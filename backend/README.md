# EduNex Backend

FastAPI backend for **EduNex** — "Turns Learning Gaps into Personalized Growth."

This service powers the Next.js frontend (`../edunex-frontend`) with learner
profiles, subject/topic content, AI-generated structured lessons (grounded in
a retrieved academic knowledge base), server-evaluated assessments, progress
tracking, and basic next-activity recommendations.

The MVP implements one validated end-to-end workflow: **Data Structures →
Linked Lists**. The architecture supports adding more subjects/topics later,
but no other topic's content has been implemented or validated yet.

---

## 1. What this backend does

1. Stores learner profiles and optional VARK-style preferences.
2. Serves subjects/topics (seeded: Data Structures → Linked Lists).
3. Accepts a learner's prompt/goal, retrieves relevant academic content via
   pgvector semantic search, and asks Gemini to generate a structured,
   schema-validated lesson (not raw HTML/JS).
4. Persists lesson sessions in PostgreSQL so a learner can resume a lesson
   without retyping anything (Gemini itself is stateless).
5. Serves assessment questions and evaluates submitted answers **on the
   server** (never trusting a client-supplied correctness flag).
6. Tracks per-topic progress and returns a simple, explainable next-activity
   recommendation.
7. Lets learners save/list/remove bookmarked lessons.
8. Exposes development-only admin endpoints to ingest academic text/Markdown
   documents into the knowledge base and test retrieval.

---

## 2. Architecture and folder structure

```
backend/
  main.py                  FastAPI app, CORS, exception handlers, routers
  requirements.txt          Pinned runtime dependencies
  requirements-dev.txt       + ruff (lint)
  .env.example               Placeholder environment variables
  pyproject.toml             ruff + pytest config
  alembic.ini, alembic/      Database migrations
  scripts/seed.py             Idempotent seed command

  app/
    core/
      config.py             Centralized settings (env vars)
      logging.py             Logging setup (never logs secrets)
      exceptions.py          AppError hierarchy + consistent JSON error envelope
    db/
      base.py                Declarative Base, UUID/timestamp mixins
      session.py              Engine + session dependency
      seed.py                 Idempotent seed logic
    models/                  SQLAlchemy ORM models (see section 3)
    schemas/                 Pydantic request/response schemas
    api/
      router.py              Aggregates all /api/v1 routers
      deps.py                 Shared FastAPI dependencies
      routes/                One module per resource group
    services/                Business logic (learner, lesson, assessment,
                              progress, recommendation)
    ai/
      gemini_client.py        Thin, mockable wrapper around google-genai
      prompts.py               Centralized Gemini prompt templates
      lesson_generator.py       Retrieval -> prompt -> generate -> validate
    rag/
      document_loader.py       Safe text/Markdown decoding (no file paths)
      chunker.py                Configurable chunking with overlap
      embeddings.py             Embedding generation + dimension validation
      retriever.py               pgvector cosine search (+ SQLite fallback)
      ingestion.py                Orchestrates document -> chunks -> vectors

  tests/                    pytest suite (SQLite + mocked Gemini, no network)
```

Route handlers are kept thin; business logic lives in `services/`, and
database access happens through SQLAlchemy directly in services/routes for
simple reads, or through services for anything stateful.

---

## 3. Database models and relationships

All primary keys are UUIDs (not guessable sequential integers). All
timestamps are timezone-aware.

- **Learner** — `display_name`, `preferences` (JSON: VARK-style preferences,
  preferred detail level, current goal). Has many `LessonSession`,
  `LearnerProgress`, `SavedLesson`.
- **Subject** — `name`, `slug` (unique), `description`, `is_active`. Has many
  `Topic`.
- **Topic** — belongs to `Subject`; `name`, `slug` (unique per subject),
  `description`, `difficulty`.
- **LessonSession** — belongs to `Learner` and `Topic`; stores the learner's
  `prompt`, `vark_preferences`, `status` (generating/ready/failed), the
  validated `lesson_json`, `source_references`, and `failure_reason`. This is
  what makes a lesson resumable without Gemini "remembering" anything.
- **AssessmentQuestion** — belongs to `Topic`; `question_text`,
  `question_type` (multiple_choice/true_false), `options`, **`correct_answer`
  (never serialized to the public question-listing schema)**, `explanation`,
  `difficulty`.
- **AssessmentAttempt** — belongs to `Learner` and `AssessmentQuestion`;
  `submitted_answer`, server-computed `is_correct`/`score`, `feedback`.
- **LearnerProgress** — one row per (`learner`, `topic`); `mastery_estimate`
  (0-100, simple accuracy ratio), `attempts_count`, `correct_count`,
  `last_activity_at`. Unique on (`learner_id`, `topic_id`).
- **SavedLesson** — belongs to `Learner` and `LessonSession`; unique on
  (`learner_id`, `lesson_session_id`) to prevent duplicate bookmarks.
- **AcademicDocument** — `title`, `source_name`, `raw_text` (the full
  original text, preserved so ingestion can be retried without the client
  resending it), `content_type`, `ingestion_status`, `failure_detail`,
  `metadata` (JSON).
- **AcademicContentChunk** — belongs to `AcademicDocument`; `chunk_text`
  (stored separately from its embedding), `chunk_order`, `metadata`, and
  `embedding` — a **pgvector** column on PostgreSQL. On SQLite (tests only)
  this falls back to a JSON-encoded float array; see section 17.

---

## 4. API endpoints

All new endpoints are under `/api/v1`. The pre-existing `GET /` and
`GET /health` routes are untouched.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Preserved app welcome message |
| GET | `/health` | Preserved basic liveness check |
| GET | `/api/v1/health/ready` | DB connectivity + Gemini-configured status (no paid call) |
| POST | `/api/v1/learners` | Create a learner |
| GET | `/api/v1/learners/{id}` | Fetch a learner |
| PATCH | `/api/v1/learners/{id}` | Update display name / preferences |
| GET/PUT | `/api/v1/learners/{id}/preferences` | Read/replace VARK-style preferences |
| GET | `/api/v1/subjects` | List active subjects |
| GET | `/api/v1/subjects/{id}` | Subject detail incl. topics |
| GET | `/api/v1/subjects/{id}/topics` | Topics for a subject |
| GET | `/api/v1/topics/{id}` | Topic detail |
| POST | `/api/v1/lessons` | Create a lesson session (retrieval + Gemini generation) |
| GET | `/api/v1/lessons/{id}` | Fetch a lesson session |
| POST | `/api/v1/lessons/{id}/resume` | Re-fetch, retrying generation if it previously failed |
| GET | `/api/v1/learners/{id}/lessons` | List a learner's lesson sessions |
| POST/GET/DELETE | `/api/v1/learners/{id}/saved-lessons[/{lesson_id}]` | Save/list/remove bookmarks |
| GET | `/api/v1/topics/{id}/questions` | Assessment questions (no correct answers/explanations) |
| POST | `/api/v1/assessments/attempts` | Submit an answer; evaluated server-side |
| GET | `/api/v1/learners/{id}/assessments` | A learner's attempt history |
| GET | `/api/v1/learners/{id}/progress` | All progress records |
| GET | `/api/v1/learners/{id}/progress/{topic_id}` | Progress for one topic (safe zeroed default if none yet) |
| GET | `/api/v1/learners/{id}/recommendations` | Next-activity recommendations |
| POST | `/api/v1/admin/knowledge-base/documents` | Ingest raw text/Markdown (JSON body) |
| POST | `/api/v1/admin/knowledge-base/documents/upload` | Ingest a `.txt`/`.md` file upload |
| GET | `/api/v1/admin/knowledge-base/documents[/{id}]` | List/fetch documents + ingestion status |
| POST | `/api/v1/admin/knowledge-base/documents/{id}/ingest` | (Re)chunk + embed + index |
| POST | `/api/v1/admin/knowledge-base/search` | Test semantic retrieval |

