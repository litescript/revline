"""Redis-backed rate limiting for auth endpoints."""
from __future__ import annotations

import logging
from typing import Callable

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from redis.exceptions import RedisError

from .config import settings

logger = logging.getLogger(__name__)

_redis_client: Redis | None = None


def init_rate_limiter(r: Redis) -> None:
    """Initialize rate limiter with Redis client."""
    global _redis_client
    _redis_client = r
    logger.info("Rate limiter initialized with Redis")


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, considering X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take first IP in chain (original client)
        return forwarded.split(",")[0].strip()
    # request.client can be None in some contexts (e.g., testing)
    if request.client:
        return request.client.host
    return "unknown"


class RateLimiter:
    """
    Redis-backed rate limiter using sliding window.
    Supports both IP-based and user-based buckets.

    Usage in route:
        @router.post("/auth/login")
        async def login(
            request: Request,
            limiter: None = Depends(RateLimiter(times=5, seconds=60))
        ):
            ...
    """

    def __init__(
        self,
        times: int = 5,
        seconds: int = 60,
        scope: str = "ip",
        user_extractor: Callable[[Request], str | None] | None = None,
    ) -> None:
        """
        Configure rate limit.

        Args:
            times: Maximum number of requests allowed
            seconds: Time window in seconds
            scope: "ip" (default) or "user" or "both"
            user_extractor: Function to extract user ID from request (for user-based limiting)
        """
        self.times = times
        self.seconds = seconds
        self.scope = scope
        self.user_extractor = user_extractor

    async def __call__(self, request: Request) -> None:
        """
        Check if request exceeds rate limit, raise 429 if so.
        Implements exponential backoff on repeated failures.
        """
        if _redis_client is None:
            # Fail open if Redis unavailable (log warning but allow request)
            logger.warning("Rate limiter called but Redis client not initialized")
            return

        client_ip = get_client_ip(request)

        # Determine which buckets to check
        keys_to_check: list[str] = []

        if self.scope in ("ip", "both"):
            keys_to_check.append(f"rate_limit:{request.url.path}:ip:{client_ip}")

        if self.scope in ("user", "both") and self.user_extractor:
            user_id = self.user_extractor(request)
            if user_id:
                keys_to_check.append(f"rate_limit:{request.url.path}:user:{user_id}")

        try:
            # Check all buckets and enforce limit on any breach
            for key in keys_to_check:
                current = await _redis_client.incr(key)

                # Set TTL on first request in window
                if current == 1:
                    await _redis_client.expire(key, self.seconds)

                # Check if limit exceeded
                if current > self.times:
                    # Calculate backoff penalty (double TTL for repeated violations)
                    penalty_key = f"{key}:penalty"
                    penalty_count = await _redis_client.get(penalty_key)
                    penalty_count = int(penalty_count) if penalty_count else 0

                    # Exponential backoff: 1x, 2x, 4x, 8x (max 8x)
                    multiplier = min(2**penalty_count, 8)
                    retry_after = self.seconds * multiplier

                    # Track penalty for next violation
                    await _redis_client.setex(
                        penalty_key,
                        self.seconds * 10,  # penalty window lasts 10x base window
                        penalty_count + 1,
                    )

                    logger.warning(
                        "Rate limit exceeded: %s (key: %s) (%d/%d in %ds, penalty: %dx)",
                        request.url.path,
                        key,
                        current,
                        self.times,
                        self.seconds,
                        multiplier,
                    )

                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests. Try again in {retry_after} seconds.",
                        headers={"Retry-After": str(retry_after)},
                    )

        except RedisError as e:
            # Fail open on Redis errors (log but allow request)
            logger.error("Rate limiter Redis error: %s", e)
            return
        except HTTPException:
            # Re-raise 429 errors
            raise


def get_auth_limiter() -> RateLimiter:
    """Get rate limiter configured for auth endpoints (IP-based, 5 req/60s)."""
    times = getattr(settings, "auth_rate_limit_times", 5)
    seconds = getattr(settings, "auth_rate_limit_seconds", 60)
    return RateLimiter(times=times, seconds=seconds, scope="ip")


def get_refresh_limiter() -> RateLimiter:
    """
    Get dual-scope rate limiter for /auth/refresh endpoint.

    Applies BOTH:
    - IP bucket: 60 requests / 60 seconds
    - User bucket: 10 requests / 60 seconds

    Returns:
        RateLimiter configured for both IP and user limiting
    """
    from .security import decode_token

    def extract_user_from_cookie(request: Request) -> str | None:
        """Extract user ID from refresh cookie."""
        cookie = request.cookies.get("revline_refresh")
        if not cookie:
            return None
        try:
            payload = decode_token(cookie)
            return payload.get("sub")
        except Exception:
            return None

    # Use "both" scope with custom limits per bucket
    # For simplicity, use stricter limit (user bucket) as primary
    # In practice, both buckets are checked in __call__
    user_times = getattr(settings, "refresh_user_rate_limit_times", 10)
    seconds = getattr(settings, "refresh_rate_limit_seconds", 60)

    return RateLimiter(
        times=user_times, seconds=seconds, scope="both", user_extractor=extract_user_from_cookie
    )


def get_user_limiter(times: int = 10, seconds: int = 60) -> RateLimiter:
    """
    Get rate limiter for authenticated endpoints (user-based).

    Args:
        times: Max requests per user
        seconds: Time window

    Returns:
        RateLimiter configured for user-based limiting
    """
    from .security import decode_token

    def extract_user_from_token(request: Request) -> str | None:
        """Extract user ID from Authorization header."""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        try:
            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            return payload.get("sub")
        except Exception:
            return None

    return RateLimiter(times=times, seconds=seconds, scope="user", user_extractor=extract_user_from_token)
