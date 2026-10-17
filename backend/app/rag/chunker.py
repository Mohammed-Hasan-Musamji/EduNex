"""Splits document text into overlapping chunks for embedding and retrieval."""


def chunk_text(text: str, *, chunk_size: int, overlap: int) -> list[str]:
    """Splits `text` into chunks of at most `chunk_size` characters, with
    `overlap` characters of context repeated between consecutive chunks.

    Splits on word boundaries where possible so words are not cut in half.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be >= 0 and less than chunk_size")

    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    current_words: list[str] = []
    current_len = 0

    for word in words:
        projected_len = current_len + len(word) + (1 if current_words else 0)
        if projected_len > chunk_size and current_words:
            chunk = " ".join(current_words)
            chunks.append(chunk)
            # Carry over the trailing `overlap` characters worth of words.
            overlap_words: list[str] = []
            overlap_len = 0
            for w in reversed(current_words):
                next_len = overlap_len + len(w) + (1 if overlap_words else 0)
                if next_len > overlap:
                    break
                overlap_words.insert(0, w)
                overlap_len = next_len
            current_words = overlap_words
            current_len = overlap_len

        current_words.append(word)
        current_len += len(word) + (1 if len(current_words) > 1 else 0)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks
