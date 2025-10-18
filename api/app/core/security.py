from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Tuple
import uuid
import jwt
from passlib.context import CryptContext

from .config import settings

# ---- Password hashing (unchanged) -------------------------------------------------
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(pw: str, pw_hash: str) -> bool:
    return pwd_ctx.verify(pw, pw_hash)


# ---- Settings compatibility helpers ----------------------------------------------
# Support either (jwt_alg, access_token_expire_minutes) or (jwt_algorithm, jwt_expire_minutes)
_ALG = getattr(settings, "jwt_alg", getattr(settings, "jwt_algorithm", "HS256"))
_ACCESS_MIN = getattr(
    settings, "access_token_expire_minutes", getattr(settings, "jwt_expire_minutes", 60)
)

# Optional refresh settings (fallbacks if not present)
_REFRESH_DAYS = getattr(settings, "refresh_token_expire_days", 7)

# If your config provides timedeltas (access_token_ttl/refresh_token_ttl), prefer those:
if hasattr(settings, "access_token_ttl"):
    _ACCESS_TTL = int(getattr(settings, "access_token_ttl").total_seconds())
else:
    _ACCESS_TTL = int(timedelta(minutes=_ACCESS_MIN).total_seconds())

if hasattr(settings, "refresh_token_ttl"):
    _REFRESH_TTL = int(getattr(settings, "refresh_token_ttl").total_seconds())
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
    Returns (token, jti). Encodes standard claims:
    - sub: subject (user identifier)
    - type: "access" | "refresh"
    - jti: unique token id for allow/deny listing
    - iat/exp: issued-at / expiration (epoch seconds, UTC)
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
    return jwt.decode(token, _SECRET, algorithms=[_ALG])


# ---- Public API: access / refresh creation ---------------------------------------
def create_access(sub: str) -> Tuple[str, str]:
    """Return (access_token, jti) with short TTL."""
    return _create_token(sub, _ACCESS_TTL, "access")


def create_refresh(sub: str) -> Tuple[str, str]:
    """Return (refresh_token, jti) with long TTL."""
    return _create_token(sub, _REFRESH_TTL, "refresh")


# ---- Backward compatibility shims ------------------------------------------------
# Your previous code used create_access_token() -> str and decode_access_token()
def create_access_token(sub: str) -> str:
    """Compatibility wrapper: returns only the encoded access token."""
    tok, _ = create_access(sub)
    return tok


def decode_access_token(token: str) -> dict:
    """Compatibility wrapper: decodes any token; callers formerly passed only access tokens."""
    return decode_token(token)
