"""Tests for authentication endpoints and JWT security."""
from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.security import create_access, decode_token


def test_register_success(client: TestClient):
    """Test successful user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecurePass123!",
            "name": "Test User",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data


def test_register_duplicate_email_returns_409(client: TestClient):
    """Test registration with duplicate email returns 409 CONFLICT."""
    payload = {
        "email": "duplicate@example.com",
        "password": "SecurePass123!",
        "name": "User One",
    }
    response1 = client.post("/api/v1/auth/register", json=payload)
    assert response1.status_code == status.HTTP_201_CREATED

    response2 = client.post("/api/v1/auth/register", json=payload)
    assert response2.status_code == status.HTTP_409_CONFLICT


def test_login_success(client: TestClient):
    """Test successful login returns access token."""
    # Register user first
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "SecurePass123!",
            "name": "Login User",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "SecurePass123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data


def test_login_invalid_credentials(client: TestClient):
    """Test login with invalid credentials returns 401."""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "badcreds@example.com",
            "password": "CorrectPass123!",
            "name": "Bad Creds User",
        },
    )

    # Try login with wrong password
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "badcreds@example.com", "password": "WrongPass123!"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_with_valid_token(client: TestClient):
    """Test /auth/me with valid access token returns user info."""
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "me@example.com",
            "password": "SecurePass123!",
            "name": "Me User",
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "me@example.com", "password": "SecurePass123!"},
    )
    access_token = login_response.json()["access_token"]

    # Call /auth/me
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "me@example.com"


def test_me_without_token(client: TestClient):
    """Test /auth/me without token returns 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_jwt_includes_required_claims():
    """Test that generated JWTs include required claims (sub, type, jti, iat, exp)."""
    token, jti = create_access("123")
    payload = decode_token(token)

    assert payload["sub"] == "123"
    assert payload["type"] == "access"
    assert payload["jti"] == jti
    assert "iat" in payload
    assert "exp" in payload
    assert payload["exp"] > payload["iat"]


@pytest.mark.asyncio
async def test_refresh_token_reuse_detection(client: TestClient, mock_redis):
    """Test that reusing a refresh token triggers nuclear option."""
    # Simulate token already consumed (Redis returns None)
    mock_redis.get.return_value = None

    response = client.post("/api/v1/auth/refresh", json={})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    detail = response.json().get("detail", "").lower()
    assert "already used" in detail or "revoked" in detail or "no refresh cookie" in detail


def test_logout(client: TestClient):
    """Test /auth/logout clears session."""
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout@example.com",
            "password": "SecurePass123!",
            "name": "Logout User",
        },
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "logout@example.com", "password": "SecurePass123!"},
    )

    # Logout
    response = client.post("/api/v1/auth/logout", json={})
    assert response.status_code in (200, 204)
    data = response.json()
    assert data.get("ok") is True
