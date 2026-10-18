<<<<<<< HEAD
"""Scan backend/data/Textbook/<Subject>/**/*.pdf, infer metadata, and index in DB.
Run from backend root: python -m scripts.ingest_textbooks
Use --dry-run to inspect PDFs without writing to the database or calling Gemini.
"""
from __future__ import annotations
import argparse, json, sys
=======
"""Ingest textbook PDFs from backend/data/Textbook/<Subject>/**/*.pdf.

Run from backend/:
    python -m scripts.ingest_textbooks --dry-run              # parse only: no DB, no Gemini
    python -m scripts.ingest_textbooks --only "Python/Strings.pdf"
    python -m scripts.ingest_textbooks --subject Python
    python -m scripts.ingest_textbooks                         # everything not yet indexed
    python -m scripts.ingest_textbooks --retry-failed          # only documents whose last run failed
    python -m scripts.ingest_textbooks --force                 # re-embed even unchanged documents
    python -m scripts.ingest_textbooks --repair-metadata       # retry failed AI metadata only (chunks/embeddings untouched)

Behavior:
- Idempotent and resumable: a document is skipped when it is already
  `indexed` with the same SHA-256 content hash. Changed files are
  re-ingested; interrupted runs pick up where they stopped.
- Before any bulk work, one small embedding call checks the key/model;
  a permanent error (bad key, unknown model) aborts immediately instead of
  failing 53 documents one by one.
- Never marks a document indexed unless every chunk was embedded and stored.
- Writes a JSON run report to data/ingestion_reports/ (counts derived from
  the actual run) plus a metadata sidecar per document there -- not next to
  the source PDFs.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
>>>>>>> b5abe61 (Implemented 3)
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

<<<<<<< HEAD
from app.ai.gemini_client import get_gemini_client
from app.db.session import SessionLocal
from app.models.academic_document import AcademicDocument, DocumentContentType, IngestionStatus
from app.rag.textbook_metadata import extract_pdf, infer_metadata
from app.rag.ingestion import ingest_document


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=BACKEND_ROOT / "data" / "Textbook")
    parser.add_argument("--dry-run", action="store_true", help="Only scan PDFs and report page/text extraction; no DB/Gemini")
    parser.add_argument("--force", action="store_true", help="Reprocess files already indexed by source path")
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.exists():
        print(f"ERROR: textbook directory does not exist: {root}"); return 2
    pdfs = sorted(p for p in root.rglob("*.pdf") if p.is_file())
    if not pdfs:
        print(f"No PDF files found under {root}"); return 0
    print(f"Found {len(pdfs)} PDFs under {root}")
    if args.dry_run:
        for pdf in pdfs:
            try:
                text, pages = extract_pdf(pdf)
                subject = pdf.relative_to(root).parts[0] if len(pdf.relative_to(root).parts) > 1 else "Uncategorized"
                weak = sum(1 for p in pages if p["needs_ocr"])
                print(f"[SCAN] subject={subject!r} file={pdf.name!r} pages={len(pages)} chars={len(text)} pages_needing_ocr={weak}")
            except Exception as exc:
                print(f"[ERROR] {pdf}: {type(exc).__name__}: {exc}")
        return 0

    gemini = get_gemini_client()
    if not gemini.is_configured:
        print("ERROR: GEMINI_API_KEY is not configured in backend .env"); return 2
    ok = failed = skipped = 0
    db = SessionLocal()
    try:
        for index, pdf in enumerate(pdfs, start=1):
            relative = pdf.relative_to(root)
            subject = relative.parts[0] if len(relative.parts) > 1 else "Uncategorized"
            source_key = str(relative).replace("\\", "/")
            existing = db.query(AcademicDocument).filter(AcademicDocument.source_name == source_key).first()
            if existing and existing.ingestion_status == IngestionStatus.indexed and not args.force:
                print(f"[{index}/{len(pdfs)}] SKIP already indexed: {source_key}"); skipped += 1; continue
            print(f"[{index}/{len(pdfs)}] Processing: {source_key}")
            try:
                raw_text, page_stats = extract_pdf(pdf)
                metadata = infer_metadata(gemini, subject=subject, pdf_path=pdf, raw_text=raw_text, pages=page_stats)
                metadata.update({"source_relative_path": source_key, "pdf_page_count": len(page_stats),
                                 "pages_needing_ocr": [p["pdf_page"] for p in page_stats if p["needs_ocr"]],
                                 "metadata_pipeline_version": 1})
                if not raw_text.strip():
                    raise ValueError("PDF produced no extracted text")
                if existing:
                    doc = existing
                    doc.title = (metadata.get("chapter_title") or pdf.stem)[:255]
                    doc.raw_text = raw_text
                    doc.doc_metadata = metadata
                    doc.content_type = DocumentContentType.markdown
                    doc.ingestion_status = IngestionStatus.uploaded
                    doc.failure_detail = None
                else:
                    doc = AcademicDocument(title=(metadata.get("chapter_title") or pdf.stem)[:255],
                        source_name=source_key, raw_text=raw_text,
                        content_type=DocumentContentType.markdown, doc_metadata=metadata,
                        ingestion_status=IngestionStatus.uploaded)
                    db.add(doc)
                db.commit(); db.refresh(doc)
                doc = ingest_document(db, doc, gemini)
                if doc.ingestion_status == IngestionStatus.indexed:
                    ok += 1
                    print(f"   INDEXED: {doc.title} | chunks={len(doc.chunks)} | review_required={metadata.get('review_required', True)}")
                else:
                    failed += 1
                    print(f"   FAILED: {doc.failure_detail}")
                # Persist a human-readable metadata sidecar for review/debugging.
                sidecar = pdf.with_suffix(".metadata.json")
                sidecar.write_text(json.dumps({"metadata": metadata, "pages": page_stats}, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception as exc:
                db.rollback(); failed += 1
                print(f"   ERROR: {type(exc).__name__}: {exc}")
    finally:
        db.close()
    print(f"\nFinished. Indexed={ok}, failed={failed}, skipped={skipped}, total={len(pdfs)}")
    return 1 if failed else 0
=======
from sqlalchemy import select  # noqa: E402

from app.ai.gemini_client import GeminiClient, GeminiError, RetryPolicy  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.academic_document import AcademicDocument, DocumentContentType, IngestionStatus  # noqa: E402
from app.rag.catalog import link_document  # noqa: E402
from app.rag.embeddings import embed_query  # noqa: E402
from app.rag.ingestion import ingest_document  # noqa: E402
from app.rag.metadata_repair import repair_document_metadata  # noqa: E402
from app.rag.textbook_metadata import METADATA_PIPELINE_VERSION, extract_pdf_document, infer_metadata  # noqa: E402

DEFAULT_ROOT = BACKEND_ROOT / "data" / "Textbook"
DEFAULT_REPORT_DIR = BACKEND_ROOT / "data" / "ingestion_reports"


def discover(root: Path, only: str | None, subject: str | None) -> list[Path]:
    pdfs = sorted(p for p in root.rglob("*.pdf") if p.is_file())
    if subject:
        pdfs = [p for p in pdfs if p.relative_to(root).parts[0].lower() == subject.lower()]
    if only:
        needle = only.replace("\\", "/").lower()
        pdfs = [p for p in pdfs if needle in str(p.relative_to(root)).replace("\\", "/").lower()]
    return pdfs


def subject_folder(root: Path, pdf: Path) -> str:
    parts = pdf.relative_to(root).parts
    return parts[0] if len(parts) > 1 else "Uncategorized"


def dry_run(root: Path, pdfs: list[Path]) -> dict:
    summary = {"discovered": len(pdfs), "parsed": 0, "parse_errors": 0, "needing_ocr": 0, "with_blank_pages": 0, "pages": 0,
               "documents": []}
    for pdf in pdfs:
        rel = str(pdf.relative_to(root)).replace("\\", "/")
        try:
            extracted = extract_pdf_document(pdf)
        except Exception as exc:
            summary["parse_errors"] += 1
            print(f"[ERROR] {rel}: {type(exc).__name__}: {exc}")
            summary["documents"].append({"source": rel, "status": "parse_error", "error": type(exc).__name__})
            continue
        summary["parsed"] += 1
        summary["pages"] += len(extracted.pages)
        weak = extracted.pages_needing_ocr
        summary["needing_ocr"] += bool(weak)
        summary["with_blank_pages"] += bool(extracted.blank_pages)
        print(
            f"[SCAN] subject={subject_folder(root, pdf)!r} file={pdf.name!r} pages={len(extracted.pages)} "
            f"chars={len(extracted.raw_text)} outline_sections={len(extracted.sections)} pages_needing_ocr={len(weak)} "
            f"blank_pages={len(extracted.blank_pages)}"
        )
        summary["documents"].append(
            {"source": rel, "status": "parsed", "pages": len(extracted.pages), "pages_needing_ocr": weak,
             "blank_pages": extracted.blank_pages, "outline_sections": len(extracted.sections)}
        )
    return summary


def preflight(client: GeminiClient) -> str | None:
    """Returns None if a one-sentence embedding works, else the failure category."""
    try:
        embed_query(client, "preflight check")
        return None
    except GeminiError as exc:
        return exc.category


def repair_metadata(root: Path, pdfs: list[Path], gemini: GeminiClient, report_path: Path, started: datetime) -> int:
    keys = {str(p.relative_to(root)).replace("\\", "/") for p in pdfs}
    outcomes = []
    with SessionLocal() as db:
        documents = db.scalars(select(AcademicDocument).where(AcademicDocument.source_name.in_(keys))).all()
        for document in documents:
            outcome = repair_document_metadata(db, document, gemini, root)
            outcomes.append(outcome.__dict__)
            print(f"{outcome.source}: {outcome.status} {outcome.detail}".rstrip())
    statuses = ("repaired", "still_failing", "skipped", "source_changed", "missing_source")
    counts = {s: sum(1 for o in outcomes if o["status"] == s) for s in statuses}
    report_path.write_text(json.dumps({"started_at": started.isoformat(), "mode": "repair-metadata", "counts": counts,
                                       "documents": outcomes}, indent=2))
    print("\nFinished. " + " ".join(f"{k}={v}" for k, v in counts.items()) + f"\nReport: {report_path}")
    return 1 if counts["still_failing"] or counts["source_changed"] or counts["missing_source"] else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    parser.add_argument("--dry-run", action="store_true", help="parse PDFs only; no database writes, no Gemini calls")
    parser.add_argument("--only", help="process files whose relative path contains this text")
    parser.add_argument("--subject", help="process one subject folder")
    parser.add_argument("--limit", type=int, help="stop after this many documents are processed")
    parser.add_argument("--retry-failed", action="store_true", help="only documents whose last ingestion failed")
    parser.add_argument("--force", action="store_true", help="re-ingest even if indexed and unchanged")
    parser.add_argument("--no-ai-metadata", action="store_true", help="skip Gemini metadata inference")
    parser.add_argument("--repair-metadata", action="store_true",
                        help="re-run AI metadata inference for indexed documents whose inference failed; never touches chunks")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    if not root.exists():
        print(f"ERROR: textbook directory does not exist: {root}")
        return 2
    pdfs = discover(root, args.only, args.subject)
    print(f"Found {len(pdfs)} PDF(s) under {root}")
    if not pdfs:
        return 0

    started = datetime.now(UTC)
    args.report_dir.mkdir(parents=True, exist_ok=True)
    report_path = args.report_dir / f"run-{started.strftime('%Y%m%dT%H%M%S%fZ')}{'-dry' if args.dry_run else ''}.json"

    if args.dry_run:
        summary = dry_run(root, pdfs)
        report_path.write_text(json.dumps({"started_at": started.isoformat(), "mode": "dry-run", **summary}, indent=2))
        print(f"\nDry run: parsed={summary['parsed']}/{summary['discovered']} errors={summary['parse_errors']} "
              f"needing_ocr={summary['needing_ocr']} with_blank_pages={summary['with_blank_pages']} pages={summary['pages']}"
              f"\nReport: {report_path}")
        return 1 if summary["parse_errors"] else 0

    gemini = GeminiClient()
    if not gemini.is_configured:
        print("ERROR: GEMINI_API_KEY is not configured in backend/.env")
        return 2
    if args.repair_metadata:
        return repair_metadata(root, pdfs, gemini, report_path, started)
    failure = preflight(GeminiClient(retry=RetryPolicy(max_attempts=2)))
    if failure in {"invalid_api_key", "permission_denied", "model_not_found", "invalid_request", "not_configured"}:
        print(f"ERROR: embedding preflight failed ({failure}). Fix the configuration before ingesting; "
              "run `python -m scripts.diagnose_gemini` for details.")
        return 2
    if failure:
        print(f"WARNING: embedding preflight failed ({failure}); continuing -- documents will be retried with backoff.")

    counts = {"discovered": len(pdfs), "indexed": 0, "failed": 0, "skipped_unchanged": 0, "skipped_not_failed": 0,
              "needing_review": 0, "needing_ocr": 0, "chunks_inserted": 0}
    documents: list[dict] = []
    processed = 0
    db = SessionLocal()
    try:
        for index, pdf in enumerate(pdfs, start=1):
            if args.limit is not None and processed >= args.limit:
                break
            source_key = str(pdf.relative_to(root)).replace("\\", "/")
            prefix = f"[{index}/{len(pdfs)}] {source_key}"
            existing = db.scalar(select(AcademicDocument).where(AcademicDocument.source_name == source_key))
            if args.retry_failed and (existing is None or existing.ingestion_status != IngestionStatus.failed):
                counts["skipped_not_failed"] += 1
                continue
            try:
                extracted = extract_pdf_document(pdf)
            except Exception as exc:
                counts["failed"] += 1
                print(f"{prefix}: PARSE ERROR {type(exc).__name__}: {exc}")
                documents.append({"source": source_key, "status": "parse_error", "error": f"{type(exc).__name__}: {exc}"})
                continue

            unchanged = existing is not None and existing.content_hash == extracted.content_hash
            if existing and unchanged and existing.ingestion_status == IngestionStatus.indexed and not args.force:
                counts["skipped_unchanged"] += 1
                print(f"{prefix}: skip (indexed, unchanged)")
                continue

            processed += 1
            print(f"{prefix}: processing ({len(extracted.pages)} pages)")
            folder = subject_folder(root, pdf)
            metadata = infer_metadata(None if args.no_ai_metadata else gemini, subject=folder, pdf_path=pdf, extracted=extracted)
            metadata.update({
                "source_relative_path": source_key,
                "pdf_page_count": len(extracted.pages),
                "pages_needing_ocr": extracted.pages_needing_ocr,
                "blank_pages": extracted.blank_pages,
                "metadata_pipeline_version": METADATA_PIPELINE_VERSION,
            })
            title = (metadata.get("chapter_title") or pdf.stem)[:255]
            doc = existing or AcademicDocument(source_name=source_key, raw_text="", content_type=DocumentContentType.text, title=title)
            doc.title = title
            doc.raw_text = extracted.raw_text
            doc.doc_metadata = metadata
            doc.content_hash = extracted.content_hash
            doc.page_count = len(extracted.pages)
            doc.ingestion_status = IngestionStatus.uploaded
            doc.failure_detail = None
            if existing is None:
                db.add(doc)
            db.flush()
            link_document(db, doc, folder)
            db.commit()
            db.refresh(doc)

            doc = ingest_document(db, doc, gemini)
            entry = {
                "source": source_key, "document_id": str(doc.id), "status": doc.ingestion_status.value,
                "chunks": len(doc.chunks), "pages": len(extracted.pages),
                "pages_needing_ocr": extracted.pages_needing_ocr, "review_required": metadata.get("review_required"),
                "failure_detail": doc.failure_detail,
            }
            documents.append(entry)
            counts["needing_ocr"] += bool(extracted.pages_needing_ocr)
            if doc.ingestion_status == IngestionStatus.indexed:
                counts["indexed"] += 1
                counts["chunks_inserted"] += len(doc.chunks)
                counts["needing_review"] += bool(metadata.get("review_required"))
                print(f"   INDEXED chunks={len(doc.chunks)} review_required={metadata.get('review_required')}")
            else:
                counts["failed"] += 1
                print(f"   FAILED: {doc.failure_detail}")
            sidecar = args.report_dir / "metadata" / f"{source_key}.metadata.json"
            sidecar.parent.mkdir(parents=True, exist_ok=True)
            sidecar.write_text(json.dumps({"metadata": metadata, "pages": extracted.pages}, indent=2, ensure_ascii=False))
    except KeyboardInterrupt:
        print("\nInterrupted -- re-run the same command to resume.")
    finally:
        db.close()
        report_path.write_text(json.dumps(
            {"started_at": started.isoformat(), "finished_at": datetime.now(UTC).isoformat(), "mode": "ingest",
             "args": {k: str(v) for k, v in vars(args).items()}, "counts": counts, "documents": documents},
            indent=2,
        ))
    print("\nFinished. " + " ".join(f"{k}={v}" for k, v in counts.items()))
    print(f"Report: {report_path}")
    return 1 if counts["failed"] else 0

>>>>>>> b5abe61 (Implemented 3)

if __name__ == "__main__":
    raise SystemExit(main())
