"""Embedding generation for academic content chunks and search queries.

Validates that every returned vector matches the configured dimension and is
non-degenerate, so a model/config change can never silently mix incompatible
vector sizes in the same column, and a failed call can never be papered over
with placeholder vectors.
"""

from app.ai.gemini_client import GeminiClient
from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError


def _validate(vectors: list[list[float]], expected_count: int) -> list[list[float]]:
    expected_dim = get_settings().gemini_embedding_dimensions
    if len(vectors) != expected_count:
        raise ServiceUnavailableError(
            f"Embedding model returned {len(vectors)} vectors for {expected_count} inputs. Refusing to store a partial result."
        )
    for vector in vectors:
        if len(vector) != expected_dim:
            raise ServiceUnavailableError(
                f"Embedding model returned {len(vector)}-dimensional vectors, "
                f"but GEMINI_EMBEDDING_DIMENSIONS is {expected_dim}. Refusing to "
                "store mismatched vectors -- check GEMINI_EMBEDDING_MODEL/"
                "GEMINI_EMBEDDING_DIMENSIONS, or re-index after changing them."
            )
        if not any(vector):
            raise ServiceUnavailableError("Embedding model returned an all-zero vector. Refusing to store it.")
    return vectors


def embed_chunks(client: GeminiClient, texts: list[str]) -> list[list[float]]:
    """Embeds document chunks (retrieval-document task type)."""
    if not texts:
        return []
    return _validate(client.embed_texts(texts), len(texts))


def embed_query(client: GeminiClient, text: str) -> list[float]:
    """Embeds a search query (retrieval-query task type) with the same model and dimension."""
    return _validate([client.embed_query(text)], 1)[0]
