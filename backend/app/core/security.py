import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


# Configure bcrypt context
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def _preprocess_password(password: str) -> str:
    """
    Preprocess password to handle bcrypt's 72-byte limit.
    Always ensure the password is ≤ 72 bytes when UTF-8 encoded.
    For passwords longer than 72 bytes, we hash them first with SHA256.
    """
    password_bytes = password.encode("utf-8")
    
    # If password is already ≤ 72 bytes, use it as-is
    if len(password_bytes) <= 72:
        return password
    
    # For passwords > 72 bytes, hash with SHA256 to get fixed 64-char hex string
    # This ensures we always have exactly 64 bytes (64 hex characters)
    sha256_hash = hashlib.sha256(password_bytes).hexdigest()
    
    # Double-check: hexdigest should be exactly 64 chars = 64 bytes
    assert len(sha256_hash.encode("utf-8")) == 64, "SHA256 hexdigest should be 64 bytes"
    
    return sha256_hash


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Automatically handles passwords longer than 72 bytes by pre-hashing.
    """
    processed = _preprocess_password(password)
    # Ensure processed password is ≤ 72 bytes
    processed_bytes = processed.encode("utf-8")
    if len(processed_bytes) > 72:
        # Truncate to 72 bytes (safety check)
        processed = processed_bytes[:72].decode("utf-8", errors="ignore")
    
    try:
        return pwd_context.hash(processed)
    except ValueError as e:
        if "72 bytes" in str(e):
            # If somehow still too long, truncate and retry
            processed_truncated = processed.encode("utf-8")[:72].decode("utf-8", errors="ignore")
            return pwd_context.hash(processed_truncated)
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    Automatically handles passwords longer than 72 bytes by pre-hashing.
    """
    processed = _preprocess_password(plain_password)
    # Ensure processed password is ≤ 72 bytes (matching hash_password behavior)
    processed_bytes = processed.encode("utf-8")
    if len(processed_bytes) > 72:
        # Truncate to 72 bytes (safety check)
        processed = processed_bytes[:72].decode("utf-8", errors="ignore")
    
    try:
        return pwd_context.verify(processed, hashed_password)
    except ValueError as e:
        if "72 bytes" in str(e):
            # If somehow still too long, truncate and retry
            processed_truncated = processed.encode("utf-8")[:72].decode("utf-8", errors="ignore")
            return pwd_context.verify(processed_truncated, hashed_password)
        raise


# Note: We don't force early initialization here because passlib's bug detection
# uses a hardcoded long test string that can cause errors. Instead, we handle
# password length in our hash/verify functions before calling passlib.


def create_access_token(
    subject: str, roles: list[str], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expires_minutes)
    expire = datetime.utcnow() + expires_delta
    to_encode: dict[str, Any] = {"sub": subject, "roles": roles, "type": "access", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(
    subject: str, expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=settings.refresh_token_expires_days)
    expire = datetime.utcnow() + expires_delta
    to_encode: dict[str, Any] = {"sub": subject, "type": "refresh", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid token") from exc

