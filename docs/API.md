# EduNex API reference

Base URL: `http://localhost:8000` (configurable). All application routes are under `/api/v1`.
The machine-readable OpenAPI schema and an interactive console are served by the backend at
**`/openapi.json`** and **`/docs`** — those are always current. This page summarizes them and adds
the behavior the schema can't express.

## Conventions

- **Authentication:** a signed session JWT in the httpOnly cookie `edunex_session`, set by
  `POST /api/v1/auth/register` or `/login`. Browsers send it automatically (`credentials: "include"`).
  There are no API keys or bearer tokens for clients.
- **Authorization:** "owner or admin" routes take a `{learner_id}` and return **403** unless it is the
  caller (or the caller is an admin). "signed in" routes always act as the caller. Notifications and
  diagnostics belonging to someone else return **404**, so they don't reveal that they exist.
- **Errors** always have this shape, with no stack traces or secrets:
  ```json
  {"error": {"code": "NOT_FOUND", "message": "Human-readable message", "details": []}}
  ```
  | Status | `code` | When |
  |---|---|---|
  | 401 | `UNAUTHORIZED` | no/invalid session |
  | 403 | `FORBIDDEN` | not your data / not an admin |
  | 404 | `NOT_FOUND` | resource missing (or not yours, for private resources) |
  | 409 | `CONFLICT` | duplicate (e.g. email taken, lesson already saved) or a concurrent-write retry failed |
  | 422 | `VALIDATION_ERROR` | malformed input, wrong answer type, questionnaire too short |
  | 429 | `RATE_LIMITED` | more than 20 tutor questions per minute per learner |
  | 503 | `SERVICE_UNAVAILABLE` | Gemini unavailable/misconfigured; the message names the category (e.g. `invalid_api_key`, `rate_limited`) |
- **Grading and rewards are server-side.** Clients send answers (an option index or a boolean); the
  server decides correctness, scores, XP, streaks, and achievements. Extra client fields such as
  `is_correct` or `xp` are ignored.
- **Idempotency:** `POST /assessments/rounds` requires a client-generated `client_request_id`
  (8–64 chars, `[A-Za-z0-9_-]`); retrying with the same id returns the stored result with
  `replayed: true`. `POST /lessons/{id}/complete` and achievement awards are naturally once-only.

## Key request/response examples

### Ask the textbook — `POST /api/v1/tutor/ask`

```json
{"question": "What does the head pointer of a linked list reference?",
 "subject_id": "optional-uuid", "document_id": "optional-uuid", "top_k": 4}
```

```json
{
  "interaction_id": "…",
  "answer": "The head pointer references the first node of the list [1].",
  "grounded": true,
  "support": "supported",
  "sources": [{
    "ref": 1, "chunk_id": "…", "document_id": "…", "title": "Linked Lists",
    "subject_id": "…", "subject": "Data Structures", "chapter": "Linked Lists", "section": "The Basics",
    "source_file": "Data structures/Linked Lists.pdf", "page_start": 12, "page_end": 12,
    "similarity": 0.81, "excerpt": "…"
  }],
  "retrieval": {"retrieved": 4, "top_similarity": 0.81, "min_similarity": 0.55, "subject_id": null, "document_id": null},
  "personalization": {"vark_preferences": ["auditory"], "explanation": "Presented for your Aural preference. …"},
  "created_at": "…"
}
```

- `grounded: false` with `support: "not_found"` means the indexed textbooks don't support an answer;
  `sources` is then empty and the answer says so. The model is not even called when nothing clears
  `RAG_MIN_SIMILARITY`.
- `sources[]` only contains chunks that retrieval returned **and** the answer cites. Titles, subjects,
  chapters and page numbers come from the database, never from model output. Page numbers are PDF
  page indices.

### Practice round — `POST /api/v1/assessments/rounds`

