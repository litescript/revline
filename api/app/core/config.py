"""Application configuration loaded from environment variables."""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[3]
_API_DIR = _REPO_ROOT / "api"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # 1. Core database + JWT
    database_url: str = Field(..., alias="DATABASE_URL")
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")

    # JWT validation (optional, required in production)
    jwt_issuer: str | None = Field(None, alias="JWT_ISSUER")
    jwt_audience: str | None = Field(None, alias="JWT_AUDIENCE")

    # 2. Refresh token + session lifecycle
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    refresh_threshold_minutes: int = Field(5, alias="REFRESH_THRESHOLD_MINUTES")
    auth_refresh_strategy: str = Field("nuclear", alias="AUTH_REFRESH_STRATEGY")

    # Cookie settings
    auth_cookie_mode: bool = Field(True, alias="AUTH_COOKIE_MODE")
    cookie_domain: str | None = Field(None, alias="COOKIE_DOMAIN")
    cookie_secure: bool = Field(False, alias="COOKIE_SECURE")
    cookie_samesite: str = Field("Lax", alias="COOKIE_SAMESITE")

    # 3. CORS + Redis
    cors_origins: str = Field(
        "http://localhost:5173,http://127.0.0.1:5173", alias="CORS_ORIGINS"
    )
    redis_url: str = Field("redis://redis:6379/0", alias="REDIS_URL")

    # 4. Derived helpers for timedeltas
    @property
    def access_token_ttl(self) -> timedelta:
        """Get access token TTL as timedelta."""
        return timedelta(minutes=self.jwt_expire_minutes)

    @property
    def refresh_token_ttl(self) -> timedelta:
        """Get refresh token TTL as timedelta."""
        return timedelta(days=self.refresh_token_expire_days)

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS env var into list."""
        origins = [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
        # Guard against empty list (fail-safe: localhost only)
        return origins if origins else ["http://localhost:5173"]

    # 5. Pydantic config: load .env automatically
    model_config = SettingsConfigDict(
        env_file=[
            _REPO_ROOT / ".env",  # <- repo root
            # _API_DIR / ".env",  # optional: api/.env if you ever add one
            Path(".env"),  # optional: cwd fallback
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global settings instance
settings = Settings()
