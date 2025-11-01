"""Tests for security headers middleware."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_basic_security_headers_present(client: TestClient):
    """Test that basic security headers are present on all responses."""
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Cross-Origin-Resource-Policy"] == "same-origin"
    assert "geolocation=()" in response.headers["Permissions-Policy"]


def test_csp_header_strict_mode(client: TestClient, monkeypatch):
    """Test CSP header in strict mode."""
    from app.core import config

    monkeypatch.setattr(config.settings, "csp_mode", "strict")

    response = client.get("/api/v1/health")

    assert "Content-Security-Policy" in response.headers
    csp = response.headers["Content-Security-Policy"]
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "connect-src 'self' ws: wss:" in csp
    assert "font-src 'self' data:" in csp


def test_csp_header_off_mode(client: TestClient, monkeypatch):
    """Test CSP header disabled when mode is off."""
    from app.core import config

    monkeypatch.setattr(config.settings, "csp_mode", "off")

    # Need to reload middleware to pick up new settings
    # In practice, restart server
    response = client.get("/api/v1/health")

    # CSP should not be present
    assert "Content-Security-Policy" not in response.headers or response.headers.get(
        "Content-Security-Policy"
    ) == ""


def test_coop_coep_headers_enabled(client: TestClient, monkeypatch):
    """Test COOP and COEP headers when enabled."""
    from app.core import config

    monkeypatch.setattr(config.settings, "coop_coep_enabled", True)

    response = client.get("/api/v1/health")

    assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"
    assert response.headers["Cross-Origin-Embedder-Policy"] == "require-corp"


def test_coop_coep_headers_disabled(client: TestClient, monkeypatch):
    """Test COOP and COEP headers not present when disabled."""
    from app.core import config

    monkeypatch.setattr(config.settings, "coop_coep_enabled", False)

    response = client.get("/api/v1/health")

    assert "Cross-Origin-Opener-Policy" not in response.headers
    assert "Cross-Origin-Embedder-Policy" not in response.headers
