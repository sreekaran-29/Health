from fastapi import APIRouter
from api.controllers.authentication_controller import router as auth_router
from api.controllers.clients_controller import router as clients_router
from api.controllers.auditlogs_controller import router as auditlogs_router
from api.controllers.subscription_controller import router as subscription_router
from api.controllers.roles_controller import router as roles_router
from api.controllers.users_controller import router as users_router
from api.controllers.doctor_controller import router as doctor_router
from api.controllers.services_controller import router as services_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(clients_router, prefix="/clients", tags=["Clients"])
api_router.include_router(auditlogs_router, prefix="/auditlogs", tags=["Audit Logs"])
api_router.include_router(subscription_router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(roles_router, prefix="/roles", tags=["Roles"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(doctor_router, prefix="/doctors", tags=["Doctors"])
api_router.include_router(services_router, prefix="/services", tags=["Services"])