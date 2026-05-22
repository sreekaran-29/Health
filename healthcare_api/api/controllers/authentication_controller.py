from fastapi import APIRouter, BackgroundTasks, Request, HTTPException, Depends
from dependencies.service_factory import get_service
from schemas.login_schema import LoginRequest
from services.authentication_service import AuthenticationService
from schemas.response_model_schema import ResponseModel
from schemas.updatepassword_schema import UpdatePasswordSchema
from utils.errorlog_util import log_error

router = APIRouter()

@router.get("/checkEmail", response_model=ResponseModel)
async def check_email(email: str, background_tasks: BackgroundTasks, service: AuthenticationService = Depends(get_service(AuthenticationService))):
    try:
        status, code, result = await service.check_email(email, background_tasks)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Email check successful"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in AuthenticationController.check_email", user_id=None)
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/login", response_model=ResponseModel)
async def login(log:Request, LoginRequest: LoginRequest, background_tasks: BackgroundTasks, service: AuthenticationService = Depends(get_service(AuthenticationService))):
    try:
        status, code, result = await service.authenticate_user(log=log, login_request=LoginRequest, background_tasks=background_tasks)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Login successful"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in AuthenticationController.login", user_id=None)
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/generatePasswordLink", response_model=ResponseModel)
async def generate_password_link(log: Request, email: str, background_tasks: BackgroundTasks, service: AuthenticationService = Depends(get_service(AuthenticationService))):
    try:
        status, code, result = await service.generate_password_link(log=log, email=email, background_tasks=background_tasks)
        if not status:
            return ResponseModel(
                data=None,
                status="Failed",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="Password reset link generated and sent to email"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in AuthenticationController.generate_password_link", user_id=None)
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/checkLinkValidity", response_model=ResponseModel)
async def check_link_validity(email: str, background_tasks: BackgroundTasks, service: AuthenticationService = Depends(get_service(AuthenticationService))):
    try:
        status, code, result = await service.check_link_validity(email, background_tasks)
        if not status:
            return ResponseModel(
                data=result,
                status="Failed",
                status_code=code,
                is_success=False,
                message=None
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="Link is valid"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in AuthenticationController.check_link_validity", user_id=None)
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.post("/updatePassword", response_model=ResponseModel)
async def update_password(log: Request, password : UpdatePasswordSchema, background_tasks: BackgroundTasks, service: AuthenticationService = Depends(get_service(AuthenticationService))):
    try:
        status, code, result = await service.update_password(log=log, password=password, background_tasks=background_tasks)
        if not status:
            return ResponseModel(
                data=None,
                status="Failed",
                status_code=code,
                is_success=False,
                message=result
            )
        return ResponseModel(
            data=result,
            status="Success",
            status_code=code,
            is_success=True,
            message="Password updated successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in AuthenticationController.update_password", user_id=None)
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )





