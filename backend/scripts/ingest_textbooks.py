"""Scan backend/data/Textbook/<Subject>/**/*.pdf, infer metadata, and index in DB.
Run from backend root: python -m scripts.ingest_textbooks
Use --dry-run to inspect PDFs without writing to the database or calling Gemini.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

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

if __name__ == "__main__":
    raise SystemExit(main())
