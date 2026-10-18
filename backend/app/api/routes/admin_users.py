"""Real admin user-management endpoints (admin-only).

Lists and manages actual Learner accounts (every account IS a user, see
app/models/learner.py) -- not fabricated rows. There is intentionally no
endpoint to create an admin account here; promote one via direct database
access (see backend/README.md).
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_learner, get_db, require_admin
from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.learner import Learner
from app.schemas.admin_user import AdminUserRead, AdminUserRoleUpdate

router = APIRouter(prefix="/admin/users", tags=["admin-users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[AdminUserRead])
def list_users(db: Session = Depends(get_db)) -> list[Learner]:
    return list(db.scalars(select(Learner).order_by(Learner.created_at.desc())))


@router.patch("/{user_id}/role", response_model=AdminUserRead)
def update_user_role(
    user_id: uuid.UUID,
    payload: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    current: Learner = Depends(get_current_learner),
) -> Learner:
    if user_id == current.id:
        raise ValidationAppError("You cannot change your own role.")

    user = db.get(Learner, user_id)
    if user is None:
        raise NotFoundError(f"User {user_id} was not found")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