```json
{"topic_id": "…", "client_request_id": "9f0c2c1e8a5b4c0d",
 "answers": [{"question_id": "…", "submitted_answer": 1}, {"question_id": "…", "submitted_answer": true}]}
```
Response: `correct`, `total`, `score`, `previous_score`, per-question `results[]` with explanations,
and `rewards` (`xp_awarded`, `xp_total`, `level`, `leveled_up`, `current_streak`, `new_achievements[]`,
`notes[]`), or `rewards: null` when replayed.

### Adaptive diagnostic

1. `POST /api/v1/diagnostics` `{"subject_id": "…"}` → a state with the first `question` (no answer
   key). Calling it again for the same subject resumes the in-progress diagnostic.
2. `POST /api/v1/diagnostics/{id}/answers` `{"question_id": "<the served question>", "submitted_answer": 2}`
   → `attempt` (correctness + explanation) and the next `state`. Any other question id → 422.
3. When `state.status == "completed"`, `state.summary` holds the overall score, per-topic status
   (`demonstrated` / `developing` / `needs_attention` / `not_assessed`, with `limited_evidence`),
   prerequisite gaps, the recommended starting difficulty with its reason, a recommended next activity,
   and coverage notes.

### Learning preferences (VARK-style)

- `GET /api/v1/vark/questionnaire` → 12 items, versioned (`edunex-1`), with a disclaimer.
- `POST /api/v1/learners/{id}/vark-assessments` `{"version": "edunex-1", "responses": {"q1": ["q1:visual", "q1:kinesthetic"], …}}`
  (at least 8 answered) → `scores`, `preferred` (all modalities within 1 of the top score), `explanation`.
  Also updates the learner's preferences with `vark_source: "questionnaire"`.
- `PUT /api/v1/learners/{id}/preferences` changes the selection manually (`vark_source` becomes
  `self_selected`; questionnaire scores are kept). Client-supplied provenance fields are ignored.

### Skill profile — `GET /api/v1/learners/{id}/skill-profile`

Per topic: `measured_accuracy` (correct/attempted, `null` with no answers), `estimated_mastery`
((correct+1)/(attempts+2)), `uncertainty` (±1 SD), `evidence_level` (`none` / `low` / `medium` /
`high`), `last_assessed_at`, `change_since_first_snapshot`, and `misconceptions[]` (only questions
missed at least twice). `GET …/skill-profile/history?topic_id=` returns the snapshots over time.

## Environment variables

See `backend/.env.example` — `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
`GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS` (must be 768 for the current schema),
`GEMINI_TIMEOUT_SECONDS`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `RAG_TOP_K`, `RAG_MIN_SIMILARITY`,
`ACTIVITY_TIMEZONE`, `CORS_ORIGINS`, `SESSION_COOKIE_*`. Frontend: `NEXT_PUBLIC_API_BASE_URL` only —
no secrets may go in `NEXT_PUBLIC_*`.

## All endpoints

Generated from the running application's routes. Auth labels are derived from each route's actual
dependencies.

### admin-questions

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/admin/questions` | admin |  |
| PATCH | `/api/v1/admin/questions/{question_id}/review` | admin |  |
| POST | `/api/v1/admin/topics/{topic_id}/questions/generate` | admin |  |

### admin-users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/admin/users` | admin |  |
| PATCH | `/api/v1/admin/users/{user_id}/role` | admin |  |

### app

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | public |  |
| GET | `/health` | public |  |

