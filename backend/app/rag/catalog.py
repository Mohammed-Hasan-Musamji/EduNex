"""Keeps the learner-facing catalog in step with ingested textbooks.

Each textbook subject folder becomes a Subject (matched by slug, so the
existing seeded "Data Structures" subject is reused rather than
duplicated), and each chapter-level PDF becomes a Topic under it. The
document is linked to both, which is what lets retrieval, lessons, and
generated questions stay within the right subject.

Folder names are normalized for display ("Dbms" -> "DBMS",
"Operating system" -> "Operating Systems"); the mapping is explicit rather
than guessed.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.academic_document import AcademicDocument
from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic
from app.utils.slugify import slugify

SUBJECT_DISPLAY_NAMES = {
    "calculus": "Calculus",
    "chemistry": "Chemistry",
    "data structures": "Data Structures",
    "dbms": "DBMS",
    "operating system": "Operating Systems",
    "physics": "Physics",
    "python": "Python",
}

SUBJECT_DESCRIPTIONS = {
    "Calculus": "Derivatives, integrals, and their applications.",
    "Chemistry": "Structure, bonding, and reactions of organic molecules.",
    "Data Structures": "How data is organized, stored, and traversed efficiently.",
    "DBMS": "Relational databases: models, languages, design, and transactions.",
    "Operating Systems": "Processes, memory, and how an OS manages a computer.",
    "Physics": "Mechanics, energy, and the physical laws behind them.",
    "Python": "Programming in Python, from statements to recursion.",
}


def subject_display_name(folder: str) -> str:
    key = " ".join(folder.replace("_", " ").split()).lower()
    return SUBJECT_DISPLAY_NAMES.get(key, folder.strip().title())


def ensure_subject(db: Session, folder: str) -> Subject:
    name = subject_display_name(folder)
    slug = slugify(name)
    subject = db.scalar(select(Subject).where(Subject.slug == slug))
    if subject is None:
        subject = Subject(name=name, slug=slug, description=SUBJECT_DESCRIPTIONS.get(name, ""), is_active=True)
        db.add(subject)
        db.flush()
    return subject


def ensure_topic(db: Session, subject: Subject, title: str, difficulty: str | None, description: str = "") -> Topic:
    slug = slugify(title)[:180]
    topic = db.scalar(select(Topic).where(Topic.subject_id == subject.id, Topic.slug == slug))
    level = DifficultyLevel(difficulty) if difficulty in {d.value for d in DifficultyLevel} else DifficultyLevel.beginner
    if topic is None:
        topic = Topic(subject_id=subject.id, name=title[:160], slug=slug, description=description[:2000], difficulty=level)
        db.add(topic)
        db.flush()
    return topic


def link_document(db: Session, document: AcademicDocument, folder: str) -> None:
    """Attaches the document to its subject and chapter topic (idempotent)."""
    meta = document.doc_metadata or {}
    subject = ensure_subject(db, folder)
    objectives = meta.get("learning_objectives") or []
    description = "; ".join(objectives[:3]) if objectives else ", ".join((meta.get("topics") or [])[:5])
    topic = ensure_topic(db, subject, meta.get("chapter_title") or document.title, meta.get("difficulty_estimate"), description)
    document.subject_id = subject.id
    document.topic_id = topic.id
