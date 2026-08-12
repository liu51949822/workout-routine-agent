"""API routes for the Workout Routine Agent backend."""

from __future__ import annotations

import json
import logging
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessageChunk

from app import config
from app.agent import create_workout_agent
from app.schemas import ChatRequest, ChatResponse, Exercise, ExerciseLibrary

logger = logging.getLogger(__name__)

router = APIRouter(prefix=config.API_PREFIX, tags=["workout"])

# Built-in exercise library (static seed data served to the mobile app).
EXERCISE_LIBRARY: list[Exercise] = [
    Exercise(name="Bodyweight Squat", muscle_group="Lower Body", equipment="None", difficulty="beginner",
             instructions=["Stand feet shoulder-width apart.", "Lower hips to parallel.", "Drive through heels to stand."]),
    Exercise(name="Push-Up", muscle_group="Upper Body", equipment="None", difficulty="beginner",
             instructions=["Plank position, hands under shoulders.", "Lower chest to floor.", "Press back up."]),
    Exercise(name="Plank", muscle_group="Core", equipment="None", difficulty="beginner",
             instructions=["Forearms on floor, body straight.", "Brace core and hold."]),
    Exercise(name="Dead Bug", muscle_group="Core", equipment="None", difficulty="beginner",
             instructions=["Lie on back, knees at 90 deg.", "Extend opposite arm and leg.", "Keep lower back flat."]),
    Exercise(name="Goblet Squat", muscle_group="Lower Body", equipment="Kettlebell", difficulty="intermediate",
             instructions=["Hold kettlebell at chest.", "Squat keeping chest tall.", "Drive up through heels."]),
    Exercise(name="Mountain Climbers", muscle_group="Full Body", equipment="None", difficulty="intermediate",
             instructions=["Plank position.", "Drive knees to chest alternately.", "Keep hips low."]),
    Exercise(name="Pallof Press", muscle_group="Core", equipment="Resistance Band", difficulty="intermediate",
             instructions=["Band at chest height.", "Press out and resist rotation.", "Hold, return slowly."]),
    Exercise(name="Burpee", muscle_group="Full Body", equipment="None", difficulty="advanced",
             instructions=["Squat, hands on floor.", "Jump back to plank.", "Jump feet forward, jump up."]),
]


@router.get("/health")
async def health() -> dict:
    return {"status": "healthy"}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Non-streaming chat with the workout agent."""
    try:
        config.require_api_key()
        agent = _agent_or_error()
        result = await agent.ainvoke({"messages": [{"role": "user", "content": req.message}]})
        reply = result["messages"][-1].content
        return ChatResponse(reply=str(reply))
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - LLM/network errors
        logger.error("Chat failed: %s", exc)
        raise HTTPException(status_code=502, detail="Agent request failed")


# Module-level agent singleton — building the agent (FAISS load + graph compile)
# is expensive, so reuse it across requests. LangGraph compiled graphs are
# stateless and safe to share.
_agent_cache = None


def _agent_or_error():
    """Return the cached agent, building it once (errors surface as HTTP 500)."""
    global _agent_cache
    try:
        if _agent_cache is None:
            _agent_cache = create_workout_agent()
        return _agent_cache
    except Exception as exc:  # pragma: no cover - depends on OpenAI credentials
        logger.error("Failed to build agent: %s", exc)
        raise HTTPException(status_code=500, detail="Agent initialization failed")


async def _chat_stream(req: ChatRequest) -> AsyncGenerator[str, None]:
    """Yield SSE `data:` frames from the agent's token stream."""
    try:
        config.require_api_key()
        agent = _agent_or_error()
        # stream_mode="messages" yields (chunk, metadata) pairs for token-level
        # increments, so we never forward ToolMessage (retrieved doc text) or
        # full graph states to the client.
        async for chunk, _meta in agent.astream(
            {"messages": [{"role": "user", "content": req.message}]},
            stream_mode="messages",
        ):
            # In "messages" mode the chunk is an AIMessageChunk; Tool/System
            # messages never appear here, but guard against retrieving raw doc
            # text leaking to the client anyway.
            if not isinstance(chunk, AIMessageChunk):
                continue
            content = chunk.content
            if not isinstance(content, str):
                continue
            yield f"data: {json.dumps({'token': content}, ensure_ascii=False)}\n\n"
    except Exception as exc:
        logger.error("Stream error: %s", exc)
        yield f"data: {json.dumps({'error': 'Streaming failed'}, ensure_ascii=False)}\n\n"
    yield "data: {\"done\": true}\n\n"


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest) -> StreamingResponse:
    """Streaming chat via Server-Sent Events."""
    return StreamingResponse(
        _chat_stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/exercises", response_model=ExerciseLibrary)
async def exercises() -> ExerciseLibrary:
    """Return the built-in exercise library."""
    return ExerciseLibrary(total=len(EXERCISE_LIBRARY), exercises=EXERCISE_LIBRARY)


@router.get("/exercises/search")
async def search_exercises(q: str = "") -> ExerciseLibrary:
    """Filter exercises by name or muscle group."""
    needle = q.strip().lower()
    if not needle:
        return ExerciseLibrary(total=len(EXERCISE_LIBRARY), exercises=EXERCISE_LIBRARY)
    matched = [
        e for e in EXERCISE_LIBRARY
        if needle in e.name.lower() or needle in e.muscle_group.lower()
    ]
    return ExerciseLibrary(total=len(matched), exercises=matched)
