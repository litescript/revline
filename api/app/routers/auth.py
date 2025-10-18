from fastapi import APIRouter, Depends, Header, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from redis import asyncio as redis
from typing import Optional, Literal, cast

from ..core.db import get_db
from ..core.security import (
    create_access,
    create_refresh,
    decode_token,
    hash_password,
    verify_password,
)
from ..core.config import settings
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserOut
from ..services.redis import get_redis


router = APIRouter(prefix="/auth", tags=["auth"])


# ------------------------------
# Cookie helpers (typed + normalized)
# ------------------------------
def _normalize_samesite(val: Optional[str]) -> Optional[Literal["lax", "strict", "none"]]:
    if val is None:
        return None
    v = val.strip().lower()
    if v in ("lax", "strict", "none"):
        # cast to satisfy type checker Literal union
        return cast(Literal["lax", "strict", "none"], v)
    # fallback to lax if invalid
    return cast(Literal["lax"], "lax")


def _normalize_domain(val: Optional[str]) -> Optional[str]:
    # Convert empty string to None, keep real domains (e.g., "revline.dev")
    if not val:
        return None
    v = val.strip()
    return v if v else None


def _access_max_age() -> int:
    if hasattr(settings, "access_token_ttl"):
        return int(settings.access_token_ttl.total_seconds())
    minutes = getattr(
        settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
    )
    return int(minutes) * 60


def _refresh_max_age() -> int:
    if hasattr(settings, "refresh_token_ttl"):
        return int(settings.refresh_token_ttl.total_seconds())
    days = getattr(settings, "refresh_token_expire_days", 7)
    return int(days) * 24 * 3600


def _set_refresh_cookie(resp: Response, refresh_token: str) -> None:
    resp.set_cookie(
        key="revline_refresh",
        value=refresh_token,
        max_age=_refresh_max_age(),
        secure=bool(getattr(settings, "cookie_secure", False)),
        httponly=True,
        samesite=_normalize_samesite(getattr(settings, "cookie_samesite", "lax")),
        domain=_normalize_domain(getattr(settings, "cookie_domain", None)),
        path="/api/v1/auth",
    )


def _delete_refresh_cookie(resp: Response) -> None:
    resp.delete_cookie(
        key="revline_refresh",
        domain=_normalize_domain(getattr(settings, "cookie_domain", None)),
        path="/api/v1/auth",
    )


# ------------------------------
# Register
# ------------------------------
@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
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
    return user


# ------------------------------
# Login (returns access; sets refresh cookie)
# ------------------------------
@router.post("/login")
async def login(
    payload: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
    r: redis.Redis = Depends(get_redis),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # New flow: short-lived access + long-lived refresh cookie (rotatable)
    access_token, _ = create_access(sub=str(user.id))
    refresh_token, refresh_jti = create_refresh(sub=str(user.id))

    # allowlist refresh JTI with TTL
    refresh_ttl = (
        int(getattr(settings, "refresh_token_ttl").total_seconds())
        if hasattr(settings, "refresh_token_ttl")
        else 7 * 24 * 3600
    )
    await r.setex(f"refresh:{refresh_jti}", refresh_ttl, str(user.id))

    _set_refresh_cookie(response, refresh_token)

    # Keep original fields; add expires_in to help client cache TTL
    access_ttl = (
        int(getattr(settings, "access_token_ttl").total_seconds())
        if hasattr(settings, "access_token_ttl")
        else int(
            getattr(
                settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
            )
            * 60
        )
    )
    return {"access_token": access_token, "token_type": "bearer", "expires_in": access_ttl}


# ------------------------------
# Me
# ------------------------------
@router.get("/me", response_model=UserOut)
def me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = decode_token(token)  # uses new helper
        # If tokens carry a "type", enforce access-only here
        t = payload.get("type")
        if t is not None and t != "access":
            raise HTTPException(status_code=401, detail="Wrong token type")
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, int(sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ------------------------------
# Refresh (rotate refresh cookie; return new access)
# ------------------------------
@router.post("/refresh")
async def refresh(request: Request, response: Response, r: redis.Redis = Depends(get_redis)):
    cookie = request.cookies.get("revline_refresh")
    if not cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh cookie")

    try:
        payload = decode_token(cookie)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")

    jti = payload.get("jti")
    user_id = await r.get(f"refresh:{jti}") if jti else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh revoked")

    # Rotate refresh
    await r.delete(f"refresh:{jti}")
    new_refresh, new_refresh_jti = create_refresh(sub=user_id)
    refresh_ttl = (
        int(getattr(settings, "refresh_token_ttl").total_seconds())
        if hasattr(settings, "refresh_token_ttl")
        else 7 * 24 * 3600
    )
    await r.setex(f"refresh:{new_refresh_jti}", refresh_ttl, user_id)
    _set_refresh_cookie(response, new_refresh)

    # Issue new access
    new_access, _ = create_access(sub=user_id)
    access_ttl = (
        int(getattr(settings, "access_token_ttl").total_seconds())
        if hasattr(settings, "access_token_ttl")
        else int(
            getattr(
                settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
            )
            * 60
        )
    )
    return {"access_token": new_access, "token_type": "bearer", "expires_in": access_ttl}


# ------------------------------
# Logout (revoke refresh; clear cookie)
# ------------------------------
@router.post("/logout")
async def logout(request: Request, response: Response, r: redis.Redis = Depends(get_redis)):
    cookie = request.cookies.get("revline_refresh")
    if cookie:
        try:
            payload = decode_token(cookie)
            jti = payload.get("jti")
            if jti:
                await r.delete(f"refresh:{jti}")
        except Exception:
            pass
    _delete_refresh_cookie(response)
    return {"ok": True}
