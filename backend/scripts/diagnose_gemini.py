"""Checks the configured Gemini key, models, and embedding dimension.

Run from backend/: python -m scripts.diagnose_gemini

Makes at most two small API calls (one embedding of a short sentence, one
tiny generation) and prints the outcome category for each -- never the API
key, and never the vector itself (only its length and norm).
Exit code 0 = both checks passed, 1 = a check failed, 2 = not configured.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.ai.gemini_client import GeminiClient, GeminiError, RetryPolicy  # noqa: E402
from app.core.config import get_settings  # noqa: E402

SAMPLE = "A linked list stores elements in nodes connected by pointers."


def main() -> int:
    settings = get_settings()
    print(f"generation model:  {settings.gemini_model}")
    print(f"embedding model:   {settings.gemini_embedding_model}")
    print(f"expected dims:     {settings.gemini_embedding_dimensions}")
    print(f"api key present:   {'yes' if settings.is_gemini_configured else 'no'}")
    if not settings.is_gemini_configured:
        print("RESULT: not_configured -- set GEMINI_API_KEY in backend/.env")
        return 2

    # One attempt only: a diagnostic should report, not wait out retries.
    client = GeminiClient(retry=RetryPolicy(max_attempts=1))
    ok = True

    try:
        vector = client.embed_query(SAMPLE)
        norm = math.sqrt(sum(v * v for v in vector))
        dims_ok = len(vector) == settings.gemini_embedding_dimensions
        print(f"embedding:         OK  dims={len(vector)} ({'matches' if dims_ok else 'MISMATCH'}) norm={norm:.3f}")
        ok &= dims_ok
    except GeminiError as exc:
        print(f"embedding:         FAILED category={exc.category} status={exc.status}")
        print(f"                   {exc.message}")
        ok = False

    try:
        text = client.generate_json('Return the JSON object {"ok": true} and nothing else.')
        print(f"generation:        OK  response_chars={len(text)}")
    except GeminiError as exc:
        print(f"generation:        FAILED category={exc.category} status={exc.status}")
        print(f"                   {exc.message}")
        ok = False

    print("RESULT:", "all checks passed" if ok else "see failures above")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
