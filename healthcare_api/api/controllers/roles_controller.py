from fastapi import APIRouter, BackgroundTasks, File, Request, HTTPException, Depends,Form, UploadFile
from dependencies.service_factory import get_service
from typing import Optional, Union
from helper.jwt_helper import verify_user
from schemas.response_model_schema import ResponseModel
from schemas.role_schema import RoleSchema
from utils.errorlog_util import log_error
from services.roles_service import RolesService

router = APIRouter()

@router.get("/getAllRoles", response_model=ResponseModel)
async def get_all_roles(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.get_all_roles(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Roles retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.get_all_roles", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/getRoleById/{role_id}", response_model=ResponseModel)
async def get_role_by_id(role_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.get_role_by_id(role_id, background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Role retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.get_role_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.post("/saveRole", response_model=ResponseModel)
async def save_role(log: Request, role: RoleSchema, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.save_role(role, background_tasks, token, log=log)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message=f"Role {role.Type}d successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.save_role", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getAllPermissions", response_model=ResponseModel)
async def get_all_permissions(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.get_all_permissions(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Permissions retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.get_all_permissions", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/deleteRole/{role_id}", response_model=ResponseModel)
async def delete_role(log: Request, role_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.delete_role(role_id, background_tasks, token, log=log)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message="Role deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.delete_role", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getRolesNames", response_model=ResponseModel)
async def get_roles_names(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : RolesService = Depends(get_service(RolesService))):
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
        status, code, result = await service.get_roles_names(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Role names retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in RolesController.get_roles_names", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

