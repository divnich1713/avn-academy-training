import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import test_engine, stats

app = FastAPI(
    title="AVN Academy cadet testing microservice",
    description="Adaptive cadet testing system API using ELO rating system.",
    version="1.0.0"
)

# CORS configuration
origins = [
    "https://avn-academy-training.netlify.app",
    "http://localhost:5173",
    "http://localhost:4173",
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

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "cadet-testing-api",
        "schema": settings.SCHEMA
    }
