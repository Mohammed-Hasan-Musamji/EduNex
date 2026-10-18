"""Run with: python -m scripts.promote_admin someone@example.com

Promotes an already-registered account to admin. This is intentionally a
local script, not an API endpoint -- there is no public admin-registration
workflow (see backend/README.md).
"""

import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.learner import Learner, LearnerRole


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.promote_admin <email>")
        raise SystemExit(1)

    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        learner = db.scalar(select(Learner).where(Learner.email == email))
        if learner is None:
            print(f"No account found for {email}. Register the account first, then run this script.")
            raise SystemExit(1)
        learner.role = LearnerRole.admin
        db.commit()
        print(f"{email} is now an admin.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