### assessments

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/assessments/attempts` | signed in |  |
| POST | `/api/v1/assessments/rounds` | signed in | Grades a whole practice round on the server, records it, and awards XP/achievements once. Retrying with the same client_request_id replays the stored result (replayed=tru |
| GET | `/api/v1/learners/{learner_id}/assessments` | owner or admin |  |
| GET | `/api/v1/topics/{topic_id}/questions` | public (personalized when signed in) |  |

### auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | public |  |
| POST | `/api/v1/auth/logout` | public |  |
| GET | `/api/v1/auth/me` | signed in |  |
| POST | `/api/v1/auth/register` | public |  |

### diagnostics

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/diagnostics` | signed in | Starts a diagnostic for a subject -- or returns the learner's in-progress one for that subject, so leaving and coming back resumes it. |
| GET | `/api/v1/diagnostics/{diagnostic_id}` | signed in |  |
| POST | `/api/v1/diagnostics/{diagnostic_id}/answers` | signed in |  |
| GET | `/api/v1/learners/{learner_id}/diagnostics` | owner or admin |  |

### health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/health/ready` | public |  |

### knowledge-base-admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/admin/knowledge-base/documents` | admin |  |
| POST | `/api/v1/admin/knowledge-base/documents` | admin |  |
| POST | `/api/v1/admin/knowledge-base/documents/upload` | admin | Accepts a .txt/.md file upload. The file is read entirely into memory and decoded to text -- it is never written to or read from a server file path, so there is no path-t |
| GET | `/api/v1/admin/knowledge-base/documents/{document_id}` | admin |  |
| POST | `/api/v1/admin/knowledge-base/documents/{document_id}/ingest` | admin |  |
| POST | `/api/v1/admin/knowledge-base/search` | admin |  |

### learners

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}` | owner or admin |  |
| PATCH | `/api/v1/learners/{learner_id}` | owner or admin |  |
| PUT | `/api/v1/learners/{learner_id}/onboarding` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/preferences` | owner or admin |  |
| PUT | `/api/v1/learners/{learner_id}/preferences` | owner or admin |  |

### learning

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/analytics` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/gamification` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/skill-profile` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/skill-profile/history` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/timeline` | owner or admin |  |

### lessons

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/lessons` | owner or admin |  |
| POST | `/api/v1/lessons` | signed in |  |
| GET | `/api/v1/lessons/{lesson_id}` | signed in |  |
| POST | `/api/v1/lessons/{lesson_id}/complete` | signed in | Marks a generated lesson as finished by its learner and awards XP once. Idempotent: repeating it returns already_completed=True with no reward. |
| POST | `/api/v1/lessons/{lesson_id}/resume` | signed in |  |

### notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/notifications` | signed in |  |
| POST | `/api/v1/notifications/read-all` | signed in |  |
| POST | `/api/v1/notifications/{notification_id}/read` | signed in |  |

### progress

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/progress` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/progress/{topic_id}` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/recommendations` | owner or admin |  |

### saved-lessons

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/saved-lessons` | owner or admin |  |
| DELETE | `/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}` | owner or admin |  |
| POST | `/api/v1/learners/{learner_id}/saved-lessons/{lesson_id}` | owner or admin |  |

### subjects

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/admin/subjects` | admin |  |
| PATCH | `/api/v1/admin/subjects/{subject_id}` | admin |  |
| GET | `/api/v1/subjects` | public |  |
| GET | `/api/v1/subjects/{subject_id}` | public |  |
| GET | `/api/v1/subjects/{subject_id}/documents` | public | Indexed textbook chapters for a subject (only what retrieval can actually search). |
| GET | `/api/v1/subjects/{subject_id}/topics` | public |  |
| GET | `/api/v1/topics/{topic_id}` | public |  |

### tutor

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/tutor/history` | owner or admin |  |
| POST | `/api/v1/tutor/ask` | signed in | Answers from retrieved textbook excerpts only, with verified citations. `grounded=false` means the indexed textbooks don't support an answer. |

### vark

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/learners/{learner_id}/learning-plan` | owner or admin |  |
| GET | `/api/v1/learners/{learner_id}/vark-assessments` | owner or admin |  |
| POST | `/api/v1/learners/{learner_id}/vark-assessments` | owner or admin |  |
| GET | `/api/v1/vark/questionnaire` | public |  |

<!-- 63 operations -->
