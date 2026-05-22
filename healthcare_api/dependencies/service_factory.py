from fastapi import Depends
from config.db_config import get_db

def get_service(service_class):
    def _get_service(db = Depends(get_db)):
        return service_class(db)
    return _get_service