"""Workout RAG agent core.

Migrated from the original single-file `workout_agent.py` and refactored into
a service layer with:
  * FAISS persistence (save_local / load_local) to avoid rebuilding on every start
  * An inline system prompt instead of `hub.pull()` (offline-friendly, testable)
  * A factory that returns a LangGraph agent (`create_agent`) supporting
    `.stream()` / `.astream()` for SSE responses.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from langchain.agents import create_agent
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.tools.retriever import create_retriever_tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app import config

logger = logging.getLogger(__name__)

# Inline system prompt (replaces `hub.pull("hwchase17/openai-tools-agent")`).
# Kept local so the agent is fully offline-capable and unit-testable.
SYSTEM_PROMPT = """\
You are a knowledgeable, experienced personal trainer and fitness coach.

You help users build personalized workout routines based on their personal \
fitness notes, exercise science research, YouTube transcripts, and web \
articles about training.

When a user asks for a workout plan, use the `search_exercise_docs` tool to \
retrieve relevant background material from the knowledge base, then design a \
clear, safe, and actionable routine. Include:

- Warm-up and cool-down recommendations
- Exercise selection with sets/reps/rest guidance
- Progression and scaling options for different fitness levels
- Safety and form tips
- Recovery guidance

Always be specific, practical, and encouraging. If you are unsure about a \
medical or safety concern, recommend consulting a qualified professional.
"""


def load_documents(resources_path: Optional[Path] = None) -> list[Document]:
    """Load all PDF and TXT documents from the resources folder."""
    resources_dir = resources_path or config.RESOURCES_DIR
    if not resources_dir.exists():
        raise FileNotFoundError(f"Resources directory not found: {resources_dir}")

    documents: list[Document] = []

    # PDF files
    pdf_loader = DirectoryLoader(
        str(resources_dir),
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,  # type: ignore[arg-type] - PyPDFLoader not in langchain's FILE_LOADER_TYPE union
        show_progress=False,
    )
    try:
        pdf_docs = pdf_loader.load()
        documents.extend(pdf_docs)
        logger.info("Loaded %d PDF documents", len(pdf_docs))
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("No PDF files found or error loading: %s", exc)

    # TXT files
    txt_loader = DirectoryLoader(
        str(resources_dir),
        glob="**/*.txt",
        loader_cls=TextLoader,
        show_progress=False,
    )
    try:
        txt_docs = txt_loader.load()
        documents.extend(txt_docs)
        logger.info("Loaded %d TXT documents", len(txt_docs))
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("No TXT files found or error loading: %s", exc)

    logger.info("Total documents loaded: %d", len(documents))
    return documents


def split_documents(documents: list[Document]) -> list[Document]:
    """Split documents into overlapping chunks for retrieval."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )
    splits = text_splitter.split_documents(documents)
    logger.info("Created %d text chunks", len(splits))
    return splits


def _embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model=config.EMBEDDING_MODEL)


def build_vector_store(documents: list[Document], persist: bool = True) -> FAISS:
    """Create a FAISS vector store and optionally persist it to disk."""
    splits = split_documents(documents)
    store = FAISS.from_documents(splits, _embeddings())
    if persist:
        save_vector_store(store)
    return store


def save_vector_store(store: FAISS) -> None:
    """Persist the FAISS index to disk."""
    config.INDEX_DIR.mkdir(parents=True, exist_ok=True)
    store.save_local(str(config.FAISS_INDEX_PATH))


def load_vector_store() -> Optional[FAISS]:
    """Load a previously persisted FAISS index, or None if missing."""
    if not config.FAISS_INDEX_FAISS.exists():
        return None
    return FAISS.load_local(
        str(config.FAISS_INDEX_PATH),
        embeddings=_embeddings(),
        allow_dangerous_deserialization=True,
    )


def get_vector_store(persist: bool = True) -> FAISS:
    """Return a vector store, loading from disk if available, else building it.

    Persisting avoids rebuilding the index on every server start. Rebuild if
    the index is missing or stale.
    """
    store = load_vector_store()
    if store is not None:
        logger.info("Loaded FAISS index from disk")
        return store
    logger.info("FAISS index not found, building from resources...")
    documents = load_documents()
    if not documents:
        raise RuntimeError("No documents found in resources folder.")
    return build_vector_store(documents, persist=persist)


def create_retriever_tool_for(store: FAISS, k: int = config.RETRIEVER_K):
    """Wrap a FAISS store as an agent tool."""
    retriever = store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )
    return create_retriever_tool(
        retriever,
        name="search_exercise_docs",
        description=(
            "Searches excerpts from personal notes, YouTube transcripts, "
            "research papers, and web articles about exercising, workouts, "
            "training routines, and fitness. Use this tool to find relevant "
            "information about exercises, techniques, and training principles."
        ),
    )


def create_workout_agent(store: Optional[FAISS] = None, model_name: str | None = None):
    """Build the workout agent as a LangGraph agent (supports stream/astream)."""
    store = store or get_vector_store()
    retriever_tool = create_retriever_tool_for(store)

    llm = ChatOpenAI(
        model=model_name or config.MODEL_NAME,
        temperature=0.7,
    )

    return create_agent(
        model=llm,
        tools=[retriever_tool],
        system_prompt=SYSTEM_PROMPT,
        name="workout_agent",
    )
