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

    # --- Gemini ---
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
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
    def is_gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    """Returns a cached Settings instance (environment is read once per process)."""
    return Settings()
