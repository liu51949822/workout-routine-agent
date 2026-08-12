"""Tests for Pydantic schemas (offline)."""

from __future__ import annotations

from datetime import date

from pydantic import ValidationError
import pytest

from app.schemas import (
    BodyMetric,
    ChatRequest,
    CheckIn,
    Exercise,
    Profile,
    WeeklyPlan,
    WorkoutItem,
    WorkoutPlan,
)


def test_chat_request_valid():
    req = ChatRequest(message="build me a plan")
    assert req.message == "build me a plan"


def test_chat_request_rejects_empty():
    with pytest.raises(ValidationError):
        ChatRequest(message="")


def test_chat_request_rejects_too_long():
    with pytest.raises(ValidationError):
        ChatRequest(message="x" * 2001)


def test_exercise_defaults():
    ex = Exercise(name="Push-Up")
    assert ex.muscle_group == ""
    assert ex.difficulty == "beginner"
    assert ex.instructions == []


def test_workout_plan_roundtrip():
    plan = WorkoutPlan(
        title="Core Blast",
        focus="core",
        duration_minutes=10,
        items=[WorkoutItem(name="Plank", sets="3", reps="45s", rest="15s")],
        warmup=["Arm circles"],
        cooldown=["Cat-cow"],
        safety_notes=["Stop if pain"],
    )
    data = plan.model_dump()
    assert data["title"] == "Core Blast"
    assert data["items"][0]["name"] == "Plank"


def test_body_metric_optional_fields():
    m = BodyMetric(date=date(2026, 1, 1), weight_kg=70.0)
    assert m.bmi is None
    assert m.body_fat_pct is None


def test_weekly_plan_days():
    w = WeeklyPlan(week_start=date(2026, 1, 5), days={"Monday": [WorkoutItem(name="Squat")]})
    assert "Monday" in w.days
    assert w.days["Monday"][0].name == "Squat"


def test_check_in_valid():
    c = CheckIn(date=date(2026, 1, 1), plan_title="Full Body", duration_minutes=30, felt="hard")
    assert c.felt == "hard"


def test_profile_defaults():
    p = Profile()
    assert p.fitness_level == "beginner"
    assert p.time_available_minutes == 30
