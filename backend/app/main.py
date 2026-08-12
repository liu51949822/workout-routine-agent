"""FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Workout Routine Agent API",
    description="RAG-powered personal training assistant backed by LangChain/LangGraph.",
    version="1.0.0",
)

# CORS: allow the Expo dev server and any configured origins.
ALLOWED_ORIGINS = [
    "http://localhost:8081",  # Expo dev
    "http://localhost:19006",  # Expo web fallback
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {"app": "Workout Routine Agent", "docs": "/docs", "health": "/api/health"}
