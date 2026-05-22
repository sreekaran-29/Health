# Author : Sree Karan H
from time import time
from typing import Any
from fastapi import BackgroundTasks
import stripe
from utils.errorlog_util import log_error
from config.api_config import Config

stripe.api_key = Config.STRIPE_API_KEY
stripe.verify_ssl_certs = False

class StripeHelper:
    @staticmethod
    def create_customer(email: str, name: str) -> tuple[bool, Any]:
        try:
            if not email or not name:
                return False, "Email and Name are required."
            result = stripe.Customer.create(
                email=email,
                name=name
            )
            return True, result.id
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def get_customer(customer_id: str) -> tuple[bool, Any]:
        try:
            if not customer_id:
                return False, "Customer ID is required."
            result = stripe.Customer.retrieve(customer_id)
            return True, result
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def update_customer(customer_id: str, email: str = None, name: str = None) -> tuple[bool, Any]:
        try:
            if not customer_id:
                return False, "Customer ID is required."
            update_data = {}
            if email:
                update_data["email"] = email
            if name:
                update_data["name"] = name
            result = stripe.Customer.modify(
                customer_id,
                **update_data
            )
            return True, result
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def create_subscription_plan(name : str, description: str) -> tuple[bool, Any]:
        try:
            product = stripe.Product.create(name=name, description=description)
            return True,product.id
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def update_subscription_plan(plan_id : str, name : str, description: str) -> tuple[bool, Any]:
        try:
            product = stripe.Product.modify(
                plan_id,
                name=name,
                description=description
            )
            return True,product.id
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def delete_subscription_plan(plan_id: str) -> tuple[bool, Any]:
        try:
            product = stripe.Product.modify(
                plan_id,
                active=False
            )
            return True, product.id
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def create_price(unit_amount: int, recurring: bool, product: str,billing_method: str) -> tuple[bool, Any]:
        try:
            price_data = {
                "unit_amount": int(unit_amount*100),
                "currency": "usd",
                "product": product
            }
            if recurring:
                price_data["recurring"] = {"interval": billing_method} if recurring else None
            price = stripe.Price.create(**price_data)
            return True, price.id
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def get_price(price_id: str) -> tuple[bool, Any]:
        try:
            price = stripe.Price.retrieve(price_id)
            return True, price
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def create_payment_link(price_id:str, customer_id:str, account_id:str, subs_id:str) -> tuple[bool, Any]:
        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                # discounts=[{"coupon": coupon_id}] if coupon_id else [],
                line_items=[
                    {
                        "price": price_id,
                        "quantity": 1,
                    }
                ],
                success_url=f"{Config.FRONTEND_URL}/Subscription/SubscriptionConfirmation",
                cancel_url=f"{Config.FRONTEND_URL}/Subscription/SubscriptionCancelled",
                payment_method_types=["card"],
                customer=customer_id if customer_id else None,
                metadata={
                    "account_id": account_id,
                    "subscriber_id": subs_id
                },
                subscription_data={
                    "metadata": {
                        "account_id": account_id,
                        "subscriber_id": subs_id
                    }
                },
            )
            return True, session
        
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def retrieve_invoice(invoice_id: str) -> tuple[bool, Any]:
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return True, invoice
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def retrieve_subscription(subscription_id: str) -> tuple[bool, Any]:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return True, subscription
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def cancel_subscription(subscription_id: str) -> tuple[bool, Any]:
        try:
            subscription = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
            return True, subscription
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def retrieve_charge(charge_id: str) -> tuple[bool, Any]:
        try:
            charge = stripe.Charge.retrieve(charge_id)
            return True, charge
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def retrieve_payment_intent(payment_intent_id: str) -> tuple[bool, Any]:
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id, expand=['payment_method'])
            return True, payment_intent
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def cancel_users_subscription(subscription_id: str) -> tuple[bool, Any]:
        try:
           subscription = stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
           return True, subscription
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def create_coupon(name: str, percent_off: int, duration: str) -> tuple[bool, Any]:
        try:
            coupon = stripe.Coupon.create(
                name=name,
                percent_off=percent_off,
                duration=duration
            )
            return True, coupon.id
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def update_coupon(coupon_id: str, name: str) -> tuple[bool, Any]:
        try:
            coupon = stripe.Coupon.modify(
                coupon_id,
                name=name
            )
            return True, coupon.id
        except Exception as e:
            return False, str(e)
        
    @staticmethod
    def delete_coupon(coupon_id: str) -> tuple[bool, Any]:
        try:
            coupon = stripe.Coupon.delete(coupon_id)
            return True, coupon.id
        except Exception as e:
            return False, str(e)