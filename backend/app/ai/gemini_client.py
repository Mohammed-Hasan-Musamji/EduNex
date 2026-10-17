"""Thin wrapper around the Google Gen AI SDK (`google-genai`).

Keeps all direct SDK usage in one place so the rest of the app depends on a
small, mockable interface instead of the SDK directly. Never logs the API
key or full prompts/responses (which may contain learner-authored text).
"""

from __future__ import annotations

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import get_logger

logger = get_logger(__name__)


class GeminiClient:
    """Mockable boundary around Gemini text generation and embeddings.

    Raises ServiceUnavailableError (not a raw SDK exception) on any failure,
    so callers get a consistent, safe-to-display error message.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._client: genai.Client | None = None
        if settings.is_gemini_configured:
            self._client = genai.Client(
                api_key=settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000)),
            )

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def _require_client(self) -> genai.Client:
        if self._client is None:
            raise ServiceUnavailableError(
                "Gemini is not configured on this server (GEMINI_API_KEY is unset)."
            )
        return self._client

    def generate_json(self, prompt: str) -> str:
        """Requests a JSON-only response from the configured generation model."""
        client = self._require_client()
        try:
            response = client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
        except Exception as exc:
            logger.warning("Gemini generation call failed: %s", exc.__class__.__name__)
            raise ServiceUnavailableError("The AI generation service is temporarily unavailable.") from exc

        text = getattr(response, "text", None)
        if not text:
            raise ServiceUnavailableError("The AI generation service returned an empty response.")
        return text

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embeds a batch of texts using the configured embedding model."""
        client = self._require_client()
        try:
            response = client.models.embed_content(
                model=self._settings.gemini_embedding_model,
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=self._settings.gemini_embedding_dimensions),
            )
        except Exception as exc:
            logger.warning("Gemini embedding call failed: %s", exc.__class__.__name__)
            raise ServiceUnavailableError("The embedding service is temporarily unavailable.") from exc

        embeddings = getattr(response, "embeddings", None)
        if not embeddings:
            raise ServiceUnavailableError("The embedding service returned no embeddings.")
        return [list(e.values) for e in embeddings]


def get_gemini_client() -> GeminiClient:
    """FastAPI-dependency-friendly factory (also used directly by services)."""
    return GeminiClient()
