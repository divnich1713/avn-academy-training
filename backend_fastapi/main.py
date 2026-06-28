import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from config import settings
from database import AsyncSessionLocal
from redis_client import redis_client
from routers import test_engine, stats, faction

logger = logging.getLogger(__name__)

# --- Startup security check ---
if not settings.DISCORD_BOT_SECRET:
    logger.warning(
        "⚠️  DISCORD_BOT_SECRET is not set! "
        "Bot authentication is effectively disabled. "
        "Set the DISCORD_BOT_SECRET environment variable before deploying to production."
    )

app = FastAPI(
    title="AVN Academy cadet testing microservice",
    description="Adaptive cadet testing system API using ELO rating system.",
    version="1.0.0"
)

# CORS configuration
origins = [
    "https://avn-academy.ru",
    "https://www.avn-academy.ru",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(test_engine.router)
app.include_router(stats.router)
app.include_router(faction.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "cadet-testing-api",
        "schema": settings.SCHEMA
    }


@app.get("/health")
async def health_check():
    """Health check endpoint that verifies DB and Redis connectivity."""
    checks = {"status": "ok", "db": False, "redis": False}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            checks["db"] = True
    except Exception as e:
        checks["status"] = "degraded"
        checks["db_error"] = str(e)
    try:
        await redis_client.ping()
        checks["redis"] = True
    except Exception as e:
        checks["status"] = "degraded"
        checks["redis_error"] = str(e)
    return checks
