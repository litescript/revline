from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Tuple
import uuid
import jwt
from passlib.context import CryptContext
from fastapi import Response, HTTPException

from .config import settings


# ---- Password hashing ------------------------------------------------------------
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_ctx.verify(pw, pw_hash)


# ---- Settings helpers ------------------------------------------------------------
_ALG = getattr(settings, "jwt_alg", getattr(settings, "jwt_algorithm", "HS256"))
_ACCESS_MIN = getattr(
    settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
)
_REFRESH_DAYS = getattr(settings, "refresh_token_expire_days", 7)

if hasattr(settings, "access_token_ttl"):
    _ACCESS_TTL = int(settings.access_token_ttl.total_seconds())
else:
    _ACCESS_TTL = int(timedelta(minutes=_ACCESS_MIN).total_seconds())

if hasattr(settings, "refresh_token_ttl"):
    _REFRESH_TTL = int(settings.refresh_token_ttl.total_seconds())
else:
    _REFRESH_TTL = int(timedelta(days=_REFRESH_DAYS).total_seconds())

_SECRET = settings.jwt_secret


# ---- JWT helpers -----------------------------------------------------------------
def _now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _create_token(
    sub: str, ttl_seconds: int, token_type: str, jti: Optional[str] = None
) -> Tuple[str, str]:
    """
    Returns (token, jti).
    Encodes standard claims: sub, type, jti, iat, exp
    """
    jti = jti or str(uuid.uuid4())
    now = _now_ts()
    payload: dict[str, Any] = {
        "sub": sub,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + int(ttl_seconds),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALG), jti


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Public API ------------------------------------------------------------------
def create_access(sub: str) -> Tuple[str, str]:
    """Return (access_token, jti) with short TTL."""
    return _create_token(sub, _ACCESS_TTL, "access")


def create_refresh(sub: str) -> Tuple[str, str]:
    """Return (refresh_token, jti) with long TTL."""
    return _create_token(sub, _REFRESH_TTL, "refresh")


# ---- Rotation helpers ------------------------------------------------------------
def rotate_refresh(sub: str) -> Tuple[str, str]:
    """
    Generates a new refresh token for the same subject.
    Returns (refresh_token, jti).
    """
    return _create_token(sub, _REFRESH_TTL, "refresh")


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Attach refresh token as HttpOnly cookie on response.
    Applies secure attributes based on environment settings.
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="strict" if settings.cookie_samesite.lower() == "strict" else "lax",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=_REFRESH_TTL,
        path="/api/v1/auth",
    )


# ---- Backward compatibility shims ------------------------------------------------
def create_access_token(sub: str) -> str:
    tok, _ = create_access(sub)
    return tok


def decode_access_token(token: str) -> dict:
    return decode_token(token)
