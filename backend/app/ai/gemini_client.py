"""Thin wrapper around the Google Gen AI SDK (`google-genai`).

Keeps all direct SDK usage in one place so the rest of the app depends on a
small, mockable interface instead of the SDK directly. Never logs the API
key or full prompts/responses (which may contain learner-authored text).

Failure handling:
- Every SDK failure is classified (see `classify_error`) into a category
  such as `invalid_api_key`, `model_not_found`, `rate_limited`, or
  `server_error`, and raised as GeminiError (a ServiceUnavailableError) whose
  message names that category -- so a bad key is never reported as a
  "temporary" outage.
- Only retryable categories (rate limits, 5xx, timeouts, network) are
  retried, with bounded exponential backoff and full jitter. Permanent
  errors (bad key, missing model, invalid request) fail on the first try.
- Embeddings are sent in batches of at most EMBED_BATCH_SIZE inputs, the
  Gemini API's per-request limit. Sending a whole textbook in one request
  is what made bulk ingestion fail with a 400 ClientError.
"""

from __future__ import annotations

import random
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, TypeVar

import httpx
from google import genai
from google.genai import errors, types

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")

EMBED_BATCH_SIZE = 100
MAX_ATTEMPTS = 4
BACKOFF_BASE_SECONDS = 1.0
BACKOFF_CAP_SECONDS = 20.0

EmbeddingTask = Literal["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "SEMANTIC_SIMILARITY"]

ErrorCategory = Literal[
    "not_configured",
    "invalid_api_key",
    "permission_denied",
    "model_not_found",
    "invalid_request",
    "rate_limited",
    "server_error",
    "timeout",
    "network",
    "empty_response",
    "unknown",
]

RETRYABLE: frozenset[str] = frozenset({"rate_limited", "server_error", "timeout", "network"})

_CATEGORY_MESSAGES: dict[str, str] = {
    "not_configured": "Gemini is not configured on this server (GEMINI_API_KEY is unset).",
    "invalid_api_key": "The Gemini API rejected the configured API key. Check GEMINI_API_KEY.",
    "permission_denied": "The Gemini API key does not have access to this model or API.",
    "model_not_found": "The configured Gemini model was not found or is not available to this key.",
    "invalid_request": "The Gemini API rejected the request as invalid.",
    "rate_limited": "The Gemini API rate limit or quota was exceeded. Try again later.",
    "server_error": "The Gemini API had a server error. Try again later.",
    "timeout": "The Gemini API request timed out.",
    "network": "Could not reach the Gemini API (network error).",
    "empty_response": "The Gemini API returned an empty response.",
    "unknown": "The Gemini API call failed unexpectedly.",
}


class GeminiError(ServiceUnavailableError):
    """A classified Gemini failure. `category` is safe to show and log."""

    def __init__(self, category: str, operation: str, *, status: int | None = None, detail: str | None = None) -> None:
        self.category = category
        self.operation = operation
        self.status = status
        self.retryable = category in RETRYABLE
        message = f"{_CATEGORY_MESSAGES.get(category, _CATEGORY_MESSAGES['unknown'])} [{operation}: {category}"
        message += f", HTTP {status}]" if status else "]"
        super().__init__(message, details=[{"category": category, "status": status, "detail": detail}] if detail else [])


def classify_error(exc: BaseException) -> tuple[str, int | None, str | None]:
    """Maps an SDK/transport exception to (category, http_status, short_detail)."""
    if isinstance(exc, errors.APIError):
        code = exc.code
        status = (exc.status or "").upper()
        message = (exc.message or "")[:200]
        lowered = message.lower()
        if code == 400 and ("api key" in lowered or (status == "INVALID_ARGUMENT" and "key" in lowered)):
            return "invalid_api_key", code, message
        if code in (401,) or status == "UNAUTHENTICATED":
            return "invalid_api_key", code, message
        if code == 403 or status == "PERMISSION_DENIED":
            return "permission_denied", code, message
        if code == 404 or status == "NOT_FOUND":
            return "model_not_found", code, message
        if code == 429 or status == "RESOURCE_EXHAUSTED":
            return "rate_limited", code, message
        if code == 408 or status == "DEADLINE_EXCEEDED":
            return "timeout", code, message
        if code is not None and code >= 500:
            return "server_error", code, message
        if code is not None and 400 <= code < 500:
            return "invalid_request", code, message
        return "unknown", code, message
    if isinstance(exc, httpx.TimeoutException | TimeoutError):
        return "timeout", None, None
    if isinstance(exc, httpx.TransportError | ConnectionError):
        return "network", None, None
    return "unknown", None, type(exc).__name__


@dataclass
class RetryPolicy:
    max_attempts: int = MAX_ATTEMPTS
    base_seconds: float = BACKOFF_BASE_SECONDS
    cap_seconds: float = BACKOFF_CAP_SECONDS
    sleep: Callable[[float], None] = time.sleep

    def delay(self, attempt: int) -> float:
        """Full-jitter exponential backoff for retry number `attempt` (1-based)."""
        return random.uniform(0, min(self.cap_seconds, self.base_seconds * (2 ** (attempt - 1))))


class GeminiClient:
    """Mockable boundary around Gemini text generation and embeddings.

    Raises GeminiError (a ServiceUnavailableError) on any failure, so callers
    get a consistent, safe-to-display, *specific* error message.
    """

    def __init__(self, retry: RetryPolicy | None = None, sdk_client: genai.Client | None = None) -> None:
        settings = get_settings()
        self._settings = settings
        self._retry = retry or RetryPolicy()
        self._client: genai.Client | None = sdk_client
        self.last_model_used: str | None = None
        if self._client is None and settings.is_gemini_configured:
            self._client = genai.Client(
                api_key=settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000)),
            )

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def _require_client(self, operation: str) -> genai.Client:
        if self._client is None:
            raise GeminiError("not_configured", operation)
        return self._client

    def _call(self, operation: str, fn: Callable[[], T]) -> T:
        attempt = 1
        while True:
            try:
                return fn()
            except Exception as exc:
                category, status, detail = classify_error(exc)
                retryable = category in RETRYABLE
                logger.warning(
                    "Gemini %s failed: category=%s status=%s attempt=%d/%d retryable=%s",
                    operation, category, status, attempt, self._retry.max_attempts, retryable,
                )
                if not retryable or attempt >= self._retry.max_attempts:
                    raise GeminiError(category, operation, status=status, detail=detail) from exc
                self._retry.sleep(self._retry.delay(attempt))
                attempt += 1

    def generate_json(self, prompt: str, model: str | None = None) -> str:
        """Requests a JSON-only response. Tries `model` (default GEMINI_MODEL),
        then each GEMINI_FALLBACK_MODELS entry -- but only when the previous
        model failed with a *retryable* error after its own retries. A permanent
        error (bad key, invalid request) is raised immediately. The model that
        produced the answer is recorded in `last_model_used`."""
        client = self._require_client("generate")
        primary = model or self._settings.gemini_model
        candidates = [primary] + [m for m in self._settings.gemini_fallback_model_list if m != primary]
        self.last_model_used = None
        for index, candidate in enumerate(candidates):
            try:
                response = self._call(
                    "generate",
                    lambda candidate=candidate: client.models.generate_content(
                        model=candidate,
                        contents=prompt,
                        config=types.GenerateContentConfig(response_mime_type="application/json"),
                    ),
                )
            except GeminiError as exc:
                if exc.retryable and index + 1 < len(candidates):
                    logger.warning("Gemini model %s unavailable (%s); trying fallback %s", candidate, exc.category, candidates[index + 1])
                    continue
                raise
            text = getattr(response, "text", None)
            if not text:
                raise GeminiError("empty_response", "generate")
            self.last_model_used = candidate
            return text
        raise AssertionError("unreachable")

    def embed_texts(self, texts: list[str], task_type: EmbeddingTask = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
        """Embeds texts in API-sized batches; returns one vector per input, in order."""
        client = self._require_client("embed")
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[start : start + EMBED_BATCH_SIZE]
            response = self._call(
                "embed",
                lambda batch=batch: client.models.embed_content(
                    model=self._settings.gemini_embedding_model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        output_dimensionality=self._settings.gemini_embedding_dimensions,
                        task_type=task_type,
                    ),
                ),
            )
            embeddings = getattr(response, "embeddings", None) or []
            if len(embeddings) != len(batch):
                raise GeminiError(
                    "empty_response", "embed", detail=f"expected {len(batch)} embeddings, got {len(embeddings)}"
                )
            vectors.extend(list(e.values or []) for e in embeddings)
        return vectors

    def embed_query(self, text: str) -> list[float]:
        """Embeds one search query (uses the retrieval-query task type)."""
        return self.embed_texts([text], task_type="RETRIEVAL_QUERY")[0]


def get_gemini_client() -> GeminiClient:
    """FastAPI-dependency-friendly factory (also used directly by services)."""
    return GeminiClient()
