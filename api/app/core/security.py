"""Authentication and security utilities for JWT token handling."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from .config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---- Password hashing ------------------------------------------------------------
def hash_password(pw: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
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
    """Get current timestamp in seconds since epoch."""
    return int(datetime.now(timezone.utc).timestamp())


def _create_token(
    sub: str, ttl_seconds: int, token_type: str, jti: str | None = None
) -> tuple[str, str]:
    """
    Create a JWT token.

    Args:
        sub: Subject (typically user ID)
        ttl_seconds: Time-to-live in seconds
        token_type: Token type ("access" or "refresh")
        jti: Optional JWT ID (generated if not provided)

    Returns:
        Tuple of (token, jti)
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
    token = jwt.encode(payload, _SECRET, algorithm=_ALG)
    return token, jti


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT token string

    Returns:
        Token payload dictionary

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- Public API ------------------------------------------------------------------
def create_access(sub: str) -> tuple[str, str]:
    """
    Create an access token.

    Args:
        sub: Subject (user ID)

    Returns:
        Tuple of (token, jti)
    """
    return _create_token(sub, _ACCESS_TTL, "access")


def create_refresh(sub: str) -> tuple[str, str]:
    """
    Create a refresh token.

    Args:
        sub: Subject (user ID)

    Returns:
        Tuple of (token, jti)
    """
    return _create_token(sub, _REFRESH_TTL, "refresh")


def rotate_refresh(sub: str) -> tuple[str, str]:
    """
    Rotate a refresh token (create new one).

    Args:
        sub: Subject (user ID)

    Returns:
        Tuple of (token, jti)
    """
    return _create_token(sub, _REFRESH_TTL, "refresh")


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Set a refresh token as an HttpOnly cookie.

    Args:
        response: FastAPI Response object
        refresh_token: JWT refresh token
    """
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
    """
    Clear the refresh token cookie.

    Args:
        response: FastAPI Response object
    """
    response.delete_cookie(
        key="revline_refresh",
        domain=settings.cookie_domain,
        path="/api/v1/auth",
    )


# ---- Compatibility shims ---------------------------------------------------------
def create_access_token(sub: str) -> str:
    """Create an access token (returns only the token, not JTI)."""
    token, _ = create_access(sub)
    return token


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode an access token (alias for decode_token)."""
    return decode_token(token)


# ---- FastAPI Security Dependencies -----------------------------------------------
bearer_scheme = HTTPBearer(auto_error=False)


def get_bearer_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """
    Extract and return the raw bearer token from Authorization header.

    Args:
        creds: HTTP authorization credentials from FastAPI security

    Returns:
        Bearer token string

    Raises:
        HTTPException: If no bearer token is provided
    """
    if not creds:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return creds.credentials


def verify_access_token(token: str = Depends(get_bearer_token)) -> dict[str, Any]:
    """
    Decode and validate an access token.

    Args:
        token: JWT token from bearer authorization

    Returns:
        Token payload with validated claims

    Raises:
        HTTPException: If token is invalid, expired, or wrong type
    """
    payload = decode_token(token)

    # Verify this is an access token (not refresh)
    token_type = payload.get("type")
    if token_type is not None and token_type != "access":
        raise HTTPException(status_code=401, detail="Wrong token type")

    # Verify sub claim exists
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload
