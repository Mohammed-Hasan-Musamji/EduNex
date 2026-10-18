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

64 operations under `/api/v1` (plus the original `GET /` and `GET /health`). The full table, with the
auth requirement of every route and request/response examples, is in
**[../docs/API.md](../docs/API.md)**; the live OpenAPI console is at **http://localhost:8000/docs**.

Main groups: auth · learner profile & preferences · catalog (subjects, topics, indexed textbook
chapters) · lessons (generate, chat with Gemini, resume, complete) · **textbook tutor (`POST /tutor/ask`)** ·
assessments (questions, practice rounds) · adaptive diagnostics · progress, recommendations,
**skill profile**, **learning plan** · gamification, analytics, timeline · notifications ·
**VARK-style questionnaire** · admin (users, subjects, knowledge base, question generation/review).

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

Follow up in an active generated lesson with `POST /api/v1/lessons/{lesson_id}/chat`, sending the
learner's latest `question` and up to 12 recent `history` turns. Gemini writes each assistant reply.
When the learner asks for a visualization, Gemini also returns a schema-validated diagram or supported
linked-list visualization; the whiteboard is updated and the new visual is saved with the lesson.

### Error format

```json
{"error": {"code": "VALIDATION_ERROR", "message": "The request could not be validated", "details": [...] }}
```
Status codes used: `200/201/204` success, `401` unauthenticated, `403`
forbidden (wrong owner / non-admin), `404` missing resource, `409` conflict
(duplicate save/email), `422` validation, `503` dependency unavailable.
`429` is not emitted — there is no rate limiting implemented yet (see
section 19).

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
alembic upgrade head      # 0001 -> 0004; additive, never drops existing data
alembic current           # expect 0004_rag_supabase_vectors (head)
alembic revision --autogenerate -m "describe the change"
```

All four migrations were applied, downgraded, and re-applied against **PostgreSQL 16 + pgvector
0.6.2** (local, via `pgserver`) and against SQLite. Applying 0001 on PostgreSQL exposed a duplicate
`difficulty_level` enum bug, which is now fixed. 0004 adds the HNSW index, the
`match_academic_chunks()` SQL function, and row-level security on every table. Supabase-specific
setup: **[../docs/SUPABASE_VECTOR_SETUP.md](../docs/SUPABASE_VECTOR_SETUP.md)**. Don't run downgrades
against a database with real learner data without a backup.

## 12. Seed data

```bash
python -m scripts.seed
```

Idempotent — seeds one starter subject (Data Structures) and topic (Linked
Lists), but no sample assessment questions. Learner practice questions are
generated with Gemini from indexed textbook passages. Safe to run repeatedly;
it never duplicates or deletes data.

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

- `app/ai/gemini_client.py` is the only module that talks to the `google-genai` SDK.
- Failures are **classified** (`invalid_api_key`, `permission_denied`, `model_not_found`,
  `invalid_request`, `rate_limited`, `server_error`, `timeout`, `network`, …) and returned as HTTP 503
  with that category in the message. Only retryable categories are retried (up to 4 attempts,
  exponential backoff with jitter); a bad key fails immediately.
- Embeddings are sent in **batches of ≤ 100** (the API's per-request limit, and the cause of the
  original bulk-ingestion `ClientError`), with `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task types.
  Every vector is checked for dimension; nothing is ever substituted for a failed embedding.
- Check a key and models without spending much quota: `python -m scripts.diagnose_gemini`.
- `GET /api/v1/health/ready` reports whether a key is *configured*; it never makes a paid call, so it
  can't tell you the key is valid. Use the diagnostic for that.

## 15. Textbook ingestion (PDF → pgvector)

```bash
python -m scripts.ingest_textbooks --dry-run                    # parse only (no DB, no Gemini)
python -m scripts.ingest_textbooks --only "Data structures/Linked"   # one PDF first
python -m scripts.ingest_textbooks                               # all, resumable and idempotent
python -m scripts.ingest_textbooks --retry-failed
```

