# EduNex — Implementation Audit

Audit date: 2026-10-18 · Checkout: `~/Desktop/EduNex`, branch `MA` (local, with uncommitted work) ·
Auditor: Claude Code.

## 0. Scope and how this was verified

The brief describes a Windows checkout (`D:\hackathon\EduNex`) containing `backend/data/Textbook`
(53 PDFs) and `backend/scripts/ingest_textbooks.py`. **This checkout did not contain them.** They
exist only on `origin/MA` (commits `4e62b8a "implemented"` and `13d9194 "fronteedn hasan"`, two
commits ahead of local `MA`). With the owner's approval, only the backend RAG pieces were brought
into the working tree from `origin/MA` (no merge):

- `backend/data/Textbook/**` (53 PDFs + 2 metadata sidecars from an earlier run)
- `backend/scripts/ingest_textbooks.py`, `backend/app/rag/textbook_metadata.py`, `backend/app/rag/ingestion.py`

`origin/MA`'s frontend rework (login/landing redesign, theme system, mascot, `demo-data.ts`
restored, committed `.next/` build output) was **not** merged — it conflicts with nearly every
locally modified frontend file. That merge remains a separate decision for the team.

Verification methods: reading source, `pytest`, `ruff`, `tsc`, `eslint`, Alembic upgrade/downgrade
on a copy of the dev SQLite DB and on a real local PostgreSQL 16 + pgvector 0.6.2 (via `pgserver`),
a dry-run parse of every PDF, and live Gemini API calls with the configured key.

Legend: **VERIFIED WORKING** · **PARTIALLY IMPLEMENTED** · **BROKEN** · **MISSING** · **NOT VERIFIED**

## 1. Fully implemented and verified

| Area | Status | Evidence |
|---|---|---|
| FastAPI app, error envelope, CORS, config | VERIFIED WORKING | `tests/test_health.py`, `tests/test_validation.py` pass |
| Auth: register/login/logout/me, bcrypt, JWT in httpOnly cookie | VERIFIED WORKING | `tests/test_learners.py`; `app/core/security.py`, `app/api/deps.py` |
| Ownership checks (`verify_owner_or_admin`, `require_admin`) | VERIFIED WORKING | 403 tests in `test_gamification.py`, `test_diagnostics.py`, `test_admin_users.py` |
| Subjects/topics read API, admin subject create/update | VERIFIED WORKING | `tests/test_subjects.py` |
| Assessment questions (answer key never exposed), server-side grading | VERIFIED WORKING | `tests/test_assessments.py` |
| Practice rounds (idempotent, server-graded, rewarded once) | VERIFIED WORKING | `tests/test_practice_rounds.py` |
| Adaptive diagnostic (one server-chosen question at a time, staircase difficulty, summary) | VERIFIED WORKING | `tests/test_diagnostics.py` |
| Progress + explainable recommendations (REMEDIATE/MAINTAIN/ADVANCE) | VERIFIED WORKING | `tests/test_progress.py`, `tests/test_adaptive_policy.py` |
| XP ledger, levels, streaks (timezone-aware), achievements, notifications | VERIFIED WORKING | `tests/test_gamification.py`, `tests/test_notifications_and_lessons.py` |
| Lesson sessions persisted, resume, completion awards once | VERIFIED WORKING (mocked Gemini) | `tests/test_lessons.py`, `tests/test_notifications_and_lessons.py` |
| Saved lessons | VERIFIED WORKING | `tests/test_saved_lessons.py` |
| Admin user management (role changes, no self-demotion) | VERIFIED WORKING | `tests/test_admin_users.py` |
| PDF text extraction (PyMuPDF), page markers | VERIFIED WORKING | dry run: 53/53 PDFs parsed, 0 errors (see §7) |
| Alembic 0001–0003 on SQLite | VERIFIED WORKING | upgrade → downgrade → upgrade on a DB copy |
| Frontend type-check and lint | VERIFIED WORKING | `npx tsc --noEmit`, `npm run lint` clean |

Backend test suite at audit time: **102 passed, 0 failed**.

## 2. Partially implemented

