"""Embedding generation for academic content chunks.

Validates that every returned vector matches the configured dimension, so a
model/config change can never silently mix incompatible vector sizes in the
same column.
"""

from app.ai.gemini_client import GeminiClient
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError


def embed_chunks(client: GeminiClient, texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    settings = get_settings()
    vectors = client.embed_texts(texts)
    expected_dim = settings.gemini_embedding_dimensions
    for vector in vectors:
        if len(vector) != expected_dim:
            raise ServiceUnavailableError(
                f"Embedding model returned {len(vector)}-dimensional vectors, "
                f"but GEMINI_EMBEDDING_DIMENSIONS is {expected_dim}. Refusing to "
                "store mismatched vectors -- check GEMINI_EMBEDDING_MODEL/"
                "GEMINI_EMBEDDING_DIMENSIONS, or re-index after changing them."
            )
    return vectors
