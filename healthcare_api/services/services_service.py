import json
from typing import Any, Optional
from schemas.auditlog_schema import AuditLogSchema
from utils.errorlog_util import log_error
from utils.auditlog_util import AuditLogUtil
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import aliased, load_only, selectinload
from models.services_model import Service
from models.status_model import Status
from models.users_model import User
from models.clients_model import Client
from schemas.services_schema import ServiceSchema

class ServicesService:
    def __init__(self, db):
        self.db = db
        self.redis_cache = RedisClient()

    async def get_all_services(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            account_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            cache_key = (RedisConfig.get_all_Services if supRole else f"{RedisConfig.get_all_Services}_{account_id}")
            if skip:
                cache_result = await self.redis_cache.get(cache_key)
                if cache_result:
                    return True, 200, json.loads(cache_result)

            services_query = (
                select(Service)
                .options(
                    selectinload(Service.status).load_only(Status.Name),
                    selectinload(Service.created_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Service.modified_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Service.client).load_only(Client.OrganizationName)
                ).order_by(Service.ModifiedOn.desc()).where(Service.StatusId != 5)
            )
            result = await self.db.execute(services_query)
            services = result.scalars().all()

            if not services:
                return False, 404, "No services found"

            services_data = []
            active_count = 0
            inactive_count = 0

            for service in services:
                status_name = service.status.Name if service.status else None
                if service.StatusId == 1:
                    active_count += 1
                else:
                    inactive_count += 1

                services_data.append({
                    "Id": str(service.Id),
                    "Name": service.Name,
                    "EstimatedServiceTime": service.EstimatedServiceTime,
                    "Status": status_name,
                    "CreatedOn": service.CreatedOn.isoformat(),
                    "CreatedBy": f"{service.created_by_user.FirstName} {service.created_by_user.LastName}" if service.created_by_user else None,
                    "ModifiedOn": service.ModifiedOn.isoformat() if service.ModifiedOn else None,
                    "ModifiedBy": f"{service.modified_by_user.FirstName} {service.modified_by_user.LastName}" if service.modified_by_user else None,
                    "Description": service.Description,
                    "Client": service.client.OrganizationName if service.client else None,
                    "ClientId": str(service.AccountId) if service.AccountId else None
                })

            summary = {
                "TotalServices": len(services_data),
                "ActiveServices": active_count,
                "InactiveServices": inactive_count,
                "Services": services_data
            }

            await self.redis_cache.set(cache_key, json.dumps(summary))  
            return True, 200, summary
        
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ServicesService.get_all_services", user_id=token.get("user_id"))
            return False, 500, str(e)
        
    async def get_service_by_id(self, background_tasks: BackgroundTasks, token: dict, service_id: str) -> tuple[bool, int, Any]:
        try:
            if not service_id:
                return False, 400, "Service ID is required"
            
            service_query = (
                select(Service)
                .where(Service.Id == service_id, Service.StatusId != 5)
                .options(
                    selectinload(Service.status).load_only(Status.Name),
                    selectinload(Service.created_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Service.modified_by_user).load_only(User.FirstName, User.LastName),
                    selectinload(Service.client).load_only(Client.OrganizationName)
                )
            )
            result = await self.db.execute(service_query)
            service = result.scalar_one_or_none()

            if not service:
                return False, 404, "Service not found"

            service_data = {
                "Id": str(service.Id),
                "Name": service.Name,
                "EstimatedServiceTime": service.EstimatedServiceTime,
                "Status": service.status.Name if service.status else None,
                "CreatedOn": service.CreatedOn.isoformat(),
                "CreatedBy": f"{service.created_by_user.FirstName} {service.created_by_user.LastName}" if service.created_by_user else None,
                "ModifiedOn": service.ModifiedOn.isoformat() if service.ModifiedOn else None,
                "ModifiedBy": f"{service.modified_by_user.FirstName} {service.modified_by_user.LastName}" if service.modified_by_user else None,
                "Description": service.Description,
                "Client": service.client.OrganizationName if service.client else None,
                "ClientId": str(service.AccountId) if service.AccountId else None
            }

            return True, 200, service_data

        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ServicesService.get_service_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)
        
    async def delete_service_by_id(self, background_tasks: BackgroundTasks, token: dict, service_id: str) -> tuple[bool, int, Any]:
        try:
            acc_id = token.get("account_id") if token else None
            if not service_id:
                return False, 400, "Service ID is required"
            
            service_query = select(Service).where(Service.Id == service_id)
            result = await self.db.execute(service_query)
            service = result.scalar_one_or_none()

            if not service:
                return False, 404, "Service not found"

            service.StatusId = 5
            await self.db.commit()

            await self.rebuild_cache(background_tasks=background_tasks, token=token, account_id=service.AccountId if service else acc_id)

            return True, 200, "Service deleted successfully"

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in ServicesService.delete_service_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def save_service(self, log: Request, background_tasks: BackgroundTasks, token: dict, service_data: ServiceSchema) -> tuple[bool, int, Any]:
        try:
            is_update = bool(service_data.Id)
            acc_id = token.get("account_id") if token else None
            actor_id = token.get("user_id") if token else None
            supRole = token.get("is_super_admin") if token else None
            old_value = None
            id = None

            if service_data.Type.lower() =="update" and not service_data.Id:
                return False, 400, "Service ID is required"
            
            if not supRole and service_data.AccountId :
                return False, 400, "Client Id is required"
            
            status, validation = self.validate_service(service_data)
            if not status:
                return False, 400, validation

            ser_data = service_data.model_dump(exclude={"Id", "Type"}, exclude_unset=True, exclude_none=True)

            if not is_update:
                new_service = Service(**ser_data, CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_service)
                await self.db.commit()
                id = new_service.Id
            else:
                service_query = select(Service).where(Service.Id == service_data.Id)
                result = await self.db.execute(service_query)
                service = result.scalar_one_or_none()

                if not service:
                    return False, 404, "Service not found"

                old_value = ServiceSchema.model_validate(service).model_dump_json()

                for key, value in ser_data.items():
                    setattr(service, key, value)
                service.ModifiedBy = actor_id
                id = service.Id
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, account_id=service_data.AccountId if service_data.AccountId else acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_service" if is_update else "create_service", AccountId=service_data.AccountId if service_data.AccountId else acc_id,
                ResourceType="Service", ResourceId=str(id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None,
                OldValue=json.dumps(old_value) if old_value else None, NewValue=jsonable_encoder(service_data)
            ))
            return True, 200, "Service updated successfully" if is_update else "Service created successfully"
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in ServicesService.save_service", user_id=token.get("user_id"))
            return False, 500, str(e)

    async def rebuild_cache(self, background_tasks: BackgroundTasks, token: dict, account_id: Optional[str] = None):
        try:
            await self.get_all_services(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":None}, skip=False)
            if account_id:
                await self.get_all_services(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":account_id}, skip=False)
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in ServicesService.rebuild_cache", user_id=token.get("user_id"))

    @staticmethod
    def validate_service(service_data: ServiceSchema) -> tuple[bool, Any]:
        try:
            validation = [
                (service_data.Name, "Name is required"),
                (service_data.AccountId, "Client ID is required"),
                (service_data.EstimatedServiceTime, "Estimated service time is required"),
                (service_data.Description, "Description is required"),
                (service_data.StatusId, "Status ID is required"),
                (service_data.Type, "Type is required")
            ]
            for field, message in validation:
                if not field:
                    return False, message
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)

    