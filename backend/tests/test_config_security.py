from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import create_access_token, decode_token


def test_development_settings_defaults():
    """Verify that development environment loads safe local defaults."""
    s = Settings(
        ENVIRONMENT="development",
        JWT_SECRET_KEY="mytradejournal-super-secret-development-key-32chars",
        DATABASE_URL="postgresql+asyncpg://tradejournal:tradejournal_dev@localhost:5433/tradejournal",
    )
    assert s.ENVIRONMENT == "development"
    assert s.JWT_ALGORITHM == "HS256"
    assert "postgresql+asyncpg://" in s.DATABASE_URL
    assert len(s.cors_origins_list) >= 1


def test_production_rejects_insecure_default_jwt_secret():
    """Verify that production mode strictly rejects default/placeholder JWT secrets."""
    insecure_keys = [
        "mytradejournal-super-secret-development-key-32chars",
        "change-me-in-production-use-a-long-random-string",
        "replace-with-a-random-secret",
        "secret",
        "password",
    ]
    for bad_key in insecure_keys:
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY=bad_key,
                DATABASE_URL="postgresql+asyncpg://app_user:strong_prod_pass_123@prod-db.render.com:5432/tradejournal_prod",
            )
        assert "JWT_SECRET_KEY is using an insecure or default placeholder value" in str(exc_info.value)


def test_production_rejects_short_jwt_secret():
    """Verify that production mode requires at least 32 characters of cryptographic entropy."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="short-secret-only-24-char",
            DATABASE_URL="postgresql+asyncpg://app_user:strong_prod_pass_123@prod-db.render.com:5432/tradejournal_prod",
        )
    assert "JWT_SECRET_KEY must be at least 32 characters long" in str(exc_info.value)


def test_production_rejects_localhost_database():
    """Verify that production mode prevents accidental connection to localhost database."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/tradejournal",
        )
    assert "DATABASE_URL points to localhost/127.0.0.1" in str(exc_info.value)


def test_production_rejects_dev_password_in_database():
    """Verify that production mode rejects the default dev password in DATABASE_URL."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql+asyncpg://user:tradejournal_dev@remote-host:5432/tradejournal",
        )
    assert "DATABASE_URL is using the development fallback password" in str(exc_info.value)


def test_production_valid_configuration_and_sync_url_alignment():
    """Verify that valid production configuration passes and syncs DATABASE_URL_SYNC."""
    prod_async_url = "postgresql+asyncpg://prod_user:SuperSecureProdPass987!@remote-postgres.render.com:5432/tradejournal_prod"
    s = Settings(
        ENVIRONMENT="production",
        JWT_SECRET_KEY="super-secure-production-random-key-with-64-characters-of-entropy!!",
        DATABASE_URL=prod_async_url,
    )
    assert s.ENVIRONMENT == "production"
    assert s.DATABASE_URL == prod_async_url
    assert s.DATABASE_URL_SYNC == "postgresql://prod_user:SuperSecureProdPass987!@remote-postgres.render.com:5432/tradejournal_prod"


def test_database_url_render_normalization():
    """Verify that Render's native postgres:// and postgresql:// are normalized to asyncpg."""
    s1 = Settings(DATABASE_URL="postgres://user:pass@host:5432/db")
    assert s1.DATABASE_URL.startswith("postgresql+asyncpg://")

    s2 = Settings(DATABASE_URL="postgresql://user:pass@host:5432/db")
    assert s2.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_cors_origins_parsing_and_frontend_url_inclusion():
    """Verify CORS origins parsing strips slashes and deduplicates."""
    s = Settings(
        CORS_ORIGINS="http://localhost:3000/, https://app.tradejournal.com/ ",
        FRONTEND_URL="https://app.tradejournal.com/",
    )
    origins = s.cors_origins_list
    assert "http://localhost:3000" in origins
    assert "https://app.tradejournal.com" in origins
    # Ensure no trailing slashes
    for o in origins:
        assert not o.endswith("/")


def test_jwt_token_creation_and_expiration():
    """Verify token encode, decode, and rejection of expired signatures."""
    test_secret = "test-secret-key-with-32-chars-long-1234"
    test_subject = "user-uuid-12345"

    # Valid token
    token = create_access_token(subject=test_subject, expires_delta=timedelta(minutes=15))
    decoded = decode_token(token)
    assert decoded["sub"] == test_subject
    assert decoded["type"] == "access"

    # Expired token
    expired_payload = {
        "sub": test_subject,
        "exp": datetime.now(timezone.utc) - timedelta(minutes=10),
        "type": "access",
    }
    expired_token = jwt.encode(expired_payload, test_secret, algorithm="HS256")
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(expired_token, test_secret, algorithms=["HS256"])


def test_error_envelope_sanitization():
    """Verify that internal error details never contain raw secrets."""
    # Ensure that exception messages from validation do not leak passwords
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="short",
            DATABASE_URL="postgresql+asyncpg://user:secret_prod_pass@localhost:5432/db",
        )
    error_str = str(exc_info.value)
    # The message should explain the rule, not echo the connection string with the secret password
    assert "secret_prod_pass" not in error_str
