"""Gemini client behavior with a fake SDK -- no network calls."""

from types import SimpleNamespace

import httpx
import pytest
from google.genai import errors

from app.ai.gemini_client import EMBED_BATCH_SIZE, GeminiClient, GeminiError, RetryPolicy, classify_error
from app.core.exceptions import ServiceUnavailableError
from app.rag.embeddings import embed_chunks, embed_query

DIM = 768


def api_error(code: int, status: str, message: str) -> errors.APIError:
    cls = errors.ClientError if code < 500 else errors.ServerError
    return cls(code, {"error": {"code": code, "status": status, "message": message}})


class FakeModels:
    def __init__(self, failures=None, dim=DIM):
        self.failures = list(failures or [])
        self.embed_calls: list[dict] = []
        self.dim = dim

    def embed_content(self, *, model, contents, config):
        self.embed_calls.append({"model": model, "n": len(contents), "task_type": config.task_type})
        if self.failures:
            raise self.failures.pop(0)
        return SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1] * self.dim) for _ in contents])

    def generate_content(self, *, model, contents, config):
        if self.failures:
            raise self.failures.pop(0)
        return SimpleNamespace(text='{"ok": true}')


def make_client(models: FakeModels, attempts: int = 4) -> tuple[GeminiClient, list[float]]:
    sleeps: list[float] = []
    client = GeminiClient(retry=RetryPolicy(max_attempts=attempts, sleep=sleeps.append), sdk_client=SimpleNamespace(models=models))
    return client, sleeps


def test_embeddings_are_sent_in_api_sized_batches():
    models = FakeModels()
    client, _ = make_client(models)
    vectors = client.embed_texts([f"chunk {i}" for i in range(250)])
    assert len(vectors) == 250
    assert [c["n"] for c in models.embed_calls] == [EMBED_BATCH_SIZE, EMBED_BATCH_SIZE, 50]
    assert all(c["task_type"] == "RETRIEVAL_DOCUMENT" for c in models.embed_calls)


def test_query_embedding_uses_query_task_type():
    models = FakeModels()
    client, _ = make_client(models)
    assert len(embed_query(client, "what is a pointer?")) == DIM
    assert models.embed_calls[0]["task_type"] == "RETRIEVAL_QUERY"


@pytest.mark.parametrize(
    ("exc", "category", "retryable"),
    [
        (api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key."), "invalid_api_key", False),
        (api_error(403, "PERMISSION_DENIED", "denied"), "permission_denied", False),
        (api_error(404, "NOT_FOUND", "models/x is not found"), "model_not_found", False),
        (api_error(400, "INVALID_ARGUMENT", "at most 100 requests can be in one batch"), "invalid_request", False),
        (api_error(429, "RESOURCE_EXHAUSTED", "quota"), "rate_limited", True),
        (api_error(503, "UNAVAILABLE", "overloaded"), "server_error", True),
        (httpx.ReadTimeout("slow"), "timeout", True),
        (httpx.ConnectError("dns"), "network", True),
    ],
)
def test_errors_are_classified(exc, category, retryable):
    got, _, _ = classify_error(exc)
    assert got == category
    models = FakeModels(failures=[exc])
    client, _ = make_client(models, attempts=1)
    with pytest.raises(GeminiError) as info:
        client.embed_texts(["x"])
    assert info.value.category == category
    assert info.value.retryable is retryable
    assert isinstance(info.value, ServiceUnavailableError)


def test_retryable_errors_back_off_then_succeed():
    models = FakeModels(failures=[api_error(429, "RESOURCE_EXHAUSTED", "q"), api_error(503, "UNAVAILABLE", "o")])
    client, sleeps = make_client(models)
    assert len(client.embed_texts(["x"])) == 1
    assert len(models.embed_calls) == 3
    assert len(sleeps) == 2
    assert all(0 <= s <= 20 for s in sleeps)


def test_permanent_errors_are_not_retried():
    models = FakeModels(failures=[api_error(400, "INVALID_ARGUMENT", "API key not valid.")] * 4)
    client, sleeps = make_client(models)
    with pytest.raises(GeminiError):
        client.embed_texts(["x"])
    assert len(models.embed_calls) == 1
    assert sleeps == []


def test_retries_are_bounded():
    models = FakeModels(failures=[api_error(503, "UNAVAILABLE", "o")] * 10)
    client, sleeps = make_client(models, attempts=3)
    with pytest.raises(GeminiError) as info:
        client.embed_texts(["x"])
    assert info.value.category == "server_error"
    assert len(models.embed_calls) == 3
    assert len(sleeps) == 2


def test_dimension_mismatch_is_refused():
    client, _ = make_client(FakeModels(dim=3072))
    with pytest.raises(ServiceUnavailableError, match="3072-dimensional"):
        embed_chunks(client, ["x"])


def test_unconfigured_client_reports_not_configured(monkeypatch):
    client = GeminiClient(sdk_client=None)
    assert client.is_configured is False
    with pytest.raises(GeminiError) as info:
        client.embed_texts(["x"])
    assert info.value.category == "not_configured"


class ModelAwareModels(FakeModels):
    """Fails generation for specific models, to exercise fallback."""

    def __init__(self, failing: dict[str, Exception]):
        super().__init__()
        self.failing = failing
        self.models_called: list[str] = []

    def generate_content(self, *, model, contents, config):
        self.models_called.append(model)
        if model in self.failing:
            raise self.failing[model]
        return SimpleNamespace(text='{"ok": true}')


def test_generation_falls_back_only_on_retryable_errors(monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "gemini_model", "primary-model")
    monkeypatch.setattr(settings, "gemini_fallback_models", "backup-model, primary-model")
    overloaded = api_error(503, "UNAVAILABLE", "This model is currently experiencing high demand.")

    models = ModelAwareModels({"primary-model": overloaded})
    client, _ = make_client(models, attempts=2)
    assert client.generate_json("x") == '{"ok": true}'
    assert models.models_called == ["primary-model", "primary-model", "backup-model"]  # retried, then fell back
    assert client.last_model_used == "backup-model"

    bad_key = api_error(400, "INVALID_ARGUMENT", "API key not valid.")
    models = ModelAwareModels({"primary-model": bad_key})
    client, _ = make_client(models, attempts=2)
    with pytest.raises(GeminiError) as info:
        client.generate_json("x")
    assert info.value.category == "invalid_api_key"
    assert models.models_called == ["primary-model"]  # permanent: no retry, no fallback

    models = ModelAwareModels({"primary-model": overloaded, "backup-model": overloaded})
    client, _ = make_client(models, attempts=1)
    with pytest.raises(GeminiError) as info:
        client.generate_json("x")
    assert info.value.category == "server_error" and info.value.status == 503
    assert client.last_model_used is None


def test_no_fallback_configured_means_primary_only(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "gemini_fallback_models", "")
    models = ModelAwareModels({get_settings().gemini_model: api_error(503, "UNAVAILABLE", "busy")})
    client, _ = make_client(models, attempts=1)
    with pytest.raises(GeminiError):
        client.generate_json("x")
    assert len(models.models_called) == 1


def test_default_fallback_models_include_35_flash():
    from app.core.config import get_settings
    get_settings.cache_clear()
    settings = get_settings()
    fallbacks = settings.gemini_fallback_model_list
    assert "gemini-3.5-flash" in fallbacks
    assert "gemini-3.5-flash-lite" in fallbacks

