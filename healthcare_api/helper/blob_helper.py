import base64
from azure.storage.blob.aio import BlobServiceClient, BlobClient
from fastapi import UploadFile
from typing import Optional
from config.api_config import Config


class BlobHelper:
    _client: Optional[BlobServiceClient] = None

    @classmethod
    def get_client(cls) -> BlobServiceClient:
        if cls._client is None:
            account_name = Config.ACCOUNT_NAME
            account_key = Config.ACCOUNT_KEY

            if not account_name or not account_key:
                raise ValueError("Azure ACCOUNT_NAME or ACCOUNT_KEY is missing")

            account_url = f"https://{account_name}.blob.core.windows.net"

            cls._client = BlobServiceClient(
                account_url=account_url,
                credential=account_key
            )

        return cls._client

    @classmethod
    async def close_client(cls) -> None:
        if cls._client is not None:
            await cls._client.close()
            cls._client = None

    @staticmethod
    async def upload_file_to_blob(file: UploadFile, client_id: str, file_name: str = None) -> tuple[bool, str]:
        try:
            blob_service_client = BlobHelper.get_client()

            container_name = Config.CONTAINER_NAME
            parent = Config.PARENT_FOLDER_NAME
            folder = Config.FOLDER_NAME

            if not container_name:
                return False, "Container name is missing"

            blob_path = f"{parent}/{folder}/{client_id}/{file_name or file.filename}"

            content = await file.read()

            async with blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_path
            ) as blob_client:
                await blob_client.upload_blob(content, overwrite=True)
                return True, blob_client.url

        except Exception as e:
            return False, str(e)
        
    @staticmethod
    async def download_file_from_blob(blob_url: str) -> tuple[bool, bytes]:
        try:
            async with BlobClient.from_blob_url(
                blob_url=blob_url,
                credential=Config.ACCOUNT_KEY
            ) as blob_client:
                stream = await blob_client.download_blob()

                chunks = []
                async for chunk in stream.chunks():
                    chunks.append(base64.b64encode(chunk).decode("utf-8"))

                return True, "".join(chunks)

        except Exception as e:
            return False, str(e)