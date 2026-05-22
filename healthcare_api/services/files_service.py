from helper.blob_helper import BlobHelper
from models.files_model import File
from config.db_config import AsyncSessionLocal

class FileService:

    @staticmethod
    async def upload_file(file, client_id, file_id=None, file_name=None, metadata=None, type=None) -> tuple[bool, str]:
        try:
            status, result = await BlobHelper.upload_file_to_blob(file, client_id, file_name=file_name)
            if not status:
                return False, f"File Upload Failed: {result}"
            
            async with AsyncSessionLocal() as db:
                async with db.begin():
                    if file_id:
                        file_record = await db.get(File, file_id)
                        if not file_record:
                            return False, "File record not found."
                        file_record.FileName = file_name or file.filename
                        file_record.FilePath = result
                    else:
                        file_record = File(
                            AccountId=client_id,
                            Type=type,  
                            FileName=file_name or file.filename,
                            FilePath=result,
                            CreatedBy=client_id,
                            Metadata=metadata
                        )
                        db.add(file_record)
                        await db.flush()  

            return True, file_record.Id
        except Exception as e:
            return False, str(e)
