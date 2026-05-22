from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api.routes import api_router
from config.api_config import Config
from helper.blob_helper import BlobHelper

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await BlobHelper.close_client()


app = FastAPI(lifespan=lifespan)
       
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    port = Config.APP_PORT
    uvicorn.run("app:app", host="0.0.0.0", port=port,reload=True)