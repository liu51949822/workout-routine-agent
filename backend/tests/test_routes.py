"""Tests for the FastAPI routes (offline, mocked LLM)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import routes

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_agent_cache():
    """Reset the module-level agent singleton between tests so mocked agents
    don't leak across test cases."""
    routes._agent_cache = None
    yield
    routes._agent_cache = None


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert "workout" in body["app"].lower()


def test_exercise_library():
    r = client.get("/api/exercises")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 8
    assert data["exercises"][0]["name"]


def test_exercise_search_hit():
    r = client.get("/api/exercises/search?q=core")
    assert r.status_code == 200
    names = [e["name"] for e in r.json()["exercises"]]
    assert "Plank" in names


def test_exercise_search_miss():
    r = client.get("/api/exercises/search?q=zzz")
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_chat_rejects_empty_message():
    r = client.post("/api/chat", json={"message": ""})
    assert r.status_code == 422


def test_chat_requires_api_key():
    with patch("app.config.OPENAI_API_KEY", ""):
        r = client.post("/api/chat", json={"message": "give me a workout"})
        assert r.status_code == 502
        assert "Agent request failed" in r.json()["detail"]


@patch("app.routes.create_workout_agent")
@patch("app.config.OPENAI_API_KEY", "dummy")
def test_chat_success(mock_create_agent):
    fake_result = {"messages": [MagicMock(), MagicMock()]}
    fake_result["messages"][1].content = "Here is your workout plan!"
    fake_agent = MagicMock()
    fake_agent.ainvoke = AsyncMock(return_value=fake_result)
    mock_create_agent.return_value = fake_agent

    r = client.post("/api/chat", json={"message": "give me a 10 min core workout"})
    assert r.status_code == 200
    assert r.json()["reply"] == "Here is your workout plan!"


@patch("app.routes.create_workout_agent")
@patch("app.config.OPENAI_API_KEY", "dummy")
def test_chat_stream_yields_tokens_only(mock_create_agent):
    """SSE must yield token frames only — never ToolMessage content."""

    async def fake_astream(*args, **kwargs):
        # stream_mode="messages" yields (chunk, metadata) pairs.
        # A ToolMessage chunk must be skipped; only AIMessage text goes out.
        from langchain_core.messages import AIMessageChunk, ToolMessage
        tool_msg = ToolMessage(content="SECRET RETRIEVED DOC TEXT", tool_call_id="t1")
        ai_msg = AIMessageChunk(content="Here is your plan")
        yield (tool_msg, {})
        yield (ai_msg, {})

    fake_agent = MagicMock()
    fake_agent.astream = fake_astream
    mock_create_agent.return_value = fake_agent

    with client.stream(
        "POST", "/api/chat/stream", json={"message": "give me a workout"}
    ) as r:
        assert r.status_code == 200
        body = "".join(r.iter_text())
        assert "SECRET RETRIEVED DOC TEXT" not in body
        assert "Here is your plan" in body
        assert "done" in body