Interactive docs: **http://localhost:8000/docs** (Swagger) once the server is
running.

### Example: create a lesson session

```http
POST /api/v1/lessons
{
  "learner_id": "f3cf7a47-...",
  "topic_id": "9cf4ae03-...",
  "prompt": "Explain how linked lists work",
  "vark_preferences": ["visual"]
}
```

```json
{
  "id": "e429624f-...",
  "status": "ready",
  "lesson": {
    "title": "Understanding Linked Lists",
    "learning_objectives": ["Explain what a linked list is"],
    "blocks": [
      {"type": "explanation", "heading": "...", "body": "..."},
      {"type": "interactive_visualization", "component_type": "linked_list",
       "config": {"node_values": ["1", "2", "3"], "mode": "traversal"}},
      {"type": "practice_question", "...": "..."}
    ],
    "source_references": []
  }
}
```

If `GEMINI_API_KEY` is not configured, this returns:

```json
{"error": {"code": "SERVICE_UNAVAILABLE", "message": "Lesson generation is unavailable: GEMINI_API_KEY is not configured on this server.", "details": []}}
```
with HTTP `503` — never a fabricated lesson.

### Error format

```json
{"error": {"code": "VALIDATION_ERROR", "message": "The request could not be validated", "details": [...] }}
```
Status codes used: `200/201/204` success, `404` missing resource, `409`
conflict (duplicate save), `422` validation, `503` dependency unavailable.
`401`/`403`/`429` are not emitted because there is no auth system and no
rate limiting implemented yet (see section 19).

---

## 5. Prerequisites

- Python 3.12 (project was built/tested with 3.12.3)
- PostgreSQL 16 with the **pgvector** extension (`postgresql-16-pgvector` on
  Debian/Ubuntu)
- A Google Gemini API key (optional — the app runs without one; lesson
  generation and embeddings return `503` until configured)

---

## 6. Setup — Windows (PowerShell)

```powershell
cd D:\hackathon\EduNex\backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
# edit .env: set DATABASE_URL, GEMINI_API_KEY, etc.
```

## 7. Setup — Ubuntu/Linux (Bash)

```bash
cd ~/EduNex/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# edit .env: set DATABASE_URL, GEMINI_API_KEY, etc.
```

---

## 8. PostgreSQL setup

**Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-16-pgvector postgresql-contrib
sudo -u postgres psql -c "CREATE USER edunex WITH PASSWORD 'edunex';"
sudo -u postgres psql -c "CREATE DATABASE edunex OWNER edunex;"
```

**Windows:** install PostgreSQL 16 from the official installer, then create
the role/database with `psql` or pgAdmin equivalently.

## 9. pgvector setup

The `postgresql-16-pgvector` package installs the extension files; it still
needs to be enabled **per database**. The first Alembic migration in this
repo runs `CREATE EXTENSION IF NOT EXISTS vector` automatically, so running
migrations (section 10) is normally all you need. To do it manually:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

> **Important limitation of this development environment:** PostgreSQL and
> pgvector could not be installed in the sandbox this backend was built in
> (no system package manager access / no Docker). The schema, migration, and
> retrieval code were written to target real PostgreSQL + pgvector and were
> verified for correctness against **SQLite** (migrations apply/rollback
> cleanly; a brute-force Python cosine-similarity fallback stands in for the
> pgvector query — see section 17) plus a fully mocked Gemini client. **Real
> pgvector-backed semantic search has not been exercised end-to-end.** Please
> run `alembic upgrade head` against a real PostgreSQL+pgvector instance and
> re-run the ingestion/search smoke test below before relying on it.

---

## 10. Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `ENVIRONMENT` | `development` / `production` (informational) |
| `LOG_LEVEL` | Python logging level |
| `DATABASE_URL` | SQLAlchemy URL, e.g. `postgresql+psycopg://edunex:edunex@localhost:5432/edunex` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins, e.g. `http://localhost:3000` |
| `GEMINI_API_KEY` | **Never expose to the browser.** Blank disables generation (returns 503) |
| `GEMINI_MODEL` | Generation model, default `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Embedding model, default `gemini-embedding-001` |
| `GEMINI_EMBEDDING_DIMENSIONS` | Must match the pgvector column width (default `768`) |
| `GEMINI_TIMEOUT_SECONDS` | Per-call timeout |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | Chunking parameters |
| `RAG_TOP_K` / `RAG_MIN_SIMILARITY` | Retrieval parameters |

`NEXT_PUBLIC_*` variables belong to the frontend only — this backend never
reads or needs them, and the Gemini key must never be placed in a
`NEXT_PUBLIC_` variable.

---

## 11. Database migrations

```bash
# apply all migrations (safe, never drops/resets existing data)
alembic upgrade head

