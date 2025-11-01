"""Token family tracking for refresh token rotation."""
from __future__ import annotations

import uuid
from typing import Optional

from redis.asyncio import Redis

from .config import settings


class TokenFamily:
    """
    Manages refresh token families for per-device tracking.

    Each login creates a unique family_id (UUID). All refresh tokens
    for that session share the same family_id. On token reuse, only
    that family is revoked (not all user sessions).

    Future: Consider abstracting behind a FamilyStore interface to support
    PostgreSQL backend for durability/audit tracking in future sprints.
    """

    def __init__(self, redis: Redis):
        """
        Initialize token family manager.

        Args:
            redis: Async Redis client
        """
        self.redis = redis
        self.ttl_seconds = settings.token_family_ttl_days * 24 * 3600

    async def create_family(self, user_id: str) -> str:
        """
        Create a new token family for a user.

        Args:
            user_id: User ID

        Returns:
            family_id (UUID string)
        """
        family_id = str(uuid.uuid4())

        # Store family metadata in Redis
        key = f"family:{family_id}"
        await self.redis.setex(key, self.ttl_seconds, user_id)

        return family_id

    async def get_family_user(self, family_id: str) -> Optional[str]:
        """
        Get user ID associated with a token family.

        Args:
            family_id: Family ID

        Returns:
            User ID if family exists, None otherwise
        """
        key = f"family:{family_id}"
        user_id = await self.redis.get(key)

        if user_id:
            return user_id.decode("utf-8")
        return None

    async def revoke_family(self, family_id: str) -> None:
        """
        Revoke an entire token family (all tokens in this family become invalid).

        Args:
            family_id: Family ID to revoke
        """
        # Delete family record
        family_key = f"family:{family_id}"
        await self.redis.delete(family_key)

        # Delete all tokens associated with this family
        # Use SCAN to find all refresh tokens for this family
        cursor = 0
        pattern = f"refresh:*:family:{family_id}"

        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break

    async def store_refresh_token(
        self, jti: str, family_id: str, user_id: str, ttl_seconds: int
    ) -> None:
        """
        Store refresh token with family association.

        Args:
            jti: JWT ID
            family_id: Token family ID
            user_id: User ID
            ttl_seconds: Time to live in seconds
        """
        # Store token with family reference
        key = f"refresh:{jti}:family:{family_id}"
        value = f"{user_id}:{family_id}"
        await self.redis.setex(key, ttl_seconds, value)

    async def get_token_family(self, jti: str) -> Optional[tuple[str, str]]:
        """
        Get family ID and user ID for a refresh token.

        Args:
            jti: JWT ID

        Returns:
            Tuple of (user_id, family_id) if token exists, None otherwise
        """
        # Try to find token key with wildcard family
        cursor = 0
        pattern = f"refresh:{jti}:family:*"

        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern, count=10)
            if keys:
                # Found the token, extract value
                value = await self.redis.get(keys[0])
                if value:
                    parts = value.decode("utf-8").split(":", 1)
                    if len(parts) == 2:
                        return (parts[0], parts[1])  # (user_id, family_id)
            if cursor == 0:
                break

        return None

    async def delete_token(self, jti: str) -> None:
        """
        Delete a specific refresh token.

        Args:
            jti: JWT ID to delete
        """
        cursor = 0
        pattern = f"refresh:{jti}:family:*"

        while True:
            cursor, keys = await self.redis.scan(cursor, match=pattern, count=10)
            if keys:
                await self.redis.delete(*keys)
            if cursor == 0:
                break
