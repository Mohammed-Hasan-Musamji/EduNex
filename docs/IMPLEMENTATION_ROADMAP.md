# EduNex — Implementation Roadmap

Derived from `docs/IMPLEMENTATION_AUDIT.md`. Each phase lists its dependencies, what "done" means,
and how it is tested. "Mocked" tests replace Gemini with fakes and run on SQLite; "real" checks use
a live service. Real checks that can't run yet are reported as NOT VERIFIED, never as passed.

| # | Phase | Depends on | Blocked externally by |
|---|---|---|---|
| C | Gemini client repair + embedding diagnostic | — | real check needs a valid `GEMINI_API_KEY` |
| D | Supabase vector schema, docs, migrations | — | hosted check needs Supabase credentials |
| E | Filtered pgvector retrieval + RPC function | D | — (local PostgreSQL+pgvector available) |
| F | Robust ingestion; one PDF, then all 53 | C, E | valid Gemini key |
| G | Grounded textbook Q&A API with citations | E (F for real answers) | valid Gemini key |
| H | Remaining backend: catalog sync, rate limiting, docs | F | — |
| I | Assessment: textbook question generation, skill profile + snapshots | G, H | valid Gemini key (generation) |
| J | VARK questionnaire + personalization | I | — |
| K | Audio learning (TTS playback, transcripts) | G, J | — (browser speech synthesis) |
| L | Frontend integration, full test run, docs | all | — |

## Phase C — Gemini client and embeddings
- Batch embeddings (≤ 100 inputs per request), `task_type` RETRIEVAL_DOCUMENT / RETRIEVAL_QUERY.
- Classify errors by HTTP status: permanent (400/401/403/404) fail fast with a specific message; retryable (408/429/5xx/timeouts/network) get bounded exponential backoff with jitter.
- Verify every vector's dimension; never substitute fabricated vectors.
- `python -m scripts.diagnose_gemini` checks one short embedding and one generation call and prints the failure category, model, and dimension — never the key or the vector.

**Done when:** mocked tests cover batching, retry/no-retry, dimension mismatch; diagnostic prints a category for the current key.

## Phase D — Supabase vector storage
- Migration 0004: fix 0001's duplicate-enum bug on PostgreSQL; add document `content_hash`, `subject` label, `metadata_provenance`; chunk `page_start`, `page_end`, `section_title`, `subject`; replace the IVFFlat index with HNSW (cosine); add `match_academic_chunks(...)` SQL function; enable RLS (deny by default for Supabase's `anon`/`authenticated` roles, since only the backend connects).
- `docs/SUPABASE_VECTOR_SETUP.md`: project setup, connection strings (session pooler, SSL), extension, migrations, verification queries, troubleshooting.

**Done when:** `alembic upgrade head` → `downgrade base` → `upgrade head` succeeds on real PostgreSQL+pgvector; a test insert + similarity query returns the expected chunk.

## Phase E — Retrieval
- Filters: subject, document; relevance threshold; top-k bounded (1–10); returns page range, chapter, subject, source file.
- pgvector path on PostgreSQL, brute-force path on SQLite with identical semantics.

**Done when:** tests prove filters exclude other subjects, threshold drops weak matches, and both paths agree.

## Phase F — Ingestion
- Content-hash idempotency; resumable runs; `--only <path>`, `--subject`, `--retry-failed`, `--limit`, `--dry-run`, `--force`.
- Placeholder text for empty pages is not embedded; such pages are recorded as `needs_ocr` and the document is marked for review.
- Metadata provenance recorded (`extracted` from PDF metadata/headings, `inferred` by Gemini, `fallback` from filename).
- Sidecars written to a separate report directory, not next to the source PDFs.
- Status `failed` with a specific reason whenever embedding or insertion fails; nothing is marked indexed otherwise.

**Done when:** mocked ingestion tests pass (idempotent re-run, retry-failed, failure status); with a valid key, one PDF end-to-end, then all 53, counts in `docs/RAG_VALIDATION_REPORT.md`.

## Phase G — Q&A API
`POST /api/v1/tutor/ask` — authenticated; validates question and filters; retrieves; if nothing clears the threshold returns `grounded=false` without calling the model; otherwise asks Gemini to answer **only** from the excerpts and to report which excerpts it used; citations are filtered to actually-retrieved chunk ids; response carries subject/chapter/page metadata from the database, never from the model. Per-learner rate limit. Interaction history stored.

**Done when:** tests cover grounded answer, no-result, model claims unsupported, fabricated citation filtered, malformed request, embedding failure, rate limit, auth.

## Phase H — Backend completion
- Catalog sync: each textbook folder → `Subject`, each document → `Topic` (difficulty from metadata, default beginner), linking documents to subjects so lessons and Q&A can filter by subject.
- Lesson generation retrieval filtered to the topic's subject.

## Phase I — Assessment and skill profile
- Grounded question generation (`python -m scripts.generate_questions`): Gemini drafts MCQ/TF items from a topic's chunks; each is schema-validated, de-duplicated, and stored with its `source_chunk_id`. Generated items are marked `review_status=unreviewed`.
- Skill profile: measured accuracy + estimated mastery (Beta(1,1) posterior mean) + evidence level (none/low/medium/high) + last assessed + recommended topics; `skill_snapshots` written after every completed round/diagnostic.
- Practice question selection avoids recently answered questions.

## Phase J — VARK
- Versioned 12-item questionnaire (`GET /vark/questionnaire`), `POST /learners/{id}/vark-assessments` stores responses, scores, version, source; preferred modalities = those within 1 point of the top score (mixed preferences allowed). Self-selection remains possible (`source=self_selected`).
- Personalization changes presentation instructions only; grounding and citations are unchanged. Explainable `personalization` block in responses.

## Phase K — Audio
- Browser speech synthesis (no paid provider, no credentials): play/pause/resume/stop, progress by sentence, rate control, transcript always visible, graceful "not supported" state.
- Provider interface so a server TTS can be added later without touching RAG.

## Phase L — Integration and quality gates
Ask-the-textbook panel with citations and audio; VARK questionnaire page; skill profile on My Progress; diagnostic/onboarding pages; all backend tests, ruff, tsc, eslint, `next build`; README, `.env.example`, API doc updated.
