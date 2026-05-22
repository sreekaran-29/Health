from datetime import datetime, timedelta, timezone
import json
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from models.auditlogs_model import AuditLog
from models.clients_model import Client
from models.doctors_model import Doctor
from models.subscriptionplan_model import SubscriptionPlan
from models.users_model import User
from models.roles_model import Role
from schemas.auditlog_schema import AuditLogSchema
from config.db_config import AsyncSessionLocal
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig

redis = RedisClient()


class AuditLogUtil:
    RESOURCE_NAME_MAP = {
        "Client": (Client, Client.OrganizationName),
        "Login": (User, func.concat_ws(" ", User.FirstName, User.LastName)),
        "Subscription": (SubscriptionPlan, SubscriptionPlan.Name),
        "Role": (Role, Role.Name),
        "User": (User, func.concat_ws(" ", User.FirstName, User.LastName)),
        "Doctor": (User, func.concat_ws(" ", User.FirstName, User.LastName)),
    }

    @staticmethod
    async def auditlog(request: Request, audit_data: AuditLogSchema) -> None:
        now = audit_data.CreatedOn or datetime.now(timezone.utc)

        async with AsyncSessionLocal() as db:
            try:
                cache_key = RedisConfig.get_all_audit_logs
                resource_name = "N/A"
                resource_type = (audit_data.ResourceType or "").strip()
                mapping = AuditLogUtil.RESOURCE_NAME_MAP.get(resource_type)

                if mapping and audit_data.ResourceId is not None:
                    model, column = mapping
                    resource_name = await db.scalar(select(column).where(model.Id == audit_data.ResourceId).limit(1)) or "N/A"

                action = (audit_data.Type or audit_data.Event or "activity").upper()
                metadata = dict(audit_data.Metadata or {})
                metadata.update({
                    "status": audit_data.Status,
                    "ip_address": request.client.host if request and request.client else None,
                    "description": f"{action} {(audit_data.ResourceType or 'resource').upper()}: {resource_name}",
                    "user_agent": request.headers.get("user-agent") if request else "N/A",
                    "timestamp": now.isoformat(),
                    "actor_role": audit_data.ActorType.upper() if audit_data.ActorType else "N/A",
                    "old_value": audit_data.OldValue,
                    "new_value": audit_data.NewValue,
                })

                db.add(
                    AuditLog(
                        AccountId=audit_data.AccountId,
                        Event=audit_data.Event,
                        ActorId=audit_data.ActorId,
                        ActorType=audit_data.ActorType.upper() if audit_data.ActorType else "N/A",
                        ResourceType=audit_data.ResourceType,
                        ResourceId=str(audit_data.ResourceId) if audit_data.ResourceId is not None else None,
                        Metadata=jsonable_encoder(metadata),
                        CreatedOn=now,
                    )
                )
                await db.commit()

                stmt = (
                    select(
                        AuditLog.Id,
                        AuditLog.AccountId,
                        AuditLog.Event,
                        AuditLog.ActorId,
                        AuditLog.ActorType,
                        AuditLog.ResourceId,
                        AuditLog.ResourceType,
                        AuditLog.Metadata,
                        AuditLog.CreatedOn,
                        func.concat_ws(" ", User.FirstName, User.LastName).label("UserName"),
                        Role.Name.label("RoleName")
                    )
                    .outerjoin(User, AuditLog.ActorId == User.Id)
                    .outerjoin(Role, User.RoleId == Role.Id)
                    .order_by(AuditLog.CreatedOn.desc())
                )
                result = await db.execute(stmt)
                logs = result.mappings().all()

                cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                response = {
                    "TotalCount": len(logs),
                    "Last24HoursCount": sum(1 for log in logs if log["CreatedOn"] and log["CreatedOn"] >= cutoff),
                    "Logs": logs,
                }
                await redis.set(cache_key, json.dumps(jsonable_encoder(response)))

            except Exception as e:
                await db.rollback()
                print(f"[AuditLogUtil] Error: {e}")
                raise 