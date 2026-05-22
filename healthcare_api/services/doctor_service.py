import json
from typing import Any, Optional
import uuid
from fastapi import BackgroundTasks, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import load_only, selectinload
from models.clients_model import Client
from models.doctorschedules_model import DoctorSchedule
from models.doctorsdaysoff_model import DoctorDayOff
from utils.errorlog_util import log_error
from schemas.auditlog_schema import AuditLogSchema
from utils.auditlog_util import AuditLogUtil
from utils.redis_util import RedisClient
from config.redis_config import RedisConfig
from schemas.doctor_schema import DoctorSchema, DoctorScheduleSchema, DoctorDayOffSchema
from models.doctors_model import Doctor
from models.status_model import Status
from models.users_model import User
from enum import IntEnum
from datetime import datetime, timedelta, time

class DayOfWeek(IntEnum):
    SUNDAY = 0
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6


class DoctorService:
    def __init__(self, db):
        self.db = db
        self.redis_cache = RedisClient()

    async def get_all_doctors(self, background_tasks: BackgroundTasks, token: dict, skip: bool = True) -> tuple[bool, int, Any]:
        try:
            account_id = token.get("account_id") if token else None
            supRole = token.get("is_super_admin") if token else None

            cache_key = (RedisConfig.get_all_doctors if supRole else f"{RedisConfig.get_all_doctors}_{account_id}")
            cache_result = await self.redis_cache.get(cache_key)
            if cache_result and skip:
                return True, 200, json.loads(cache_result)

            stmt = (
                select(Doctor)
                .options(
                    load_only(
                        Doctor.Id,
                        Doctor.UserId,
                        Doctor.Title,
                        Doctor.ClinicalRole,
                        Doctor.Specialty,
                        Doctor.Credential,
                        Doctor.CreatedBy,
                        Doctor.ModifiedBy,
                        Doctor.CreatedOn,
                        Doctor.ModifiedOn,
                    ),
                    selectinload(Doctor.user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                        User.EmailAddress,
                        User.Phone,
                        User.IsDoctor,
                        User.StatusId,
                        User.AccountId,
                    )
                    .selectinload(User.client)
                    .load_only(
                        Client.Id,
                        Client.OrganizationName,
                    ),
                    selectinload(Doctor.created_by_user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                    selectinload(Doctor.modified_by_user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                    # selectinload(Doctor.schedules)
                    # .load_only(
                    #     DoctorSchedule.Id,
                    #     DoctorSchedule.Date,
                    #     DoctorSchedule.StartTime,
                    #     DoctorSchedule.EndTime,
                    #     DoctorSchedule.StatusId,
                    #     DoctorSchedule.DayOfWeek,
                    # ),
                    # selectinload(Doctor.days_off)
                    # .load_only(
                    #     DoctorDayOff.Id,
                    #     DoctorDayOff.StartDate,
                    #     DoctorDayOff.EndDate,
                    #     DoctorDayOff.StartTime,
                    #     DoctorDayOff.EndTime,
                    #     DoctorDayOff.IsAllDay,
                    #     DoctorDayOff.StatusId,
                    #     DoctorDayOff.Reason,
                    # ),
                )
                .where(Doctor.user.has(User.StatusId != 5))
            )

            if not supRole:
                stmt = stmt.where(Doctor.user.has(User.AccountId == account_id))

            result = await self.db.execute(stmt)
            doctors = result.scalars().unique().all()

            if not doctors:
                return False, 404, "No doctors found"

            response = []
            active_count = 0
            inactive_count = 0

            for doctor in doctors:
                user = doctor.user
                if user and user.StatusId == 1:
                    active_count += 1
                else:
                    inactive_count += 1

                created_by_name = ( f"{doctor.created_by_user.FirstName} " f"{doctor.created_by_user.LastName}" if doctor.created_by_user else None)
                modified_by_name = ( f"{doctor.modified_by_user.FirstName} " f"{doctor.modified_by_user.LastName}" if doctor.modified_by_user else None)
                # schedules = [
                #     {
                #         "Id": s.Id,
                #         "Date": s.Date,
                #         "StartTime": s.StartTime,
                #         "EndTime": s.EndTime,
                #         "StatusId": s.StatusId,
                #         "DayOfWeek": s.DayOfWeek,
                #     }
                #     for s in (doctor.schedules or [])
                # ]
                # days_off = [
                #     {
                #         "Id": d.Id,
                #         "StartDate": d.StartDate,
                #         "EndDate": d.EndDate,
                #         "StartTime": d.StartTime,
                #         "EndTime": d.EndTime,
                #         "IsAllDay": d.IsAllDay,
                #         "StatusId": d.StatusId,
                #         "Reason": d.Reason,
                #     }
                #     for d in (doctor.days_off or [])
                # ]   
                response.append({
                    "Id": doctor.Id,
                    "UserId": doctor.UserId,
                    "Title": doctor.Title,
                    "ClinicalRole": doctor.ClinicalRole,
                    "Specialty": doctor.Specialty,
                    "Credential": doctor.Credential,
                    "CreatedBy": created_by_name,
                    "ModifiedBy": modified_by_name,
                    "CreatedOn": (doctor.CreatedOn if doctor.CreatedOn  else None),
                    "ModifiedOn": (doctor.ModifiedOn if doctor.ModifiedOn else None),
                    "User": {
                        "Id": user.Id if user else None,
                        "AccountId": (user.AccountId if user else None),
                        "AccountName": (user.client.OrganizationName if user and user.client else None),
                        "FirstName": (user.FirstName if user else None),
                        "LastName": (user.LastName if user else None),
                        "EmailAddress": (user.EmailAddress if user else None),
                        "Phone": (user.Phone if user else None),
                        "StatusId": (user.StatusId if user else None),
                        "StatusName": (user.status.Name if user and user.status else None),
                    } if user else None,
                    # "Schedules": schedules,
                    # "DaysOff": days_off,
                })

            summary = {
                "TotalDoctors": len(response),
                "ActiveDoctors": active_count,
                "InactiveDoctors": inactive_count,
                "Doctors": response,
            }
            await self.redis_cache.set(cache_key, json.dumps(jsonable_encoder(summary)))
            return True, 200, summary
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.get_all_doctors", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def get_doctor_by_id (self, doctor_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not doctor_id:
                return False, 400, "Doctor ID is required"

            stmt = (
                select(Doctor)
                .options(
                    load_only(
                        Doctor.Id,
                        Doctor.UserId,
                        Doctor.Title,
                        Doctor.ClinicalRole,
                        Doctor.Specialty,
                        Doctor.Credential,
                        Doctor.CreatedOn,
                        Doctor.ModifiedOn,
                    ),
                    selectinload(Doctor.user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                        User.EmailAddress,
                        User.Phone,
                        User.IsDoctor,
                        User.StatusId,
                        User.AccountId,
                    )
                    .selectinload(User.client)
                    .load_only(
                        Client.Id,
                        Client.OrganizationName,
                    ),
                    selectinload(Doctor.user)
                    .selectinload(User.status)
                    .load_only(
                        Status.Id,
                        Status.Name,
                    ),
                    selectinload(Doctor.created_by_user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                    selectinload(Doctor.modified_by_user)
                    .load_only(
                        User.Id,
                        User.FirstName,
                        User.LastName,
                    ),
                )
                .where(Doctor.Id == doctor_id, Doctor.user.has(User.StatusId != 5))
            )

            result = await self.db.execute(stmt)
            doctor = result.scalars().first()
            if not doctor:
                return False, 404, "Doctor not found"

            user = doctor.user
            created_by_name = ( f"{doctor.created_by_user.FirstName} " f"{doctor.created_by_user.LastName}" if doctor.created_by_user else None)
            modified_by_name = ( f"{doctor.modified_by_user.FirstName} " f"{doctor.modified_by_user.LastName}" if doctor.modified_by_user else None)

            response = {
                "Id": doctor.Id,
                "UserId": doctor.UserId,
                "Title": doctor.Title,
                "ClinicalRole": doctor.ClinicalRole,
                "Specialty": doctor.Specialty,
                "Credential": doctor.Credential,
                "CreatedBy": created_by_name,
                "ModifiedBy": modified_by_name,
                "CreatedOn": (doctor.CreatedOn if doctor.CreatedOn  else None),
                "ModifiedOn": (doctor.ModifiedOn if doctor.ModifiedOn else None),
                "User": {
                        "Id": user.Id if user else None,
                        "AccountId": (user.AccountId if user else None),
                        "AccountName": (user.client.OrganizationName if user and user.client else None),
                        "FirstName": (user.FirstName if user else None),
                        "LastName": (user.LastName if user else None),
                        "EmailAddress": (user.EmailAddress if user else None),
                        "Phone": (user.Phone if user else None),
                        "StatusId": (user.StatusId if user else None),
                        "StatusName": (user.status.Name if user and user.status else None),
                } if user else None,
            }
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.get_doctor_by_id", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def save_doctors(self, log: Request, doctor: DoctorSchema, background_tasks: BackgroundTasks, token: dict, logo: Optional[UploadFile] = None) -> tuple[bool, int, Any]:
        try:
            is_update = bool(doctor.Id)
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None
            old_value = None

            if doctor.Type.lower() == "update" and not doctor.Id:
                return False, 400, "Doctor ID is required"

            status, validation = self.validate_doctor(doctor)
            if not status:
                return False, 400, validation
            
            res = await self.retrieve_acc_id(doctor.UserId)
            if res :
                acc_id = res
            
            if not is_update:
                new_doctor = Doctor(**doctor.model_dump(exclude={"Id", "Type", "Schedule", "DaysOff"}), CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_doctor)
                await self.db.flush()
                id = new_doctor.Id
            else:
                result = await self.db.execute(select(Doctor).where(Doctor.Id == doctor.Id))
                existing_doctor = result.scalars().first()
                if not existing_doctor:
                    return False, 404, "Doctor not found"
                
                old_value = DoctorSchema.model_validate(existing_doctor).model_dump_json()
                
                for field, value in doctor.model_dump(exclude={"Id", "Type", "Schedule", "DaysOff"}).items():
                    setattr(existing_doctor, field, value)
                existing_doctor.ModifiedBy = actor_id
                id = existing_doctor.Id

            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=existing_doctor.user.AccountId if existing_doctor.user else acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_doctor" if is_update else "create_doctor", AccountId=acc_id,
                ResourceType="Doctor", ResourceId=str(id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None, OldValue=old_value, NewValue=jsonable_encoder(doctor)
            ))
            return True, 200, id
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.save_doctors", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def delete_doctor(self, log: Request, doctor_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None

            result = await self.db.execute(select(Doctor).options(selectinload(Doctor.user)).where(Doctor.Id == doctor_id))
            existing_doctor = result.scalars().first()
            if not existing_doctor:
                return False, 404, "Doctor not found"

            old_value = jsonable_encoder(existing_doctor)
            if existing_doctor.user:
                existing_doctor.user.StatusId = 5
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=existing_doctor.user.AccountId if existing_doctor.user else acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Delete", Event="delete_doctor", AccountId=existing_doctor.user.AccountId if existing_doctor.user else acc_id,
                ResourceType="Doctor", ResourceId=str(doctor_id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None, OldValue=old_value, NewValue=None
            ))
            return True, 200, doctor_id
        except Exception as e:
            await self.db.rollback()
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.delete_doctor", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def save_doctor_schedule(self, log: Request, schedule: DoctorScheduleSchema, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            is_update = bool(schedule.Id)
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None
            id = None
            old_value = None

            if schedule.Type and schedule.Type.lower() == "update" and not schedule.Id:
                return False, 400, "Schedule ID is required"

            status, validation = self.validate_schedule(schedule)
            if not status:
                return False, 400, validation
            
            res = await self.retrieve_acc_id(schedule.UserId)
            if res :
                acc_id = res

            date_obj = datetime.strptime(schedule.Date, "%Y-%m-%d").date() if schedule.Date else None
            start_time_obj = None
            end_time_obj = None
            if schedule.StartTime:
                start_time_obj = datetime.strptime(schedule.StartTime, "%H:%M").time()
            if schedule.EndTime:
                end_time_obj = datetime.strptime(schedule.EndTime, "%H:%M").time()

            schedule_data = schedule.model_dump(exclude={"Id", "Type"}, exclude_unset=True, exclude_none=True)
            schedule_data["Date"] = date_obj
            schedule_data["StartTime"] = start_time_obj
            schedule_data["EndTime"] = end_time_obj

            if not is_update:
                new_Schedule = DoctorSchedule(**schedule_data, CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_Schedule)
                await self.db.flush()
                id = new_Schedule.Id
            else:
                result = await self.db.execute(select(DoctorSchedule).where(DoctorSchedule.Id == schedule.Id))
                existing_schedule = result.scalars().first()
                if not existing_schedule:
                    return False, 404, "Doctor Schedule not found"
                
                old_value = DoctorScheduleSchema.model_validate(existing_schedule).model_dump_json()

                for field, value in schedule_data.items():
                    setattr(existing_schedule, field, value)
                existing_schedule.ModifiedBy = actor_id
                id = existing_schedule.Id

            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_doctor_schedule" if is_update else "create_doctor_schedule", AccountId=acc_id,
                ResourceType="Doctor", ResourceId=str(id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None,
                NewValue=jsonable_encoder(schedule), OldValue = old_value if is_update else None
            ))

            return True, 200, id
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.save_doctor_schedule", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)
        
    async def save_doctor_day_off(self, log: Request, day_off: DoctorDayOffSchema, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            is_update = bool(day_off.Id)
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None
            id = None
            old_value = None

            if day_off.Type and day_off.Type.lower() == "update" and not day_off.Id:
                return False, 400, "Day Off ID is required"

            status, validation = self.validate_day_off(day_off)
            if not status:
                return False, 400, validation
            
            res = await self.retrieve_acc_id(day_off.UserId)
            if res :
                acc_id = res

            start_date_obj = datetime.strptime(day_off.StartDate, "%Y-%m-%d").date() if day_off.StartDate else None
            end_date_obj = datetime.strptime(day_off.EndDate, "%Y-%m-%d").date() if day_off.EndDate else None

            day_off_data = day_off.model_dump(exclude={"Id", "Type"}, exclude_unset=True, exclude_none=True)
            day_off_data["StartDate"] = start_date_obj
            day_off_data["EndDate"] = end_date_obj

            if not is_update:
                new_day_off = DoctorDayOff(**day_off_data, CreatedBy=actor_id, ModifiedBy=actor_id)
                self.db.add(new_day_off)
                await self.db.flush()
                id = new_day_off.Id
            else:
                result = await self.db.execute(select(DoctorDayOff).where(DoctorDayOff.Id == day_off.Id))
                existing_day_off = result.scalars().first()
                if not existing_day_off:
                    return False, 404, "Doctor Day Off not found"

                old_value = DoctorDayOffSchema.model_validate(existing_day_off).model_dump_json()

                for field, value in day_off_data.items():
                    setattr(existing_day_off, field, value)
                existing_day_off.ModifiedBy = actor_id
                id = existing_day_off.Id

            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Update" if is_update else "Create", Event="update_doctor_day_off" if is_update else "create_doctor_day_off", AccountId=acc_id,
                ResourceType="Doctor", ResourceId=str(id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None,
                NewValue=jsonable_encoder(day_off), OldValue = old_value if is_update else None
            ))

            return True, 200, id
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.save_doctor_day_off", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def get_doctor_schedule(self, doctor_id: str, date: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not doctor_id:
                return False, 400, "Doctor ID is required"
            
            if not date:
                return False, 400, "Date is required"

            today = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.today().date()
            start_of_week = today - timedelta(days=today.weekday() + 1) if today.weekday() != 6 else today

            if today.weekday() != 6:
                start_of_week = today - timedelta(days=(today.weekday() + 1))
            else:
                start_of_week = today

            end_of_week = start_of_week + timedelta(days=6)

            stmt = (select(DoctorSchedule).options(
                load_only(
                    DoctorSchedule.Id, DoctorSchedule.UserId, DoctorSchedule.Date, DoctorSchedule.StartTime, DoctorSchedule.EndTime, DoctorSchedule.StatusId, DoctorSchedule.DayOfWeek
                )
            ).where(
                DoctorSchedule.UserId == uuid.UUID(doctor_id),
                DoctorSchedule.StatusId != 5,
                DoctorSchedule.Date >= start_of_week,
                DoctorSchedule.Date <= end_of_week
            ).order_by(DoctorSchedule.Date))

            result = await self.db.execute(stmt)
            schedules = result.scalars().all()
            response = [
                {
                    "Id": s.Id,
                    "UserId": s.UserId,
                    "Date": s.Date,
                    "StartTime": s.StartTime.strftime("%H:%M") if s.StartTime else None,
                    "EndTime": s.EndTime.strftime("%H:%M") if s.EndTime else None,
                    "StatusId": s.StatusId,
                    "DayOfWeek": s.DayOfWeek,
                    "DayOfWeekName": DayOfWeek(s.DayOfWeek).name if s.DayOfWeek is not None else None
                }
                for s in schedules or []
            ]
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.get_doctor_schedules", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)
    
    async def get_doctor_days_off(self, doctor_id: str, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not doctor_id:
                return False, 400, "Doctor ID is required"

            today = datetime.today().date()

            stmt = select(DoctorDayOff).options(
                load_only(
                    DoctorDayOff.Id, DoctorDayOff.UserId, DoctorDayOff.StartDate, DoctorDayOff.EndDate, DoctorDayOff.StartTime, DoctorDayOff.EndTime, DoctorDayOff.IsAllDay, DoctorDayOff.StatusId, DoctorDayOff.Reason
                ),
                selectinload(DoctorDayOff.status).load_only(Status.Id, Status.Name)
            ).where(
                DoctorDayOff.UserId == doctor_id,
                DoctorDayOff.StatusId != 5,
                DoctorDayOff.EndDate >= today
            )

            result = await self.db.execute(stmt)
            days_off = result.scalars().all()
            response = [
                {
                    "Id": d.Id,
                    "UserId": d.UserId,
                    "StartDate": d.StartDate,
                    "EndDate": d.EndDate,
                    "StartTime": d.StartTime,
                    "EndTime": d.EndTime,
                    "IsAllDay": d.IsAllDay,
                    "StatusId": d.StatusId,
                    "Reason": d.Reason,
                    "StatusName": d.status.Name if d.status else None
                }
                for d in days_off
            ]
            return True, 200, response
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.get_doctor_days_off", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def delete_doctor_schedule(self, log: Request, schedule_id: uuid.UUID, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            if not schedule_id:
                return False, 400, "Schedule ID is required"
            
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None

            result = await self.db.execute(
                select(DoctorSchedule)
                .options(
                    selectinload(DoctorSchedule.user).load_only(User.Id, User.AccountId)
                )
                .where(DoctorSchedule.Id == schedule_id))
            schedule = result.scalars().first()
            if not schedule:
                return False, 404, "Doctor Schedule not found"
            
            schedule.StatusId = 5
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=schedule.user.AccountId if schedule.user else acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Delete", Event="delete_doctor_schedule", AccountId=schedule.user.AccountId if schedule.user else acc_id,
                ResourceType="Doctor", ResourceId=str(schedule_id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None,
                OldValue="Active" if schedule.StatusId == 1 else "Inactive", NewValue="Doctor Schedule marked as deleted"
            ))
            return True, 200, None
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.delete_doctor_schedule", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)
    
    async def delete_doctor_day_off(self, log: Request, day_off_id: uuid.UUID, background_tasks: BackgroundTasks, token: dict) -> tuple[bool, int, Any]:
        try:
            actor_id = token.get("user_id") if token else None
            acc_id = token.get("account_id") if token else None

            if not day_off_id:
                return False, 400, "Day Off ID is required"
            result = await self.db.execute(
                select(DoctorDayOff)
                .options(
                    selectinload(DoctorDayOff.user).load_only(User.Id, User.AccountId)
                )
                .where(DoctorDayOff.Id == day_off_id)
            )
            day_off = result.scalars().first()
            if not day_off:
                return False, 404, "Doctor Day Off not found"
            
            day_off.StatusId = 5
            await self.db.commit()
            await self.rebuild_cache(background_tasks=background_tasks, token=token, acc_id=day_off.user.AccountId if day_off.user else acc_id)
            background_tasks.add_task(AuditLogUtil.auditlog, request=log, audit_data=AuditLogSchema(
                Type="Delete", Event="delete_doctor_day_off", AccountId=day_off.user.AccountId if day_off.user else acc_id,
                ResourceType="Doctor", ResourceId=str(day_off_id), ActorId=actor_id, Status="success", ActorType=token.get("role") if token else None,
                OldValue="Active" if day_off.StatusId == 1 else "Inactive", NewValue="Doctor DaysOff marked as deleted"
            ))
            return True, 200, None
        except Exception as e:
            background_tasks.add_task(log_error, e=e, name="Error in DoctorService.delete_doctor_day_off", user_id=token.get("user_id") if token else None)
            return False, 500, str(e)

    async def rebuild_cache(self, background_tasks: BackgroundTasks, token: dict, acc_id: Optional[uuid.UUID] = None):
        try:
            if acc_id:
                await self.get_all_doctors(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":acc_id}, skip=False)
            await self.get_all_doctors(background_tasks=background_tasks, token={"is_super_admin": True,"account_id":None}, skip=False)
        except Exception as e:
            return

    async def retrieve_acc_id(self, user_id: uuid.UUID) -> Optional[uuid.UUID]:
        try:
            result = await self.db.execute(select(User).options(load_only(User.AccountId)).where(User.Id == user_id))
            user = result.scalars().first()
            return user.AccountId if user else None
        except Exception as e:
            return None

    @staticmethod
    def validate_doctor(doctor: DoctorSchema) -> tuple[bool, str]:
        try:
            validation = [
                (doctor.Title, "Title is required"),
                (doctor.ClinicalRole, "Clinical Role is required"),
                (doctor.Specialty, "Specialty is required"),
                (doctor.Credential, "Credential is required"),
                (doctor.UserId, "UserId is required"),
                (doctor.Type, "Type is required")
            ]
            for value, error in validation:
                if not value:
                    return False, error
            return True, "Validation successful"
        except Exception as e: 
            return False, str(e)
    
    @staticmethod
    def validate_schedule(schedule: DoctorScheduleSchema) -> tuple[bool, str]:
        validation =[
            (schedule.UserId, "UserId is required"),
            (schedule.Date, "Date is required"),
            (schedule.DayOfWeek is not None and schedule.DayOfWeek >= 0, "DayOfWeek is required"),
            (schedule.StartTime, "StartTime is required"),
            (schedule.EndTime, "EndTime is required"),
            (schedule.StartTime < schedule.EndTime, "StartTime must be before EndTime")
        ]
        for value, error in validation:
            if not value:
                return False, error
        return True, "Validation successful"
    
    @staticmethod
    def validate_day_off(day_off: DoctorDayOffSchema) -> tuple[bool, str]:
        validation =[
            (day_off.UserId, "UserId is required"),
            (day_off.StartDate, "StartDate is required"),
            (day_off.EndDate, "EndDate is required"),
            (day_off.IsAllDay, "IsAllDay is required"),
            (day_off.StartDate <= day_off.EndDate, "StartDate must be on or before EndDate") if day_off.StartDate and day_off.EndDate else (True, "") ,
        ]
        if not day_off.IsAllDay:
            validation.append((day_off.StartTime, "StartTime is required"))
            validation.append((day_off.EndTime, "EndTime is required"))
            if day_off.StartTime and day_off.EndTime:
                validation.append((day_off.StartTime < day_off.EndTime, "StartTime must be before EndTime"))

        for value, error in validation:
            if value in [None, '']:
                return False, error
        return True, "Validation successful"