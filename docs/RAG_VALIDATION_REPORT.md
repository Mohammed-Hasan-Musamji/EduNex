# RAG Validation Report

Date: 2026-10-18 · Environment: `~/Desktop/EduNex` (Linux), Python 3.12, PyMuPDF 1.28.2,
PostgreSQL 16 + pgvector 0.6.2 (local, via `pgserver`), google-genai 2.31.0.

Every number below comes from an actual run on this machine. Anything that needs a working Gemini key
or a hosted Supabase project is reported as **NOT RUN** with the reason, not estimated.

## 1. Headline

| Check | Result |
|---|---|
| PDFs discovered | **53** (7 subject folders) |
| PDFs parsed successfully | **53** (0 parse errors) |
| Pages extracted | **2,438** |
| PDFs requiring OCR (pages with images but no text) | **0** |
| PDFs with blank pages (no text, no images; skipped, not embedded) | **7** (12 blank pages in 6 DBMS PDFs + 1 title page in Operating Systems) |
| PDFs with a PDF outline (sections become chunk `section_title`) | **45** of 53 |
| Chunks the pipeline produces (800 chars, 120 overlap) | **8,636** (7,696 with a section title; every chunk has a real page range) |
| Documents indexed with real Gemini embeddings | **0 — NOT RUN** (see §3) |
| Documents needing review | **0 flagged by extraction** (AI metadata inference not run) |
| Failed documents | **0** (the run aborted at the preflight before touching any document) |
| Chunks / embeddings inserted (real) | **0 / 0 — NOT RUN** |
| Vector dimension verified | **768** in the schema (`vector(768)`, checked by `atttypmod`); real Gemini output dimension **NOT VERIFIED** |
| Similarity queries tested on real pgvector | **4 queries** (ranking, subject filter, document filter, threshold) — all pass, with deterministic test vectors |
| End-to-end RAG tests passed | **11/11** mocked tutor tests; **0** with real Gemini (NOT RUN) |

## 2. Per-subject extraction

| Subject | PDFs | Chunks |
|---|---|---|
| Calculus | 4 | 1,126 |
| Chemistry | 8 | 940 |
| DBMS | 7 | 3,448 |
| Data Structures | 10 | 587 |
| Operating Systems | 3 | 538 |
| Physics | 9 | 1,392 |
| Python | 12 | 605 |
| **Total** | **53** | **8,636** |

Chunk length: median 699 characters, 95th percentile 797, max 881, min 111. No chunk ends on a
heading line (headings move to the chunk with their text). Source: `python -m scripts.ingest_textbooks
--dry-run` and the chunk statistics script run during this audit.

## 3. Embedding failure — diagnosis

`python -m scripts.diagnose_gemini` (actual output, key redacted by design):

```
embedding:  FAILED category=invalid_api_key status=400
generation: FAILED category=invalid_api_key status=400
```

**This checkout's `GEMINI_API_KEY` is rejected by Google for every call**, so no real embedding could
be produced here. It is not the key from the Windows machine where generation worked.

Root cause of the originally reported `ClientError` (code-level, independent of this key):
`GeminiClient.embed_texts` sent **every chunk of a document in a single `embed_content` request**.
The Gemini API accepts at most 100 inputs per batch embedding request. With the original chunker,
21 of 53 documents exceeded 100 chunks (up to 645); with the current chunker 29 do (up to 805). Those
requests fail with HTTP 400 while text generation keeps working — exactly the reported symptom.
The old client also discarded the status code and called every failure "temporarily unavailable".

Fixes (`app/ai/gemini_client.py`, tested in `tests/test_gemini_client.py`, 15 tests):
- batches of ≤ 100 inputs; result count verified per batch;
- `task_type` `RETRIEVAL_DOCUMENT` for chunks, `RETRIEVAL_QUERY` for questions;
- errors classified (`invalid_api_key`, `permission_denied`, `model_not_found`, `invalid_request`,
  `rate_limited`, `server_error`, `timeout`, `network`, …);
- bounded retries (4 attempts, exponential backoff with full jitter, ≤ 20 s) **only** for retryable
  categories; permanent errors fail on the first attempt;
- every vector's dimension checked, all-zero vectors refused; no fabricated vectors anywhere.

The ingestion CLI now runs a one-sentence preflight embedding and aborts the whole run on a permanent
error. Actual run: `python -m scripts.ingest_textbooks --only "Data structures/Linked"` →
`ERROR: embedding preflight failed (invalid_api_key)`, no documents written.

## 4. Database validation (real PostgreSQL + pgvector)

`EDUNEX_TEST_PG_URL=… pytest tests/test_postgres_integration.py` → **4 passed**:
- `alembic upgrade head` (0001→0004) on an empty database; `downgrade base` at teardown. Separately,
  `upgrade → downgrade 0003 → upgrade` was run by hand. A real bug was found and fixed here: 0001
  failed on PostgreSQL with `DuplicateObject: type "difficulty_level" already exists`.
- HNSW index with `vector_cosine_ops` exists; `match_academic_chunks` exists; `embedding` is `vector(768)`;
  RLS enabled on every application table.
- Retrieval through `match_academic_chunks`: best match ranked first with correct `page_start`,
  results sorted by similarity, a document still being ingested is excluded, subject and document
  filters exclude everything else, a 0.99 threshold returns nothing.
- Rows persist across a brand-new engine/connection.
- A non-owner role granted `SELECT` still reads **0 rows** (RLS deny-by-default).

Live HTTP check (uvicorn on local PostgreSQL): register → diagnostic → practice → skill profile →
learning plan → notifications all succeeded. `POST /tutor/ask` returned **503** naming
`invalid_api_key` instead of an answer.

## 5. Mocked end-to-end checks (deterministic, no network)

| Suite | Tests | What it proves |
|---|---|---|
| `test_ingestion.py` | 8 | real generated PDFs → chunks with page ranges and outline sections → stored vectors; idempotent re-run (no re-embedding); changed file re-ingested in place; embedding failure marks `failed` and stores nothing; `--retry-failed` recovers; permanent preflight error aborts; image-only page flagged for OCR and review; blank pages skipped |
| `test_tutor.py` | 11 | grounded answer cites only retrieved chunks with DB page numbers; no-result → `not_found` without calling the model; model "no support" answer withheld; fabricated citation numbers dropped; subject/document filters; malformed input 422; embedding failure 503; auth 401; per-learner rate limit 429; VARK changes style only (identical evidence); history owner-only |
| `test_gemini_client.py` | 15 | batching, error categories, retry/no-retry, bounded backoff, dimension check |

"Mocked" means Gemini is replaced by `tests/fakes.FakeGemini` (hashed bag-of-words embeddings), so
retrieval ranking is real but embedding *quality* is not measured.

## 6. What remains to run, in order (needs a valid key)

```bash
cd backend
.venv/bin/python -m scripts.diagnose_gemini                                   # expect two OKs, dims=768
.venv/bin/python -m scripts.ingest_textbooks --only "Data structures/Linked"   # one PDF end to end
.venv/bin/python -m scripts.ingest_textbooks --only "Data structures/Linked"   # idempotency: "skip (indexed, unchanged)"
# ask a question about it at POST /api/v1/tutor/ask and check sources[].page_start
.venv/bin/python -m scripts.ingest_textbooks                                    # all 53 (resumable)
.venv/bin/python -m scripts.ingest_textbooks --retry-failed                     # if any failed
.venv/bin/python -m scripts.generate_questions --all                            # grounded questions per chapter
```

Each run writes a JSON report with real counts to `backend/data/ingestion_reports/`. Copy its
`counts` block into §1 of this file to replace the NOT RUN rows.