# create a new migration after changing models
alembic revision --autogenerate -m "describe the change"

# roll back the most recent migration
alembic downgrade -1
```

The initial migration (`alembic/versions/0001_initial_schema.py`) was
hand-written against the SQLAlchemy models (autogenerate needs a live DB
connection, which was unavailable here) and verified by applying/rolling it
back against SQLite. **Run and verify it against your real PostgreSQL
instance before trusting it in production.**

---

## 12. Seed data

```bash
python -m scripts.seed
```

Idempotent — seeds exactly one subject (Data Structures), one topic (Linked
Lists), and 3 sample assessment questions. Safe to run repeatedly; it never
duplicates or deletes data.

---

## 13. Running the server

```bash
uvicorn main:app --reload --port 8000
```

- App: http://localhost:8000
- Swagger docs: **http://localhost:8000/docs**
- OpenAPI schema: http://localhost:8000/openapi.json

---

## 14. Gemini configuration and failure behavior

- Uses the current **`google-genai`** SDK (the unified Google Gen AI SDK;
  the older `google-generativeai` package is in maintenance mode).
- `GeminiClient` ([app/ai/gemini_client.py](app/ai/gemini_client.py)) is the
  single place that talks to the SDK. If `GEMINI_API_KEY` is unset, every
  method raises a `ServiceUnavailableError`, which routes return as HTTP
  `503` — no fabricated lesson or embedding is ever returned.
- Lesson generation retries once on malformed/non-JSON model output (see
  `MAX_GENERATION_ATTEMPTS` in `app/ai/lesson_generator.py`), then fails with
  `503`.
- A per-call timeout (`GEMINI_TIMEOUT_SECONDS`) is enforced via the SDK's
  `HttpOptions`.
- `source_references` in a generated lesson are **always** the chunks that
  were actually retrieved — the model's own citation claims are discarded
  and overwritten server-side, so it cannot invent sources.
- `GET /api/v1/health/ready` reports whether Gemini is *configured*; it
  never makes a paid API call.

---

## 15. How academic documents are ingested

```
raw text/Markdown (JSON body or .txt/.md upload, decoded in memory)
  -> validated (non-empty, size-limited; no file-path handling at all)
  -> chunked (app/rag/chunker.py: configurable size + overlap, word-boundary aware)
  -> embedded (Gemini embedding model, dimension-validated)
  -> stored as AcademicContentChunk rows (chunk_text + embedding, pgvector column)
