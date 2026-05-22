from fastapi import APIRouter, BackgroundTasks, File, Request, HTTPException, Depends,Form, UploadFile
from dependencies.service_factory import get_service
from typing import Optional, Union
from helper.jwt_helper import verify_user
from schemas.response_model_schema import ResponseModel
from utils.errorlog_util import log_error
from services.users_service import UsersService
from schemas.users_schema import UserSchema

router = APIRouter()

@router.get("/getAllUsers", response_model=ResponseModel)
async def get_all_users(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: UsersService = Depends(get_service(UsersService))):
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
        status, code, result = await service.get_all_users(background_tasks=background_tasks, token=token)
        if not status:
            return ResponseModel(
                data=None,
                status="Error",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="Users retrieved successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in UsersController.get_all_users", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/getUserById/{user_id}", response_model=ResponseModel)
async def get_user_by_id(user_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: UsersService = Depends(get_service(UsersService))):
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
        status, code, result = await service.get_user_by_id(user_id=user_id, background_tasks=background_tasks, token=token)
        if not status:
            return ResponseModel(
                data=None,
                status="Error",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="User retrieved successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in UsersController.get_user_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/deleteUser/{user_id}", response_model=ResponseModel)
async def delete_user(log: Request, user_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: UsersService = Depends(get_service(UsersService))):
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
        status, code, result = await service.delete_user(log = log, user_id=user_id, background_tasks=background_tasks, token=token)
        if not status:
            return ResponseModel(
                data=None,
                status="Error",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=None,
            status="Success",
            status_code=code,
            is_success=True,
            message="User deleted successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in UsersController.delete_user", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/saveUser", response_model=ResponseModel)
async def save_user(log: Request, user: UserSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service: UsersService = Depends(get_service(UsersService))):
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
        status, code, result = await service.save_user(log=log, user=user, background_tasks=background_tasks, token=token)
        if not status:
            return ResponseModel(
                data=None,
                status="Error",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="User saved successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in UsersController.save_user", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )



