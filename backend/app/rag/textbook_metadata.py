<<<<<<< HEAD
"""Extract textbook PDF text page-by-page and infer chapter metadata with Gemini."""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any
import fitz  # PyMuPDF
from app.ai.gemini_client import GeminiClient

PAGE_MARKER = re.compile(r"\[\[PAGE:(\d+)\]\]")


def extract_pdf(pdf_path: Path) -> tuple[str, list[dict[str, Any]]]:
    """Return combined text with page markers and per-page extraction stats."""
    page_blocks: list[str] = []
    pages: list[dict[str, Any]] = []
    with fitz.open(pdf_path) as pdf:
        for index, page in enumerate(pdf, start=1):
            text = page.get_text("text", sort=True).strip()
            pages.append({"pdf_page": index, "character_count": len(text), "needs_ocr": len(text) < 40})
            if text:
                page_blocks.append(f"[[PAGE:{index}]]\n{text}")
            else:
                page_blocks.append(f"[[PAGE:{index}]]\n[No selectable text found on this page; OCR may be required.]")
    return "\n\n".join(page_blocks), pages


def _fallback_title(pdf_path: Path) -> str:
    name = pdf_path.stem.replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", name).strip()


def infer_metadata(client: GeminiClient, *, subject: str, pdf_path: Path, raw_text: str,
                   pages: list[dict[str, Any]]) -> dict[str, Any]:
    """Ask Gemini for structured metadata; fall back safely if AI fails."""
    sample = raw_text[:24000]
    prompt = f'''You are extracting metadata from an academic textbook PDF. Return valid JSON only.
Do not invent facts. If uncertain, use null or an empty array and mention uncertainty in review_notes.
Return exactly these keys:
{{"subject": string, "chapter_title": string|null, "chapter_number": string|null,
"document_title": string|null, "topics": [string], "keywords": [string],
"sections": [{{"title": string, "start_pdf_page": integer|null}}],
"learning_objectives": [string], "difficulty_estimate": "beginner"|"intermediate"|"advanced"|"unknown",
"review_required": boolean, "review_notes": [string]}}
Subject folder: {subject}
Filename: {pdf_path.name}
PDF pages: {len(pages)}
Text sample (page markers indicate PDF page numbers):
{sample}
'''
    fallback = {
        "subject": subject, "chapter_title": _fallback_title(pdf_path), "chapter_number": None,
        "document_title": None, "topics": [], "keywords": [], "sections": [],
        "learning_objectives": [], "difficulty_estimate": "unknown", "review_required": True,
        "review_notes": ["AI metadata extraction was unavailable; title uses filename fallback."],
    }
    try:
        parsed = json.loads(client.generate_json(prompt))
        if not isinstance(parsed, dict):
            raise ValueError("Gemini response was not a JSON object")
        for key, value in fallback.items():
            parsed.setdefault(key, value)
        parsed["subject"] = subject  # folder is the authoritative subject label
        if not parsed.get("chapter_title"):
            parsed["chapter_title"] = _fallback_title(pdf_path)
            parsed["review_required"] = True
        if any(p["needs_ocr"] for p in pages):
            parsed["review_required"] = True
            parsed.setdefault("review_notes", []).append("One or more pages have little selectable text; OCR may be needed.")
        return parsed
    except Exception as exc:
        fallback["review_notes"].append(f"Metadata inference failed ({type(exc).__name__}).")
        if any(p["needs_ocr"] for p in pages):
            fallback["review_notes"].append("One or more pages have little selectable text; OCR may be needed.")
        return fallback
