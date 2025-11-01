from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Tuple
import uuid
import jwt
from passlib.context import CryptContext
from fastapi import Response, HTTPException

from .config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---- Password hashing ------------------------------------------------------------
def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_ctx.verify(pw, pw_hash)


# ---- Settings helpers ------------------------------------------------------------
_ALG: str = getattr(settings, "jwt_alg", getattr(settings, "jwt_algorithm", "HS256"))
_ACCESS_MIN: int = getattr(
    settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
)
_REFRESH_DAYS: int = getattr(settings, "refresh_token_expire_days", 7)

_ACCESS_TTL: int = (
    int(settings.access_token_ttl.total_seconds())
    if hasattr(settings, "access_token_ttl")
    else int(timedelta(minutes=_ACCESS_MIN).total_seconds())
)
_REFRESH_TTL: int = (
    int(settings.refresh_token_ttl.total_seconds())
    if hasattr(settings, "refresh_token_ttl")
    else int(timedelta(days=_REFRESH_DAYS).total_seconds())
)
_SECRET: str = settings.jwt_secret


# ---- JWT helpers -----------------------------------------------------------------
def _now_ts() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _create_token(
    sub: str, ttl_seconds: int, token_type: str, jti: Optional[str] = None
) -> Tuple[str, str]:
    """Return (token, jti)."""
    jti = jti or str(uuid.uuid4())
    now = _now_ts()
    payload: dict[str, Any] = {
        "sub": sub,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + int(ttl_seconds),
    }
    token = jwt.encode(payload, _SECRET, algorithm=_ALG)
    return token, jti


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Public API ------------------------------------------------------------------
def create_access(sub: str) -> Tuple[str, str]:
    return _create_token(sub, _ACCESS_TTL, "access")


def create_refresh(sub: str) -> Tuple[str, str]:
    return _create_token(sub, _REFRESH_TTL, "refresh")


def rotate_refresh(sub: str) -> Tuple[str, str]:
    return _create_token(sub, _REFRESH_TTL, "refresh")


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="revline_refresh",
        value=refresh_token,
        httponly=True,
        samesite="strict" if settings.cookie_samesite.lower() == "strict" else "lax",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=_REFRESH_TTL,
        path="/api/v1/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="revline_refresh",
        domain=settings.cookie_domain,
        path="/api/v1/auth",
    )


# ---- Compatibility shims ---------------------------------------------------------
def create_access_token(sub: str) -> str:
    token, _ = create_access(sub)
    return token


def decode_access_token(token: str) -> dict[str, Any]:
    return decode_token(token)
