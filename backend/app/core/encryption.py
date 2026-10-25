import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet() -> Fernet:
    if hasattr(settings.JWT_SECRET_KEY, "get_secret_value"):
        secret = settings.JWT_SECRET_KEY.get_secret_value()
    else:
        secret = str(settings.JWT_SECRET_KEY)
    key_bytes = hashlib.sha256(secret.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_token(plain_text: str) -> str:
    """Encrypt a sensitive token (e.g. Dhan Access Token) before database persistence."""
    if not plain_text:
        return ""
    f = _get_fernet()
    return f.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_token(cipher_text: str) -> str:
    """Decrypt an encrypted broker access token for outgoing API calls."""
    if not cipher_text:
        return ""
    f = _get_fernet()
    try:
        return f.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""
