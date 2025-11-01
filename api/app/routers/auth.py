"""Authentication routes for user registration, login, and token management."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.db import get_db
from ..core.rate_limit import get_auth_limiter, get_refresh_limiter
from ..core.security import (
    clear_refresh_cookie,
    create_access,
    create_refresh,
    decode_token,
    hash_password,
    set_refresh_cookie,
    verify_access_token,
    verify_password,
)
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserOut
from ..services.redis import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)


def _access_max_age() -> int:
    """Calculate access token max age in seconds."""
    if hasattr(settings, "access_token_ttl"):
        return int(settings.access_token_ttl.total_seconds())
    minutes = getattr(
        settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
    )
    return minutes * 60


def _refresh_max_age() -> int:
    """Calculate refresh token max age in seconds."""
    if hasattr(settings, "refresh_token_ttl"):
        return int(settings.refresh_token_ttl.total_seconds())
    days = getattr(settings, "refresh_token_expire_days", 7)
    return days * 24 * 3600


@router.post("/register", response_model=UserOut, status_code=201)
async def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _limiter: None = Depends(get_auth_limiter),
) -> UserOut:
    """
    Register a new user account.

    Args:
        payload: User registration data
        db: Database session
        _limiter: Rate limiter dependency

    Returns:
        Created user information

    Raises:
        HTTPException: If email is already registered
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserOut.model_validate(user)


@router.post("/login")
async def login(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
    r: Redis = Depends(get_redis),
    _limiter: None = Depends(get_auth_limiter),
) -> dict[str, Any]:
    """
    Authenticate user and issue tokens.

    Args:
        payload: Login credentials
        response: FastAPI response for setting cookies
        db: Database session
        r: Redis client for refresh token storage
        _limiter: Rate limiter dependency

    Returns:
        Access token and metadata

    Raises:
        HTTPException: If credentials are invalid
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    access_token, _ = create_access(str(user.id))
    refresh_token, refresh_jti = create_refresh(str(user.id))

    # Only set cookie if cookie mode enabled
    if settings.auth_cookie_mode:
        ttl_val = getattr(settings, "refresh_token_ttl", 7 * 24 * 3600)
        if hasattr(ttl_val, "total_seconds"):
            refresh_ttl = int(ttl_val.total_seconds())
        else:
            refresh_ttl = int(ttl_val)

        await r.setex(f"refresh:{refresh_jti}", refresh_ttl, str(user.id))
        set_refresh_cookie(response, refresh_token)

    access_ttl = _access_max_age()
    result = {"access_token": access_token, "token_type": "bearer", "expires_in": access_ttl}

    # Include refresh token in response body if cookie mode disabled
    if not settings.auth_cookie_mode:
        result["refresh_token"] = refresh_token

    return result


@router.get("/me", response_model=UserOut)
def me(
    payload: dict[str, Any] = Depends(verify_access_token),
    db: Session = Depends(get_db),
) -> UserOut:
    """
    Get current authenticated user information.

    Args:
        payload: Decoded JWT token payload
        db: Database session

    Returns:
        Current user information

    Raises:
        HTTPException: If token is invalid or user not found
    """
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, int(sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or session invalid",
        )

    return UserOut.model_validate(user)


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    r: Redis = Depends(get_redis),
    db: Session = Depends(get_db),
    _limiter: None = Depends(get_refresh_limiter),
) -> dict[str, Any]:
    """
    Refresh access token using refresh token from cookie.
    Implements refresh token rotation with reuse detection.

    Args:
        request: FastAPI request for reading cookies
        response: FastAPI response for setting new cookies
        r: Redis client for token management
        db: Database session for user validation

    Returns:
        New access token and metadata

    Raises:
        HTTPException: If refresh token is missing or invalid
    """
    cookie = request.cookies.get("revline_refresh")
    if not cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh cookie"
        )

    payload = decode_token(cookie)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    # Verify token type
    token_type = payload.get("type")
    if token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type"
        )

    old_jti = payload.get("jti")
    if not old_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    # REUSE DETECTION: Check if this refresh token was already used
    redis_key = f"refresh:{old_jti}"
    stored_sub = await r.get(redis_key)

    if not stored_sub:
        # Token was already consumed or expired → possible replay attack
        logger.warning(
            "Refresh token reuse detected for user %s (jti: %s). Strategy: %s",
            sub,
            old_jti,
            settings.auth_refresh_strategy,
        )

        if settings.auth_refresh_strategy == "nuclear":
            # Nuclear option: revoke ALL refresh tokens for this user
            # In practice, we can't easily iterate keys, so we rely on JTI tracking
            # For now, just log and reject (individual tokens already expired)
            logger.warning("Nuclear strategy: token reuse detected, session invalidated")

        # Future: implement "family" tracking here

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token already used or revoked",
        )

    # Verify stored user matches token claim
    if stored_sub.decode("utf-8") != sub:
        logger.error("User ID mismatch in refresh token: stored=%s, claim=%s", stored_sub, sub)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    # Token is valid and not reused → revoke it and issue new one
    await r.delete(redis_key)

    access_token, _ = create_access(sub)
    refresh_token, refresh_jti = create_refresh(sub)

    # Store new refresh token with user ID as value
    ttl = _refresh_max_age()
    await r.setex(f"refresh:{refresh_jti}", ttl, sub)

    set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": _access_max_age(),
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    r: Redis = Depends(get_redis),
) -> dict[str, bool]:
    """
    Logout user by revoking refresh token and clearing cookie.

    Args:
        request: FastAPI request for reading cookies
        response: FastAPI response for clearing cookies
        r: Redis client for token revocation

    Returns:
        Success status
    """
    cookie = request.cookies.get("revline_refresh")

    if cookie:
        try:
            payload = decode_token(cookie)
            jti = payload.get("jti")

            if jti:
                # attempt to revoke the refresh token server-side
                try:
                    await r.delete(f"refresh:{jti}")
                except Exception as e:
                    # We failed to delete the token from Redis. Not fatal for logout,
                    # but we should know about it.
                    logger.warning(
                        "Failed to revoke refresh token %s during logout: %s", jti, e
                    )

        except Exception as e:
            # token couldn't be decoded / malformed / expired / tampered
            # Don't fail logout for that, but record it.
            logger.debug("Invalid refresh token during logout: %s", e)

    # Always clear the browser cookie so the client is logged out regardless
    clear_refresh_cookie(response)
    return {"ok": True}
