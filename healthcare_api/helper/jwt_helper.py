import json
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from config.api_config import Config

security = HTTPBearer()

def create_access_token(identity: Any, claims: Dict[str, Any]) -> tuple[bool, Any]:
    """ Create a JWT access token with an optional expiration time. """
    try:
        payload = {"sub": identity}
    
        if claims:
            payload.update(claims)

        payload["iat"] = datetime.now(timezone.utc)
        payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=60)
        
        return True,jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.ALGORITHM)
    
    except Exception as e:
        return False, str(e)

def verify_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> tuple[bool, Any]:
    try:
        token = credentials.credentials
        if not token:
            return False, "Token is required"
        
        decoded_token = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=[Config.ALGORITHM])
        exp_timestamp = decoded_token.get("exp")
        
        if exp_timestamp:
            exp_datetime = datetime.fromtimestamp(exp_timestamp, timezone.utc)
            if exp_datetime < datetime.now(timezone.utc):
                return False, "Token has expired"
        
        return True, decoded_token
    
    except Exception as e:
        return False, str(e)