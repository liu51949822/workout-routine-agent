"""Tests for the memory module (offline, mocked LLM/embeddings)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.memory import (
    MemoryService,
    ShortTermMemory,
    _merge_profiles,
)


@pytest.fixture
def memory():
    return MemoryService()


# ---------------- Short-term ----------------

def test_short_term_keeps_recent_history():
    m = ShortTermMemory()
    history = [{"role": "user", "content": f"msg{i}"} for i in range(4)]
    ctx = m.short_term_context("s1", history)
    assert ctx["summary"] == ""
    assert len(ctx["recent"]) == 4


@patch("app.memory._summarize_conversation", return_value="SUMMARY")
def test_short_term_summarizes_long_history(mock_sum):
    m = ShortTermMemory()
    history = [{"role": "user", "content": f"msg{i}"} for i in range(12)]
    ctx = m.short_term_context("s1", history)
    mock_sum.assert_called_once()
    assert ctx["summary"] == "SUMMARY"
    # recent is capped
    assert len(ctx["recent"]) == 6


def test_short_term_isolates_sessions():
    m = ShortTermMemory()
    m.get_session("a").summary = "AAA"
    ctx_b = m.short_term_context("b", [])
    assert ctx_b["summary"] == ""


def test_short_term_history_none():
    m = ShortTermMemory()
    ctx = m.short_term_context("s1", None)
    assert ctx["recent"] == []
    assert ctx["summary"] == ""


# ---------------- Long-term ----------------

def test_profile_empty_without_user():
    m = MemoryService()
    assert m.long.get_profile(None) == {}


@patch("app.memory._extract_profile", return_value={"goals": ["lose weight"]})
def test_profile_update_merges(mock_extract):
    m = MemoryService()
    p = m.long.update_profile("u1", "I want to lose weight")
    assert p["goals"] == ["lose weight"]
    # second turn with same goal dedupes
    p2 = m.long.update_profile("u1", "still want to lose weight")
    assert p2["goals"] == ["lose weight"]


def test_profile_update_failure_keeps_existing():
    m = MemoryService()
    with patch("app.memory._extract_profile", side_effect=Exception("LLM fail")):
        p = m.long.update_profile("u1", "hi")
    assert p == {}


def test_merge_profiles_dedupes_and_caps():
    merged = _merge_profiles(
        {"goals": ["a", "b"], "constraints": []},
        {"goals": ["b", "c"], "constraints": ["knee"]},
    )
    assert merged["goals"] == ["a", "b", "c"]
    assert merged["constraints"] == ["knee"]


# ---------------- Vector ----------------

def test_vector_memory_save_and_search():
    m = MemoryService()
    with patch.object(m.vector, "_embed", side_effect=[[1, 0], [1, 0]]):
        m.vector.save("u1", "core workout", "do planks")
        hits = m.vector.search("u1", "core", k=2)
    assert len(hits) == 1
    assert hits[0]["question"] == "core workout"


def test_vector_memory_user_isolation():
    m = MemoryService()
    with patch.object(m.vector, "_embed", return_value=[1, 0]):
        m.vector.save("u1", "leg day", "squats")
        hits = m.vector.search("u2", "leg day", k=2)
    assert hits == []


def test_vector_memory_failure_returns_empty():
    m = MemoryService()
    with patch.object(m.vector, "_embed", side_effect=Exception("embed fail")):
        hits = m.vector.search("u1", "anything", k=2)
    assert hits == []


# ---------------- Facade ----------------

def test_build_context_empty_when_no_memory():
    m = MemoryService()
    ctx = m.build_context(None, None, None, "hello", None)
    assert ctx["context_text"] == ""
    assert ctx["summary"] == ""


def test_build_context_includes_profile_and_vector():
    m = MemoryService()
    with patch.object(m.vector, "_embed", side_effect=[[1, 0], [1, 0]]):
        m.vector.save("u1", "core workout", "planks")
        ctx = m.build_context(
            session_id="s1",
            user_id="u1",
            history=[{"role": "user", "content": "x"}],
            user_message="core",
            profile={"goals": ["strength"]},
        )
    assert "strength" in ctx["context_text"]
    assert "planks" in ctx["context_text"]


def test_record_turn_does_not_raise():
    m = MemoryService()
    with patch.object(m.vector, "_embed", return_value=[1, 0]):
        m.record_turn("u1", "tell me a plan", "do squats")  # should not raise