| Area | Status | Notes |
|---|---|---|
| RAG ingestion of textbooks | PARTIALLY IMPLEMENTED | Page-aware chunking + metadata inference exist (`origin/MA`), but no embedding batching, no retry, no idempotency by content hash, no resumable/retry-failed/single-file modes, sidecars written next to source PDFs. |
| Retrieval (`app/rag/retriever.py`) | PARTIALLY IMPLEMENTED | pgvector cosine query + SQLite brute-force fallback; no subject/document filters; no page metadata returned; never exercised on PostgreSQL. |
| Knowledge-base admin API | PARTIALLY IMPLEMENTED | Text/Markdown upload + ingest + search work; PDFs only via CLI script. |
| Lesson generation (Gemini, grounded) | PARTIALLY IMPLEMENTED | Schema-validated and cited from retrieved chunks; retrieval has no subject filter, so a lesson can cite another subject's textbook. |
| VARK | PARTIALLY IMPLEMENTED | Self-selected preferences stored and used in lesson prompts; **no questionnaire**, no scores, no version/source provenance. |
| Skill model | PARTIALLY IMPLEMENTED | Per-topic accuracy (`learner_progress.mastery_estimate`) + diagnostic summary; no confidence/evidence level on the profile, no snapshots over time, no estimated-vs-measured distinction. |
| Frontend learner UI redesign | PARTIALLY IMPLEMENTED | New design tokens, shell, sidebar, notification bell, charts and gamification widgets exist; onboarding/diagnostic pages and the rebuilt progress/practice pages are not built yet. |
| Assessment content for textbook subjects | PARTIALLY IMPLEMENTED | Only 3 seeded questions exist (Linked Lists). The 7 textbook subjects have no catalog entries or questions. |

## 3. Missing

| Area | Status |
|---|---|
| Textbook-grounded Q&A API (`ask a question, get cited answer`) | MISSING |
| Supabase setup guide, vector RPC function, HNSW index, RLS policy | MISSING |
| Embedding diagnostic tool | MISSING |
| Catalog sync: textbook folders → subjects, chapters → topics | MISSING |
| Grounded question generation from textbook chunks | MISSING |
| VARK questionnaire (versioned, scored) | MISSING |
| Skill-profile endpoint with confidence + history | MISSING |
| Audio learning (TTS playback, transcript) | MISSING (only `audio-effects.ts` UI sounds on `origin/MA`) |
| OCR for image-only pages | MISSING (no Tesseract/OCR engine installed on this machine) |
| Speech-to-text | MISSING (out of scope unless requested) |
| `docs/` folder | MISSING (this audit creates it) |

## 4. Broken

| Area | Status | Cause |
|---|---|---|
| Bulk textbook embedding | BROKEN | `GeminiClient.embed_texts` sends **all** chunks of a document in one `embed_content` call. Gemini batch embedding accepts at most 100 inputs per request; 21 of 53 textbook documents produce more than 100 chunks (max 645). This yields a 4xx `ClientError` even with a valid key, while text generation keeps working — matching the reported symptom. |
| Error diagnosis | BROKEN | The client logs only the exception class (`ClientError`) and re-raises a generic "temporarily unavailable" message, hiding the HTTP status (400 vs 403 vs 429) — so permanent errors look transient. |
| Gemini API key in this checkout | BROKEN | Every call (embed and generate, any model) returns `400 INVALID_ARGUMENT: API key not valid`. The key that worked on the Windows machine is not the one in this `.env`. |
| Alembic 0001 on PostgreSQL | BROKEN (fixed on `origin/MA`) | `difficulty_enum.create(checkfirst=True)` followed by `create_table` re-creates the same enum type on PostgreSQL → `DuplicateObject`. |
| Retrieval index | BROKEN for this dataset | `ivfflat (lists=100)` is created on an empty table; IVFFlat centroids are computed at build time, so recall is poor after bulk insert. |
| Teammate's `gemini-3.8-flash` model name | NOT VERIFIED | Cannot be checked without a valid key. Default kept at `gemini-2.5-flash`; `GEMINI_MODEL` env var overrides. |

## 5. Existing APIs (52 operations, all under `/api/v1` except `/` and `/health`)

Errors always use `{"error": {"code", "message", "details"}}`. Full OpenAPI at `GET /docs`.

| Group | Endpoints | Auth |
|---|---|---|
| Health | `GET /health`, `GET /api/v1/health/ready` | public |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | public / cookie |
| Learner profile | `GET/PATCH /learners/{id}`, `GET/PUT /learners/{id}/preferences`, `PUT /learners/{id}/onboarding` | owner or admin |
| Catalog | `GET /subjects`, `GET /subjects/{id}`, `GET /subjects/{id}/topics`, `GET /topics/{id}`; `POST/PATCH /admin/subjects…` | public / admin |
| Lessons | `POST /lessons`, `GET /lessons/{id}`, `POST /lessons/{id}/resume`, `POST /lessons/{id}/complete`, `GET /learners/{id}/lessons` | user / owner |
| Saved lessons | `GET /learners/{id}/saved-lessons`, `POST/DELETE …/{lesson_id}` | owner |
| Assessments | `GET /topics/{id}/questions`, `POST /assessments/attempts`, `POST /assessments/rounds`, `GET /learners/{id}/assessments` | public / user / owner |
| Diagnostics | `POST /diagnostics`, `GET /diagnostics/{id}`, `POST /diagnostics/{id}/answers`, `GET /learners/{id}/diagnostics` | user / owner |
| Progress | `GET /learners/{id}/progress`, `GET …/progress/{topic_id}`, `GET …/recommendations` | owner |
| Engagement | `GET /learners/{id}/gamification`, `…/analytics`, `…/timeline` | owner |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | user (own only) |
| Knowledge base | `POST /admin/knowledge-base/documents`, `…/documents/upload`, `GET …/documents`, `GET …/documents/{id}`, `POST …/documents/{id}/ingest`, `POST …/search` | admin |
| Admin users | `GET /admin/users`, `PATCH /admin/users/{id}/role` | admin |

