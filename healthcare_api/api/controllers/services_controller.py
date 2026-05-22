from fastapi import APIRouter, BackgroundTasks, File, Request, HTTPException, Depends,Form, UploadFile
from dependencies.service_factory import get_service
from typing import Optional, Union
from helper.jwt_helper import verify_user
from schemas.response_model_schema import ResponseModel
from utils.errorlog_util import log_error
from services.services_service import ServicesService
from schemas.services_schema import ServiceSchema

router = APIRouter()

@router.get("/getAllServices", response_model=ResponseModel)
async def get_all_services(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: ServicesService = Depends(get_service(ServicesService))):
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
        status, code, result = await service.get_all_services(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Services retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ServicesController.get_all_services", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/getServiceById/{service_id}", response_model=ResponseModel)
async def get_service_by_id(service_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: ServicesService = Depends(get_service(ServicesService))):
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
        status, code, result = await service.get_service_by_id(background_tasks, token, service_id)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Service retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ServicesController.get_service_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/deleteServiceById/{service_id}", response_model=ResponseModel)
async def delete_service_by_id(service_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: ServicesService = Depends(get_service(ServicesService))):
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
        status, code, result = await service.delete_service_by_id(background_tasks, token, service_id)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message=result
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ServicesController.delete_service_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.post("/saveService", response_model=ResponseModel)
async def save_service(log: Request, service_data: ServiceSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: ServicesService = Depends(get_service(ServicesService))):
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
        status, code, result = await service.save_service(log=log, background_tasks=background_tasks, token=token, service_data=service_data)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message=f"Service {service_data.Type}d successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ServicesController.save_service", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )