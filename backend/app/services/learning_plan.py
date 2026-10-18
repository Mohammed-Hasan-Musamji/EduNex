"""Explainable personalized learning plan: skill gaps x presentation preference.

The *what* comes only from measured performance (the REMEDIATE / MAINTAIN /
ADVANCE recommendations in recommendation_service). The learner's VARK
preference only reorders *how* to work on it -- which activity formats are
suggested first. Every format stays available, and each item says why it
was chosen.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.personalization import LABELS
from app.models.learner import Learner
from app.schemas.progress import Recommendation

FORMATS = {
    "visual": {"format": "visual_lesson", "action": "lesson",
               "label": "Lesson on the whiteboard with diagrams and interactive visualizations"},
    "auditory": {"format": "audio_explanation", "action": "tutor",
                 "label": "Ask the textbook tutor and listen to the explanation"},
    "read_write": {"format": "written_lesson", "action": "lesson",
                   "label": "Lesson with definitions and a written summary"},
    "kinesthetic": {"format": "practice_round", "action": "practice",
                    "label": "Practice round with feedback on every answer"},
}
DEFAULT_ORDER = ("read_write", "visual", "kinesthetic", "auditory")


def build_plan(db: Session, learner: Learner, recommendations: list[Recommendation], limit: int = 3) -> dict:
    preferred = [p for p in (learner.preferences or {}).get("vark_preferences", []) if p in FORMATS]
    order = preferred + [m for m in DEFAULT_ORDER if m not in preferred]
    items = []
    for rec in recommendations[:limit]:
        # Practice-type recommendations lead with practice regardless of preference:
        # the measured need decides the activity, preference decides the rest.
        modalities = list(order)
        if rec.suggested_activity == "practice":
            modalities.remove("kinesthetic")
            modalities.insert(0, "kinesthetic")
        activities = [{**FORMATS[m], "modality": m, "preferred": m in preferred} for m in modalities]
        why_style = (
            f"Formats ordered for your {', '.join(LABELS[m] for m in preferred)} preference."
            if preferred else "No learning preference saved, so a balanced mix is suggested."
        )
        items.append({
            "topic_id": rec.topic_id,
            "topic_name": rec.topic_name,
            "difficulty": rec.difficulty,
            "recommendation_type": rec.recommendation_type,
            "label": rec.label,
            "reason": f"{rec.rationale} {why_style}",
            "activities": activities,
        })
    return {
        "vark_preferences": preferred,
        "vark_source": (learner.preferences or {}).get("vark_source"),
        "items": items,
        "note": "What to study comes from your assessment results; your preference only changes how it's presented.",
    }
