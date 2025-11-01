"""Shared test fixtures for Revline API tests."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from redis.asyncio import Redis
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from unittest.mock import AsyncMock

from app.core.db import get_db
from app.main import api
from app.models.base import Base
from app.services.redis import get_redis

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a fresh in-memory SQLite database for each test."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provide a database session for tests."""
    TestingSessionLocal = sessionmaker(bind=db_engine, expire_on_commit=False)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def mock_redis():
    """Mock Redis client for tests."""
    mock = AsyncMock(spec=Redis)
    mock.get = AsyncMock(return_value=None)
    mock.setex = AsyncMock()
    mock.delete = AsyncMock()
    mock.incr = AsyncMock(return_value=1)
    mock.expire = AsyncMock()
    return mock


@pytest.fixture(scope="function")
def client(db_session: Session, mock_redis: AsyncMock):
    """Provide a FastAPI test client with overridden dependencies."""

    def override_get_db():
        yield db_session

    async def override_get_redis():
        return mock_redis

    api.dependency_overrides[get_db] = override_get_db
    api.dependency_overrides[get_redis] = override_get_redis

    with TestClient(api) as test_client:
        yield test_client

    api.dependency_overrides.clear()
