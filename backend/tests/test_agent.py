"""Tests for the workout agent core (offline, no API key / no network).

These tests mock the OpenAI LLM and embeddings so they can run anywhere.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app import config
from app.agent import (
    SYSTEM_PROMPT,
    load_documents,
    split_documents,
    create_retriever_tool_for,
    create_workout_agent,
)


def test_system_prompt_mentions_retrieval_tool():
    assert "search_exercise_docs" in SYSTEM_PROMPT


def test_load_documents_reads_txt_resources():
    docs = load_documents()
    assert len(docs) >= 5
    # Personal goals doc should be present
    texts = "\n".join(d.page_content for d in docs)
    assert "Personal Fitness Goals" in texts or "fitness" in texts.lower()


def test_load_documents_raises_when_missing(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_documents(resources_path=tmp_path / "nope")


def test_split_documents_creates_chunks():
    docs = load_documents()
    splits = split_documents(docs)
    assert len(splits) > 0
    # Chunk size should respect the configured limit
    assert all(len(c.page_content) <= config.CHUNK_SIZE + config.CHUNK_OVERLAP for c in splits)


def test_retriever_tool_registration():
    fake_store = MagicMock()
    tool = create_retriever_tool_for(fake_store, k=3)
    assert tool.name == "search_exercise_docs"
    assert "fitness" in tool.description.lower()
    fake_store.as_retriever.assert_called_once()


@patch("app.agent.ChatOpenAI")
@patch("app.agent.get_vector_store")
def test_create_workout_agent_returns_streamable_graph(mock_store, mock_chat):
    mock_store.return_value = MagicMock()
    mock_chat.return_value = MagicMock()
    agent = create_workout_agent()
    # create_agent returns a CompiledStateGraph with stream support
    assert hasattr(agent, "stream")
    assert hasattr(agent, "ainvoke")