## 6. Database tables and relationships

`learners` (account + role + onboarding_status + preferences JSON) ─┬─ `lesson_sessions` ─ `saved_lessons`
├─ `assessment_attempts` ─ `assessment_questions` ─ `topics` ─ `subjects`
├─ `assessment_rounds` (practice/diagnostic; attempts reference it)
├─ `learner_progress` (unique learner×topic)
├─ `learning_events` (XP/streak ledger, unique learner×event_key)
├─ `learner_achievements` ─ `achievement_definitions`
└─ `notifications` (unique recipient×dedupe_key)

`academic_documents` (optional `subject_id`) ─ `academic_content_chunks` (`embedding vector(768)`).
Every PK is a UUID; every timestamp is timezone-aware.

## 7. RAG pipeline and failure points

Flow (as found): PDF → PyMuPDF text with `[[PAGE:n]]` markers → Gemini metadata inference
(falls back to filename) → page-aware chunks (800 chars, 120 overlap) → **one** embedding request
per document → replace chunks → `indexed`.

Dry-run results (this machine, actual): **53 PDFs discovered, 53 parsed, 0 parse errors, 2,438
pages, 5,719,163 characters, 7 PDFs with at least one low-text page (13 pages: 12 in DBMS, 1 in
Operating system)**. Chunking produces **6,994 chunks** in total (median 92/document, max 645).

Failure points:
1. Unbatched embedding requests (BROKEN, §4).
2. No retry/backoff; no distinction between retryable (429/5xx/timeout) and permanent (400/401/403/404) errors.
3. No `task_type` on embeddings (retrieval-document vs retrieval-query), which lowers retrieval quality.
4. Re-ingestion is keyed only by path; content changes aren't detected and re-runs re-embed everything with `--force`.
5. Pages needing OCR are flagged but there is no OCR engine; such pages carry a placeholder string that is currently chunked and embedded as if it were content.
6. Retrieval cannot filter by subject or document and returns no page numbers, so citations can't show pages.
7. Metadata provenance (extracted vs inferred vs fallback) isn't recorded per field.

## 8. Authentication and authorization

Session = HS256 JWT in an httpOnly, SameSite=Lax cookie (`edunex_session`, 7 days). The
authenticated learner is always derived from the cookie, never from a client-supplied id. Routes
with `{learner_id}` require owner-or-admin. Admin routes require `role=admin`; there is no API to
self-promote (`scripts/promote_admin.py`). Logout only deletes the cookie (tokens aren't revocable
server-side). There is no rate limiting yet.

## 9. Frontend/backend integration gaps

- No UI for asking textbook questions (the Learn chat only triggers lesson generation).
- Onboarding, diagnostic, VARK questionnaire and skill-profile screens don't exist yet.
- Practice page still posts one attempt at a time instead of `POST /assessments/rounds`.
- Progress/dashboard pages don't use the new analytics/gamification endpoints yet.
- No audio playback anywhere.

## 10. Environment variables and external services

`DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `SESSION_COOKIE_*`,
`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS`,
`GEMINI_TIMEOUT_SECONDS`, `RAG_*`, `ACTIVITY_TIMEZONE`; frontend `NEXT_PUBLIC_API_BASE_URL`.
External: Google Gemini API (generation + embeddings), PostgreSQL with pgvector (Supabase target).
This checkout's `.env` uses SQLite and an invalid Gemini key; no Supabase credentials exist on this
machine.

## 11. Tests

| Suite | Result |
|---|---|
| Backend `pytest` (SQLite, Gemini mocked) | 102 passed, 0 failed |
| Backend `ruff check` | clean |
| Frontend `tsc --noEmit`, `eslint` | clean |
| Frontend production build | NOT VERIFIED at audit time |
| Real Gemini calls | FAIL — invalid API key (400) |
| Real PostgreSQL/pgvector | NOT VERIFIED at audit time (a local pgvector server is available for the next phase) |
| Supabase | NOT VERIFIED — no credentials |

## 12. Risks, dependencies, priorities

1. **Valid Gemini key** is a hard dependency for real ingestion, metadata inference, question generation and Q&A. Everything else can be built and tested with mocks.
2. **Supabase credentials** are needed to verify the hosted database; local PostgreSQL+pgvector covers schema, index and search correctness.
3. Fix embeddings (batching, retry, task types, diagnostics) before any bulk ingestion.
4. Subject/document-filtered retrieval with page metadata before the Q&A API, so citations are real.
5. Catalog sync + grounded question generation before textbook-subject assessments can exist.
6. Frontend `origin/MA` merge decision affects how much UI work is duplicated.
