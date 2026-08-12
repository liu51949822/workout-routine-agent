"""Memory module for the Workout Routine Agent backend.

Implements the "full memory stack":
  1. Short-term (thread) memory  — session-scoped summary + rolling window
  2. Long-term (cross-thread) memory — persistent user profile
  3. Vector / semantic memory    — retrieve similar past conversations

Design notes (matches LangGraph's official Checkpointer + Store split):
  - The client `history` is the single source of truth for short-term context.
    The server only ACCUMULATES a summary (never edits history), avoiding
    double-write conflicts.
  - All stores are in-memory (optionally file-persisted) so the backend runs
    without any database; the interfaces mirror LangGraph Store semantics so a
    production swap (PostgresStore / checkpointer) is a drop-in change.
  - Memory operations fail silently (degrade, never raise) so a memory hiccup
    can never break a chat request.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Short-term (thread-scoped) memory
# ---------------------------------------------------------------------------

# Tune these to control how much recent raw history stays in context
# before it is compressed into a summary.
MAX_RECENT_MESSAGES = 6
SUMMARY_THRESHOLD = 10


@dataclass
class ShortTermMemory:
    """Session-scoped memory: one summary per session (thread).

    The client sends the full `history` each request (source of truth); this
    class keeps only a cached summary so we can summarize the long tail once
    and reuse it across turns, instead of re-reading every old message.
    """

    summary: str = ""
    messages_seen: int = 0
    # Map session_id -> ShortTermMemory
    _sessions: dict = field(default_factory=dict, init=False)

    def get_session(self, session_id: str) -> "ShortTermMemory":
        if session_id not in self._sessions:
            self._sessions[session_id] = ShortTermMemory()
        return self._sessions[session_id]

    def short_term_context(self, session_id: str | None, history: list[dict] | None) -> dict:
        """Return {summary, recent} for the given session.

        `history` is the client-provided conversation (source of truth).
        We return the cached summary plus the last N messages.
        """
        safe_history = history if isinstance(history, list) else []
        session = self.get_session(session_id) if session_id else ShortTermMemory()

        # We summarize lazily: if we have never seen this many messages before
        # and the history has grown past the threshold, regenerate the summary.
        if (
            len(safe_history) >= SUMMARY_THRESHOLD
            and len(safe_history) > session.messages_seen
        ):
            try:
                session.summary = _summarize_conversation(safe_history, session.summary)
            except Exception as exc:  # pragma: no cover - LLM failure
                logger.warning("summary generation failed, keeping cached: %s", exc)
            session.messages_seen = len(safe_history)

        return {
            "summary": session.summary,
            "recent": safe_history[-MAX_RECENT_MESSAGES:],
        }


def _summarize_conversation(messages: list[dict], existing: str) -> str:
    """Compress old messages into a short summary using the LLM."""
    from langchain_openai import ChatOpenAI

    from app import config

    llm = ChatOpenAI(model=config.MODEL_NAME, temperature=0.2)
    history_text = "\n".join(
        f"{'User' if m.get('role') == 'user' else 'Coach'}: {m.get('content', '')}"
        for m in messages
    )
    prompt = (
        "Summarize the following fitness-coaching conversation into a concise "
        "summary (keep: user goals, preferences, constraints, decisions made, "
        "important advice given). Max 200 words.\n\n"
        f"{'Existing summary:\n' + existing + '\n\n' if existing else ''}"
        f"Conversation:\n{history_text}\n\nSummary:"
    )
    return llm.invoke(prompt).content.strip()[:1000]


# ---------------------------------------------------------------------------
# Long-term (cross-thread) memory — user profile
# ---------------------------------------------------------------------------

PROFILES_FILE = Path(__file__).resolve().parent.parent / "data" / "memory" / "profiles.json"


def _is_test() -> bool:
    """Return True when running under pytest (checked dynamically because
    PYTEST_CURRENT_TEST is only set at runtime, not at import time)."""
    return os.getenv("PYTEST_CURRENT_TEST") is not None


@dataclass
class LongTermMemory:
    """Cross-session user profile memory (Store-style, one doc per user)."""

    _profiles: dict = field(default_factory=dict, init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False)

    def _load(self) -> None:
        if _is_test():
            return
        try:
            if PROFILES_FILE.exists():
                import json

                self._profiles = json.loads(PROFILES_FILE.read_text("utf-8"))
        except Exception as exc:  # pragma: no cover
            logger.warning("failed to load profiles: %s", exc)

    def _save(self) -> None:
        if _is_test():
            return
        try:
            import json

            PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)
            PROFILES_FILE.write_text(
                json.dumps(self._profiles, ensure_ascii=False, indent=2), "utf-8"
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("failed to save profiles: %s", exc)

    def get_profile(self, user_id: str | None) -> dict:
        if not user_id:
            return {}
        return self._profiles.get(user_id, {})

    def update_profile(self, user_id: str | None, message: str) -> dict:
        """Extract/merge structured profile facts from a user message."""
        if not user_id:
            return {}
        existing = self.get_profile(user_id)
        try:
            updated = _extract_profile(message, existing)
            merged = _merge_profiles(existing, updated)
            with self._lock:
                self._profiles[user_id] = merged
                self._save()
            return merged
        except Exception as exc:  # pragma: no cover - LLM failure
            logger.warning("profile update failed, keeping existing: %s", exc)
            return existing


def _extract_profile(message: str, existing: dict) -> dict:
    """Ask the LLM to extract structured profile facts from one message."""
    from langchain_openai import ChatOpenAI

    from app import config

    llm = ChatOpenAI(model=config.MODEL_NAME, temperature=0.2)
    prompt = (
        "You extract structured user profile facts from a fitness-coaching "
        "message. Only extract what is directly stated; do not guess. "
        "Return JSON with these keys (arrays of strings): "
        '{"goals":[], "constraints":[], "preferences":[], "equipment":[]}. '
        f"Existing profile: {existing or '{}'}\n"
        f"User message: {message}\n"
        "JSON:"
    )
    raw = llm.invoke(prompt).content
    import json
    import re

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {}
    return json.loads(match.group(0))


def _merge_profiles(existing: dict, new: dict) -> dict:
    """Merge new profile facts into existing, deduped and capped.

    Defensively accepts only string lists (LLM output may be malformed).
    """
    merged: dict[str, list[str]] = {}
    for key in ("goals", "constraints", "preferences", "equipment"):
        old = existing.get(key)
        fresh = new.get(key)
        old = old if isinstance(old, list) else []
        fresh = fresh if isinstance(fresh, list) else []
        combined = list(dict.fromkeys([str(x) for x in old] + [str(x) for x in fresh]))
        merged[key] = combined[:20]
    return merged


# ---------------------------------------------------------------------------
# Vector / semantic memory — retrieve similar past conversations
# ---------------------------------------------------------------------------


@dataclass
class VectorMemory:
    """Semantic memory: store past QA pairs as embeddings and retrieve by
    cosine similarity. In-memory now; swap to pgvector/PostgresStore in prod.
    """

    _items: list = field(default_factory=list, init=False)
    _max_items: int = 500

    def _embed(self, text: str) -> list[float]:
        from langchain_openai import OpenAIEmbeddings

        from app import config

        embeddings = OpenAIEmbeddings(model=config.EMBEDDING_MODEL)
        return embeddings.embed_query(text)

    def save(self, user_id: str | None, question: str, answer: str) -> None:
        if not user_id or not question or not answer:
            return
        try:
            vec = self._embed(question)
            self._items.append(
                {
                    "user_id": user_id,
                    "question": question,
                    "answer": answer,
                    "embedding": vec,
                    "ts": __import__("time").time(),
                }
            )
            if len(self._items) > self._max_items:
                self._items = sorted(self._items, key=lambda x: x["ts"])[-self._max_items :]
        except Exception as exc:  # pragma: no cover - embedding failure
            logger.warning("vector memory save failed: %s", exc)

    def search(self, user_id: str | None, query: str, k: int = 3) -> list[dict]:
        if not user_id or not query:
            return []
        try:
            qvec = self._embed(query)
            scored = []
            for item in self._items:
                if item["user_id"] != user_id:
                    continue
                score = _cosine(qvec, item["embedding"])
                scored.append((score, item))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [
                {"question": item["question"], "answer": item["answer"][:300]}
                for _, item in scored[:k]
            ]
        except Exception as exc:  # pragma: no cover
            logger.warning("vector memory search failed: %s", exc)
            return []


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    return dot / (na * nb + 1e-9)


# ---------------------------------------------------------------------------
# Facade
# ---------------------------------------------------------------------------


class MemoryService:
    """Single entry point combining all three memory types."""

    def __init__(self) -> None:
        self.short = ShortTermMemory()
        self.long = LongTermMemory()
        self.long._load()
        self.vector = VectorMemory()

    def build_context(
        self,
        session_id: str | None,
        user_id: str | None,
        history: list[dict] | None,
        user_message: str,
        profile: dict | None,
    ) -> dict:
        """Assemble the memory context to inject into the agent's system prompt."""
        short = self.short.short_term_context(session_id, history)
        long_profile = self.long.get_profile(user_id) if not profile else profile
        relevant = self.vector.search(user_id, user_message, 3)

        parts = []
        if short["summary"]:
            parts.append(f"Conversation summary: {short['summary']}")
        if long_profile:
            facts = _format_profile(long_profile)
            if facts:
                parts.append(f"User profile: {facts}")
        for item in relevant:
            parts.append(
                f"Past conversation (for reference): Q: {item['question']} | A: {item['answer']}"
            )
        return {"summary": short["summary"], "context_text": "\n\n".join(parts)}

    def record_turn(
        self,
        user_id: str | None,
        user_message: str,
        reply: str,
    ) -> None:
        """Persist a completed turn to long-term + vector memory."""
        self.long.update_profile(user_id, user_message)
        self.vector.save(user_id, user_message, reply)


def _format_profile(profile: dict) -> str:
    """Format profile dict into a compact string for the prompt.

    Keeps the keys aligned with the mobile app's Profile type (goals,
    equipment) plus the extra memory-extracted dimensions when present.
    """
    parts = []
    for key, label in (
        ("goals", "Goals"),
        ("constraints", "Constraints"),
        ("preferences", "Preferences"),
        ("equipment", "Equipment"),
    ):
        vals = profile.get(key) or []
        if isinstance(vals, list) and vals:
            parts.append(f"{label}: {', '.join(str(v) for v in vals)}")
    return "; ".join(parts)
