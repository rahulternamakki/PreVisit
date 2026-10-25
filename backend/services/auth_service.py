import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

security = HTTPBearer(auto_error=False)

def verify_doctor_passcode(passcode: str) -> bool:
    """
    Verifies the provided passcode against the server configured DOCTOR_PASSCODE.
    Uses hmac.compare_digest to mitigate timing attacks.
    """
    if not passcode:
        return False
    configured = (settings.DOCTOR_PASSCODE or "").strip().encode("utf-8")
    provided = passcode.strip().encode("utf-8")
    return hmac.compare_digest(configured, provided)

def create_doctor_token(expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT session token for an authenticated doctor.
    """
    now = datetime.now(timezone.utc)
    expiration = now + (expires_delta if expires_delta else timedelta(hours=24))
    payload = {
        "sub": "doctor",
        "role": "doctor",
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    secret = settings.JWT_SECRET_KEY or "previsit_doctor_secret_fallback_key"
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

def verify_doctor_token(token: str) -> Dict[str, Any]:
    """
    Validates the doctor JWT token and returns its payload.
    Raises ValueError on expired or invalid token.
    """
    secret = settings.JWT_SECRET_KEY or "previsit_doctor_secret_fallback_key"
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("role") != "doctor":
            raise ValueError("Token does not have doctor authorization role.")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Doctor session has expired. Please log in again.")
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid doctor authentication token: {str(e)}")

def get_current_doctor(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces doctor authentication.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Doctor passcode authentication required. Missing session credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        return verify_doctor_token(credentials.credentials)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
