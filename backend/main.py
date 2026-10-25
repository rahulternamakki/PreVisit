import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from rate_limiter import limiter
from config import settings
from database import check_database_connection
from routers.intakes import router as intakes_router
from routers.doctor import router as doctor_router

app = FastAPI(
    title="PreVisit API",
    description="Backend service for PreVisit - AI-powered patient intake and doctor summary generator",
    version="0.1.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS setup - allow configured frontend origin(s), Vercel deployments, and local dev
configured_origins = [url.strip().rstrip("/") for url in settings.FRONTEND_URL.split(",") if url.strip()]
origins = list(set(configured_origins + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# HTTP Security Headers Middleware (OWASP recommended defense-in-depth)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include Routers
app.include_router(intakes_router)
app.include_router(doctor_router)

@app.get("/")
def root():
    return {
        "service": "PreVisit API",
        "status": "healthy",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    db_health = check_database_connection()
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": db_health
    }

@app.get("/api/database/status")
def database_status():
    """
    Dedicated endpoint to verify Supabase connection & table readiness.
    """
    return check_database_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
