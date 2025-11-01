"""Tests for token family tracking."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.token_family import TokenFamily


@pytest.fixture
def mock_redis():
    """Create a mock async Redis client."""
    redis = AsyncMock()
    redis.setex = AsyncMock()
    redis.get = AsyncMock()
    redis.delete = AsyncMock()
    redis.scan = AsyncMock()
    return redis


@pytest.mark.asyncio
async def test_create_family(mock_redis):
    """Test creating a new token family."""
    family_manager = TokenFamily(mock_redis)

    family_id = await family_manager.create_family("user_123")

    assert family_id is not None
    assert len(family_id) == 36  # UUID format
    mock_redis.setex.assert_called_once()


@pytest.mark.asyncio
async def test_store_and_retrieve_token(mock_redis):
    """Test storing and retrieving token with family."""
    family_manager = TokenFamily(mock_redis)

    # Store token
    await family_manager.store_refresh_token("jti_123", "family_456", "user_789", 3600)

    # Mock Redis scan to return our key
    mock_redis.scan.return_value = (0, [b"refresh:jti_123:family:family_456"])
    mock_redis.get.return_value = b"user_789:family_456"

    # Retrieve token family
    result = await family_manager.get_token_family("jti_123")

    assert result is not None
    user_id, family_id = result
    assert user_id == "user_789"
    assert family_id == "family_456"


@pytest.mark.asyncio
async def test_revoke_family(mock_redis):
    """Test revoking an entire token family."""
    family_manager = TokenFamily(mock_redis)

    # Mock scan to return some tokens in the family
    mock_redis.scan.return_value = (
        0,
        [b"refresh:jti_1:family:family_456", b"refresh:jti_2:family:family_456"],
    )

    await family_manager.revoke_family("family_456")

    # Should delete family key + all associated tokens
    assert mock_redis.delete.call_count >= 2  # Family key + token keys


@pytest.mark.asyncio
async def test_get_family_user(mock_redis):
    """Test getting user ID from family."""
    family_manager = TokenFamily(mock_redis)

    # Mock Redis to return user ID
    mock_redis.get.return_value = b"user_123"

    user_id = await family_manager.get_family_user("family_456")

    assert user_id == "user_123"
    mock_redis.get.assert_called_once_with("family:family_456")


@pytest.mark.asyncio
async def test_get_family_user_not_found(mock_redis):
    """Test getting user ID from non-existent family."""
    family_manager = TokenFamily(mock_redis)

    # Mock Redis to return None (family doesn't exist)
    mock_redis.get.return_value = None

    user_id = await family_manager.get_family_user("family_999")

    assert user_id is None


@pytest.mark.asyncio
async def test_delete_token(mock_redis):
    """Test deleting a specific token."""
    family_manager = TokenFamily(mock_redis)

    # Mock scan to find the token
    mock_redis.scan.return_value = (0, [b"refresh:jti_123:family:family_456"])

    await family_manager.delete_token("jti_123")

    # Should delete the found token
    mock_redis.delete.assert_called_once()
