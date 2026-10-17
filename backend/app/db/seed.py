"""Idempotent seed data for the MVP: Data Structures -> Linked Lists.

Safe to run repeatedly -- every insert is guarded by a lookup on a stable
natural key (slug), so re-running this does not create duplicates. This
intentionally seeds only the validated MVP topic; it is not a claim that
other subjects/topics are implemented.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.assessment import AssessmentQuestion, QuestionType
from app.models.learner import Learner, LearnerRole
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


_SAMPLE_QUESTIONS = [
    {
        "question_text": "What does the head pointer of a linked list reference?",
        "question_type": QuestionType.multiple_choice,
        "options": ["The last node", "The first node", "A random node", "Nothing, it is unused"],
        "correct_answer": 1,
        "explanation": "The head pointer always references the first node in the list.",
        "difficulty": DifficultyLevel.beginner,
    },
    {
        "question_text": "A null 'next' pointer marks the end of a singly linked list.",
        "question_type": QuestionType.true_false,
        "options": None,
        "correct_answer": True,
        "explanation": "When a node's next pointer is null, traversal has reached the end of the list.",
        "difficulty": DifficultyLevel.beginner,
    },
    {
        "question_text": "When removing a node from the middle of a linked list, what must be updated?",
        "question_type": QuestionType.multiple_choice,
        "options": [
            "Nothing -- removal is automatic",
            "The previous node's next pointer, so it skips the removed node",
            "Every node's value in the list",
            "Only the head pointer",
        ],
        "correct_answer": 1,
        "explanation": "The previous node's next pointer must be re-linked to skip over the removed node.",
        "difficulty": DifficultyLevel.intermediate,
    },
]


def _seed_questions(db: Session, topic: Topic) -> None:
    existing_count = db.scalar(
        select(AssessmentQuestion).where(AssessmentQuestion.topic_id == topic.id).limit(1)
    )
    if existing_count is not None:
        return  # Already seeded for this topic.
    for item in _SAMPLE_QUESTIONS:
        db.add(AssessmentQuestion(topic_id=topic.id, **item))


def _seed_default_users(db: Session) -> None:
    admin_email = "admin@edunex.com"
    admin = db.scalar(select(Learner).where(Learner.email == admin_email))
    if admin is None:
        admin = Learner(
            display_name="EduNex Administrator",
            email=admin_email,
            hashed_password=hash_password("adminpassword123"),
            role=LearnerRole.admin,
            preferences={},
        )
        db.add(admin)
    else:
        admin.role = LearnerRole.admin

    learner_email = "learner@edunex.com"
    learner = db.scalar(select(Learner).where(Learner.email == learner_email))
    if learner is None:
        learner = Learner(
            display_name="Alex Chen",
            email=learner_email,
            hashed_password=hash_password("learnerpassword123"),
            role=LearnerRole.learner,
            preferences={
                "vark_preferences": ["visual", "kinesthetic"],
                "learning_goal": "Master Linked Lists and Algorithmic Problem Solving",
                "preferred_detail": "comprehensive",
            },
        )
        db.add(learner)


def seed_initial_data(db: Session) -> None:
    subject = _get_or_create_subject(db)
    topic = _get_or_create_topic(db, subject)
    _seed_questions(db, topic)
    _seed_default_users(db)
    db.commit()

