"""Learning-preference questionnaire (VARK-style) and personalized plan.

The questionnaire is EduNex's own short instrument organized around the
four VARK modalities -- it is not the official VARK questionnaire, and it
measures stated *preferences*, not ability or how a learner learns best.
Each situation offers one option per modality and the learner may pick any
number of them. Scores are counts per modality; every modality within
PREFERENCE_MARGIN of the top score is "preferred", so mixed preferences are
normal and a near-even profile is reported as multimodal.

Results are stored (scores, responses, version, date) and copied into the
learner's preferences with source="questionnaire". Choosing preferences
manually later switches the source to "self_selected".
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationAppError
from app.models.learner import Learner
from app.models.learning_profile import VarkAssessment

QUESTIONNAIRE_VERSION = "edunex-1"
MIN_ANSWERED = 8
PREFERENCE_MARGIN = 1
MODALITIES = ("visual", "auditory", "read_write", "kinesthetic")


@dataclass(frozen=True)
class Item:
    id: str
    prompt: str
    options: dict[str, str]  # modality -> option text


ITEMS: list[Item] = [
    Item("q1", "You need to understand how a new app's settings fit together. You would rather…", {
        "visual": "look at a diagram or screenshot map of the menus",
        "auditory": "have someone talk you through it",
        "read_write": "read the help article",
        "kinesthetic": "click around and try things",
    }),
    Item("q2", "Before an exam, the most useful study aid for you is…", {
        "visual": "colour-coded charts or mind maps",
        "auditory": "explaining topics aloud or discussing them",
        "read_write": "rewriting your notes and summaries",
        "kinesthetic": "working through practice problems",
    }),
    Item("q3", "A friend gives you directions to their house. You prefer…", {
        "visual": "a map with the route marked",
        "auditory": "spoken directions",
        "read_write": "written step-by-step directions",
        "kinesthetic": "following them there once",
    }),
    Item("q4", "When a teacher explains a hard concept, what helps most?", {
        "visual": "a drawing or animation on the board",
        "auditory": "hearing it explained a second way",
        "read_write": "a clear written definition",
        "kinesthetic": "an example you work out yourself",
    }),
    Item("q5", "You're assembling furniture. You mostly rely on…", {
        "visual": "the pictures in the instructions",
        "auditory": "a video where someone narrates the steps",
        "read_write": "the written instruction text",
        "kinesthetic": "fitting the pieces together as you go",
    }),
    Item("q6", "You want to remember a new word or term. You would…", {
        "visual": "picture it or link it to an image",
        "auditory": "say it out loud a few times",
        "read_write": "write it down with its meaning",
        "kinesthetic": "use it straight away in a sentence or task",
    }),
    Item("q7", "When you review a lesson later, you'd rather…", {
        "visual": "scan diagrams and highlighted visuals",
        "auditory": "listen to a recap",
        "read_write": "read a concise written summary",
        "kinesthetic": "redo an exercise from the lesson",
    }),
    Item("q8", "You're choosing between two laptops. You'd decide using…", {
        "visual": "a comparison chart",
        "auditory": "advice from someone who owns one",
        "read_write": "detailed written reviews",
        "kinesthetic": "trying both in a shop",
    }),
    Item("q9", "In a group project, you naturally take on…", {
        "visual": "designing slides or diagrams",
        "auditory": "leading discussions",
        "read_write": "writing the report",
        "kinesthetic": "building the demo or prototype",
    }),
    Item("q10", "Learning to code a new feature, you'd first…", {
        "visual": "look at a flowchart of how it works",
        "auditory": "watch someone explain it while coding",
        "read_write": "read the documentation",
        "kinesthetic": "copy a small example and modify it",
    }),
    Item("q11", "When you get feedback on your work, it helps most if it is…", {
        "visual": "marked up visually on the work itself",
        "auditory": "discussed with you in conversation",
        "read_write": "written as comments you can reread",
        "kinesthetic": "shown through a corrected example you try again",
    }),
    Item("q12", "To understand how a machine works, you'd prefer…", {
        "visual": "a labelled cutaway diagram",
        "auditory": "an expert describing it",
        "read_write": "a written technical explanation",
        "kinesthetic": "taking one apart or using a simulation",
    }),
]

_ITEMS_BY_ID = {item.id: item for item in ITEMS}


def option_id(item_id: str, modality: str) -> str:
    return f"{item_id}:{modality}"


def questionnaire() -> dict:
    return {
        "version": QUESTIONNAIRE_VERSION,
        "instructions": "Choose every answer that fits you -- one or several. Skip any question that doesn't apply.",
        "disclaimer": (
            "This describes how you prefer information to be presented. It isn't a measure of ability, and research "
            "doesn't show that matching a style improves learning on its own -- EduNex uses it only to vary presentation."
        ),
        "min_answered": MIN_ANSWERED,
        "questions": [
            {"id": item.id, "prompt": item.prompt, "options": [{"id": option_id(item.id, m), "text": t} for m, t in item.options.items()]}
            for item in ITEMS
        ],
    }


def score(responses: dict[str, list[str]]) -> tuple[dict[str, int], list[str]]:
    scores = dict.fromkeys(MODALITIES, 0)
    answered = 0
    for item_id, selected in responses.items():
        item = _ITEMS_BY_ID.get(item_id)
        if item is None:
            raise ValidationAppError(f"Unknown question '{item_id}'.")
        modalities = set()
        for choice in selected:
            prefix, _, modality = choice.partition(":")
            if prefix != item_id or modality not in item.options:
                raise ValidationAppError(f"'{choice}' is not an option for question '{item_id}'.")
            modalities.add(modality)
        if modalities:
            answered += 1
        for modality in modalities:
            scores[modality] += 1
    if answered < MIN_ANSWERED:
        raise ValidationAppError(f"Answer at least {MIN_ANSWERED} of the {len(ITEMS)} questions ({answered} answered).")
    top = max(scores.values())
    preferred = [m for m in MODALITIES if scores[m] > 0 and scores[m] >= top - PREFERENCE_MARGIN]
    return scores, preferred


def describe(preferred: list[str]) -> str:
    labels = {"visual": "Visual", "auditory": "Aural", "read_write": "Read/Write", "kinesthetic": "Kinesthetic"}
    if len(preferred) == len(MODALITIES):
        return "Your answers are spread evenly, so EduNex will mix all four presentation styles."
    return "You leaned toward " + " and ".join(labels[m] for m in preferred) + " presentation. You can change this any time."


def submit(db: Session, learner: Learner, version: str, responses: dict[str, list[str]]) -> VarkAssessment:
    if version != QUESTIONNAIRE_VERSION:
        raise ValidationAppError(f"This questionnaire version ('{version}') is no longer current; reload it.")
    scores, preferred = score(responses)
    now = datetime.now(UTC)
    record = VarkAssessment(
        learner_id=learner.id, questionnaire_version=version, responses=responses, scores=scores, preferred=preferred,
        created_at=now,
    )
    db.add(record)
    learner.preferences = {
        **(learner.preferences or {}),
        "vark_preferences": preferred,
        "vark_source": "questionnaire",
        "vark_scores": scores,
        "vark_assessed_at": now.isoformat(),
    }
    db.commit()
    db.refresh(record)
    return record


def history(db: Session, learner_id: uuid.UUID) -> list[VarkAssessment]:
    return list(
        db.scalars(select(VarkAssessment).where(VarkAssessment.learner_id == learner_id).order_by(VarkAssessment.created_at.desc()))
    )
