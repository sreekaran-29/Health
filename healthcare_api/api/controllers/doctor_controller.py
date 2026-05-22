from fastapi import APIRouter, BackgroundTasks, File, Request, HTTPException, Depends,Form, UploadFile
from dependencies.service_factory import get_service
from typing import Optional, Union
from helper.jwt_helper import verify_user
from schemas.doctor_schema import DoctorSchema, DoctorScheduleSchema, DoctorDayOffSchema
from schemas.response_model_schema import ResponseModel
from services.doctor_service import DoctorService
from utils.errorlog_util import log_error

router = APIRouter()

@router.get("/getAllDoctors", response_model=ResponseModel)
async def get_all_doctors(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.get_all_doctors(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctors retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.get_all_doctors", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getDoctorById/{id}", response_model=ResponseModel)
async def get_doctor_by_id(id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.get_doctor_by_id(doctor_id=id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.get_doctor_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/saveDoctor",response_model=ResponseModel)
async def save_doctor(log:Request, background_tasks: BackgroundTasks, request: str = Form(...),logo: Optional[UploadFile] = File(None), auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        doctor = DoctorSchema.model_validate_json(request)
        status, code, result = await service.save_doctors(log=log, doctor=doctor, logo=logo, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor saved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.save_doctor", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/deleteDoctor/{id}", response_model=ResponseModel)
async def delete_doctor(id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.delete_doctor(id=id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.delete_doctor", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getDoctorSchedule/{doctor_id}/{date}", response_model=ResponseModel)
async def get_doctor_schedule(doctor_id: str, date: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.get_doctor_schedule(doctor_id=doctor_id, date=date, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor schedule retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.get_doctor_schedule", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getDoctorDaysOff/{doctor_id}", response_model=ResponseModel)
async def get_doctor_days_off(doctor_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.get_doctor_days_off(doctor_id=doctor_id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor days off retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.get_doctor_days_off", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/saveDoctorSchedule",response_model=ResponseModel)
async def save_doctor_schedule(log: Request, schedule: DoctorScheduleSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.save_doctor_schedule(log=log, schedule=schedule, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor schedule saved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.save_doctor_schedule", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/saveDoctorDayOff",response_model=ResponseModel)
async def save_doctor_day_off(log: Request, day_off: DoctorDayOffSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.save_doctor_day_off(log=log, day_off=day_off, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor daysoff saved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.save_doctor_day_off", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/deleteDoctorSchedule/{id}", response_model=ResponseModel)
async def delete_doctor_schedule(log: Request, id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.delete_doctor_schedule(log=log, schedule_id=id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor schedule deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.delete_doctor_schedule", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/deleteDoctorDayOff/{id}", response_model=ResponseModel)
async def delete_doctor_day_off(log: Request, id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : DoctorService = Depends(get_service(DoctorService))):
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
        status, code, result = await service.delete_doctor_day_off(log=log, day_off_id=id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message="Doctor day off deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in DoctorController.delete_doctor_day_off", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )