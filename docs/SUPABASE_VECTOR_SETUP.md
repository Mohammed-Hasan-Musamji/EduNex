# Supabase + pgvector setup for EduNex

EduNex uses Supabase only as **managed PostgreSQL with pgvector**. The FastAPI backend is the only
thing that connects to the database; the browser never talks to Supabase directly, and no Supabase
key is ever given to the frontend. Alembic migrations are the source of truth for the schema.

> Status: the migrations, HNSW index, `match_academic_chunks` function and RLS lockdown were
> verified on PostgreSQL 16 + pgvector 0.6.2 locally (`tests/test_postgres_integration.py`).
> They have **not** yet been applied to a hosted Supabase project — follow the steps below and run
> the verification in step 9.

## 1. Create or open the project

1. Sign in at <https://supabase.com/dashboard> → **New project** (or open the existing one).
2. Pick a region close to where the backend runs, and set a strong **database password**. Store it in
   a password manager — Supabase shows it only once.

## 2. Find the connection settings

Project → **Connect** (top bar) → **Connection string** → *URI*. You'll see three variants:

| Variant | Host / port | Use for EduNex? |
|---|---|---|
| Direct connection | `db.<project-ref>.supabase.co:5432` | Only if your network has IPv6 (or you bought the IPv4 add-on). |
| **Session pooler** | `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<project-ref>` | **Recommended** for the backend and for running migrations — works over IPv4, supports everything Alembic and psycopg do. |
| Transaction pooler | same host, port `6543` | Avoid for the backend: it doesn't support the server-side prepared statements psycopg 3 creates automatically. |

## 3. Configure the backend connection (server-side only)

In `backend/.env` (never committed; `.gitignore` excludes it):

```dotenv
# Note the SQLAlchemy driver prefix "postgresql+psycopg://" and sslmode=require.
DATABASE_URL=postgresql+psycopg://postgres.<project-ref>:<url-encoded-password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

- URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
- The **service-role key and anon key are not needed** — the backend uses the database connection
  string. Don't put either key in `edunex-frontend/.env*`; `NEXT_PUBLIC_*` variables are shipped to
  every browser.

## 4. Enable pgvector

Either run the migrations (step 6, which executes `CREATE EXTENSION IF NOT EXISTS vector`) or enable it
first in the dashboard: **Database → Extensions → vector → Enable**. Supabase installs it into the
`extensions` schema, which is on the default `search_path`, so the `vector` type resolves either way.
Check:

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';  -- needs 0.5.0+ for HNSW
```

## 5. What the migrations create

| Migration | Contents |
|---|---|
| `0001_initial_schema` | learners, subjects, topics, assessment questions/attempts, progress, lesson sessions, saved lessons, academic documents, content chunks (`embedding vector(768)`) |
| `0002_add_authentication` | email, password hash, role on learners |
| `0003_learning_engagement` | assessment rounds (practice + diagnostics), onboarding status, lesson completion, XP/streak ledger, achievements, notifications |
| `0004_rag_supabase_vectors` | chunk page range + section, document content hash + chapter topic, question provenance, skill snapshots, VARK questionnaire results, tutor history, **HNSW index**, **`match_academic_chunks()`**, **RLS on every table** |

Design notes:
- **Dimension**: `vector(768)` must equal `GEMINI_EMBEDDING_DIMENSIONS`. `gemini-embedding-001` supports
  768 via `output_dimensionality`; the backend refuses to store any vector of another length. Changing
  the dimension needs a new migration and a full re-embed.
- **Metric**: cosine distance (`<=>`, `vector_cosine_ops`). Gemini embeddings at reduced dimensionality
  aren't unit-normalized, and cosine is scale-invariant, so it is the safe choice.
- **Index**: HNSW (`m=16, ef_construction=64`). It needs no training data (unlike IVFFlat, whose
  centroids are fixed at build time — the original 0001 IVFFlat index was built on an empty table) and
  keeps recall stable as textbooks are added. For ~9k chunks the index is a few tens of MB. Trade-off:
  slower inserts than IVFFlat, which doesn't matter for batch ingestion.
- **Filtered search**: `match_academic_chunks` sets `hnsw.ef_search = 100` so that subject/document
  filters — applied after the index scan — still return enough rows. It only searches documents whose
  ingestion finished (`ingestion_status = 'indexed'`), and caps results at 20.

```sql
SELECT chunk_id, document_title, page_start, page_end, round(similarity::numeric, 3)
FROM match_academic_chunks(
  query_embedding    => '[...768 floats...]'::vector,
  match_count        => 5,
  min_similarity     => 0.55,
  filter_subject_id  => NULL,   -- or a subjects.id
  filter_document_id => NULL    -- or an academic_documents.id
);
```

## 6. Apply the migrations

