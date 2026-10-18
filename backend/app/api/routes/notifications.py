"""In-app notifications for the authenticated user.

There is no learner_id parameter: the recipient is always the caller, so a
user can never list or mark another user's notifications. A notification
id that belongs to someone else is reported as not found.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_learner, get_db
from app.core.exceptions import NotFoundError
from app.models.learner import Learner
from app.models.notification import Notification
from app.schemas.notification import NotificationList, NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _unread_count(db: Session, recipient_id: uuid.UUID) -> int:
    return int(
        db.scalar(
            select(func.count(Notification.id)).where(Notification.recipient_id == recipient_id, Notification.is_read.is_(False))
        )
        or 0
    )


@router.get("", response_model=NotificationList)
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> NotificationList:
    stmt = select(Notification).where(Notification.recipient_id == current.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    items = list(db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit)))
    return NotificationList(
        items=[NotificationRead.model_validate(n) for n in items], unread_count=_unread_count(db, current.id)
    )


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: uuid.UUID, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)
) -> NotificationRead:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.recipient_id != current.id:
        raise NotFoundError("Notification not found")
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(UTC)
        db.commit()
        db.refresh(notification)
    return NotificationRead.model_validate(notification)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)) -> None:
    db.execute(
        update(Notification)
        .where(Notification.recipient_id == current.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    db.commit()
