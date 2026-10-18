"""Idempotent seed data for the MVP: Data Structures -> Linked Lists.

Safe to run repeatedly -- every insert is guarded by a lookup on a stable
natural key (slug), so re-running this does not create duplicates. This
intentionally seeds only the validated MVP topic; it is not a claim that
other subjects/topics are implemented.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.models.topic import DifficultyLevel, Topic

DATA_STRUCTURES_SLUG = "data-structures"
LINKED_LISTS_SLUG = "linked-lists"


def _get_or_create_subject(db: Session) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.slug == DATA_STRUCTURES_SLUG))
    if subject is not None:
        return subject
    subject = Subject(
        name="Data Structures",
        slug=DATA_STRUCTURES_SLUG,
        description="How data is organized, stored, and traversed efficiently.",
        is_active=True,
    )
    db.add(subject)
    db.flush()
    return subject


def _get_or_create_topic(db: Session, subject: Subject) -> Topic:
    topic = db.scalar(
        select(Topic).where(Topic.subject_id == subject.id, Topic.slug == LINKED_LISTS_SLUG)
    )
    if topic is not None:
        return topic
    topic = Topic(
        subject_id=subject.id,
        name="Linked Lists",
        slug=LINKED_LISTS_SLUG,
        description="Nodes connected by pointers: traversal, insertion, and removal.",
        difficulty=DifficultyLevel.beginner,
    )
    db.add(topic)
    db.flush()
    return topic


def seed_initial_data(db: Session) -> None:
    subject = _get_or_create_subject(db)
    _get_or_create_topic(db, subject)
    db.commit()
