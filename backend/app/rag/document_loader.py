"""Loads and validates raw academic document text.

Only plain text and Markdown are supported in this MVP -- there is no PDF,
image, or scanned-document extraction. Content always arrives as an
in-memory string (a JSON request body, or decoded multipart file bytes);
nothing is ever written to or read from a server-side file path, so there
is no path-traversal surface here.
"""

from app.core.exceptions import ValidationAppError

MAX_DOCUMENT_CHARS = 200_000
ALLOWED_EXTENSIONS = {".txt", ".md", ".markdown"}


def load_text_from_upload(filename: str, raw_bytes: bytes) -> str:
    """Decodes an uploaded file's bytes to text, enforcing type/size limits."""
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValidationAppError(
            f"Unsupported file type '{suffix or filename}'. Only {sorted(ALLOWED_EXTENSIONS)} are supported."
        )
    if len(raw_bytes) > MAX_DOCUMENT_CHARS * 4:  # generous byte ceiling before even decoding
        raise ValidationAppError("File is too large (limit is approximately 200,000 characters).")
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValidationAppError("File is not valid UTF-8 text.") from exc
    return validate_text(text)


def validate_text(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise ValidationAppError("Document text is empty.")
    if len(cleaned) > MAX_DOCUMENT_CHARS:
        raise ValidationAppError(f"Document text exceeds the {MAX_DOCUMENT_CHARS}-character limit.")
    return cleaned
