import base64
import mimetypes
from datetime import datetime, timedelta, timezone
import json
from typing import Any, Optional, Union
import uuid
from fastapi import BackgroundTasks, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select, or_
from sqlalchemy.orm import aliased, selectinload
from utils.errorlog_util import log_error
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from models.auditlogs_model import AuditLog
from models.users_model import User
from models.roles_model import Role

redis_cache = RedisClient() 

class AuditLogsService:
    def __init__(self, db):
        self.db = db

    async def get_all_logs(self, background_tasks: BackgroundTasks, token: dict):
        try:
            cache_key = RedisConfig.get_all_audit_logs
            cached_data = await redis_cache.get(cache_key)
            if cached_data:
                payload = json.loads(cached_data)
                return True, 200, payload
            
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
            result = await self.db.execute(stmt)
            logs = result.mappings().all()

            if not logs:
                return False, 404, "No audit logs found"

            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            response = {
                "TotalCount": len(logs),
                "Last24HoursCount": sum(1 for log in logs if log["CreatedOn"] and log["CreatedOn"] >= cutoff),
                "Logs": logs,
            }
            
            await redis_cache.set(cache_key, json.dumps(jsonable_encoder(response)))
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in AuditLogsService.get_all_logs", user_id=token.get("user_id"))
            return False, 500, str(e)
        
    async def get_audit_by_id(self, audit_id: int, background_tasks: BackgroundTasks, token: dict):
        try:
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
                .where(AuditLog.Id == audit_id)
            )
            result = await self.db.execute(stmt)
            log = result.mappings().first()
            if log:
                return True, 200, log
            return False, 404, "Audit log not found"
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in AuditLogsService.get_audit_by_id", user_id=token.get("user_id"))
            return False, 500, str(e)






