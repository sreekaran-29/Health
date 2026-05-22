import asyncio
import mimetypes
import json
from typing import Any, Optional
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from schemas.auditlog_schema import AuditLogSchema
from schemas.client_schema import ClientSchema
from models.clients_model import Client
from utils.auditlog_util import AuditLogUtil
from utils.errorlog_util import log_error
from helper.stripe_helper import StripeHelper
from services.files_service import FileService
from models.address_model import Address
from models.accountservices_model import AccountServices
from models.users_model import User
from models.status_model import Status
from models.subscribers_model import Subscriber
from models.subscriptionplan_model import SubscriptionPlan
from models.subscriptionprice_model import SubscriptionPrice
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from helper.blob_helper import BlobHelper
from models.files_model import File

# redis_cache = RedisClient() 

class ClientService:
    def __init__(self, db):
        self.db = db
        self.redis_cache = RedisClient()

    async def get_all_clients(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            cache_result = await self.redis_cache.get(RedisConfig.get_all_clients)
            if cache_result and skip:
                cached_data = json.loads(cache_result)
                return True, 200, cached_data
            
            stmt = (
                select(Client)
                .options(
                    selectinload(Client.account_service).load_only(AccountServices.ServiceIds),
                    selectinload(Client.LegalAddress).load_only(
                        Address.Id,
                        Address.Street,
                        Address.State,
                        Address.Zipcode,
                        Address.City,
                        Address.Country,
                    ),
                    selectinload(Client.BillingAddress).load_only(
                        Address.Id,
                        Address.Street,
                        Address.State,
                        Address.Zipcode,
                        Address.City,
                        Address.Country,
                    ),
                    selectinload(Client.created_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Client.modified_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Client.status).load_only(Status.Name),
                    selectinload(Client.subscribers).options(
                        selectinload(Subscriber.subscription_plan).load_only(SubscriptionPlan.Id, SubscriptionPlan.Name),
                        selectinload(Subscriber.subscription_price).load_only(SubscriptionPrice.Id, SubscriptionPrice.Price, SubscriptionPrice.BillingMethod, SubscriptionPrice.IsRecurring),
                        selectinload(Subscriber.status).load_only(Status.Id, Status.Name),
                    ),
                )
                .order_by(Client.ModifiedOn.desc())
                .where(Client.StatusId != 5)
            )

            result = await self.db.execute(stmt)
            clients = result.scalars().all()

            if not clients:
                return False, 404, "No clients found."

            clients_data = [self._serialize_client_with_relations(client) for client in clients]

            status_summary = {
                "Active": sum(1 for c in clients_data if c["StatusId"] == 1),
                "Inactive": sum(1 for c in clients_data if c["StatusId"] == 2),
                "Pending": sum(1 for c in clients_data if c["StatusId"] == 3),
                "Suspended": sum(1 for c in clients_data if c["StatusId"] == 4),
            }

            response_data = {
                "Clients": clients_data,
                "StatusSummary": status_summary,
            }

            await self.redis_cache.set(RedisConfig.get_all_clients,json.dumps(jsonable_encoder(response_data)))

            return True, 200, response_data
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.get_all_clients", user_id=token.get("user_id"))
            return False, 500, str(e)
    
    async def get_client_by_id(self, client_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not client_id:
                return False, 400, "Client ID is required"

            stmt = (
                select(Client)
                .options(
                    selectinload(Client.account_service).load_only(AccountServices.ServiceIds),
                    selectinload(Client.LegalAddress).load_only(
                        Address.Id,
                        Address.Street,
                        Address.State,
                        Address.Zipcode,
                        Address.City,
                        Address.Country,
                    ),
                    selectinload(Client.BillingAddress).load_only(
                        Address.Id,
                        Address.Street,
                        Address.State,
                        Address.Zipcode,
                        Address.City,
                        Address.Country,
                    ),
                    selectinload(Client.created_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Client.modified_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Client.status).load_only(Status.Name),
                    selectinload(Client.subscribers).options(
                        selectinload(Subscriber.subscription_plan).load_only(SubscriptionPlan.Id, SubscriptionPlan.Name),
                        selectinload(Subscriber.subscription_price).load_only(SubscriptionPrice.Id, SubscriptionPrice.Price, SubscriptionPrice.BillingMethod, SubscriptionPrice.IsRecurring),
                        selectinload(Subscriber.status).load_only(Status.Id, Status.Name),
                    ),
                )
                .where(Client.Id == uuid.UUID(client_id), Client.StatusId != 5)
            )

            result = await self.db.execute(stmt)
            client = result.scalars().first()
            if not client:
                return False, 404, "Client not found."

            return True, 200, jsonable_encoder(self._serialize_client_with_relations(client))
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.get_client_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_client_logo(self, client_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not client_id:
                return False, 400, "Client ID is required"

            stmt = select(Client.FileId).where(Client.Id == uuid.UUID(client_id), Client.StatusId != 5)
            result = await self.db.execute(stmt)
            file_id = result.scalar_one_or_none()
            if not file_id:
                return False, 404, "Client logo not found."
            
            file_record = await self.db.scalar(
                select(File).where(File.Id == file_id)
            )
            if not file_record:
                return False, 404, "File record not found."
            
            status, file_data = await BlobHelper.download_file_from_blob(file_record.FilePath)
            if not status:
                return False, 400, "Error downloading file from blob."

            mime_type, _ = mimetypes.guess_type(file_record.FileName or "")
            mime_type = mime_type or "application/octet-stream"
            
            data_uri = f"data:{mime_type};base64,{file_data}"

            return True, 200, data_uri
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.get_client_logo", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def save_client(self, log: Request, background_tasks: BackgroundTasks, token: dict, client: ClientSchema, logo: Optional[UploadFile] = None) -> tuple[bool, int, str]:
        try:
            is_update = bool(client.Id)
            actor_user_id = uuid.UUID(token.get("user_id")) if token.get("user_id") else None
            old_value = None

            if client.Type.lower() == "update" and not is_update:
                return False, 400, "Client ID is required."

            status, msg = self.validate_save_client(client)
            if not status:
                return False, 400, msg

            legal_data = client.LegalAddress.model_dump(exclude={"Id"})
            billing_data = client.BillingAddress.model_dump(exclude={"Id"})
            client_data = client.model_dump(exclude={"Id", "Type", "LegalAddress", "BillingAddress", "Services"}, exclude_unset=True, exclude_none=True)

            db_client = None

            if not is_update:
                db_client = Client(**client_data,CreatedBy=actor_user_id,ModifiedBy=actor_user_id)
                self.db.add(db_client)
                await self.db.flush()

                status, stripe_id = StripeHelper.create_customer(email=client.Email,name=client.OrganizationName)
                if not status:
                    await self.db.rollback()
                    return False, 500, f"Stripe Customer Creation Failed: {stripe_id}"

                db_client.StripeCustomerId = stripe_id

                addresses = [
                    Address(
                        Type=11,
                        AccountId=db_client.Id,
                        CreatedBy=actor_user_id,
                        ModifiedBy=actor_user_id,
                        **legal_data
                    ),
                    Address(
                        Type=12,
                        AccountId=db_client.Id,
                        CreatedBy=actor_user_id,
                        ModifiedBy=actor_user_id,
                        **billing_data
                    ),
                ]

                self.db.add_all(addresses)
                await self.db.flush()

                db_client.LegalAddressId = addresses[0].Id
                db_client.BillingAddressId = addresses[1].Id

            else:
                db_client = await self.db.scalar(select(Client).where(Client.Id == client.Id))
                if not db_client:
                    return False, 404, "Client not found."
                
                old_value = jsonable_encoder(db_client)
                
                for field, value in client_data.items():
                    setattr(db_client, field, value)
                db_client.ModifiedBy = actor_user_id

                if db_client.StripeCustomerId:
                    status, result = StripeHelper.update_customer(customer_id=db_client.StripeCustomerId,email=client.Email,name=client.OrganizationName)
                    if not status:
                        return False, 500, f"Stripe Customer Update Failed: {result}"

                address_ids = [db_client.LegalAddressId, db_client.BillingAddressId]

                result = await self.db.execute(select(Address).where(Address.Id.in_(address_ids)))
                address_map = {addr.Id: addr for addr in result.scalars()}

                legal_address = address_map.get(db_client.LegalAddressId)
                billing_address = address_map.get(db_client.BillingAddressId)

                if legal_address:
                    for key, value in legal_data.items():
                        setattr(legal_address, key, value)
                    legal_address.ModifiedBy = actor_user_id

                if billing_address:
                    for key, value in billing_data.items():
                        setattr(billing_address, key, value)
                    billing_address.ModifiedBy = actor_user_id

            if logo:
                status, file_id = await FileService.upload_file(file=logo, client_id=db_client.Id, file_id=db_client.FileId, type=6, file_name=f"Logo/{logo.filename}")
                if not status:
                    return False, 400, "Logo Upload Failed"

                db_client.FileId = file_id

            acc_service_result = await self.db.execute(select(AccountServices).where(AccountServices.AccountId == db_client.Id))
            acc_service = acc_service_result.scalars().first()

            if acc_service:
                acc_service.ServiceIds = client.Services or []
                acc_service.ModifiedBy = actor_user_id
            else:
                self.db.add(AccountServices(
                    AccountId=db_client.Id,
                    ServiceIds=client.Services or [],
                    CreatedBy=actor_user_id,
                    ModifiedBy=actor_user_id
                ))

            await self.db.commit()
            await self.db.refresh(db_client)
            self.db.expire_all()

            await self.get_all_clients(background_tasks, token, skip=False)
            await self.get_clients_names(background_tasks, token, skip=False)


            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_client" if is_update else "create_client", ResourceType="Client",
                ResourceId=db_client.Id, AccountId=db_client.Id, ActorId=actor_user_id, ActorType=token.get("role"),
                Status="success", OldValue=old_value if is_update else None, NewValue=jsonable_encoder(client),
            ))

            return True, 200, db_client.Id
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.save_client", user_id=token.get("user_id"))
            return False, 500, str(e)
    
    async def delete_client(self, log: Request, client_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, str]:
        try:
            if not client_id:
                return False, 400, "Client ID is required"
            
            db_client = await self.db.scalar(
                select(Client).where(Client.Id == uuid.UUID(client_id))
            )
            if not db_client:
                return False, 404, "Client not found."

            db_client.StatusId = 5
            await self.db.commit()
            # Avoid concurrent use of the same AsyncSession instance.
            await self.get_all_clients(background_tasks, token, skip=False)
            await self.get_clients_names(background_tasks, token, skip=False)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Delete", Event="delete_client", ResourceType="Client",
                ResourceId=db_client.Id, AccountId=db_client.Id, ActorId=token.get("user_id"), ActorType=token.get("role"),
                Status="success", OldValue=None, NewValue="Client deleted",
            ))
            return True, 200, "Client deleted successfully."
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.delete_client", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def get_clients_names(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            cache_result = await self.redis_cache.get(RedisConfig.get_all_clients_names)
            if cache_result and skip:
                cached_data = json.loads(cache_result)
                return True, 200, cached_data
            
            stmt = select(Client.Id, Client.OrganizationName).where(Client.StatusId != 5)
            result = await self.db.execute(stmt)
            clients = [{"Id": str(r.Id), "OrganizationName": r.OrganizationName} for r in result]

            await self.redis_cache.set(RedisConfig.get_all_clients_names,json.dumps(jsonable_encoder(clients)))
            return True, 200, clients
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ClientService.get_clients_names", user_id=token.get("user_id"))
            return False, 500, str(e)

    @staticmethod
    def _format_full_name(user: Optional[User]) -> Optional[str]:
        try:
            if not user:
                return None
            full_name = f"{user.FirstName or ''} {user.LastName or ''}".strip()
            return full_name or None
        except Exception:
            raise

    @staticmethod
    def _serialize_address(address: Optional[Address]) -> Optional[dict[str, Any]]:
        try:
            if not address:
                return None
            return {
                "Id": address.Id,
                "Street": address.Street,
                "State": address.State,
                "Zipcode": address.Zipcode,
                "City": address.City,
                "Country": address.Country,
            }
        except Exception:
            raise

    @staticmethod
    def _serialize_subscriber(subscriber: Subscriber) -> dict[str, Any]:
        try:
            return {
                "Id": subscriber.Id,
                "SubscriptionPlanId": subscriber.SubscriptionPlanId,
                "SubscriptionPlanName": subscriber.subscription_plan.Name if subscriber.subscription_plan else None,
                "SubscriptionPriceId": subscriber.SubscriptionPriceId,
                "Price": subscriber.subscription_price.Price if subscriber.subscription_price else None,
                "BillingMethod": subscriber.subscription_price.BillingMethod if subscriber.subscription_price else None,
                "IsRecurring": subscriber.subscription_price.IsRecurring if subscriber.subscription_price else None,
                "StartDate": subscriber.StartDate,
                "EndDate": subscriber.EndDate,
                "StripeSubscriptionId": subscriber.StripeSubscriptionId,
                "StatusId": subscriber.StatusId,
                "StatusName": subscriber.status.Name if subscriber.status else None,
            }
        except Exception:
            raise

    def _serialize_client_with_relations(self, client: Client) -> dict[str, Any]:
        try:
            service_ids = client.account_service.ServiceIds if client.account_service and client.account_service.ServiceIds else []
            subscribers = [self._serialize_subscriber(subscriber) for subscriber in client.subscribers]

            return {
                "Id": client.Id,
                "ShortForm": client.ShortForm,
                "FileId": client.FileId,
                "Email": client.Email,
                "Phone": client.Phone,
                "OrganizationName": client.OrganizationName,
                "StripeCustomerId": client.StripeCustomerId,
                "StatusId": client.StatusId,
                "CreatedOn": client.CreatedOn,
                "CreatedBy": self._format_full_name(client.created_by_user),
                "ModifiedOn": client.ModifiedOn,
                "ModifiedBy": self._format_full_name(client.modified_by_user),
                "StatusName": client.status.Name if client.status else None,
                "LegalAddress": self._serialize_address(client.LegalAddress),
                "BillingAddress": self._serialize_address(client.BillingAddress),
                "ServiceIds": service_ids,
                "ServicesCount": len(service_ids),
                "Subscribers": subscribers,
                "SubscribersCount": len(subscribers),
            }
        except Exception:
            raise

    def validate_save_client(self, client: ClientSchema) -> tuple[bool, str]:
        try:
            validation = [
                (client.OrganizationName.strip(), "Organization Name is required"),
                (client.ShortForm.strip(), "Short Form is required"),
                (client.Email.strip(), "Email is required"),
                (client.Phone.strip(), "Phone is required"),
            ]
            for value, message in validation:
                if not value:
                    return False, message
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)