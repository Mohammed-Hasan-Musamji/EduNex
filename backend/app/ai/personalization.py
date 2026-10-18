"""VARK-informed presentation instructions for generated explanations.

VARK is treated as an optional presentation preference -- it changes *how*
an explanation is written (structure, tone, examples), never *what* it
claims. Grounding and citations are enforced separately and are identical
for every learner. Mixed preferences combine; no preference means a
balanced default with no extra instructions.
"""

from __future__ import annotations

from dataclasses import dataclass

STYLE_INSTRUCTIONS: dict[str, str] = {
    "visual": "Organize the explanation around relationships and structure: describe how parts connect, "
    "and where helpful sketch a simple diagram or table in plain text.",
    "auditory": "Write in a clear, conversational tone that sounds natural when read aloud: short sentences, "
    "minimal symbols, and a one-sentence recap at the end.",
    "read_write": "Use precise definitions, well-structured paragraphs, and finish with a short bulleted summary.",
    "kinesthetic": "Anchor the explanation in a concrete worked example or a small exercise the learner can try, "
    "walking through it step by step.",
}

LABELS = {"visual": "Visual", "auditory": "Aural", "read_write": "Read/Write", "kinesthetic": "Kinesthetic"}


@dataclass(frozen=True)
class Personalization:
    preferences: list[str]
    instructions: list[str]

    @property
    def explanation(self) -> str:
        if not self.preferences:
            return "Balanced presentation (no learning preference saved)."
        names = ", ".join(LABELS[p] for p in self.preferences)
        return f"Presented for your {names} preference. The facts and citations are the same for every learner."


def personalization_for(preferences: list[str] | None) -> Personalization:
    chosen = [p for p in (preferences or []) if p in STYLE_INSTRUCTIONS]
    return Personalization(preferences=chosen, instructions=[STYLE_INSTRUCTIONS[p] for p in chosen])
