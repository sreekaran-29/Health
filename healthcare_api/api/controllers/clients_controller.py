from fastapi import APIRouter, BackgroundTasks, File, Request, HTTPException, Depends,Form, UploadFile
from dependencies.service_factory import get_service
from typing import Optional, Union
from helper.jwt_helper import verify_user
from schemas.response_model_schema import ResponseModel
from utils.errorlog_util import log_error
from schemas.client_schema import ClientSchema
from schemas.client_schema import ClientSchema
from services.client_service import ClientService

router = APIRouter()

@router.get("/getAllClients", response_model=ResponseModel)
async def get_all_clients(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        status, code, result = await service.get_all_clients(background_tasks, token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Clients retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.get_all_clients", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.post("/saveClient",response_model=ResponseModel)
async def save_client(log:Request, background_tasks: BackgroundTasks, request: str = Form(...),logo: Optional[UploadFile] = File(None), auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        client = ClientSchema.model_validate_json(request)
        status, code, result = await service.save_client(log=log, client=client, logo=logo, background_tasks=background_tasks, token=token)
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
            message=f"Client {client.Type}d successfully"
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.save_client", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getClientById/{client_id}", response_model=ResponseModel)
async def get_client_by_id(client_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        status, code, result = await service.get_client_by_id(client_id=client_id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Client retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.get_client_by_id", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )
    
@router.get("/getClientLogo/{client_id}", response_model=ResponseModel)
async def get_client_logo(client_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        status, code, result = await service.get_client_logo(client_id=client_id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Client logo retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.get_client_logo", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/deleteClient/{client_id}", response_model=ResponseModel)
async def delete_client(log: Request, client_id: str, background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        status, code, result = await service.delete_client(client_id=client_id, background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=None,
                status="Success",
                status_code=code,
                is_success=True,
                message="Client deleted successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.delete_client", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

@router.get("/getClientsNames", response_model=ResponseModel)
async def get_clients_names(background_tasks: BackgroundTasks, auth: tuple = Depends(verify_user), service : ClientService = Depends(get_service(ClientService))):
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
        status, code, result = await service.get_clients_names(background_tasks=background_tasks, token=token)
        if status:
            return ResponseModel(
                data=result,
                status="Success",
                status_code=code,
                is_success=True,
                message="Client names retrieved successfully"
            )
        return ResponseModel(
            data=None,
            status="Failed",
            status_code=code,
            is_success=False,
            message=result
        )
    except Exception as e:
        background_tasks.add_task(log_error, e=e, name="Error in ClientsController.get_clients_names", user_id=token.get("user_id"))
        return ResponseModel(
            data=None,
            status="Error",
            status_code=500,
            is_success=False,
            message=str(e)
        )

