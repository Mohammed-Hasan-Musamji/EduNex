"""Aggregates all /api/v1 routers."""

from fastapi import APIRouter

from app.api.routes import (
    assessments,
    auth,
    health,
    knowledge_base,
    learners,
    lessons,
    progress,
    saved_lessons,
    subjects,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(learners.router)
api_router.include_router(subjects.router)
api_router.include_router(lessons.router)
api_router.include_router(saved_lessons.router)
api_router.include_router(assessments.router)
api_router.include_router(progress.router)
api_router.include_router(knowledge_base.router)
