"""Learning-preference questionnaire and the personalized learning plan."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_owner_or_admin
from app.models.learner import Learner
from app.schemas.vark import LearningPlan, Questionnaire, VarkResult, VarkSubmission
from app.services import vark_service
from app.services.learner_service import LearnerService
from app.services.learning_plan import build_plan
from app.services.recommendation_service import recommendations_for

router = APIRouter(tags=["vark"])


def _result(record) -> VarkResult:
    return VarkResult(
        id=record.id, questionnaire_version=record.questionnaire_version, scores=record.scores, preferred=record.preferred,
        explanation=vark_service.describe(record.preferred), created_at=record.created_at,
    )


@router.get("/vark/questionnaire", response_model=Questionnaire)
def get_questionnaire() -> Questionnaire:
    return Questionnaire.model_validate(vark_service.questionnaire())


@router.post("/learners/{learner_id}/vark-assessments", response_model=VarkResult, status_code=status.HTTP_201_CREATED)
def submit_vark(
    learner_id: uuid.UUID,
    payload: VarkSubmission,
    db: Session = Depends(get_db),
    current: Learner = Depends(verify_owner_or_admin),
) -> VarkResult:
    learner = LearnerService(db).get(learner_id)
    return _result(vark_service.submit(db, learner, payload.version, payload.responses))


@router.get("/learners/{learner_id}/vark-assessments", response_model=list[VarkResult])
def list_vark(learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)) -> list[VarkResult]:
    return [_result(r) for r in vark_service.history(db, learner_id)]


@router.get("/learners/{learner_id}/learning-plan", response_model=LearningPlan)
def learning_plan(learner_id: uuid.UUID, db: Session = Depends(get_db), _: Learner = Depends(verify_owner_or_admin)) -> LearningPlan:
    learner = LearnerService(db).get(learner_id)
    return LearningPlan.model_validate(build_plan(db, learner, recommendations_for(db, learner_id)))
