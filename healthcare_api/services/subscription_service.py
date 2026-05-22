import json
from datetime import datetime, timezone
import mimetypes
from typing import Any, Optional, Union
from unittest import result
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import case, func, select, or_, cast, String
from sqlalchemy.orm import aliased, selectinload, load_only
from helper.blob_helper import BlobHelper
from helper.stripe_helper import StripeHelper
from schemas.auditlog_schema import AuditLogSchema
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from models.clients_model import Client
from models.subscriptionplan_model import SubscriptionPlan
from models.subscribers_model import Subscriber
from models.transaction_model import Transaction
from models.transactionlog_model import TransactionLog
from models.users_model import User
from schemas.subscriptionplan_schema import SubscriptionPlanSchema, SubscriberPaymentLink
from utils.errorlog_util import log_error
from models.subscriptionprice_model import SubscriptionPrice
from models.status_model import Status
from models.address_model import Address
from utils.auditlog_util import AuditLogUtil
import requests
from services.files_service import FileService
from io import BytesIO
from services.client_service import ClientService
from models.files_model import File


SUBSCRIBER_ACTIVE = 1
SUBSCRIBER_INACTIVE = 2
SUBSCRIBER_SUSPENDED = 4
TRANSACTION_PAID = 13
TRANSACTION_UNPAID = 14
TRANSACTION_CANCELLED = 15
TRANSACTION_EXPIRED = 16


