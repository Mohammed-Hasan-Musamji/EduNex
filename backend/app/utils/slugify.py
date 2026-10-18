"""Minimal slug generation -- no external dependency needed for this."""

import re


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-")
    return slug or "item"
