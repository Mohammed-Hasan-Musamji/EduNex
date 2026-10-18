"""Run a unit of work as one transaction, retrying once on a unique-key race.

Reward-bearing operations (a practice round, a diagnostic answer, a lesson
completion) write several rows -- attempts, progress, learning events,
achievements, notifications -- that must commit or fail together. Every
idempotency guarantee is backed by a unique constraint, so a concurrent
duplicate request surfaces as an IntegrityError at commit. Rolling back and
re-running the whole unit lets the retry observe the winner's committed
rows (and replay them) instead of failing or double-awarding.
"""

from __future__ import annotations

from collections.abc import Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError

MAX_ATTEMPTS = 2


def run_in_transaction[T](db: Session, unit: Callable[[], T]) -> T:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            result = unit()
            db.commit()
            return result
        except IntegrityError:
            db.rollback()
            if attempt == MAX_ATTEMPTS:
                raise ConflictError("This request conflicted with another one in progress. Please try again.") from None
        except Exception:
            db.rollback()
            raise
    raise AssertionError("unreachable")