```

Only plain text and Markdown are supported. **PDF, image, and
scanned-document ingestion are not implemented.** Re-running ingest on the
same document replaces its chunks rather than duplicating them.

## 16. How vector retrieval works

On PostgreSQL, `app/rag/retriever.py` issues a real pgvector query using
SQLAlchemy's `cosine_distance()` (the `<=>` operator), ordered and limited to
`RAG_TOP_K`, filtered by `RAG_MIN_SIMILARITY`. An IVFFlat index is created in
the initial migration for approximate nearest-neighbor performance.

## 17. SQLite fallback (tests/dev only — read this before trusting retrieval)

PostgreSQL/pgvector were unavailable in the environment this was built in.
To make the automated test suite possible without them:

- `AcademicContentChunk.embedding` uses `pgvector.sqlalchemy.Vector` on
  PostgreSQL, with `.with_variant(JSON(), "sqlite")` as a fallback type.
- `app/rag/retriever.py` detects the SQLAlchemy dialect at query time: on
  PostgreSQL it uses the real pgvector query above; on SQLite it loads every
  embedded chunk and computes cosine similarity in pure Python, then sorts
  and truncates to top-k.

This fallback is real cosine-similarity math (not keyword matching), so it
is useful for correctness testing of the surrounding pipeline, but it is
**not** pgvector's indexed ANN search and has not been used to validate
pgvector itself. Do not deploy against SQLite.

---

## 18. Running tests

```bash
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pytest -v
```

Actual result in this environment:

```
40 passed in ~0.7s
```

The suite uses an isolated SQLite file (`test_edunex.db`, created and deleted
automatically) and **never calls the real Gemini API** — `GeminiClient`
methods are monkeypatched per test. No `GEMINI_API_KEY` is required to run
the suite.

Lint:
```bash
pip install -r requirements-dev.txt
ruff check app main.py scripts tests alembic
```
Actual result: `All checks passed!`

---

## 19. Known limitations

- **No authentication or authorization.** `learner_id` is a client-supplied
  identifier, not a verified identity — anyone who knows or guesses a
  learner_id can read/modify that learner's data. All `/api/v1/learners/...`
  and `/api/v1/admin/...` routes are **development-only**. Do not expose
  this backend publicly without adding real auth first.
- **No rate limiting.** `429` responses are not emitted by anything in this
  codebase.
- **Real PostgreSQL/pgvector were never reachable** in the environment this
  was developed in (no package manager/Docker access). Migrations and
  retrieval logic were verified against SQLite + a brute-force similarity
  fallback only. Apply and smoke-test the migration against real Postgres
  before trusting it.
- **No real Gemini calls were made.** All lesson-generation and embedding
  behavior was verified with a mocked `GeminiClient`. Once a real
  `GEMINI_API_KEY` is configured, re-verify: (a) the model name in
  `GEMINI_MODEL` is actually available to your key, (b) JSON-mode output
  actually conforms to the lesson schema on the first or second attempt in
  practice, (c) the embedding model/dimension actually match
  `GEMINI_EMBEDDING_DIMENSIONS`.
- **Only PDF-free ingestion is implemented** (plain text / Markdown). No
  PDF, image, or OCR extraction.
- **Only Data Structures → Linked Lists is seeded and validated.** The
  architecture supports more subjects/topics, but none are implemented.
- **Only multiple-choice and true/false questions are evaluated.**
  Short-answer grading is not implemented (the spec allows it only with a
  reliable evaluation method, which was out of scope for this MVP).
- **Mastery/recommendation logic is a simple heuristic** (accuracy ratio +
  recency rules documented in `app/services/recommendation_service.py`), not
  a validated psychometric model.
- **No background job queue.** Ingestion and lesson generation run
  synchronously within the request; a large document or slow Gemini call
  will hold the request open for its duration.

## 20. Implemented vs. planned

**Implemented and tested (SQLite + mocked Gemini):** learner profiles and
preferences; subject/topic listing with idempotent seeding; lesson session
create/get/list/resume; strict discriminated-union lesson schema with 8
block types including the `linked_list` interactive visualization; Gemini
client with graceful missing-key/timeout/malformed-output handling; full RAG
pipeline (load → chunk → embed → store → retrieve) with source references
that can never be invented; server-side assessment evaluation; progress
tracking; baseline recommendations; saved lessons with duplicate prevention;
knowledge-base admin CRUD + ingest + search; consistent JSON error envelope
and status codes; 40 passing automated tests; Alembic migration (verified on
SQLite only, see section 17).

**Documented but not implemented:** authentication/authorization, rate
limiting, PDF/image ingestion, short-answer grading, background job
processing, production CORS lockdown beyond the configured origin list.

**Not verified in this environment (needs your own machine with
Postgres/Docker access):** real pgvector query performance/correctness, a
real Gemini API call end-to-end, the Alembic migration against a live
PostgreSQL server.
