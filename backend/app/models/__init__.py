"""Import every model so Base.metadata is fully populated for Alembic and tests."""

from app.models.academic_document import AcademicDocument
from app.models.assessment import AssessmentAttempt, AssessmentQuestion, AssessmentRound
from app.models.content_chunk import AcademicContentChunk
from app.models.gamification import AchievementDefinition, LearnerAchievement, LearningEvent
from app.models.learner import Learner
from app.models.learning_profile import SkillSnapshot, TutorInteraction, VarkAssessment
from app.models.lesson import LessonSession
from app.models.notification import Notification
from app.models.progress import LearnerProgress
from app.models.saved_lesson import SavedLesson
from app.models.subject import Subject
from app.models.topic import Topic

__all__ = [
    "AcademicContentChunk",
    "AcademicDocument",
    "AchievementDefinition",
    "AssessmentAttempt",
    "AssessmentQuestion",
    "AssessmentRound",
    "Learner",
    "LearnerAchievement",
    "LearnerProgress",
    "LearningEvent",
    "LessonSession",
    "Notification",
    "SavedLesson",
    "SkillSnapshot",
    "Subject",
    "Topic",
    "TutorInteraction",
    "VarkAssessment",
]
