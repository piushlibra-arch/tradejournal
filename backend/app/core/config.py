from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://tradejournal:tradejournal_dev@localhost:5433/tradejournal"
    DATABASE_URL_SYNC: str = "postgresql://tradejournal:tradejournal_dev@localhost:5433/tradejournal"

    # JWT Authentication
    JWT_SECRET_KEY: str = "mytradejournal-super-secret-development-key-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for dev convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS & Allowed Origins
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    # App Environment & Metadata
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "MyTradeJournal"
    API_V1_PREFIX: str = "/api/v1"

    # Startup & Migrations
    RUN_MIGRATIONS_ON_START: bool = False

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_async_db_url(cls, v: str) -> str:
        """Ensure DATABASE_URL uses postgresql+asyncpg:// driver for async SQLAlchemy engines.
        Render PostgreSQL provides URLs starting with postgres:// or postgresql://.
        """
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("DATABASE_URL_SYNC", mode="after")
    @classmethod
    def assemble_sync_db_url(cls, v: str) -> str:
        """Ensure DATABASE_URL_SYNC uses synchronous postgresql:// driver."""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        if v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql+asyncpg://", "postgresql://", 1)
        return v

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Enforce strict secret hygiene in production environments.

        Guarantees that:
        1. Insecure default development JWT secrets are rejected in production.
        2. Production JWT secret has sufficient cryptographic entropy (>= 32 chars).
        3. Localhost database URLs or development passwords are not mistakenly used in production.
        4. DATABASE_URL_SYNC is aligned with DATABASE_URL in production.
        """
        is_prod = self.ENVIRONMENT.lower() in ("production", "prod", "staging")
        if is_prod:
            insecure_jwt_placeholders = {
                "mytradejournal-super-secret-development-key-32chars",
                "change-me-in-production-use-a-long-random-string",
                "replace-with-a-random-secret",
                "replace-with-a-secure-random-32-plus-character-secret-in-production",
                "secret",
                "changeme",
                "password",
            }
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY.strip() in insecure_jwt_placeholders:
                raise ValueError(
                    "Production configuration error: JWT_SECRET_KEY is using an insecure or default placeholder value. "
                    "A secure, randomly generated key of at least 32 characters must be configured in production."
                )
            if len(self.JWT_SECRET_KEY.strip()) < 32:
                raise ValueError("Production configuration error: JWT_SECRET_KEY must be at least 32 characters long.")

            # Check database URL in production
            db_lower = self.DATABASE_URL.lower()
            if "localhost" in db_lower or "127.0.0.1" in db_lower:
                raise ValueError(
                    "Production configuration error: DATABASE_URL points to localhost/127.0.0.1. "
                    "A managed remote database URL must be configured for production."
                )
            if "tradejournal_dev" in db_lower:
                raise ValueError(
                    "Production configuration error: DATABASE_URL is using the development fallback password. "
                    "A secure database password must be configured in production."
                )

            # Align synchronous DB URL if it remained at dev default
            if "localhost" in self.DATABASE_URL_SYNC or "127.0.0.1" in self.DATABASE_URL_SYNC:
                self.DATABASE_URL_SYNC = self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

        return self

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if self.FRONTEND_URL:
            clean_fe = self.FRONTEND_URL.strip().rstrip("/")
            if clean_fe and clean_fe not in origins:
                origins.append(clean_fe)
        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
