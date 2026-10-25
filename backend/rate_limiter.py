from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared Limiter instance for FastAPI app and routers
limiter = Limiter(key_func=get_remote_address)
