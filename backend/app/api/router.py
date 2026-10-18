"""Aggregates all /api/v1 routers."""

from fastapi import APIRouter

from app.api.routes import (
    admin_questions,
    admin_users,
    assessments,
    auth,
    diagnostics,
    health,
    knowledge_base,
    learners,
    learning,
    lessons,
    notifications,
    progress,
    saved_lessons,
    subjects,
    tutor,
    vark,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(learners.router)
api_router.include_router(admin_users.router)
api_router.include_router(admin_questions.router)
api_router.include_router(subjects.router)
api_router.include_router(lessons.router)
api_router.include_router(saved_lessons.router)
api_router.include_router(assessments.router)
api_router.include_router(diagnostics.router)
api_router.include_router(progress.router)
api_router.include_router(learning.router)
api_router.include_router(notifications.router)
api_router.include_router(tutor.router)
api_router.include_router(vark.router)
api_router.include_router(knowledge_base.router)