=======
"""Extract textbook PDF text page by page and build chapter metadata.

Metadata provenance is recorded per field in `metadata["provenance"]`:
- "extracted": read from the PDF itself (document info, outline/TOC)
- "inferred":  proposed by Gemini from the first pages of text
- "fallback":  derived from the folder/filename because nothing better existed
Page numbers are always PDF page indices (1-based), never invented.

Pages with almost no selectable text are classified:
- `blank`: no images either (separator pages, blank backs) -- nothing to recover.
- `needs_ocr`: contains images, so text may be in a scan or picture. No OCR
  engine is wired in (none is installed in this environment); such pages
  are left out of chunking rather than embedded as placeholder text, and the
  document is marked for review.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pymupdf

from app.ai.gemini_client import GeminiClient, GeminiError

PAGE_MARKER = re.compile(r"\[\[PAGE:(\d+)\]\]")
MIN_PAGE_CHARS = 40
METADATA_SAMPLE_CHARS = 24_000
DIFFICULTIES = {"beginner", "intermediate", "advanced"}
METADATA_PIPELINE_VERSION = 2


@dataclass
class ExtractedPdf:
    raw_text: str  # page texts joined with [[PAGE:n]] markers; weak pages omitted
    pages: list[dict[str, Any]]
    sections: list[dict[str, Any]]  # [{"title", "level", "start_pdf_page"}] from the PDF outline
    info: dict[str, Any] = field(default_factory=dict)  # PDF document-info dictionary
    content_hash: str = ""

    @property
    def pages_needing_ocr(self) -> list[int]:
        return [p["pdf_page"] for p in self.pages if p["needs_ocr"]]

    @property
    def blank_pages(self) -> list[int]:
        return [p["pdf_page"] for p in self.pages if p.get("blank")]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def extract_pdf_document(pdf_path: Path) -> ExtractedPdf:
    page_blocks: list[str] = []
    pages: list[dict[str, Any]] = []
    with pymupdf.open(pdf_path) as pdf:
        info = {k: v for k, v in (pdf.metadata or {}).items() if v}
        sections = [
            {"title": title.strip(), "level": level, "start_pdf_page": page}
            for level, title, page, *_ in pdf.get_toc(simple=True)
            if title and title.strip() and page and page > 0
        ]
        for index, page in enumerate(pdf, start=1):
            text = page.get_text("text", sort=True).strip()
            low_text = len(text) < MIN_PAGE_CHARS
            has_images = bool(page.get_images(full=False)) if low_text else False
            pages.append({
                "pdf_page": index,
                "character_count": len(text),
                "needs_ocr": low_text and has_images,
                "blank": low_text and not has_images,
            })
            if not low_text:
                page_blocks.append(f"[[PAGE:{index}]]\n{text}")
    return ExtractedPdf(
        raw_text="\n\n".join(page_blocks), pages=pages, sections=sections, info=info, content_hash=file_sha256(pdf_path)
    )


def extract_pdf(pdf_path: Path) -> tuple[str, list[dict[str, Any]]]:
    """Backward-compatible (text, page stats) view used by the dry run."""
    extracted = extract_pdf_document(pdf_path)
    return extracted.raw_text, extracted.pages


def fallback_title(pdf_path: Path) -> str:
    name = pdf_path.stem.replace("_", " ").replace("-", " ")
    name = re.sub(r"^\d+\s+", "", name)  # "03 Chapter 1 ..." -> "Chapter 1 ..."
    return re.sub(r"\s+", " ", name).strip()


def _base_metadata(subject: str, pdf_path: Path, extracted: ExtractedPdf) -> dict[str, Any]:
    provenance: dict[str, str] = {"subject": "extracted"}  # the folder the file lives in
    pdf_title = (extracted.info.get("title") or "").strip()
    # Many PDFs carry junk titles like "Microsoft Word - ch3.docx"; ignore those.
    if pdf_title and not re.search(r"(microsoft|\.docx?|\.pdf|untitled)", pdf_title, re.I) and len(pdf_title) > 3:
        chapter_title = pdf_title
        provenance["chapter_title"] = "extracted"
    else:
        chapter_title = fallback_title(pdf_path)
        provenance["chapter_title"] = "fallback"
    chapter_match = re.search(r"chapter[\s_-]*(\d+)", pdf_path.stem, re.I)
    if chapter_match:
        provenance["chapter_number"] = "extracted"
    if extracted.sections:
        provenance["sections"] = "extracted"
    return {
        "subject": subject,
        "chapter_title": chapter_title,
        "chapter_number": chapter_match.group(1) if chapter_match else None,
        "document_title": pdf_title or None,
        "topics": [],
        "keywords": [],
        "sections": extracted.sections,
        "learning_objectives": [],
        "difficulty_estimate": "unknown",
        "review_required": False,
        "review_notes": [],
        "provenance": provenance,
    }


def infer_metadata(
    client: GeminiClient | None,
    *,
    subject: str,
    pdf_path: Path,
    extracted: ExtractedPdf,
) -> dict[str, Any]:
    """Combines extracted metadata with Gemini-inferred fields. PDF-extracted
    values always win over inferred ones; inference never invents pages."""
    metadata = _base_metadata(subject, pdf_path, extracted)
    provenance = metadata["provenance"]

    if extracted.pages_needing_ocr:
        metadata["review_required"] = True
        metadata["review_notes"].append(
            f"{len(extracted.pages_needing_ocr)} page(s) have little or no selectable text and were not indexed (OCR not available)."
        )

    metadata["metadata_attempted_at"] = datetime.now(UTC).isoformat()
    if client is None:
        metadata["metadata_status"] = "skipped"
        metadata["review_notes"].append("AI metadata inference was skipped.")
        return metadata

    prompt = f'''You are extracting metadata from an academic textbook PDF. Return valid JSON only.
Do not invent facts. If uncertain, use null or an empty array and say so in review_notes.
Return exactly these keys:
{{"chapter_title": string|null, "chapter_number": string|null, "topics": [string], "keywords": [string],
"learning_objectives": [string], "difficulty_estimate": "beginner"|"intermediate"|"advanced"|"unknown",
"review_notes": [string]}}
Subject folder: {subject}
Filename: {pdf_path.name}
PDF pages: {len(extracted.pages)}
Text sample (markers [[PAGE:n]] give PDF page numbers):
{extracted.raw_text[:METADATA_SAMPLE_CHARS]}
'''
    try:
        parsed = json.loads(client.generate_json(prompt))
        if not isinstance(parsed, dict):
            raise ValueError("response was not a JSON object")
    except (GeminiError, ValueError) as exc:
        reason = exc.category if isinstance(exc, GeminiError) else "invalid_json"
        # A failed inference always needs attention: it stays flagged until
        # repaired (scripts.ingest_textbooks --repair-metadata) or reviewed by an admin.
        metadata["review_required"] = True
        metadata["metadata_status"] = "failed"
        metadata["metadata_error"] = reason
        metadata["review_notes"].append(f"AI metadata inference failed ({reason}); extracted/fallback values used.")
        return metadata

    metadata["metadata_status"] = "inferred"
    metadata["metadata_model"] = getattr(client, "last_model_used", None)

    if provenance.get("chapter_title") == "fallback" and isinstance(parsed.get("chapter_title"), str) and parsed["chapter_title"].strip():
        metadata["chapter_title"] = parsed["chapter_title"].strip()[:255]
        provenance["chapter_title"] = "inferred"
    if not metadata["chapter_number"] and parsed.get("chapter_number"):
        metadata["chapter_number"] = str(parsed["chapter_number"])[:20]
        provenance["chapter_number"] = "inferred"
    for key in ("topics", "keywords", "learning_objectives"):
        values = parsed.get(key)
        if isinstance(values, list):
            metadata[key] = [str(v)[:200] for v in values if isinstance(v, str | int | float)][:20]
            if metadata[key]:
                provenance[key] = "inferred"
    difficulty = parsed.get("difficulty_estimate")
    if difficulty in DIFFICULTIES:
        metadata["difficulty_estimate"] = difficulty
        provenance["difficulty_estimate"] = "inferred"
    notes = parsed.get("review_notes")
    if isinstance(notes, list) and notes:
        metadata["review_notes"].extend(str(n)[:300] for n in notes[:5])
    return metadata


def needs_metadata_repair(metadata: dict[str, Any] | None) -> bool:
    """True when AI inference failed (including documents ingested before
    `metadata_status` existed, identified by their failure note)."""
    metadata = metadata or {}
    status = metadata.get("metadata_status")
    if status is not None:
        return status == "failed"
    return any("AI metadata inference failed" in str(note) for note in metadata.get("review_notes") or [])

>>>>>>> b5abe61 (Implemented 3)
