"""Centralized application configuration.

All runtime configuration is read from environment variables (optionally via
a local .env file during development). Nothing here hardcodes credentials.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Application ---
    environment: str = "development"
    log_level: str = "INFO"

    # --- Database ---
    database_url: str = "postgresql+psycopg://edunex:edunex@localhost:5432/edunex"

    # --- CORS ---
    cors_origins: str = "http://localhost:3000"

    # --- Authentication ---
    secret_key: str = "change-me-generate-a-real-random-secret"
    access_token_expire_minutes: int = 10080  # 7 days
    session_cookie_name: str = "edunex_session"
    session_cookie_secure: bool = False

    # --- Learning activity ---
    # IANA timezone whose calendar days define a "learning day" for streaks
    # and activity charts. One policy for every learner (no per-user zones yet).
    activity_timezone: str = "UTC"

    # --- Gemini ---
    gemini_api_key: str | None = None
<<<<<<< HEAD
    gemini_model: str = "gemini-3.8-flash"
=======
    # gemini-2.5-flash now returns 404 "no longer available to new users" and
    # names gemini-3.8-flash as its replacement (verified 2026-10-18).
    gemini_model: str = "gemini-3.8-flash"
    # Comma-separated generation models tried, in order, only when the primary
    # model is temporarily unavailable (503/429/timeout) after its retries.
    # Empty = no fallback. Embeddings never fall back (vectors must stay comparable).
    gemini_fallback_models: str = "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3-flash-preview"
>>>>>>> b5abe61 (Implemented 3)
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_embedding_dimensions: int = 768
    gemini_timeout_seconds: float = 30.0

    # --- RAG ---
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120
    rag_top_k: int = 4
    rag_min_similarity: float = 0.55

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def gemini_fallback_model_list(self) -> list[str]:
        return [m.strip() for m in self.gemini_fallback_models.split(",") if m.strip()]

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    """Returns a cached Settings instance (environment is read once per process)."""
    return Settings()
