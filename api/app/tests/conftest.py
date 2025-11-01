# api/app/tests/conftest.py
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

# Import the FastAPI app instance
# Your uvicorn CMD is "app.main:api", so we import the same object here.
from app.main import api as app


@pytest.fixture(scope="function")
def client() -> TestClient:
    """
    FastAPI TestClient for sync-style tests (e.g., header checks).
    Uses the same app instance as production so middleware order is preserved.
    """
    with TestClient(app) as c:
        yield c
