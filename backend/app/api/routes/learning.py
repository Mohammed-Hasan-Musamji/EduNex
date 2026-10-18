"""Gamification summary, progress analytics, and the learning timeline.

All three are read-only views over server-recorded events; ownership is
enforced by verify_owner_or_admin on the learner_id path parameter.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.schemas.analytics import LearnerAnalytics
from app.schemas.gamification import GamificationSummary, TimelineEvent
from app.schemas.skill import SkillProfile, SkillSnapshotRead
from app.services.analytics_service import AnalyticsService
from app.services.gamification_service import GamificationService
from app.services.skill_service import skill_profile, snapshot_history

SKILL_METHOD = (
    "Measured accuracy is correct/attempted. Estimated mastery is (correct+1)/(attempts+2) -- a Beta posterior mean "
    "that starts at 50% and needs real evidence to move -- with about one standard deviation shown as uncertainty."
)

router = APIRouter(prefix="/learners/{learner_id}", tags=["learning"], dependencies=[Depends(verify_owner_or_admin)])


@router.get("/gamification", response_model=GamificationSummary)
def get_gamification(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> GamificationSummary:
    summary = GamificationService(db).summary(learner_id)
    # summary() may sync achievement definitions; persist that, nothing else.
    db.commit()
    return summary


@router.get("/analytics", response_model=LearnerAnalytics)
def get_analytics(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> LearnerAnalytics:
    return AnalyticsService(db).analytics(learner_id)


@router.get("/timeline", response_model=list[TimelineEvent])
def get_timeline(
    learner_id: uuid.UUID, limit: int = Query(default=30, ge=1, le=100), db: Session = Depends(get_db)
) -> list[TimelineEvent]:
    return AnalyticsService(db).timeline(learner_id, limit)


@router.get("/skill-profile", response_model=SkillProfile)
def get_skill_profile(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> SkillProfile:
    return SkillProfile(method=SKILL_METHOD, **skill_profile(db, learner_id))


@router.get("/skill-profile/history", response_model=list[SkillSnapshotRead])
def get_skill_history(
    learner_id: uuid.UUID, topic_id: uuid.UUID | None = None, db: Session = Depends(get_db)
) -> list[SkillSnapshotRead]:
    return [SkillSnapshotRead.model_validate(s) for s in snapshot_history(db, learner_id, topic_id)]

