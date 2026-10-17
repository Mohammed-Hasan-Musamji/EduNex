"""Shared Pydantic building blocks used across multiple schema modules."""

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base for response schemas that read directly from SQLAlchemy ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list = []


class ErrorResponse(BaseModel):
    """Matches the JSON shape produced by app/core/exceptions.py handlers."""

    error: ErrorDetail
