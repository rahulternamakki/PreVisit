import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import settings
from database import check_database_connection
from routers.intakes import router as intakes_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="PreVisit API",
    description="Backend service for PreVisit - AI-powered patient intake and doctor summary generator",
    version="0.1.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS setup
origins = list(set([
    settings.FRONTEND_URL.rstrip("/"),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(intakes_router)

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
