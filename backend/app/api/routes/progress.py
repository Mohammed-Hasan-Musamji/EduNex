"""Learner progress and recommendation endpoints."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.core.exceptions import NotFoundError
from app.models.topic import Topic
from app.schemas.progress import ProgressRead, Recommendation
from app.services.progress_service import ProgressService
from app.services.recommendation_service import recommendations_for

router = APIRouter(prefix="/learners/{learner_id}", tags=["progress"], dependencies=[Depends(verify_owner_or_admin)])


def _to_progress_read(progress, topic_name: str) -> ProgressRead:
    return ProgressRead(
        learner_id=progress.learner_id,
        topic_id=progress.topic_id,
        topic_name=topic_name,
        mastery_estimate=progress.mastery_estimate,
        attempts_count=progress.attempts_count,
        correct_count=progress.correct_count,
        last_activity_at=progress.last_activity_at,
        updated_at=progress.updated_at,
    )


@router.get("/progress", response_model=list[ProgressRead])
def list_progress(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> list[ProgressRead]:
    records = ProgressService(db).list_for_learner(learner_id)
    return [_to_progress_read(p, p.topic.name if p.topic else "") for p in records]


@router.get("/progress/{topic_id}", response_model=ProgressRead)
def get_progress(learner_id: uuid.UUID, topic_id: uuid.UUID, db: Session = Depends(get_db)) -> ProgressRead:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise NotFoundError(f"Topic {topic_id} was not found")

    progress = ProgressService(db).get_progress(learner_id, topic_id)
    if progress is None:
        # A new learner legitimately has no progress yet -- that's an
        # expected empty state, not a missing resource.
        return ProgressRead(
            learner_id=learner_id,
            topic_id=topic_id,
            topic_name=topic.name,
            mastery_estimate=0.0,
            attempts_count=0,
            correct_count=0,
            last_activity_at=None,
            updated_at=topic.updated_at,
        )
    return _to_progress_read(progress, topic.name)


@router.get("/recommendations", response_model=list[Recommendation])
def get_recommendations(learner_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Recommendation]:
    return recommendations_for(db, learner_id)
