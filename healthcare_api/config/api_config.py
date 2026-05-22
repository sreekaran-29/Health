import os
from dotenv import load_dotenv

class Config:
    try:
        APP_PORT = int(os.getenv("APP_PORT", 5000))
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
        JWT_TOKEN_IDENTIFIER = os.getenv("JWT_TOKEN_IDENTIFIER", "")
        ALGORITHM = os.getenv("ALGORITHM", "HS256")
        DATABASE_URL = os.getenv("DATABASE_URL", "")
        FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
        SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")
        SENDER_PASSKEY = os.getenv("SENDER_PASSKEY", "")
        SECRET_KEY = os.getenv("SECRET_KEY", "")
        RESET_PASSWORD_TOKEN_EXPIRY_HOURS = int(os.getenv("RESET_PASSWORD_TOKEN_EXPIRY_HOURS", 24))
        ACCOUNT_NAME = os.getenv("ACCOUNT_NAME", "")
        ACCOUNT_KEY = os.getenv("ACCOUNT_KEY", "")
        CONTAINER_NAME = os.getenv("CONTAINER_NAME", "")
        PARENT_FOLDER_NAME = os.getenv("PARENT_FOLDER_NAME", "")
        FOLDER_NAME = os.getenv("FOLDER_NAME", "")
        STRIPE_API_KEY = os.getenv("STRIPE_API_KEY", "")
        REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
        REDIS_DB = int(os.getenv("REDIS_DB", 0))
        STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    except Exception as e:
        print(f"Error loading configuration: {e}")