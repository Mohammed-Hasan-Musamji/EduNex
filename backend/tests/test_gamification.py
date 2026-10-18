import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app.db.seed import seed_initial_data
from app.models.gamification import LearningEventType
from app.models.learner import Learner
from app.services.gamification_service import (
    GamificationService,
    RewardSession,
    compute_streaks,
    level_for_xp,
    xp_for_level,
)
from tests.conftest import register

D = date(2026, 3, 10)


def days(*offsets: int) -> list[date]:
    return [D - timedelta(days=o) for o in offsets]


def test_no_activity_means_no_streak():
    assert compute_streaks([], D) == (0, 0)


def test_streak_counts_consecutive_days_ending_today():
    assert compute_streaks(days(0, 1, 2), D) == (3, 3)


def test_streak_stays_current_until_the_day_after_last_activity():
    # Last learned yesterday: today isn't over, so the streak is still alive.
    assert compute_streaks(days(1, 2), D) == (2, 2)


def test_streak_breaks_after_a_missed_day_but_best_is_kept():
    assert compute_streaks(days(2, 3, 4, 5), D) == (0, 4)


def test_repeated_events_on_one_day_count_once():
    assert compute_streaks([D, D, D], D) == (1, 1)


def test_streak_after_gap_restarts():
    assert compute_streaks(days(0, 1, 5, 6, 7), D) == (2, 3)


@pytest.mark.parametrize(("level", "xp"), [(1, 0), (2, 50), (3, 150), (4, 300), (5, 500)])
def test_level_thresholds(level, xp):
    assert xp_for_level(level) == xp
    assert level_for_xp(xp) == level
    assert level_for_xp(xp - 1) == max(1, level - 1)


def test_midnight_boundary_uses_activity_timezone(db_session, client, monkeypatch):
    """23:30 UTC on the 9th and 00:30 UTC on the 10th are two learning days
    in UTC, but the same calendar day in a timezone 2 hours behind."""
    seed_initial_data(db_session)
    account = register(client)
    learner = db_session.get(Learner, uuid.UUID(account["id"]))

    late = datetime(2026, 3, 9, 23, 30, tzinfo=UTC)
    early = datetime(2026, 3, 10, 0, 30, tzinfo=UTC)
    for moment, key in ((late, "a"), (early, "b")):
        session = RewardSession(db_session, learner, moment)
        session.award(LearningEventType.lesson_completed, f"lesson:{key}", 20, title="t", description="d")
    db_session.commit()

    service = GamificationService(db_session, early)
    assert sorted(service.learning_days(learner.id)) == [date(2026, 3, 9), date(2026, 3, 10)]

    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "activity_timezone", "America/Noronha")  # UTC-2
    shifted = GamificationService(db_session, early)
    assert shifted.local_date(late) == shifted.local_date(early) == date(2026, 3, 9)


def test_recording_the_same_event_twice_awards_xp_once(db_session, client):
    account = register(client)
    learner = db_session.get(Learner, uuid.UUID(account["id"]))
    for _ in range(2):
        session = RewardSession(db_session, learner)
        session.award(LearningEventType.lesson_completed, "lesson:same", 20, title="t", description="d")
        session.finish()
        db_session.commit()
    # No LessonSession row was completed, so no achievement adds XP here.
    assert GamificationService(db_session).total_xp(learner.id) == 20


def test_new_learner_summary_has_no_fabricated_values(client):
    account = register(client)
    response = client.get(f"/api/v1/learners/{account['id']}/gamification")
    assert response.status_code == 200
    body = response.json()
    assert body["xp_total"] == 0
    assert body["level"] == 1
    assert body["current_streak"] == 0
    assert body["best_streak"] == 0
    assert body["active_today"] is False
    assert all(a["earned_at"] is None for a in body["achievements"])
    assert all(day["activity_count"] == 0 for day in body["activity_calendar"])


def test_learners_cannot_read_each_others_gamification(client):
    first = register(client)
    register(client)  # client now holds the second learner's session
    assert client.get(f"/api/v1/learners/{first['id']}/gamification").status_code == 403
    assert client.get(f"/api/v1/learners/{first['id']}/analytics").status_code == 403
    assert client.get(f"/api/v1/learners/{first['id']}/timeline").status_code == 403
