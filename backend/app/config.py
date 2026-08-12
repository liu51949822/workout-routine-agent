"""Configuration for the Workout Routine Agent backend."""

from __future__ import annotations

import os
from pathlib import Path

# Base directories: backend/ (parent of app/)
BASE_DIR = Path(__file__).resolve().parent.parent
RESOURCES_DIR = BASE_DIR / "data" / "resources"
INDEX_DIR = BASE_DIR / "data" / "index"

# Environment / secrets
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# RAG / vector store settings
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
RETRIEVER_K = 5

# FAISS persistence
FAISS_INDEX_PATH = INDEX_DIR / "workout_index"
FAISS_INDEX_PKL = FAISS_INDEX_PATH / "index.pkl"
FAISS_INDEX_FAISS = FAISS_INDEX_PATH / "index.faiss"

# API
API_PREFIX = "/api"


def require_api_key() -> None:
    """Fail fast with a clear message if OPENAI_API_KEY is missing."""
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Set it in your environment or in a .env file "
            "before starting the server."
        )