class SubscriptionService:
    def __init__(self, db):
        self.db = db
        self.client_service = ClientService(db)
        self.redis_cache = RedisClient()


    async def create_subscription(self, log:Request, subscription: SubscriptionPlanSchema, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if subscription.Type.lower() == "update":
                if not subscription.Id:
                    return False, 400, "Subscription ID is required"
            
            status, message = self.subscription_validation(subscription)
            if not status:
                return False, 400, message
            
            new_price_list = []
            old_values = None
            audit_resource_id = None
            
            if not subscription.Id:
                status, result = StripeHelper.create_subscription_plan(name = subscription.Name,description=subscription.Description)
                if not status:
                    return False, 500, f"Stripe Subscription Plan Creation Failed: {result}"
                new_subscription = SubscriptionPlan(**subscription.model_dump(exclude={"Type","Price","BillingMethod","IsRecurring","MonthlyPriceId","YearlyPriceId"}),StripeProductId=result,CreatedBy=token.get("user_id"),ModifiedBy=token.get("user_id"))
                self.db.add(new_subscription)
                await self.db.flush()
                audit_resource_id = new_subscription.Id

                for index, price in enumerate(subscription.Price):
                    state, response = StripeHelper.create_price(unit_amount = price,recurring=subscription.IsRecurring, billing_method=subscription.BillingMethod[index], product=result)
                    if not state:
                        return False, 500, f"Stripe Price Creation Failed: {response}"
                    new_price_list.append(SubscriptionPrice(
                        StripePriceId = response,
                        SubscriptionPlanId = new_subscription.Id,
                        Price = price,
                        IsRecurring = subscription.IsRecurring,
                        BillingMethod = subscription.BillingMethod[index]+"ly",
                        CreatedBy = token.get("user_id"),
                        ModifiedBy = token.get("user_id")
                    ))

                self.db.add_all(new_price_list)
            else:
                subscription_plan = await self.db.scalar(
                    select(SubscriptionPlan).where(SubscriptionPlan.Id == subscription.Id)
                )
                if not subscription_plan:
                    return False, 404, "Subscription plan not found"
                
                old_values = SubscriptionPlanSchema.model_validate(subscription_plan).model_dump_json()
                audit_resource_id = subscription_plan.Id

                if subscription_plan.Name != subscription.Name or subscription_plan.Description != subscription.Description:
                    status, result = StripeHelper.update_subscription_plan(subscription_plan.StripeProductId, name=subscription.Name, description=subscription.Description)
                    if not status:
                        return False, 500, f"Stripe Subscription Plan Update Failed: {result}"
                
                for key, value in subscription.model_dump(exclude={"Type","Price","BillingMethod","IsRecurring","MonthlyPriceId","YearlyPriceId"}).items():
                    setattr(subscription_plan, key, value)

            await self.db.commit()
            
            await self.get_all_subscriptions(background_tasks=background_tasks, token=token, skip=False)
            await self.get_all_plan_prices(background_tasks=background_tasks, token=token, skip=False)

            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                    AccountId=None, ActorId=token.get("user_id"), ActorType=token.get("role"), 
                    Event="subscription_created" if subscription.Type.lower() == "create" else "subscription_updated",
                    ResourceType="Subscription", ResourceId=audit_resource_id, Status="success",
                    OldValue=None if subscription.Type.lower() == "create" else old_values,
                    NewValue=jsonable_encoder(subscription), Type="create" if subscription.Type.lower() == "create" else "update",
                ),
            )

            return True, 200, audit_resource_id

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.create_subscription", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_all_subscriptions(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            cache = await self.redis_cache.get(RedisConfig.get_all_subscriptions)
            if skip and cache:
                cached_data = json.loads(cache)
                return True, 200, cached_data

            plans_result = await self.db.execute(
                select(SubscriptionPlan)
                .execution_options(populate_existing=True)
                .options(
                    selectinload(SubscriptionPlan.prices).load_only(
                        SubscriptionPrice.Id,
                        SubscriptionPrice.StripePriceId,
                        SubscriptionPrice.Price,
                        SubscriptionPrice.BillingMethod,
                        SubscriptionPrice.IsRecurring
                    ),
                    selectinload(SubscriptionPlan.subscribers).load_only(
                        Subscriber.Id,
                        Subscriber.StatusId,
                    ),
                    selectinload(SubscriptionPlan.created_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    )
                ).order_by(SubscriptionPlan.ModifiedOn.desc()).where(SubscriptionPlan.StatusId != 5)
            )

            plans = plans_result.scalars()

            response = []
            plans_list = []
            active_subscriptions = 0
            inactive_subscriptions = 0

            for plan in plans:
                plans_list.append(plan)
                if plan.StatusId == SUBSCRIBER_ACTIVE:
                    active_subscriptions += 1
                elif plan.StatusId == SUBSCRIBER_INACTIVE:
                    inactive_subscriptions += 1

            for plan in plans_list:
                price_details = []
                price_list = []
                billing_methods = []

                monthly_price_id = None
                yearly_price_id = None
                is_recurring = False

                for idx, price in enumerate(plan.prices):
                    billing_method = price.BillingMethod
                    normalized = billing_method.lower() if billing_method else ""

                    price_list.append(price.Price)
                    billing_methods.append(billing_method)

                    price_details.append(
                        {
                            "id": str(price.Id),
                            "stripe_price_id": price.StripePriceId,
                            "price": price.Price,
                            "billing_method": billing_method,
                            "is_recurring": price.IsRecurring
                        }
                    )

                    if idx == 0:
                        is_recurring = bool(price.IsRecurring)

                    if normalized == "monthly":
                        monthly_price_id = monthly_price_id or price.StripePriceId

                    elif normalized == "yearly":
                        yearly_price_id = yearly_price_id or price.StripePriceId

                total = len(plan.subscribers)
                active = sum(1 for subscriber in plan.subscribers if subscriber.StatusId == SUBSCRIBER_ACTIVE)
                inactive = sum(1 for subscriber in plan.subscribers if subscriber.StatusId == SUBSCRIBER_INACTIVE)

                response.append(
                    {
                        "id": str(plan.Id),
                        "createdBy": (
                            f"{plan.created_by_user.FirstName} {plan.created_by_user.LastName}".strip()
                            if plan.created_by_user
                            else None
                        ),
                        "name": plan.Name,
                        "description": plan.Description,
                        "status_id": plan.StatusId,
                        "doctors_limit": plan.DoctorsLimit,
                        "patients_limit": plan.PatientsLimit,
                        "storage_size": plan.StorageSize,
                        "price": price_list,
                        "billing_method": billing_methods,
                        "price_details": price_details,
                        "is_recurring": is_recurring,
                        "total_subscribers": total,
                        "active_subscribers": active,
                        "inactive_subscribers": inactive,
                        "monthly_price_id": monthly_price_id,
                        "yearly_price_id": yearly_price_id,
                    }
                )

            payload = {
                "total_subscriptions": len(plans_list),
                "active_subscriptions": active_subscriptions,
                "inactive_subscriptions": inactive_subscriptions,
                "subscriptions": response,
            }

            if not plans_list:
                await self.redis_cache.delete(RedisConfig.get_all_subscriptions)
                return False, 404, []

            await self.redis_cache.set(RedisConfig.get_all_subscriptions, json.dumps(jsonable_encoder(payload)))
            return True, 200, payload
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_all_subscriptions", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_subscription_by_id(self, subscription_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not subscription_id:
                return False, 400, "Subscription ID is required"
            
            plan_result = await self.db.execute(
                select(SubscriptionPlan)
                .execution_options(populate_existing=True)
                .where(SubscriptionPlan.Id == subscription_id, SubscriptionPlan.StatusId != 5)
                .options(
                    selectinload(SubscriptionPlan.prices).load_only(
                        SubscriptionPrice.Id,
                        SubscriptionPrice.StripePriceId,
                        SubscriptionPrice.Price,
                        SubscriptionPrice.BillingMethod,
                        SubscriptionPrice.IsRecurring
                    ),
                    selectinload(SubscriptionPlan.subscribers).load_only(
                        Subscriber.Id,
                        Subscriber.StatusId,
                    ),
                    selectinload(SubscriptionPlan.created_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    )
                )
            )

            plan = plan_result.scalar_one_or_none()

            if not plan:
                return False, 404, "Subscription plan not found"

            total_subscribers = len(plan.subscribers)
            active_subscribers = sum(1 for subscriber in plan.subscribers if subscriber.StatusId == SUBSCRIBER_ACTIVE)
            inactive_subscribers = sum(1 for subscriber in plan.subscribers if subscriber.StatusId == SUBSCRIBER_INACTIVE)

            price_details = []
            price_list = []
            billing_methods = []

            monthly_price_id = None
            yearly_price_id = None
            is_recurring = False

            for idx, price in enumerate(plan.prices):
                billing_method = price.BillingMethod
                normalized = billing_method.lower() if billing_method else ""

                price_list.append(price.Price)
                billing_methods.append(billing_method)

                price_details.append(
                    {
                        "id": str(price.Id),
                        "stripe_price_id": price.StripePriceId,
                        "price": price.Price,
                        "billing_method": billing_method,
                        "is_recurring": price.IsRecurring,
                    }
                )

                if idx == 0:
                    is_recurring = bool(price.IsRecurring)

                if normalized == "monthly":
                    monthly_price_id = monthly_price_id or price.StripePriceId

                elif normalized == "yearly":
                    yearly_price_id = yearly_price_id or price.StripePriceId

            response = {
                "id": str(plan.Id),
                "createdBy": (
                    f"{plan.created_by_user.FirstName} {plan.created_by_user.LastName}".strip()
                    if plan.created_by_user
                    else None
                ),
                "name": plan.Name,
                "description": plan.Description,
                "status_id": plan.StatusId,
                "doctors_limit": plan.DoctorsLimit,
                "patients_limit": plan.PatientsLimit,
                "storage_size": plan.StorageSize,
                "price": price_list,
                "billing_method": billing_methods,
                "price_details": price_details,
                "is_recurring": is_recurring,
                "total_subscribers": total_subscribers,
                "active_subscribers": active_subscribers,
                "inactive_subscribers": inactive_subscribers,
                "monthly_price_id": monthly_price_id,
                "yearly_price_id": yearly_price_id,
            }

            return True, 200, response

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_subscription_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def delete_subscription(self, log:Request, subscription_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not subscription_id:
                return False, 400, "Subscription ID is required"
            
            subscription_plan = await self.db.scalar(
                select(SubscriptionPlan).where(SubscriptionPlan.Id == subscription_id)
            )
            if not subscription_plan:
                return False, 404, "Subscription plan not found"
            
            subscription_plan.StatusId = 5
            subscription_plan.ModifiedBy = token.get("user_id")

            await self.db.commit()
            await self.get_all_subscriptions(background_tasks=background_tasks, token=token, skip=False)
            await self.get_all_plan_prices(background_tasks=background_tasks, token=token, skip=False)

            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                    AccountId=None, ActorId=token.get("user_id"), ActorType=token.get("role"), 
                    Event="subscription_deleted", ResourceType="Subscription", ResourceId=subscription_plan.Id, Status="success",
                    OldValue="Active" if subscription_plan.StatusId == 1 else "Inactive", NewValue="Subscription deleted successfully", Type="delete",
                )
            )

            return True, 200, "Subscription deleted successfully"

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.delete_subscription", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def create_payment_link(self, log: Request, payment_link_data: SubscriberPaymentLink, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            user_id = token.get("user_id")
            is_update = payment_link_data.Type.lower() == "update"
            old_subscriber_value = None

            if is_update and not payment_link_data.Id:
                return False, 400, "Subscription ID is required"

            state, message = SubscriptionService.payment_link_validation(payment_link_data)
            if not state:
                return False, 400, message

            client = await self.db.scalar(select(Client).where(Client.Id == payment_link_data.AccountId))

            if not client:
                return False, 404, "Client not found"

            plan_price_result = await self.db.execute(
                select(SubscriptionPlan, SubscriptionPrice)
                .join(SubscriptionPrice, SubscriptionPrice.SubscriptionPlanId == SubscriptionPlan.Id)
                .where(
                    SubscriptionPlan.Id == payment_link_data.SubscriptionPlanId,
                    SubscriptionPlan.StatusId == 1,
                    SubscriptionPrice.Id == payment_link_data.SubscriptionPriceId,
                )
            )
            row = plan_price_result.one_or_none()
            if not row:
                return False, 404, "Subscription plan or price not found"
            subscription_plan, price = row

            amount = price.Price or 0
            sub_Id = None

            if is_update:
                subscriber = await self.db.scalar(
                    select(Subscriber).where(Subscriber.Id == payment_link_data.Id)
                )
                if not subscriber:
                    return False, 404, "Subscriber not found"
                old_subscriber_value = SubscriberPaymentLink.model_validate(subscriber).model_dump_json()
                
                sub_Id = subscriber.Id
                subscriber.SubscriptionPlanId = payment_link_data.SubscriptionPlanId
                subscriber.SubscriptionPriceId = payment_link_data.SubscriptionPriceId
                subscriber.ModifiedBy = user_id

                transaction = await self.db.scalar(select(Transaction).where(Transaction.SubscribersId == subscriber.Id))
                if transaction:
                    transaction.TransactionAmount = amount
                    transaction.ModifiedBy = user_id
            else:
                subscriber = Subscriber(
                    SubscriptionPlanId=subscription_plan.Id,
                    SubscriptionPriceId=payment_link_data.SubscriptionPriceId,
                    AccountId=client.Id,
                    StatusId=2,
                    CreatedBy=user_id,
                    ModifiedBy=user_id,
                )
                self.db.add(subscriber)
                await self.db.flush()
                sub_Id = subscriber.Id

                transaction = Transaction(
                    SubscribersId=sub_Id,
                    TransactionAmount=amount,
                    StatusId=14,
                    CreatedBy=user_id,
                    ModifiedBy=user_id,
                )

                self.db.add(transaction)

            await self.db.commit()

            status, session = StripeHelper.create_payment_link(price_id=price.StripePriceId, customer_id=client.StripeCustomerId, account_id=str(payment_link_data.AccountId), subs_id=str(sub_Id))
            if not status:
                return False, 500, f"Stripe Payment Link Creation Failed: {session}"
            
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                    AccountId=None, ActorId=token.get("user_id"), ActorType=token.get("role"), 
                    Event="payment_link_updated" if is_update else "payment_link_created", ResourceType="Subscription", ResourceId=sub_Id, Status="success",
                    OldValue=old_subscriber_value if is_update else None,
                    NewValue=jsonable_encoder(subscriber),
                    Type="update" if is_update else "create",
                ))
            
            await self.get_all_subscribers(background_tasks, None, skip=False)
            await self.client_service.get_all_clients(background_tasks, token, skip=False)

            return True, 200, {"Id": str(sub_Id), "PaymentLink": session.url}
            
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.create_payment_link", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_all_subscribers(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            cache_result = await self.redis_cache.get(RedisConfig.get_all_subscribers)
            if cache_result and skip:
                cached_data = json.loads(cache_result)
                return True, 200, cached_data

            subscribers_result = await self.db.execute(
                select(Subscriber)
                .execution_options(populate_existing=True)
                .options(
                    selectinload(Subscriber.subscription_plan).load_only(
                        SubscriptionPlan.Id,
                        SubscriptionPlan.Name,
                        SubscriptionPlan.Description,
                    ),
                    selectinload(Subscriber.subscription_price).load_only(
                        SubscriptionPrice.Id,
                        SubscriptionPrice.Price,
                        SubscriptionPrice.BillingMethod,
                        SubscriptionPrice.IsRecurring,
                    ),
                    selectinload(Subscriber.client).load_only(
                        Client.Id,
                        Client.OrganizationName,
                        Client.Email,
                        Client.Phone,
                        Client.BillingAddressId,
                    ),
                    selectinload(Subscriber.client)
                    .selectinload(Client.BillingAddress)
                    .load_only(
                        Address.Id,
                        Address.Street,
                        Address.City,
                        Address.State,
                        Address.Country,
                        Address.Zipcode,
                    ),
                    selectinload(Subscriber.status).load_only(
                        Status.Id,
                        Status.Name,
                    ),
                    selectinload(Subscriber.transactions)
                    .load_only(
                        Transaction.Id,
                        Transaction.StatusId,
                        Transaction.ModifiedOn,
                        Transaction.CreatedOn,
                    )
                    .selectinload(Transaction.status)
                    .load_only(Status.Id, Status.Name),
                    selectinload(Subscriber.created_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                    selectinload(Subscriber.modified_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                )
                .order_by(Subscriber.ModifiedOn.desc())
            )

            subscribers = subscribers_result.scalars().all()

            response = []
            active_subscribers = 0
            inactive_subscribers = 0
            monthly_revenue_amount = 0.0

            for subscriber in subscribers:
                latest_transaction = max(
                    subscriber.transactions,
                    key=lambda transaction: (
                        (transaction.ModifiedOn or transaction.CreatedOn).timestamp()
                        if (transaction.ModifiedOn or transaction.CreatedOn)
                        else 0
                    ),
                    default=None,
                )

                subscription_status_id = subscriber.StatusId
                subscription_status_name = subscriber.status.Name if subscriber.status else None
                payment_status_id = latest_transaction.StatusId if latest_transaction else None
                payment_status_name = latest_transaction.status.Name if latest_transaction and latest_transaction.status else None

                if subscription_status_id == SUBSCRIBER_ACTIVE:
                    active_subscribers += 1
                elif subscription_status_id == SUBSCRIBER_INACTIVE:
                    inactive_subscribers += 1

                if (
                    subscription_status_id == SUBSCRIBER_ACTIVE
                    and payment_status_id == TRANSACTION_PAID
                    and subscriber.subscription_price
                    and subscriber.subscription_price.Price is not None
                ):
                    price_value = float(subscriber.subscription_price.Price)
                    billing_method = (subscriber.subscription_price.BillingMethod or "").strip().lower()
                    if billing_method.startswith("year"):
                        monthly_revenue_amount += price_value / 12
                    else:
                        monthly_revenue_amount += price_value

                response.append(
                    {
                        "id": str(subscriber.Id),
                        "start_date": subscriber.StartDate if subscriber.StartDate else None,
                        "end_date": subscriber.EndDate if subscriber.EndDate else None,
                        "subscription_plan": {
                            "id": str(subscriber.subscription_plan.Id) if subscriber.subscription_plan else None,
                            "name": subscriber.subscription_plan.Name if subscriber.subscription_plan else None,
                            "description": subscriber.subscription_plan.Description if subscriber.subscription_plan else None,
                        },
                        "subscription_price": {
                            "id": str(subscriber.subscription_price.Id) if subscriber.subscription_price else None,
                            "price": subscriber.subscription_price.Price if subscriber.subscription_price else None,
                            "billing_method": subscriber.subscription_price.BillingMethod if subscriber.subscription_price else None,
                            "is_recurring": subscriber.subscription_price.IsRecurring if subscriber.subscription_price else None,
                        },
                        "client": {
                            "id": str(subscriber.client.Id) if subscriber.client else None,
                            "name": subscriber.client.OrganizationName if subscriber.client else None,
                            "billing_email": subscriber.client.Email if subscriber.client else None,
                            "billing_phone": subscriber.client.Phone if subscriber.client else None,
                            "billing_address": {
                                "id": subscriber.client.BillingAddress.Id if subscriber.client and subscriber.client.BillingAddress else None,
                                "street": subscriber.client.BillingAddress.Street if subscriber.client and subscriber.client.BillingAddress else None,
                                "city": subscriber.client.BillingAddress.City if subscriber.client and subscriber.client.BillingAddress else None,
                                "state": subscriber.client.BillingAddress.State if subscriber.client and subscriber.client.BillingAddress else None,
                                "country": subscriber.client.BillingAddress.Country if subscriber.client and subscriber.client.BillingAddress else None,
                                "zipcode": subscriber.client.BillingAddress.Zipcode if subscriber.client and subscriber.client.BillingAddress else None,
                            },
                        },
                        "subscription_status_id": subscription_status_id,
                        "subscription_status_name": subscription_status_name,
                        "payment_status_id": payment_status_id,
                        "payment_status_name": payment_status_name,
                        "created_by": (
                            f"{subscriber.created_by_user.FirstName} {subscriber.created_by_user.LastName}".strip()
                            if subscriber.created_by_user
                            else None
                        ),
                        "modified_by": (
                            f"{subscriber.modified_by_user.FirstName} {subscriber.modified_by_user.LastName}".strip()
                            if subscriber.modified_by_user
                            else None
                        ),
                        "created_on": subscriber.CreatedOn if subscriber.CreatedOn else None,
                        "modified_on": subscriber.ModifiedOn if subscriber.ModifiedOn else None,
                    }
                )

            payload = {
                "total_subscribers": len(subscribers),
                "active_subscribers": active_subscribers,
                "inactive_subscribers": inactive_subscribers,
                "monthly_revenue": round(monthly_revenue_amount, 2),
                "subscribers": response,
            }

            await self.redis_cache.set(RedisConfig.get_all_subscribers, json.dumps(jsonable_encoder(payload)))

            return True, 200, payload
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_all_subscribers", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_subscriber_by_id(self, subscriber_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not subscriber_id:
                return False, 400, "Subscriber ID is required"
            
            subscriber_result = await self.db.execute(
                select(Subscriber)
                .execution_options(populate_existing=True)
                .where(Subscriber.Id == subscriber_id)
                .options(
                    selectinload(Subscriber.subscription_plan).load_only(
                        SubscriptionPlan.Id,
                        SubscriptionPlan.Name,
                        SubscriptionPlan.Description,
                    ),
                    selectinload(Subscriber.subscription_price).load_only(
                        SubscriptionPrice.Id,
                        SubscriptionPrice.Price,
                        SubscriptionPrice.BillingMethod,
                        SubscriptionPrice.IsRecurring,
                    ),
                    selectinload(Subscriber.client).load_only(
                        Client.Id,
                        Client.OrganizationName,
                        Client.Email,
                        Client.Phone,
                        Client.BillingAddressId,
                    ),
                    selectinload(Subscriber.client)
                    .selectinload(Client.BillingAddress)
                    .load_only(
                        Address.Id,
                        Address.Street,
                        Address.City,
                        Address.State,
                        Address.Country,
                        Address.Zipcode,
                    ),
                    selectinload(Subscriber.status).load_only(
                        Status.Id,
                        Status.Name,
                    ),
                    selectinload(Subscriber.transactions)
                    .load_only(
                        Transaction.Id,
                        Transaction.StatusId,
                        Transaction.ModifiedOn,
                        Transaction.CreatedOn,
                    )
                    .selectinload(Transaction.status)
                    .load_only(Status.Id, Status.Name),
                    selectinload(Subscriber.created_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                    selectinload(Subscriber.modified_by_user).load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                )
            )

            subscriber = subscriber_result.scalar_one_or_none()

            if not subscriber:
                return False, 404, "Subscriber not found"

            latest_transaction = max(
                subscriber.transactions,
                key=lambda transaction: (
                    (transaction.ModifiedOn or transaction.CreatedOn).timestamp()
                    if (transaction.ModifiedOn or transaction.CreatedOn)
                    else 0
                ),
                default=None,
            )

            subscription_status_id = subscriber.StatusId
            subscription_status_name = subscriber.status.Name if subscriber.status else None
            payment_status_id = latest_transaction.StatusId if latest_transaction else None
            payment_status_name = latest_transaction.status.Name if latest_transaction and latest_transaction.status else None

            response = {
                "id": str(subscriber.Id),
                "start_date": subscriber.StartDate if subscriber.StartDate else None,
                "end_date": subscriber.EndDate if subscriber.EndDate else None,
                "subscription_plan": {
                    "id": str(subscriber.subscription_plan.Id) if subscriber.subscription_plan else None,
                    "name": subscriber.subscription_plan.Name if subscriber.subscription_plan else None,
                    "description": subscriber.subscription_plan.Description if subscriber.subscription_plan else None,
                },
                "subscription_price": {
                    "id": str(subscriber.subscription_price.Id) if subscriber.subscription_price else None,
                    "price": subscriber.subscription_price.Price if subscriber.subscription_price else None,
                    "billing_method": subscriber.subscription_price.BillingMethod if subscriber.subscription_price else None,
                    "is_recurring": subscriber.subscription_price.IsRecurring if subscriber.subscription_price else None,
                },
                "client": {
                    "id": str(subscriber.client.Id) if subscriber.client else None,
                    "name": subscriber.client.OrganizationName if subscriber.client else None,
                    "billing_email": subscriber.client.Email if subscriber.client else None,
                    "billing_phone": subscriber.client.Phone if subscriber.client else None,
                    "billing_address": {
                        "id": subscriber.client.BillingAddress.Id if subscriber.client and subscriber.client.BillingAddress else None,
                        "street": subscriber.client.BillingAddress.Street if subscriber.client and subscriber.client.BillingAddress else None,
                        "city": subscriber.client.BillingAddress.City if subscriber.client and subscriber.client.BillingAddress else None,
                        "state": subscriber.client.BillingAddress.State if subscriber.client and subscriber.client.BillingAddress else None,
                        "country": subscriber.client.BillingAddress.Country if subscriber.client and subscriber.client.BillingAddress else None,
                        "zipcode": subscriber.client.BillingAddress.Zipcode if subscriber.client and subscriber.client.BillingAddress else None,
                    },
                },
                "subscription_status_id": subscription_status_id,
                "subscription_status_name": subscription_status_name,
                "payment_status_id": payment_status_id,
                "payment_status_name": payment_status_name,
                "created_by": (
                    f"{subscriber.created_by_user.FirstName} {subscriber.created_by_user.LastName}".strip()
                    if subscriber.created_by_user
                    else None
                ),
                "modified_by": (
                    f"{subscriber.modified_by_user.FirstName} {subscriber.modified_by_user.LastName}".strip()
                    if subscriber.modified_by_user
                    else None
                ),
                "created_on": subscriber.CreatedOn.isoformat() if subscriber.CreatedOn else None,
                "modified_on": subscriber.ModifiedOn.isoformat() if subscriber.ModifiedOn else None,
            }
            return True, 200, response
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_subscriber_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_all_plan_prices(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            cache_result = await self.redis_cache.get(RedisConfig.get_all_plan_prices)
            if cache_result and skip:
                cached_data = json.loads(cache_result)
                return True, 200, cached_data
            
            plans_result = await self.db.execute(
                select(SubscriptionPlan)
                .execution_options(populate_existing=True)
                .options(
                    selectinload(SubscriptionPlan.prices).load_only(
                        SubscriptionPrice.Id,
                        SubscriptionPrice.StripePriceId,
                        SubscriptionPrice.Price,
                        SubscriptionPrice.BillingMethod,
                    )
                )
                .where(SubscriptionPlan.StatusId == 1)
                .order_by(SubscriptionPlan.ModifiedOn.desc())
            )

            plans = plans_result.scalars().all()

            response = []
            for plan in plans:
                response.append(
                    {
                        "id": str(plan.Id),
                        "name": plan.Name,
                        "prices": [
                            {
                                "id": str(price.Id),
                                "stripe_price_id": price.StripePriceId,
                                "price": price.Price,
                                "billing_method": price.BillingMethod,
                            }
                            for price in plan.prices
                        ],
                    }
                )
            await self.redis_cache.set(RedisConfig.get_all_plan_prices, json.dumps(response))
            return True, 200, response
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_all_plan_prices", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_all_transaction_details(self, background_tasks: BackgroundTasks, token: dict, subscriber_id: str = None, account_id: str = None) -> tuple[bool, int, Any]:
        try:
            if not (subscriber_id and subscriber_id != "null") and not (account_id and account_id != "null"):
                return False, 400, "Either Subscriber ID or Account ID is required"

            if account_id and account_id != "null":
                transactions_result = await self.db.execute(
                    select(File)
                    .where(
                        File.Type == 7,
                        File.AccountId == uuid.UUID(account_id)
                    )
                    .order_by(File.CreatedOn.desc())
                )
            else:
                transactions_result = await self.db.execute(
                    select(File)
                    .where(
                        File.Type == 7,
                        cast(cast(File.Metadata, String), String).contains(subscriber_id)
                    )
                    .order_by(File.CreatedOn.desc())
                )
            
            transactions = transactions_result.scalars().all()
            response = []
            now_utc = datetime.now(timezone.utc)
            for transaction in transactions:
                is_cancel_button_visible = False
                metadata = json.loads(transaction.Metadata) if transaction.Metadata else {}

                period_start = metadata.get("period_start") if isinstance(metadata, dict) else None
                period_end = metadata.get("period_end") if isinstance(metadata, dict) else None
                status = metadata.get("payment_status") if isinstance(metadata, dict) else None

                if period_start and period_end and status!="Cancelled" and status!="Inactive":
                    start_dt = datetime.fromisoformat(str(period_start).replace("Z", "+00:00"))
                    end_dt = datetime.fromisoformat(str(period_end).replace("Z", "+00:00"))

                    if start_dt.tzinfo is None:
                        start_dt = start_dt.replace(tzinfo=timezone.utc)
                    if end_dt.tzinfo is None:
                        end_dt = end_dt.replace(tzinfo=timezone.utc)

                    is_cancel_button_visible = start_dt <= now_utc <= end_dt


                response.append({
                    "id": str(transaction.Id),
                    "name": transaction.FileName,
                    "metadata": metadata,
                    "is_cancel" : is_cancel_button_visible,
                    "created_on": transaction.CreatedOn,
                })
            return True, 200, response
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.get_all_transaction_details", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def update_transaction_details(self, background_tasks: BackgroundTasks, token: dict, sub_id: str, msg: str) -> tuple[bool, int, Any]:
        try:
            if not sub_id or sub_id == "null":
                return False, 400, "Subscriber ID is required"
            
            transactions_result = await self.db.execute(
                    select(File)
                    .where(
                        File.Type == 7,
                        cast(cast(File.Metadata, String), String).contains(sub_id)
                    )
                    .order_by(File.CreatedOn.desc())
                )
            transaction_file = transactions_result.scalars().first()
            if not transaction_file:
                return False, 404, "Transaction not found"
            metadata = json.loads(transaction_file.Metadata) if transaction_file.Metadata else {}
            metadata["payment_status"] = msg
            transaction_file.Metadata = json.dumps(metadata)
            await self.db.commit()
            return True, 200, f"Transaction status updated to {msg}"
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.update_transaction_details", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def download_invoice(self, log: Request, background_tasks: BackgroundTasks, file_id: str, token: dict) -> tuple[bool, int, Any]:
        try:
            if not file_id or file_id == "None" or file_id == "null":
                return False, 400, "File ID is required"
            
            file_result = await self.db.execute(select(File).where(File.Id == int(file_id), File.Type == 7))
            file = file_result.scalar_one_or_none()
            if not file:
                return False, 404, "File not found"

            status, file_data = await BlobHelper.download_file_from_blob(file.FilePath)
            if not status:
                return False, 400, "Error downloading file from blob."

            mime_type, _ = mimetypes.guess_type(file.FileName or "")
            mime_type = mime_type or "application/pdf"
            
            data_uri = f"data:{mime_type};base64,{file_data}"
            
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                AccountId=None, ActorId=token.get("user_id"), ActorType=token.get("role"),
                Event="invoice_downloaded", ResourceType="Subscription", ResourceId=file.Id, Status="success",
                OldValue=None, NewValue=f"Invoice {file.FileName} downloaded", Type="download",
            ))

            return True, 200, data_uri
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.download_invoice", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def cancel_subscription(self, log: Request, subscriber_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not subscriber_id or subscriber_id == "null":
                return False, 400, "Subscriber ID is required"
            subscriber = await self.db.scalar(select(Subscriber).where(Subscriber.Id == subscriber_id))
            if not subscriber:
                return False, 404, "Subscriber not found"
            if subscriber.StripeSubscriptionId:
                status, result = StripeHelper.cancel_subscription(subscriber.StripeSubscriptionId)
                if not status:
                    return False, 500, f"Stripe subscription cancellation failed: {result}"
                subscriber.StatusId = TRANSACTION_CANCELLED
            
            await self.db.commit()
            await self.get_all_subscribers(background_tasks, None, skip=False)
            
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                AccountId=None, ActorId=token.get("user_id"), ActorType=token.get("role"),
                Event="subscription_cancellation_initiated", ResourceType="Subscription", ResourceId=subscriber_id, Status="success",
                OldValue=None, NewValue=f"Subscription {subscriber_id} cancellation initiated", Type="update"
            ))  
            
            return True, 200, jsonable_encoder(result)
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in SubscriptionService.cancel_subscription", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def handle_stripe_event(self, background_tasks: BackgroundTasks, event_type: str, data: dict) -> None:
        try:
            if event_type == "invoice.paid":
                await self.handle_payment_succeeded(data, background_tasks)
            
            if event_type == "charge.dispute.created":
                await self.handle_dispute_created(data, background_tasks)

            if event_type == "customer.subscription.updated":
                await self.handle_subscription_updated(data , background_tasks, False)

            if event_type == "customer.subscription.deleted":
                await self.handle_subscription_updated(data, background_tasks, True)

        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in handle_stripe_event Service", user_id=None)
            return

    async def handle_payment_succeeded(self, data: dict, background_tasks: BackgroundTasks) -> None:
        try:
            invoice = data
            lines = invoice.get("lines")
            line_items = lines.get("data", []) if isinstance(lines, dict) else []
            line = line_items[0] if line_items else None

            metadata = line.get("metadata", {}) if line else {}
            if not metadata:
                metadata = invoice.get("subscription_details", {}).get("metadata", {})
            if not metadata:
                metadata = invoice.get("parent", {}).get("subscription_details", {}).get("metadata", {})

            account_id = metadata.get("account_id")
            subscriber_id = metadata.get("subscriber_id")

            if not account_id or not subscriber_id:
                raise Exception("Missing metadata: account_id or subscriber_id")

            account_uuid = uuid.UUID(account_id)
            subscriber_uuid = uuid.UUID(subscriber_id)
            payment_intent = invoice.get("payment_intent")
            charge_id = invoice.get("charge")
            subscription_id = invoice.get("subscription")
            charge = None
            payment_type = None
            status, result = StripeHelper.retrieve_charge(charge_id)
            if status and result:  
                charge = result
            status1, result = StripeHelper.retrieve_payment_intent("pi_3TVnDAEgR4z9XwpD0iCAS9lg")
            if result.payment_method and status1:
                payment_type = result.payment_method.type
            period = line.get("period", {}) if line else {}
            start_ts = period.get("start")
            end_ts = period.get("end")
            start_date = datetime.fromtimestamp(start_ts, timezone.utc) if start_ts else None
            end_date = datetime.fromtimestamp(end_ts, timezone.utc) if end_ts else None

            subscriber = await self.db.scalar(select(Subscriber).where(Subscriber.Id == subscriber_uuid))
            if not subscriber:
                raise Exception("Subscriber not found")

            subscriber.StatusId = SUBSCRIBER_ACTIVE
            subscriber.StartDate = start_date
            subscriber.EndDate = end_date
            subscriber.StripeSubscriptionId = subscription_id

            transaction = await self.db.scalar(
                select(Transaction)
                .where(Transaction.SubscribersId == subscriber_uuid)
                .order_by(Transaction.ModifiedOn.desc(), Transaction.CreatedOn.desc())
            )
            if transaction:
                transaction.StatusId = TRANSACTION_PAID
                transaction.TransactionDate = datetime.now(timezone.utc)
                transaction.StripeTransactionId = payment_intent
                transaction.StripeChargeId = charge_id

            client = await self.db.scalar(select(Client).where(Client.Id == account_uuid))
            if client:
                client.StatusId = SUBSCRIBER_ACTIVE
                client.Reason = None

            transaction_log = TransactionLog(
                TransactionId=transaction.Id if transaction else None,
                RequestData="Invoice Paid",
                ResponseData=json.dumps(jsonable_encoder(invoice)),
                ResponseDate=datetime.now(timezone.utc),
                CreatedBy=account_uuid,
            )
            self.db.add(transaction_log)

            response = requests.get(invoice.get("invoice_pdf"), stream=True)
            file = f"Invoices/{invoice.get('id')}.pdf"
            
            file_check = await self.db.scalar(select(File).where(File.FileName == file, File.AccountId == account_uuid, File.Type == 7))
            if not file_check:
                invoice_upload = UploadFile(file=BytesIO(response.content), filename=file)
                blob_metadata  = {
                    "invoice_id": invoice.get("id"), 
                    "stripe_customer_id": invoice.get("customer"), 
                    "stripe_subscription_id": subscription_id,
                    "stripe_transaction_id": payment_intent,
                    "stripe_charge_id": charge_id,
                    "subscriber_id": str(subscriber_uuid),
                    "amount_paid": invoice.get("amount_paid"),
                    "currency": invoice.get("currency"),
                    "payment_status": invoice.get("status"),
                    "transaction_date": datetime.now(timezone.utc),
                    "payment_method": payment_type if result.payment_method else None,
                    "period_start": start_date if start_date else None,
                    "period_end": end_date if end_date else None,
                    "card_number": charge.payment_method_details.card.last4,
                    "card_brand": charge.payment_method_details.card.brand,
                    "exp_month" : charge.payment_method_details.card.exp_month,
                    "exp_year" : charge.payment_method_details.card.exp_year,
                }
                await FileService.upload_file(
                    file=invoice_upload,
                    client_id=account_uuid, 
                    file_name=file, 
                    file_id=None, 
                    metadata=json.dumps(jsonable_encoder(blob_metadata)), 
                    type=7
                )

            await self.db.commit()
            # Avoid concurrent DB operations on the same AsyncSession.
            await self.get_all_subscribers(background_tasks, None, skip=False)
            await self.get_all_subscriptions(background_tasks, None, skip=False)
            await self.get_all_plan_prices(background_tasks, None, skip=False)
            await self.client_service.get_all_clients(background_tasks, None, skip=False)
            return
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in handle_payment_succeeded Service", user_id=None)
            return

    async def handle_subscription_updated(self, data: dict, background_tasks: BackgroundTasks, is_deleted: bool = False) -> None:
        now = datetime.now(timezone.utc)
        try:
            metadata = data.get("metadata") or {}
            account_id = metadata.get("account_id")
            subscriber_id = metadata.get("subscriber_id")
            status = data.get("status")

            if not account_id or not subscriber_id:
                raise ValueError("Missing metadata: account_id or subscriber_id")

            account_uuid = uuid.UUID(account_id)
            subscriber_uuid = uuid.UUID(subscriber_id)

            subscriber = await self.db.scalar(select(Subscriber).where(Subscriber.Id == subscriber_uuid))
            client = await self.db.scalar(select(Client).where(Client.Id == account_uuid))
            transaction = await self.db.scalar(
                select(Transaction).where(Transaction.SubscribersId == subscriber_uuid).order_by(Transaction.ModifiedOn.desc()).limit(1)
            )

            transaction_status_id = None
            reason_message = None
            status_msg = None

            if is_deleted and status == "canceled":
                if subscriber:
                    subscriber.StatusId = SUBSCRIBER_INACTIVE
                    subscriber.EndDate = now
                if client:
                    client.StatusId = SUBSCRIBER_INACTIVE
                status_msg = "Inactive"

                reason_message = "Subscription canceled and marked as expired."
                transaction_status_id = TRANSACTION_EXPIRED
            elif status in ("past_due", "unpaid"):
                if subscriber:
                    subscriber.StatusId = SUBSCRIBER_INACTIVE
                if client:
                    client.StatusId = SUBSCRIBER_SUSPENDED

                latest_invoice_id = data.get("latest_invoice")
                if latest_invoice_id:
                    inv_status, invoice = StripeHelper.retrieve_invoice(latest_invoice_id)
                    if inv_status and invoice:
                        charge_id = invoice.get("charge")
                        if charge_id:
                            charge_status, charge = StripeHelper.retrieve_charge(charge_id)
                            if charge_status and charge:
                                outcome = charge.get("outcome") or {}
                                reason_message = (
                                    f"Payment failed due to "
                                    f"{charge.get('failure_code', 'unknown_code')}: "
                                    f"{charge.get('failure_message', 'unknown reason')}. "
                                    f"Network status: {outcome.get('network_status', 'unknown')}, "
                                    f"Reason: {outcome.get('reason', 'unknown')}, "
                                    f"Risk level: {outcome.get('risk_level', 'unknown')}."
                                )
                reason_message = (reason_message or "Subscription is unpaid/past_due.")
                transaction_status_id = TRANSACTION_UNPAID
                status_msg = "Past Due"
            elif data.get("cancel_at_period_end"):
                if subscriber:
                    subscriber.StatusId = SUBSCRIBER_ACTIVE
                    current_period_end = data.get("current_period_end")
                    if current_period_end:
                        subscriber.EndDate = datetime.fromtimestamp(current_period_end,timezone.utc)

                reason_message = "Aegis Team initiated cancellation on behalf of the subscriber and subscription will cancel at period end."
                transaction_status_id = TRANSACTION_CANCELLED
                status_msg = "Cancelled"

            if client:
                client.Reason = reason_message

            if transaction and transaction_status_id:
                transaction.StatusId = transaction_status_id
                transaction.TransactionDate = now
            
            transaction_log = TransactionLog(
                TransactionId=transaction.Id if transaction else None,
                RequestData="Subscription Updated",
                ResponseData=json.dumps(data, default=str),
                ResponseDate=now,
                CreatedBy=account_uuid,
            )

            self.db.add(transaction_log)
            await self.update_transaction_details(background_tasks, None, data.get("id"), status_msg if status_msg else None)
            # Avoid concurrent DB operations on the same AsyncSession.
            await self.get_all_subscribers(background_tasks, None, skip=False)
            await self.get_all_subscriptions(background_tasks, None, skip=False)
            await self.get_all_plan_prices(background_tasks, None, skip=False)
            await self.client_service.get_all_clients(background_tasks, None, skip=False)
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in handle_subscription_updated Service", user_id=None)
            return

    async def handle_dispute_created(self, data: dict, background_tasks: BackgroundTasks) -> None:
        try:
            dispute = jsonable_encoder(data)
            charge_id = dispute.get("charge")
            dispute_id = dispute.get("id")
            reason_code = dispute.get("reason")

            STRIPE_DISPUTE_REASONS = {
                "bank_cannot_process": "The bank could not process the payment.",
                "check_returned": "The check payment was returned or bounced.",
                "credit_not_processed": "The customer expected a refund that was not processed.",
                "customer_initiated": "The customer initiated a dispute.",
                "debit_not_authorized": "The debit was not authorized by the customer.",
                "duplicate": "The customer claims they were charged more than once.",
                "fraudulent": "The customer claims the payment was unauthorized or fraudulent.",
                "general": "A general dispute with no specific category.",
                "incorrect_account_details": "The bank account details provided were incorrect.",
                "insufficient_funds": "The customer did not have enough funds to complete the payment.",
                "product_not_received": "The customer claims they did not receive the product or service.",
                "product_unacceptable": "The product or service was defective or not as described.",
                "subscription_canceled": "The customer claims they canceled their subscription but were still charged.",
                "unrecognized": "The customer does not recognize the payment.",
                "unauthorized": "The payment was not authorized by the customer.",
            }
            reason_text = STRIPE_DISPUTE_REASONS.get(reason_code, "Unknown dispute reason")
            dispute_reason = f"Dispute : {dispute_id}, Reason : {reason_code} - {reason_text}"

            transaction = await self.db.scalar(select(Transaction).where(Transaction.StripeChargeId == charge_id))
            subscriber = None
            client = None

            if transaction:
                transaction.StatusId = TRANSACTION_CANCELLED
                transaction.TransactionDate = datetime.now(timezone.utc)

                subscriber = await self.db.scalar(select(Subscriber).where(Subscriber.Id == transaction.SubscribersId))
                if subscriber:
                    subscriber.StatusId = SUBSCRIBER_INACTIVE
                    subscriber.EndDate = datetime.now(timezone.utc)

                    client = await self.db.scalar(select(Client).where(Client.Id == subscriber.AccountId))
                    if client:
                        client.StatusId = SUBSCRIBER_SUSPENDED
                        client.Reason = dispute_reason

            transaction_log = TransactionLog(
                TransactionId=transaction.Id if transaction else None,
                RequestData="Dispute Created",
                ResponseData=json.dumps(dispute),
                ResponseDate=datetime.now(timezone.utc),
                CreatedBy=client.Id if client else (subscriber.AccountId if subscriber else None),
            )
            self.db.add(transaction_log)

            await self.db.commit()
            await self.get_all_subscribers(background_tasks, None, skip=False)
            await self.get_all_subscriptions(background_tasks, None, skip=False)
            await self.get_all_plan_prices(background_tasks, None, skip=False)
            await self.client_service.get_all_clients(background_tasks, None, skip=False)
            return
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in handle_dispute_created Service", user_id=None)
            return
    
    @staticmethod
    def subscription_validation(subscription: SubscriptionPlanSchema) -> tuple[bool, str]:
        try:
            validation = [
                (subscription.Name.strip(), "Subscription name is required"),
                (subscription.DoctorsLimit > 0, "Doctors limit must be greater than zero"),
                (subscription.PatientsLimit >= 0, "Patients limit must be greater than zero"),
                (subscription.Description.strip(), "Description is required"),
                (subscription.StorageSize >= 0, "Storage size must be greater than zero"),
                (subscription.StatusId, "StatusId is required"),
            ]
            for condition, message in validation:
                if not condition:
                    return False, message
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def payment_link_validation(paymentLink: SubscriberPaymentLink) -> tuple[bool, str]:
        try:
            validations = [
                (paymentLink.SubscriptionPlanId.strip() if paymentLink.SubscriptionPlanId else None,"Subscription Plan ID is required"),
                (paymentLink.SubscriptionPriceId.strip() if paymentLink.SubscriptionPriceId else None,"Price is required"),
                (paymentLink.AccountId.strip() if paymentLink.AccountId else None,"Account ID is required"),
                (paymentLink.Type.strip() if paymentLink.Type else None,"Type is required"),
            ]
            for condition, message in validations:
                if not condition:
                    return False, message
                
            return True, "Validation Successful"
        except Exception as e:
            return False, str(e)



