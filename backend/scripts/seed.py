"""Run with: python -m scripts.seed

Seeds the Data Structures -> Linked Lists subject/topic and sample
assessment questions. Safe to run multiple times (idempotent) -- it never
drops or deletes existing data.
"""

from app.db.seed import seed_initial_data
from app.db.session import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
        print("Seed complete: Data Structures -> Linked Lists (practice questions are generated from indexed content).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
