import json

from fastapi import APIRouter, HTTPException, Depends,BackgroundTasks, Request
import stripe
from config.api_config import Config
from dependencies.service_factory import get_service
from services.client_service import ClientService
from services.subscription_service import SubscriptionService
from utils.errorlog_util import log_error
from helper.jwt_helper import verify_user
from schemas.response_model_schema import ResponseModel
from schemas.subscriptionplan_schema import SubscriptionPlanSchema, SubscriberPaymentLink

router = APIRouter()

@router.post("/createSubscription", response_model=ResponseModel)
async def create_subscription(log:Request, subscription: SubscriptionPlanSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.create_subscription(log = log, subscription = subscription, background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message=f"Subscription {subscription.Type}d successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.create_subscription", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/getAllSubscriptions", response_model=ResponseModel)
async def get_all_subscriptions(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_all_subscriptions(background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscriptions retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_all_subscriptions", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/getSubscriptionById/{subscription_id}", response_model=ResponseModel)
async def get_subscription_by_id(subscription_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_subscription_by_id(subscription_id=subscription_id, background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscription retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_subscription_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )
    
@router.get("/deleteSubscription/{subscription_id}", response_model=ResponseModel)
async def delete_subscription(log:Request, subscription_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.delete_subscription(log=log, subscription_id=subscription_id, background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscription deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.delete_subscription", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/getAllSubscribers", response_model=ResponseModel)
async def get_all_subscribers(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_all_subscribers(background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscribers retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_all_subscribers", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/getSubscriberById/{subscriber_id}", response_model=ResponseModel)
async def get_subscriber_by_id(subscriber_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_subscriber_by_id(subscriber_id=subscriber_id, background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscriber retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_subscriber_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.post("/createPaymentLink", response_model=ResponseModel)
async def create_payment_link(log:Request, payment_link_data: SubscriberPaymentLink, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), client_service: ClientService = Depends(get_service(ClientService)), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.create_payment_link(log=log, payment_link_data=payment_link_data, background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Payment link created successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.create_payment_link", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )
    
@router.post("/stripeWebhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks, service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        event = stripe.Webhook.construct_event(payload, sig_header, Config.STRIPE_WEBHOOK_SECRET)

        event = json.loads(payload)
        event_type = event["type"]
        data = event["data"]["object"] 

        await service.handle_stripe_event(background_tasks=background_tasks, event_type=event_type, data=data)

        return "Webhook received"
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.stripe_webhook", user_id=None)
        return "Error processing webhook : "+str(e)
    
@router.get("/getAllPlanPrices", response_model=ResponseModel)
async def get_all_plan_prices(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_all_plan_prices(background_tasks = background_tasks, token = token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Plan prices retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_all_plan_prices", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/getAllTransactionDetails/{subscriber_id}/{account_id}", response_model=ResponseModel)
async def get_all_transaction_details(subscriber_id: str, account_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.get_all_transaction_details(subscriber_id=subscriber_id, background_tasks = background_tasks, token = token, account_id=account_id)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Transaction details retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.get_all_transaction_details", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/downloadInvoice/{file_id}", response_model=ResponseModel)
async def download_invoice(log:Request, file_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.download_invoice(file_id=file_id, background_tasks = background_tasks, token = token, log=log)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Invoice downloaded successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.download_invoice", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )

@router.get("/cancelSubscription/{subscriber_id}", response_model=ResponseModel)
async def cancel_subscription(log:Request, subscriber_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: SubscriptionService = Depends(get_service(SubscriptionService))):
    try:
        state, token = auth
        if not state:
            return ResponseModel(
                data=None,
                status="Unauthorized",
                status_code=401,
                is_success=False,
                message=token
            )
        token = dict(token)
        status, code, result = await service.cancel_subscription(subscriber_id=subscriber_id, background_tasks = background_tasks, token = token, log=log)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Subscription cancelled successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
         )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in SubscriptionController.cancel_subscription", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
         )