From `backend/` with the Supabase `DATABASE_URL` in `.env`:

```bash
.venv/bin/alembic upgrade head
.venv/bin/alembic current        # expect: 0004_rag_supabase_vectors (head)
.venv/bin/python -m scripts.seed  # optional: starter Linked Lists catalog entry (no sample questions)
```

Never run `alembic downgrade` against a database holding real learner data without a verified backup
(**Database → Backups**). Downgrades drop the tables they created.

## 7. Row-level security and permissions

`0004` enables RLS on all 18 application tables **with no policies**, and revokes `EXECUTE` on
`match_academic_chunks` from `anon` and `authenticated`. The effect on Supabase:

- The backend connects as `postgres`, the owner of these tables, so it bypasses RLS and enforces
  per-learner ownership in the API (`verify_owner_or_admin`; notifications, diagnostics, and lessons
  check the caller). This is covered by tests that assert 403/404 across learners.
- Anyone holding the project's public anon key and calling the auto-generated PostgREST API gets **no
  rows** from any table. A student can't read another student's attempts, preferences, or progress
  through Supabase directly.
- Don't add permissive policies or `GRANT`s to `anon`/`authenticated` unless you deliberately move data
  access to the browser — and then write per-row policies keyed on the learner.

Verify in the SQL editor:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;  -- only alembic_version
SET ROLE anon; SELECT count(*) FROM learners; RESET ROLE;                          -- 0 (or permission denied)
```

## 8. Backend environment variables

See `backend/.env.example`. Required for Supabase + RAG: `DATABASE_URL`, `SECRET_KEY`,
`GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`, `GEMINI_EMBEDDING_DIMENSIONS=768`.
Set `ENVIRONMENT=production` and `SESSION_COOKIE_SECURE=true` when served over HTTPS.

## 9. Verify end to end

```bash
cd backend
.venv/bin/python -m scripts.diagnose_gemini                                     # embedding + generation OK, dims=768
.venv/bin/python -m scripts.ingest_textbooks --only "Data structures/Linked"     # one PDF
.venv/bin/python -m scripts.ingest_textbooks --only "Data structures/Linked"     # again: "skip (indexed, unchanged)"
```

```sql
SELECT d.title, d.ingestion_status, d.page_count, count(c.id) AS chunks,
       count(c.embedding) AS embedded, min(c.page_start), max(c.page_end)
FROM academic_documents d LEFT JOIN academic_content_chunks c ON c.document_id = d.id
GROUP BY d.id;
SELECT vector_dims(embedding) FROM academic_content_chunks LIMIT 1;             -- 768
```

Then start the API (`uvicorn main:app`), sign in, and `POST /api/v1/tutor/ask` with a question about
that chapter — the answer's `sources[]` should list that document with real PDF page numbers.
**Persistence:** restart the backend and repeat the query — the same chunks come back (they live in
Supabase, not in the process).

Optional automated check against a **disposable, empty** Supabase branch database (it runs every
migration up and back down):

```bash
EDUNEX_TEST_PG_URL="postgresql+psycopg://...?...sslmode=require" .venv/bin/python -m pytest tests/test_postgres_integration.py
```

Once one PDF works: `python -m scripts.ingest_textbooks` (all 53; resumable — re-run after any interruption).

## 10. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| `could not translate host name "db.<ref>.supabase.co"` / `Network is unreachable` | Direct host is IPv6-only → use the **session pooler** URI. |
| `password authentication failed for user "postgres"` via pooler | Pooler user must be `postgres.<project-ref>`, not `postgres`; check password URL-encoding. |
| `SSL connection is required` / `SSL SYSCALL error` | Add `?sslmode=require`. |
| `prepared statement "_pg3_0" already exists` | You're on the transaction pooler (6543) → use the session pooler (5432). |
| `No module named 'psycopg2'` | URL must start `postgresql+psycopg://` (psycopg 3 is installed). |
| `type "vector" does not exist` | Enable the extension (step 4); confirm `extensions` is in `search_path` (`SHOW search_path;`). |
| `function match_academic_chunks(...) does not exist` | Migrations not at head → `alembic upgrade head`. |
| `expected 768 dimensions, not 3072` | Embedding requested without `output_dimensionality`, or `GEMINI_EMBEDDING_DIMENSIONS` changed → keep 768, or add a migration and re-embed everything. |
| `permission denied for table …` from the backend | Backend isn't connecting as the table owner (`postgres`); use the owner role in `DATABASE_URL`. |
| `type "difficulty_level" already exists` on first upgrade | Fixed in `0001` (`create_type=False`); pull the latest migration. |
| Tutor always answers "not found" | Nothing indexed yet, or `RAG_MIN_SIMILARITY` too high for your content — check `/api/v1/admin/knowledge-base/search` scores. |
