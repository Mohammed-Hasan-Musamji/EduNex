"""Application-wide logging configuration.

Logging intentionally never includes request bodies, API keys, or full
learner records -- only identifiers and high-level event descriptions.
"""

import logging

from app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Quiet noisy third-party loggers that may otherwise echo connection
    # strings or request payloads at DEBUG level.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("google_genai").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
