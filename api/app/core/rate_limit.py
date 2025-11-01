"""Redis-backed rate limiting for auth endpoints."""
from __future__ import annotations
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from redis import asyncio as redis
from redis.exceptions import RedisError
from .config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


def init_rate_limiter(r: redis.Redis) -> None:
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
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """
    Redis-backed rate limiter using sliding window.

    Usage in route:
        @router.post("/auth/login")
        async def login(request: Request, limiter: None = Depends(RateLimiter(times=5, seconds=60))):
            ...
    """

    def __init__(self, times: int = 5, seconds: int = 60):
        """
        Configure rate limit.

        Args:
            times: Maximum number of requests allowed
            seconds: Time window in seconds
        """
        self.times = times
        self.seconds = seconds

    async def __call__(self, request: Request) -> None:
        """Check if request exceeds rate limit, raise 429 if so."""
        if _redis_client is None:
            # Fail open if Redis unavailable (log warning but allow request)
            logger.warning("Rate limiter called but Redis client not initialized")
            return

        client_ip = get_client_ip(request)
        key = f"rate_limit:{request.url.path}:{client_ip}"

        try:
            # Increment counter
            current = await _redis_client.incr(key)

            # Set TTL on first request in window
            if current == 1:
                await _redis_client.expire(key, self.seconds)

            # Check if limit exceeded
            if current > self.times:
                logger.warning(
                    "Rate limit exceeded: %s from %s (%d/%d in %ds)",
                    request.url.path,
                    client_ip,
                    current,
                    self.times,
                    self.seconds,
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Try again in {self.seconds} seconds.",
                )
        except RedisError as e:
            # Fail open on Redis errors (log but allow request)
            logger.error("Rate limiter Redis error: %s", e)
            return


# Default rate limiters for auth endpoints
# Configurable via environment or override in routes
def get_auth_limiter() -> RateLimiter:
    """Get rate limiter configured for auth endpoints (default 5 req/60s)."""
    times = getattr(settings, "auth_rate_limit_times", 5)
    seconds = getattr(settings, "auth_rate_limit_seconds", 60)
    return RateLimiter(times=times, seconds=seconds)
