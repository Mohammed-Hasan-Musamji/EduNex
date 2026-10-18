"""XP, level, streak, achievement, and timeline schemas.

Every value here is computed on the server from the learning-event ledger
(app/models/gamification.py) -- the client never supplies XP or rewards.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.gamification import LearningEventType


class AchievementBrief(BaseModel):
    code: str
    title: str
    description: str
    xp_reward: int


class RewardSummary(BaseModel):
    """What a verified learning action earned. Returned by every
    reward-bearing endpoint so the UI can celebrate exactly what happened."""

    xp_awarded: int
    xp_total: int
    level: int
    leveled_up: bool
    current_streak: int
    new_achievements: list[AchievementBrief]
    # Plain-language notes, e.g. that a daily XP limit was reached.
    notes: list[str] = []


class AchievementStatus(BaseModel):
    code: str
    title: str
    description: str
    requirement: str
    xp_reward: int
    earned_at: datetime | None
    progress_current: int
    progress_target: int


class ActivityDay(BaseModel):
    date: date
    activity_count: int


class XpRule(BaseModel):
    event_type: str
    label: str
    xp: int
    note: str | None = None


class GamificationSummary(BaseModel):
    xp_total: int
    level: int
    level_floor_xp: int
    next_level_xp: int
    current_streak: int
    best_streak: int
    active_today: bool
    last_active_date: date | None
    streak_policy: str
    activity_timezone: str
    activity_calendar: list[ActivityDay]
    achievements: list[AchievementStatus]
    xp_rules: list[XpRule]


class TimelineEvent(BaseModel):
    id: uuid.UUID
    event_type: LearningEventType
    title: str
    description: str
    xp_awarded: int
    resource_id: uuid.UUID | None
    occurred_at: datetime