PyMuPDF extracts text page by page → blank pages are skipped and image-only pages are flagged as
needing OCR (no OCR engine is installed) → metadata comes from the PDF itself first (title, outline),
then Gemini, then the filename, with provenance recorded per field → paragraph-aware chunks keep
headings with their text and carry real PDF page ranges and section titles → embeddings → stored in
one commit, or the document is marked `failed` with the reason. Unchanged files (same SHA-256) are
skipped on re-runs. Each textbook folder becomes a Subject and each chapter PDF becomes a Topic, so
retrieval, lessons, and generated questions stay within the right subject. Run reports go to
`data/ingestion_reports/` (git-ignored). Actual counts: **[../docs/RAG_VALIDATION_REPORT.md](../docs/RAG_VALIDATION_REPORT.md)**.

Grounded questions for those chapters: `python -m scripts.generate_questions --all`. Each item is
written from one excerpt, validated, de-duplicated, stored as `unreviewed` with its source chunk, and
reviewable at `/api/v1/admin/questions`.

## 16. Retrieval and grounded answers

`app/rag/retriever.py` calls `match_academic_chunks()` on PostgreSQL (HNSW, cosine, only `indexed`
documents, optional subject/document filters, `RAG_MIN_SIMILARITY`, ≤ 20 rows). On SQLite (tests only)
it runs the same filters with brute-force cosine similarity in Python.

`POST /api/v1/tutor/ask` (`app/ai/tutor.py`) prefers retrieved excerpts and drops any citation that
doesn't point at a supplied excerpt. When no cited textbook answer is available, Gemini provides a
general-knowledge response marked as unverified and without textbook sources. Grounded answers return
database metadata (subject, chapter, section, PDF pages) for every cited source. VARK preferences
change presentation instructions only; the evidence and citations are identical for every learner.

## 17. Assessment, skill profile, VARK

- **Adaptive diagnostic** (`app/services/diagnostic_service.py`): one server-chosen question at a time,
  a one-step difficulty staircase, and a stored summary with per-topic status, limited-evidence
  flags, prerequisite gaps, and a recommended starting difficulty.
- **Skill profile** (`app/services/skill_service.py`): measured accuracy vs. a Beta-posterior estimate
  with uncertainty and an evidence level; snapshots after every completed round; misconceptions only
  from repeated misses on the same question.
- **VARK-style questionnaire** (`app/services/vark_service.py`): EduNex's own 12-item instrument (not
  the official VARK). Mixed preferences are allowed; scores, version, and source are stored. It changes
  presentation only, and the learner can override it.
- **Gamification** (`app/services/gamification_service.py`): server-side XP rules, levels, streaks by
  calendar day in `ACTIVITY_TIMEZONE`, and data-driven achievements awarded once.

## 18. Running tests

```bash
.venv/bin/python -m pytest            # SQLite + mocked Gemini; no key needed
.venv/bin/ruff check .
# Real PostgreSQL + pgvector (an EMPTY, disposable database; runs all migrations up and down):
EDUNEX_TEST_PG_URL=postgresql+psycopg://user:pass@host:5432/empty_db .venv/bin/python -m pytest tests/test_postgres_integration.py
```

Most recent result in this environment: see the final report in `docs/RAG_VALIDATION_REPORT.md`
§4–5. The PostgreSQL tests are skipped unless `EDUNEX_TEST_PG_URL` is set.

## 19. Known limitations

- **Real Gemini calls haven't succeeded in this checkout**: its `GEMINI_API_KEY` is rejected
  (`invalid_api_key`). Textbook embeddings, AI metadata inference, question generation, and live tutor
  answers are verified only with a deterministic fake.
- **Supabase itself hasn't been connected yet** (no credentials were available). The same migrations
  and SQL were verified on local PostgreSQL + pgvector.
- No OCR engine is installed. In the current textbooks no page needs OCR; blank pages are skipped.
- `gemini-3.8-flash` (used on another machine) hasn't been verified to exist. The default stays
  `gemini-2.5-flash`; override it with `GEMINI_MODEL` after running the diagnostic.
- The tutor rate limit (20/min/learner) is in-process; use a shared store if you run several workers.
- Ingestion and generation run synchronously (CLI/admin request), with no job queue.
- Short-answer grading is not implemented (multiple choice and true/false only).
- Audio uses the browser's built-in speech synthesis: voices vary by device, there is no
  server-generated audio file, and speech-to-text is not implemented.
