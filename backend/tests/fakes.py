"""Deterministic stand-ins for Gemini used by RAG tests (no network).

FakeGemini embeds text as a hashed bag of words, so texts sharing words
really are closer in cosine space -- retrieval tests exercise genuine
ranking rather than constant vectors.
"""

from __future__ import annotations

import hashlib
import json
import math
import re

from app.ai.gemini_client import GeminiError

DIM = 768


def bag_of_words_vector(text: str) -> list[float]:
    vec = [0.0] * DIM
    for word in re.findall(r"[a-z]{3,}", text.lower()):
        vec[int(hashlib.md5(word.encode()).hexdigest(), 16) % DIM] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    if not any(vec):
        vec[0] = 1.0
    return [v / norm for v in vec]


class FakeGemini:
    is_configured = True

    def __init__(self, *, answer: dict | None = None, embed_error: str | None = None, generate_error: str | None = None):
        self.answer = answer
        self.embed_error = embed_error
        self.generate_error = generate_error
        self.embed_calls = 0
        self.prompts: list[str] = []
        self.last_model_used: str | None = None

    def embed_texts(self, texts, task_type="RETRIEVAL_DOCUMENT"):
        self.embed_calls += 1
        if self.embed_error:
            raise GeminiError(self.embed_error, "embed", status=400 if self.embed_error != "rate_limited" else 429)
        return [bag_of_words_vector(t) for t in texts]

    def embed_query(self, text):
        return self.embed_texts([text], task_type="RETRIEVAL_QUERY")[0]

    def generate_json(self, prompt: str) -> str:
        self.prompts.append(prompt)
        if self.generate_error:
            raise GeminiError(self.generate_error, "generate", status=503 if self.generate_error == "server_error" else None)
        self.last_model_used = "fake-model"
        if self.answer is not None:
            return json.dumps(self.answer)
        if "general knowledge" in prompt:
            return json.dumps({"answer": "Here is a general explanation that is not verified by the textbooks."})
        return json.dumps({"chapter_title": None, "topics": ["fixture"], "difficulty_estimate": "beginner", "review_notes": []})
