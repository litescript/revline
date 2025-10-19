from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from datetime import timedelta
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_API_DIR = _REPO_ROOT / "api"


class Settings(BaseSettings):
    # 1. Core database + JWT
    database_url: str = Field(..., alias="DATABASE_URL")
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")

    # 2. Refresh token + session lifecycle
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    cookie_domain: str | None = Field(None, alias="COOKIE_DOMAIN")
    cookie_secure: bool = Field(False, alias="COOKIE_SECURE")
    cookie_samesite: str = Field("Lax", alias="COOKIE_SAMESITE")

    # 3. CORS + Redis
    cors_origins: str = Field("http://localhost:5173", alias="CORS_ORIGINS")
    redis_url: str = Field("redis://redis:6379/0", alias="REDIS_URL")

    # 4. Derived helpers for timedeltas
    @property
    def access_token_ttl(self) -> timedelta:
        return timedelta(minutes=self.jwt_expire_minutes)

    @property
    def refresh_token_ttl(self) -> timedelta:
        return timedelta(days=self.refresh_token_expire_days)

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


settings = Settings()  # type: ignore[call-arg]
