import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from redis import asyncio as redis
from typing import Optional, Literal, cast, Any
from redis.exceptions import RedisError


from ..core.db import get_db
from ..core.token_family import TokenFamily
from ..core.security import (
    create_access,
    create_refresh,
    decode_token,
    hash_password,
    verify_password,
    set_refresh_cookie,
    clear_refresh_cookie,
)
from ..core.config import settings
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserOut
from ..services.redis import get_redis

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)


def _normalize_samesite(val: Optional[str]) -> Optional[Literal["lax", "strict", "none"]]:
    if val is None:
        return None
    v = val.strip().lower()
    if v in ("lax", "strict", "none"):
        return cast(Literal["lax", "strict", "none"], v)
    return "lax"


def _normalize_domain(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    v = val.strip()
    return v or None


def _access_max_age() -> int:
    if hasattr(settings, "access_token_ttl"):
        return int(settings.access_token_ttl.total_seconds())
    minutes = getattr(
        settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
    )
    return minutes * 60


def _refresh_max_age() -> int:
    if hasattr(settings, "refresh_token_ttl"):
        return int(settings.refresh_token_ttl.total_seconds())
    days = getattr(settings, "refresh_token_expire_days", 7)
    return days * 24 * 3600


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

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
    r: redis.Redis = Depends(get_redis),
) -> dict[str, Any]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token, _ = create_access(str(user.id))
    refresh_token, refresh_jti = create_refresh(str(user.id))

    # Sprint 6C: Token family tracking
    if settings.auth_refresh_strategy == "family":
        # Create new family for this login session
        family_manager = TokenFamily(r)
        family_id = await family_manager.create_family(str(user.id))

        # Store token with family association
        ttl = _refresh_max_age()
        await family_manager.store_refresh_token(refresh_jti, family_id, str(user.id), ttl)
    else:
        # Nuclear strategy: simple key-value storage
        ttl_val = getattr(settings, "refresh_token_ttl", 7 * 24 * 3600)
        # if it's a timedelta, convert to seconds
        if hasattr(ttl_val, "total_seconds"):
            refresh_ttl = int(ttl_val.total_seconds())
        else:
            # assume it's already numeric (int/str)
            refresh_ttl = int(ttl_val)

        await r.setex(f"refresh:{refresh_jti}", refresh_ttl, str(user.id))

    set_refresh_cookie(response, refresh_token)
    access_ttl = _access_max_age()
    return {"access_token": access_token, "token_type": "bearer", "expires_in": access_ttl}


@router.get("/me", response_model=UserOut)
def me(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> UserOut:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)

    token_type = payload.get("type")
    if token_type is not None and token_type != "access":
        raise HTTPException(status_code=401, detail="Wrong token type")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, int(sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserOut.model_validate(user)


@router.post("/refresh")
async def refresh(
    request: Request, response: Response, r: redis.Redis = Depends(get_redis)
) -> dict[str, Any]:
    cookie = request.cookies.get("revline_refresh")
    if not cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh cookie")

    payload = decode_token(cookie)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    old_jti = payload.get("jti")
    if not old_jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Sprint 6C: Branch on refresh strategy
    if settings.auth_refresh_strategy == "family":
        await _refresh_family_strategy(old_jti, sub, response, r)
    else:
        await _refresh_nuclear_strategy(old_jti, sub, response, r)

    access_token, _ = create_access(sub)
    return {"access_token": access_token, "token_type": "bearer", "expires_in": _access_max_age()}


async def _refresh_family_strategy(
    old_jti: str, sub: str, response: Response, r: redis.Redis
) -> None:
    """
    Handle refresh using family strategy.

    On token reuse, revoke only the affected family (not all user sessions).
    """
    family_manager = TokenFamily(r)

    # Get family for old token
    token_data = await family_manager.get_token_family(old_jti)

    if not token_data:
        # Token not found or expired → possible reuse
        logger.warning("Refresh token reuse detected for user %s (jti: %s)", sub, old_jti)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token already used or revoked",
        )

    user_id, family_id = token_data

    # Verify user match
    if user_id != sub:
        logger.error("User ID mismatch: stored=%s, claim=%s", user_id, sub)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Token is valid → delete old one and issue new one in same family
    await family_manager.delete_token(old_jti)

    refresh_token, refresh_jti = create_refresh(sub)
    ttl = _refresh_max_age()

    # Store new token in same family
    await family_manager.store_refresh_token(refresh_jti, family_id, sub, ttl)
    set_refresh_cookie(response, refresh_token)


async def _refresh_nuclear_strategy(
    old_jti: str, sub: str, response: Response, r: redis.Redis
) -> None:
    """
    Handle refresh using nuclear strategy.

    On token reuse, log warning but don't revoke all sessions (current simple behavior).
    """
    # Simple delete and reissue (original behavior)
    await r.delete(f"refresh:{old_jti}")

    refresh_token, refresh_jti = create_refresh(sub)
    await r.setex(f"refresh:{refresh_jti}", _refresh_max_age(), sub)
    set_refresh_cookie(response, refresh_token)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    r: redis.Redis = Depends(get_redis),
) -> dict[str, bool]:
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
                    logger.warning("Failed to revoke refresh token %s during logout: %s", jti, e)

        except Exception as e:
            # token couldn't be decoded / malformed / expired / tampered
            # Don't fail logout for that, but record it.
            logger.debug("Invalid refresh token during logout: %s", e)

    # Always clear the browser cookie so the client is logged out regardless
    clear_refresh_cookie(response)
    return {"ok": True}
