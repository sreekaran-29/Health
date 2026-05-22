from passlib.context import CryptContext

pwd_context = CryptContext(
        schemes=["argon2"],
        deprecated="auto",
        argon2__time_cost=3,
        argon2__memory_cost=65536,    
        argon2__parallelism=4
    )

def hash_password(plain_password: str) -> tuple[bool, str]:
    try:
        return True, pwd_context.hash(plain_password)
    except Exception as e:
        return False, str(e)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)  
    except Exception as e:
        return False