import traceback
import json
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from models.errorlogs_model import ErrorLog
from config.db_config import AsyncSessionLocal


async def log_error(e: Exception, name: str, user_id: str):
    async with AsyncSessionLocal() as db:
        try:
            new_log = ErrorLog(
                UserId=user_id,
                ExceptionAt=name,
                Error=repr(e),
                Properties=json.dumps({
                    "Message": str(e),
                    "Source": type(e).__name__,
                    "StackTrace": "".join(traceback.format_exception(type(e), e, e.__traceback__))
                }),
                CreatedOn=datetime.utcnow()
            )
            db.add(new_log)
            await db.commit()
        except Exception as ex:
            print(f"[UNKNOWN LOG ERROR FAILED]: {ex}")