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
