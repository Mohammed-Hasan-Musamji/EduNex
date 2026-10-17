"""Dependency readiness checks.

This is distinct from the top-level GET /health, which only confirms the
process is up. This endpoint checks whether the database is actually
reachable and whether Gemini is configured -- without making a paid Gemini
API call.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import get_settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/ready")
def readiness(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()

    database_ok = True
    database_detail = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        database_ok = False
        database_detail = "unreachable"
        # Never include the raw exception (may contain connection details).
        _ = exc

    return {
        "status": "ready" if database_ok else "degraded",
        "dependencies": {
            "database": {"ok": database_ok, "detail": database_detail},
            "gemini": {
                "configured": settings.is_gemini_configured,
                "detail": "configured" if settings.is_gemini_configured else "GEMINI_API_KEY not set",
            },
        },
    }
