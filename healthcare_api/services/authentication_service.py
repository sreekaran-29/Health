import secrets
from datetime import datetime, timedelta, timezone
from fastapi import BackgroundTasks, Request
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from config.api_config import Config
from schemas.login_schema import LoginRequest
from helper.jwt_helper import create_access_token
from models.users_model import User
from schemas.updatepassword_schema import UpdatePasswordSchema
from utils.auditlog_util import AuditLogUtil
from utils.email_util import EmailUtil
from utils.errorlog_util import log_error
from utils.password_util import hash_password, verify_password
from schemas.email_schema import EmailSchema
from schemas.auditlog_schema import AuditLogSchema


class AuthenticationService:
    def __init__(self, db):
        self.db = db

    async def _get_user_by_email(self, email: str):
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.role))
            .where(func.lower(User.EmailAddress) == email.strip().lower())
        )
        return result.scalars().first()

    async def check_email(self, email: str, background_tasks: BackgroundTasks) -> tuple[bool, int, str]:
        try:
            if not email.strip():
                return False, 400, "Email is required"
            user = await self._get_user_by_email(email)
            if user:
                return True, 200, "The provided email address already exists."
            return False, 404, "No account found with the email address."
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="AuthenticationService.check_email", user_id="Unknown")
            return False, 500, str(e)

    async def authenticate_user(self, log: Request, login_request: LoginRequest, background_tasks: BackgroundTasks) -> tuple[bool, int, str]:
        user = None
        try:
            state, val = self.validate_login_request(login_request)
            if not state:
                return False, 400, val

            result = await self.db.execute(
                select(User).options(selectinload(User.role))
                .where(func.lower(User.EmailAddress) == login_request.username.strip().lower())
            )
            user = result.scalars().first()
            if not user:
                return False, 404, "User not found."

            if not verify_password(login_request.password, user.Password):
                return False, 401, "Login failed. Please check your credentials and try again."

            role = user.role
            additional_claims = {
                "role": role.Name if role else None,
                "is_super_admin": role.IsSuperAdmin if role else False,
                "username": f"{user.FirstName} {user.LastName}",
                "user_email": user.EmailAddress,
                "user_id": str(user.Id),
                "account_id": str(user.AccountId) if user.AccountId else None,
            }
            status, token = create_access_token(identity=Config.JWT_TOKEN_IDENTIFIER, claims=additional_claims)
            if not status:
                return False, 500, "Token creation failed."
            
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Authenticate", Event="authenticate_user", ResourceType="Login", ResourceId=user.Id,
                AccountId=user.AccountId, ActorId=user.Id, ActorType=role.Name if role else "user",
                Status="success", OldValue=None, NewValue="User authenticated successfully",
            ))
            
            return (True, 200, token) if status else (False, 500, "Token Creation Failed")
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="AuthenticationService.authenticate_user", user_id=str(user.Id) if user else "Unknown")
            return False, 500, str(e)

    async def generate_password_link(self, log: Request, email: str, background_tasks: BackgroundTasks) -> tuple[bool, int, str]:
        user = None
        try:
            if not email.strip():
                return False, 400, "Email is required"
            user = await self._get_user_by_email(email)
            if not user:
                return False, 404, "User not found."

            user.ResetToken = secrets.token_urlsafe(32)
            user.ResetTokenExpires = datetime.now(timezone.utc) + timedelta(hours=Config.RESET_PASSWORD_TOKEN_EXPIRY_HOURS)
            await self.db.commit()

            reset_url = f"{Config.FRONTEND_URL}/reset-password?token={user.ResetToken}&email={email}"
            status, result = EmailUtil.send_email(EmailSchema(
                subject="Password Reset Request",
                body=f"Click the following link to reset your password: {reset_url}",
                recipient_email=email
            ))
            if not status:
                return False, 500, f"Failed to send email: {result}"

            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Create", Event="password_reset_request", ResourceType="Login",
                ResourceId=user.Id, AccountId=user.AccountId, ActorId=user.Id, ActorType=user.role.Name if user.role else "user",
                Status="success", OldValue=None, NewValue=reset_url,
            ))

            return True, 200, "Reset link has been sent."
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="AuthenticationService.generate_password_link", user_id=str(user.Id) if user else "Unknown")
            return False, 500, str(e)

    async def check_link_validity(self, email: str, token: str, background_tasks: BackgroundTasks) -> tuple[bool, int, dict]:
        user = None
        try:
            if not email.strip():
                return False, 400, {"IsValidity": False, "Message": "Email is required."}

            result = await self.db.execute(
                select(User).where(
                    func.lower(User.EmailAddress) == email.strip().lower(),
                    User.ResetToken == token.strip()  
                )
            )
            user = result.scalars().first()
            if not user or not user.ResetTokenExpires:
                return False, 404, {"IsValidity": False, "Message": "Invalid token or email."}

            if user.ResetTokenExpires <= datetime.now(timezone.utc):
                return False, 400, {"IsValidity": True, "Message": "Token has expired."}  

            return True, 200, {"IsValidity": True, "Message": "Token is valid."}
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="AuthenticationService.check_link_validity", user_id=str(user.Id) if user else "Unknown")
            return False, 500, {"IsValidity": False, "Message": str(e)}

    async def update_password(self, log: Request, password: UpdatePasswordSchema, background_tasks: BackgroundTasks) -> tuple[bool, int, str]:
        user = None
        try:
            status, validation = self.validate_update_password_request(password)
            if not status:
                return False, 400, validation

            user = await self._get_user_by_email(password.email)
            if not user:
                return False, 404, "No account found with the email address."

            if not user.ResetToken or not secrets.compare_digest(user.ResetToken, password.token.strip()):
                return False, 400, "Invalid token."

            user.Password = hash_password(password.new_password)[1]
            user.ResetToken = None
            user.ResetTokenExpires = None
            await self.db.commit()

            return True, 200, "Password has been updated successfully."
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="AuthenticationService.update_password", user_id=str(user.Id) if user else "Unknown")
            return False, 500, str(e)

    @staticmethod
    def validate_login_request(login_request: LoginRequest) -> tuple[bool, str]:
        try:
            for value, error_message in [
                (login_request.username.strip(), "Username is required"),
                (login_request.password.strip(), "Password is required"),
            ]:
                if not value:
                    return False, error_message
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)

    @staticmethod
    def validate_update_password_request(password: UpdatePasswordSchema) -> tuple[bool, str]:
        try:
            for value, error_message in [
                (password.email.strip(), "Email is required"),
                (password.new_password.strip(), "New password is required"),
                (password.confirm_password.strip(), "Confirm password is required"),
                (password.new_password == password.confirm_password, "Passwords do not match"),
                (password.token.strip(), "Token is required"),
            ]:
                if not value:
                    return False, error_message
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)