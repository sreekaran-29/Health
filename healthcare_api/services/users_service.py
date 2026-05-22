import json
from typing import Any, Optional
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import load_only, selectinload
from models.doctors_model import Doctor
from models.roles_model import Role
from models.status_model import Status
from schemas.auditlog_schema import AuditLogSchema
from schemas.users_schema import UserSchema
from utils.errorlog_util import log_error
from utils.auditlog_util import AuditLogUtil
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from models.users_model import User
from models.clients_model import Client
from services.doctor_service import DoctorService

class UsersService:
    def __init__(self, db):
        self.db = db
        self.doctor_service = DoctorService(db)
        self.redis_client = RedisClient()

    async def _get_user_name(self, user_id):
        try:
            if not user_id:
                return None
            result = await self.db.execute(select(User).where(User.Id == user_id))
            user = result.scalars().first()
            if user:
                return f"{user.FirstName} {user.LastName}".strip()
        except Exception as ex:
            return None

    async def get_all_users(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            acc_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            cache_key = ( RedisConfig.get_all_users if supRole else f"{RedisConfig.get_all_users}_{acc_id}")
            cache_result = await self.redis_client.get(cache_key)
            if cache_result and skip:
                return True, 200, json.loads(cache_result)

            stmt = (
                select(User)
                .options(
                    load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                        User.EmailAddress,
                        User.Phone,
                        User.IsDoctor,
                        User.StatusId,
                        User.AccountId,
                        User.CreatedBy,
                        User.ModifiedBy,
                        User.CreatedOn,
                        User.ModifiedOn,
                    ),
                    selectinload(User.client).load_only(
                        Client.OrganizationName,
                    ),
                    selectinload(User.role).load_only(
                        Role.Id,
                        Role.Name,
                        Role.IsSuperAdmin,
                        Role.PermissionIds,
                    ),
                    selectinload(User.status).load_only(
                        Status.Name,
                    ),
                    selectinload(User.doctor).load_only(
                        Doctor.Id,
                        Doctor.Title,
                        Doctor.ClinicalRole,
                        Doctor.Specialty,
                        Doctor.Credential,
                        Doctor.UserId,
                    ),
                ).where(User.StatusId != 5).order_by(User.ModifiedOn.desc())
            )

            if not supRole:
                stmt = stmt.where(User.AccountId == acc_id)

            result = await self.db.execute(stmt)
            users = result.scalars().unique().all()

            active_count = 0
            inactive_count = 0
            user_data = []

            for user in users:

                status_id = user.StatusId
                if status_id == 1:
                    active_count += 1
                elif status_id == 2:
                    inactive_count += 1

                role = user.role
                status = user.status
                doctor = user.doctor

                user_data.append({
                    "Id": user.Id,
                    "ClientId": user.AccountId,
                    "ClientName": (user.client.OrganizationName if user.client else "Global User"),
                    "FirstName": user.FirstName,
                    "LastName": user.LastName,
                    "EmailAddress": user.EmailAddress,
                    "Phone": user.Phone,
                    "IsDoctor": user.IsDoctor,
                    "StatusId": user.StatusId,
                    "StatusName": ( status.Name if status else None),
                    "Role": {
                        "Id": role.Id if role else None,
                        "Name": (role.Name if role else None)
                    },
                    "Doctor": (
                        {
                            "Id": doctor.Id if doctor else None,
                            "Title": doctor.Title if doctor else None,
                            "ClinicalRole": doctor.ClinicalRole if doctor else None,
                            "Specialty": doctor.Specialty if doctor else None,
                            "Credential": doctor.Credential if doctor else None,
                            "UserId": doctor.UserId if doctor else None,
                        }
                    ),
                    "CreatedBy": await self._get_user_name(user.CreatedBy) if hasattr(user, "CreatedBy") and user.CreatedBy else None,
                    "ModifiedBy": await self._get_user_name(user.ModifiedBy) if hasattr(user, "ModifiedBy") and user.ModifiedBy else None,
                    "CreatedOn": user.CreatedOn if hasattr(user, "CreatedOn") and user.CreatedOn else None,
                    "ModifiedOn": user.ModifiedOn if hasattr(user, "ModifiedOn") and user.ModifiedOn else None,
                })
            status_summary = {
                "Total": len(users),
                "Active": sum(1 for user in users if user.status and user.StatusId == 1),
                "Inactive": sum(1 for user in users if user.status and user.StatusId == 2),
            }
            response = {
                "Users": user_data,
                "StatusSummary": status_summary
            }
            await self.redis_client.set(cache_key, json.dumps(jsonable_encoder(response)))
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in UsersService.get_all_users", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def get_user_by_id(self, user_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            acc_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            if not user_id or user_id.strip() == "":
                return False, 400, "User ID is required"

            stmt = (
                select(User)
                .where(User.Id == user_id)
                .options(
                    load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                        User.EmailAddress,
                        User.Phone,
                        User.IsDoctor,
                        User.StatusId,
                        User.AccountId,
                        User.CreatedBy,
                        User.ModifiedBy,
                        User.CreatedOn,
                        User.ModifiedOn,
                    ),
                    selectinload(User.client).load_only(
                        Client.OrganizationName,
                    ),
                    selectinload(User.role).load_only(
                        Role.Id,
                        Role.Name,
                        Role.IsSuperAdmin,
                        Role.PermissionIds,
                    ),
                    selectinload(User.status).load_only(
                        Status.Name,
                    ),
                    selectinload(User.doctor).load_only(
                        Doctor.Id,
                        Doctor.Title,
                        Doctor.ClinicalRole,
                        Doctor.Specialty,
                        Doctor.Credential,
                        Doctor.UserId,
                    ),
                ).where(User.StatusId != 5)
            )

            if not supRole:
                stmt = stmt.where(User.AccountId == acc_id)

            result = await self.db.execute(stmt)
            user = result.scalars().first()

            if not user:
                return False, 404, "User not found"

            role = user.role
            status = user.status
            doctor = user.doctor

            response = {
                "Id": user.Id,
                "ClientId": user.AccountId,
                "ClientName": (user.client.OrganizationName if user.client else "Global User"),
                "FirstName": user.FirstName,
                "LastName": user.LastName,
                "EmailAddress": user.EmailAddress,
                "Phone": user.Phone,
                "IsDoctor": user.IsDoctor,
                "StatusId": user.StatusId,
                "StatusName": ( status.Name if status else None),
                "CreatedBy": await self._get_user_name(user.CreatedBy) if hasattr(user, "CreatedBy") and user.CreatedBy else None,
                "ModifiedBy": await self._get_user_name(user.ModifiedBy) if hasattr(user, "ModifiedBy") and user.ModifiedBy else None,
                "CreatedOn": user.CreatedOn if hasattr(user, "CreatedOn") and user.CreatedOn else None,
                "ModifiedOn": user.ModifiedOn if hasattr(user, "ModifiedOn") and user.ModifiedOn else None,
                "Role": {
                    "Id": role.Id if role else None,
                    "Name": (role.Name if role else None)
                },
                "Doctor": (
                    {
                        "Id": doctor.Id if doctor else None,
                        "Title": doctor.Title if doctor else None,
                        "ClinicalRole": doctor.ClinicalRole if doctor else None,
                        "Specialty": doctor.Specialty if doctor else None,
                        "Credential": doctor.Credential if doctor else None,
                        "UserId": doctor.UserId if doctor else None,
                    }
                )
            }
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in UsersService.get_user_by_id", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def delete_user(self, log: Request, user_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            acc_id = token.get("account_id") if token else None

            if not user_id or user_id.strip() == "":
                return False, 400, "User ID is required"

            result = await self.db.execute(select(User).where(User.Id == user_id))
            user = result.scalars().first()

            if not user:
                return False, 404, "User not found"

            user.StatusId = 5
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                    Type="Delete", Event="delete_user", ResourceType="User", ResourceId=str(user_id), 
                    ActorId=token.get("user_id") if token else None, Status="success",
                    ActorType=token.get("user_id") if token else None, AccountId=acc_id, NewValue="User marked as deleted", 
                    OldValue="Active" if user.StatusId == 1 else "Inactive",
                )
            )
            return True, 200, None
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in UsersService.delete_user", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def save_user(self, log: Request, user: UserSchema, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            is_update = bool(user.Id)
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None
            old_value = None
            id = None
            docstatus = None

            if user.Type.lower() == "update" and not user.Id:
                return False, 400, "User ID is required"
            
            if not supRole and not user.AccountId:
                return False, 400, "Client ID is required"
            
            status, validation = self.validate_user(user)
            if not status:
                return False, 400, validation
            
            if not is_update:
                new_user = User(**user.model_dump(exclude={"Id", "Type", "doctor"}), CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_user)
                await self.db.flush()
                id = new_user.Id
                user.doctor.UserId = id
            else:
                result = await self.db.execute(select(User).where(User.Id == user.Id))
                existing_user = result.scalars().first()

                if not existing_user:
                    return False, 404, "User not found"

                old_value = UserSchema.model_validate(existing_user, from_attributes=True).model_dump_json()
                for key, value in user.model_dump(exclude={"Id", "Type","doctor"}).items():
                    setattr(existing_user, key, value)
                existing_user.ModifiedBy = actor_id
                id = existing_user.Id

            if user.IsDoctor and user.doctor:
                docstatus, code, result = await self.doctor_service.save_doctors(log=log, doctor=user.doctor, background_tasks=background_tasks, token=token)
                if not docstatus:
                    return False, code, result
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                    Type="Update" if is_update else "Create", Event="update_user" if is_update else "create_user",
                    ResourceType="User", ResourceId=str(id), ActorId=actor_id, Status="success", ActorType=actor_id,
                    AccountId=user.AccountId if hasattr(user, "AccountId") else None, NewValue=jsonable_encoder(user),
                    OldValue=old_value if is_update else None,
                )
            )
            return True, 200, {"Id": id,"DoctorId": result if docstatus else None}

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in UsersService.save_user", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def rebuild_cache(self, background_tasks: BackgroundTasks, token: dict, acc_id: Optional[str] = None):
        try:
            await self.get_all_users(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":None}, skip=False)
            if acc_id:
                await self.get_all_users(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":acc_id}, skip=False)  
        except Exception as e:
            return 
        
    @staticmethod
    def validate_user(user: UserSchema) -> tuple[bool, Any]:
        try:
            validation = [
                (user.FirstName, "First name is required"),
                (user.LastName, "Last name is required"),
                (user.EmailAddress, "Email address is required"),
                (user.Phone, "Phone number is required"),
                (user.RoleId, "Role ID is required"),
                (user.Type, "Type is required"),
                (user.StatusId is not None, "Status ID is required"),
            ]
            for valid, error_msg in validation:
                if not valid:
                    return False, error_msg
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)
