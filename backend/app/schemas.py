"""Pydantic schemas for the Workout Routine Agent API.

These mirror the TypeScript types in `app/src/types.ts` so the mobile client
and the backend share one data contract.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """A single chat/consultation request.

    `session_id` / `history` / `profile` are optional and enable the memory
    system (short-term, long-term, vector) without a database.
    """

    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    session_id: Optional[str] = Field(None, description="Session id (thread-scoped short-term memory)")
    user_id: Optional[str] = Field(None, description="User id (cross-thread long-term + vector memory)")
    history: Optional[list[dict]] = Field(
        None, description="Conversation history (single source of truth for short-term context)"
    )
    profile: Optional[dict] = Field(
        None, description="User profile facts (long-term memory), e.g. from the mobile app"
    )


class ChatResponse(BaseModel):
    """A full (non-streaming) chat response."""

    reply: str
    sources: list[str] = Field(default_factory=list, description="Retrieved source labels")


class Exercise(BaseModel):
    """An exercise from the built-in library."""

    name: str
    muscle_group: str = ""
    equipment: str = ""
    difficulty: str = "beginner"  # beginner | intermediate | advanced
    instructions: list[str] = Field(default_factory=list)


class ExerciseLibrary(BaseModel):
    """Response for the exercise library."""

    total: int
    exercises: list[Exercise]


class WorkoutItem(BaseModel):
    """A single block within a workout plan."""

    name: str
    sets: str = ""
    reps: str = ""
    rest: str = ""
    notes: str = ""


class WorkoutPlan(BaseModel):
    """A structured workout plan returned by the agent/planner."""

    title: str
    focus: str = ""
    duration_minutes: int = 0
    items: list[WorkoutItem] = Field(default_factory=list)
    warmup: list[str] = Field(default_factory=list)
    cooldown: list[str] = Field(default_factory=list)
    safety_notes: list[str] = Field(default_factory=list)


class Profile(BaseModel):
    """User fitness profile (stored on-device, synced via API)."""

    name: str = ""
    fitness_level: str = "beginner"  # beginner | intermediate | advanced
    goals: list[str] = Field(default_factory=list)
    time_available_minutes: int = 30
    equipment: list[str] = Field(default_factory=list)
    height_cm: Optional[float] = None  # used to compute BMI
    notes: str = ""


class BodyMetric(BaseModel):
    """A body measurement entry."""

    date: date
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    bmi: Optional[float] = None


class CheckIn(BaseModel):
    """A workout check-in / attendance record."""

    date: date
    plan_title: str = ""
    duration_minutes: int = 0
    felt: str = "ok"  # easy | ok | hard
    notes: str = ""


class WeeklyPlan(BaseModel):
    """A generated weekly training schedule."""

    week_start: date
    days: dict[str, list[WorkoutItem]] = Field(default_factory=dict)
