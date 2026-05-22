import json
from typing import Any, Optional
from unittest import skip
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import aliased, load_only, selectinload
from models.roles_model import Role
from models.permissions_model import Permission
from models.status_model import Status
from models.users_model import User
from models.clients_model import Client
from models.accountservices_model import AccountServices
from schemas.auditlog_schema import AuditLogSchema
from utils.errorlog_util import log_error
from utils.auditlog_util import AuditLogUtil
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from schemas.role_schema import RoleSchema

class RolesService:
    def __init__(self, db):
        self.db = db
        self.redis_cache = RedisClient()

    async def get_all_roles(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Optional[Any]]:
        try:
            account_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            cache_key = (RedisConfig.get_all_roles if supRole else f"{RedisConfig.get_all_roles}_{account_id}")
            if skip:
                cache_result = await self.redis_cache.get(cache_key)
                if cache_result:
                    return True, 200, json.loads(cache_result)

            created_by = aliased(User)
            modified_by = aliased(User)

            stmt = (
                select(
                    Role.Id,
                    Role.AccountId,
                    Role.Name,
                    Role.Description,
                    Role.PermissionIds,
                    Role.IsSuperAdmin,
                    Role.StatusId,
                    Role.CreatedOn,
                    Role.ModifiedOn,
                    Status.Name.label("StatusName"),
                    Client.OrganizationName.label("AccountName"),
                    created_by.FirstName.label("CreatedByFirst"),
                    created_by.LastName.label("CreatedByLast"),
                    modified_by.FirstName.label("ModifiedByFirst"),
                    modified_by.LastName.label("ModifiedByLast"),
                )
                .outerjoin(Status, Status.Id == Role.StatusId)
                .outerjoin(Client, Client.Id == Role.AccountId)
                .outerjoin(created_by,created_by.Id == Role.CreatedBy)
                .outerjoin(modified_by,modified_by.Id == Role.ModifiedBy)
                .where(Role.StatusId != 5)
                .order_by(Role.ModifiedOn.desc())
            )

            if account_id:
                stmt = stmt.where(Role.AccountId == uuid.UUID(account_id))

            result = await self.db.execute(stmt)
            roles = result.mappings().all()


            permission_ids = { pid for role in roles for pid in (role.PermissionIds or []) if pid}
            permissions_map = {}

            if permission_ids:
                perm_stmt = (
                    select(
                        Permission.Id,
                        Permission.Name,
                        Permission.Code,
                        Permission.Description,
                    )
                    .where(Permission.Id.in_(permission_ids))
                )
                perm_result = await self.db.execute(perm_stmt)
                permissions_map = {
                    p.Id: {
                        "Id": str(p.Id),
                        "Name": p.Name,
                        "Code": p.Code,
                        "Description": p.Description,
                    }
                    for p in perm_result.all()
                }
            active_count = 0
            inactive_count = 0
            roles_data = []

            for role in roles:
                role_permission_ids = role.PermissionIds or []
                permissions = [ permissions_map[pid] for pid in role_permission_ids if pid in permissions_map]

                if role.StatusId == 1:
                    active_count += 1
                elif role.StatusId == 2:
                    inactive_count += 1

                roles_data.append({
                    "Id": str(role.Id),
                    "AccountId": (str(role.AccountId) if role.AccountId else None),
                    "AccountName": (role.AccountName or "Global Role" ),
                    "Name": role.Name,
                    "Description": role.Description,
                    "PermissionIds": [str(pid) for pid in role_permission_ids ],
                    "PermissionsCount": len(permissions),
                    "IsSuperAdmin": role.IsSuperAdmin,
                    "StatusId": role.StatusId,
                    "Status": role.StatusName,
                    "CreatedOn": (role.CreatedOn if role.CreatedOn else None ),
                    "CreatedBy": ( f"{role.CreatedByFirst or ''} " f"{role.CreatedByLast or ''}").strip() or None,
                    "ModifiedOn": ( role.ModifiedOn if role.ModifiedOn else None ),
                    "ModifiedBy": ( f"{role.ModifiedByFirst or ''} " f"{role.ModifiedByLast or ''}" ).strip() or None,
                    "Permissions": permissions,
                })

            response_data = {
                "Roles": roles_data,
                "StatusSummary": {
                    "Total": len(roles_data),
                    "Active": active_count,
                    "Inactive": inactive_count,
                },
            }

            await self.redis_cache.set(cache_key, json.dumps(jsonable_encoder(response_data)))
            return True, 200, response_data
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.get_all_roles", user_id=token.get("user_id"))
            return False, 500, str(e)
        
    async def get_role_by_id(self, role_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Optional[Any]]:
        try:
            if not role_id:
                return False, 400, "Role ID is required"
            
            stmt = (
                select(Role)
                .options(
                    load_only(
                        Role.Id,
                        Role.AccountId,
                        Role.Name,
                        Role.Description,
                        Role.PermissionIds,
                        Role.IsSuperAdmin,
                        Role.StatusId,
                        Role.CreatedOn,
                        Role.CreatedBy,
                        Role.ModifiedOn,
                        Role.ModifiedBy,
                    ),
                    selectinload(Role.created_by_user).load_only(
                        User.Id, User.FirstName, User.LastName
                    ),
                    selectinload(Role.modified_by_user).load_only(
                        User.Id, User.FirstName, User.LastName
                    ),
                    selectinload(Role.status).load_only(
                        Status.Id, Status.Code, Status.Name
                    ),
                    selectinload(Role.client).load_only(
                        Client.Id, Client.OrganizationName
                    ),
                )
                .where(Role.Id == uuid.UUID(role_id), Role.StatusId != 5)
            )

            result = await self.db.execute(stmt)
            role = result.scalar_one_or_none()

            if not role:
                return False, 404, "Role not found"

            permissions = []
            if role.PermissionIds:
                perm_stmt = (
                    select(Permission)
                    .options(
                        load_only(
                            Permission.Id,
                            Permission.Name,
                            Permission.Code,
                            Permission.Description,
                        )
                    )
                    .where(Permission.Id.in_(role.PermissionIds))
                )
                perm_result = await self.db.execute(perm_stmt)
                permissions = perm_result.scalars().all()

            role_data = {
                "Id": str(role.Id),
                "AccountId": str(role.AccountId) if role.AccountId else None,
                "AccountName": role.client.OrganizationName if role.client else "Global Role",
                "Name": role.Name,
                "Description": role.Description,
                "PermissionIds": [str(pid) for pid in (role.PermissionIds or [])],
                "IsSuperAdmin": role.IsSuperAdmin,
                "StatusId": role.StatusId,
                "Status": role.status.Name if role.status else None,
                "CreatedOn": role.CreatedOn.isoformat() if role.CreatedOn else None,
                "CreatedBy": (
                    f"{role.created_by_user.FirstName} {role.created_by_user.LastName}"
                    if role.created_by_user
                    else None
                ),
                "ModifiedOn": role.ModifiedOn.isoformat() if role.ModifiedOn else None,
                "ModifiedBy": (
                    f"{role.modified_by_user.FirstName} {role.modified_by_user.LastName}"
                    if role.modified_by_user
                    else None
                ),
                "Permissions": [
                    {
                        "Id": str(permission.Id),
                        "Name": permission.Name,    
                        "Code": permission.Code,
                        "Description": permission.Description
                    } for permission in permissions
                ]
            }

            return True, 200, role_data
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.get_role_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)
        
    async def save_role(self, role: RoleSchema, background_tasks: BackgroundTasks, token: dict, log: Request) -> tuple[bool, int, Optional[Any]]:
        try:
            is_update = bool(role.Id)
            acc_id = token.get("account_id") if token else None
            actor_id = uuid.UUID(token.get("user_id")) if token.get("user_id") else None
            supRole = token.get("is_super_admin") if token.get("is_super_admin") else None
            old_value = None
            id = None

            if role.Type.lower() == "update" and not is_update:
                return False, 400, "Role ID is required"
            
            if not supRole and not role.AccountId :
                return False, 400, "AccountId is required"
            
            status, validation_msg = self.role_validation(role)
            if not status:
                return False, 400, validation_msg
            
            role_data = role.model_dump(exclude={"Id", "Type"}, exclude_unset=True, exclude_none=True)
            
            if not is_update:
                new_role = Role(**role_data, CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_role)
                await self.db.flush()
                id = new_role.Id
            else:
                ex_role = await self.db.scalar(select(Role).where(Role.Id == role.Id))
                if not ex_role:
                    return False, 404, "Role not found"
                id = ex_role.Id
                old_value = RoleSchema.model_validate(ex_role).model_dump_json()

                for key, value in role_data.items():
                    setattr(ex_role, key, value)
                ex_role.ModifiedBy = actor_id
            
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)

            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_role" if is_update else "create_role", ResourceType="Role", 
                ResourceId=id, AccountId=acc_id, ActorId=actor_id, ActorType=token.get("role") if token else None,
                Status="success", OldValue=old_value if is_update else None, NewValue=jsonable_encoder(role),
            ))

            return True, 200, id

        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.save_role", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)
    
    async def get_all_permissions(self, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Optional[Any]]:
        try:
            acc_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            stmt = (
                select(Permission)
                .options(
                    load_only(
                        Permission.Id,
                        Permission.Name,
                        Permission.Code,
                        Permission.Description,
                        Permission.ApplicationServiceId,
                    )
                )
                .order_by(Permission.Name.asc())
            )

            if acc_id and not supRole:
                svc_stmt = select(AccountServices.ServiceIds).where(AccountServices.AccountId == uuid.UUID(acc_id))
                svc_result = await self.db.execute(svc_stmt)
                service_id_rows = svc_result.scalars().all()
                service_ids = {sid for row in service_id_rows for sid in (row or [])}

                if not service_ids:
                    return True, 200, []

                stmt = stmt.where(
                    Permission.ApplicationServiceId.in_(service_ids),
                    Permission.Code.notin_(["CLIENT_LIST", "CONFIG_LIST", "CONFIG_CREATE", "CONFIG_DELETE"]),
                )

            result = await self.db.execute(stmt)
            permissions = result.scalars().all()

            permissions_data = [
                {
                    "Id": str(permission.Id),
                    "Name": permission.Name,
                    "Code": permission.Code,
                    "Description": permission.Description,
                }
                for permission in permissions
            ]

            return True, 200, permissions_data
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.get_all_permissions", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def delete_role(self, role_id: str, background_tasks: BackgroundTasks, token: dict, log: Request) -> tuple[bool, int, Optional[Any]]:
        try:
            if not role_id:
                return False, 400, "Role ID is required"
            
            actor_id = uuid.UUID(token.get("user_id")) if token else None
            acc_id = token.get("account_id") if token else None

            role = await self.db.scalar(select(Role).where(Role.Id == uuid.UUID(role_id)))
            if not role:
                return False, 404, "Role not found"

            old_value = jsonable_encoder(role)

            role.StatusId = 5
            await self.db.commit()

            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Delete", Event="delete_role", ResourceType="Role", ResourceId=role.Id, AccountId=role.AccountId, ActorId=actor_id, 
                ActorType=token.get("role") if token else None, Status="success", OldValue=old_value, NewValue="Role Deleted Successfully",
            ))

            return True, 200, "Role deleted successfully"
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.delete_role", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def get_roles_names(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Optional[Any]]:
        try:
            account_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            cache_result = await self.redis_cache.get(RedisConfig.get_roles_names if supRole else f"{RedisConfig.get_roles_names}_{account_id}")
            if cache_result and skip:
                cached_data = json.loads(cache_result)
                return True, 200, cached_data 

            stmt = select(Role.Id, Role.Name).where(Role.StatusId == 1, Role.AccountId == None)

            if account_id and not supRole:
                stmt = stmt.where(Role.AccountId == uuid.UUID(account_id))

            result = await self.db.execute(stmt)
            roles = result.all()

            roles_data = [{"Id": str(role.Id), "Name": role.Name} for role in roles]

            return True, 200, roles_data
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in RolesService.get_roles_names", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def rebuild_cache(self, background_tasks: BackgroundTasks, token: dict, acc_id: Optional[str] = None):
        try:
            await self.get_all_roles(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":None}, skip=False)
            if acc_id:
                await self.get_all_roles(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":acc_id}, skip=False)
        except Exception as e:
            return
    
    @staticmethod
    def role_validation(role:RoleSchema) -> tuple[bool, Optional[str]]:
        try:
            validation = [
                (role.Name.strip(), "Role name is required"),
                (role.Description.strip(), "Role description is required"),
                (role.PermissionIds is not None and len(role.PermissionIds) > 0, "At least one permission must be assigned to the role"),
                (role.StatusId, "StatusId is required"),
                (role.Type, "Type is required"),
            ]
            for valid, error_msg in validation:
                if not valid:
                    return False, error_msg
            return True, "Validation successful"
        except Exception as e:
            return False, str(e)