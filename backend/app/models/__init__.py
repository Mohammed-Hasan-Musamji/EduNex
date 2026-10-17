"""Import every model so Base.metadata is fully populated for Alembic and tests."""

from app.models.academic_document import AcademicDocument
from app.models.assessment import AssessmentAttempt, AssessmentQuestion
from app.models.content_chunk import AcademicContentChunk
from app.models.learner import Learner
from app.models.lesson import LessonSession
from app.models.progress import LearnerProgress
from app.models.saved_lesson import SavedLesson
from app.models.subject import Subject
from app.models.topic import Topic

__all__ = [
    "AcademicContentChunk",
    "AcademicDocument",
    "AssessmentAttempt",
    "AssessmentQuestion",
    "Learner",
    "LearnerProgress",
    "LessonSession",
    "SavedLesson",
    "Subject",
    "Topic",
]
