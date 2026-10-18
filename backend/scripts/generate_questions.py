"""Generate grounded assessment questions for indexed textbook topics.

Run from backend/ (after textbooks are ingested):
    python -m scripts.generate_questions --subject Python
    python -m scripts.generate_questions --all --excerpts 4 --per-excerpt 2

Each question is written from one textbook excerpt and stored as
`unreviewed` with its source chunk (see app/services/question_generation.py).
Topics that already have questions are skipped unless --top-up is given.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, select  # noqa: E402

from app.ai.gemini_client import GeminiClient, GeminiError  # noqa: E402
from app.core.exceptions import AppError  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.academic_document import AcademicDocument, IngestionStatus  # noqa: E402
from app.models.assessment import AssessmentQuestion  # noqa: E402
from app.models.subject import Subject  # noqa: E402
from app.models.topic import Topic  # noqa: E402
from app.services.question_generation import generate_for_topic  # noqa: E402

PERMANENT = {"invalid_api_key", "permission_denied", "model_not_found", "not_configured"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--subject", help="subject name, e.g. Python or 'Data Structures'")
    target.add_argument("--all", action="store_true")
    parser.add_argument("--excerpts", type=int, default=4)
    parser.add_argument("--per-excerpt", type=int, default=2)
    parser.add_argument("--top-up", action="store_true", help="also generate for topics that already have questions")
    args = parser.parse_args(argv)

    client = GeminiClient()
    if not client.is_configured:
        print("ERROR: GEMINI_API_KEY is not configured")
        return 2
    totals = {"topics": 0, "accepted": 0, "invalid": 0, "duplicate": 0, "skipped": 0, "failed": 0}
    with SessionLocal() as db:
        stmt = (
            select(Topic)
            .join(AcademicDocument, AcademicDocument.topic_id == Topic.id)
            .where(AcademicDocument.ingestion_status == IngestionStatus.indexed)
            .distinct()
        )
        if args.subject:
            stmt = stmt.join(Subject, Topic.subject_id == Subject.id).where(func.lower(Subject.name) == args.subject.lower())
        for topic in db.scalars(stmt):
            have = db.scalar(select(func.count(AssessmentQuestion.id)).where(AssessmentQuestion.topic_id == topic.id))
            if have and not args.top_up:
                totals["skipped"] += 1
                continue
            totals["topics"] += 1
            try:
                report = generate_for_topic(db, client, topic.id, excerpts=args.excerpts, per_excerpt=args.per_excerpt)
            except GeminiError as exc:
                print(f"{topic.name}: FAILED ({exc.category})")
                totals["failed"] += 1
                if exc.category in PERMANENT:
                    print("Stopping: this error won't resolve by retrying other topics.")
                    break
                continue
            except AppError as exc:
                print(f"{topic.name}: skipped ({exc.message})")
                totals["skipped"] += 1
                continue
            totals["accepted"] += report.accepted
            totals["invalid"] += report.rejected_invalid
            totals["duplicate"] += report.rejected_duplicate
            print(f"{topic.name}: accepted={report.accepted} invalid={report.rejected_invalid} duplicate={report.rejected_duplicate}")
    print("Done. " + " ".join(f"{k}={v}" for k, v in totals.items()))
    return 1 if totals["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
