from datetime import datetime, timedelta

import jwt
from passlib.context import CryptContext

from .config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_ctx.verify(pw, pw_hash)


def create_access_token(sub: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": sub, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
