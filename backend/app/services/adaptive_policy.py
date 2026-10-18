"""Explicit, size-independent adaptive assessment policy.

Canonical reference point: for a five-question assessment round,
- 0-2 correct (0-40%)  -> REMEDIATE
- 3-4 correct (60-80%) -> MAINTAIN
- 5 correct (100%)     -> ADVANCE (only if the curriculum has a next topic)

Assessment rounds are not always exactly five questions, so the policy is
defined on the *proportion* correct rather than a raw count, which
normalizes cleanly to any round size:
- accuracy <  0.6            -> REMEDIATE
- 0.6 <= accuracy <  1.0      -> MAINTAIN
- accuracy >= 1.0 (perfect)   -> ADVANCE

Limitations: this is a simple, explainable threshold rule -- not a
validated psychometric model. It treats every question as equally
informative about mastery of the topic, ignores response time, and (for
ADVANCE) a single perfect round does not imply permanent mastery.
"""

from __future__ import annotations

import enum

REMEDIATE_THRESHOLD = 0.6
ADVANCE_THRESHOLD = 1.0


class AdaptiveAction(str, enum.Enum):
    remediate = "remediate"
    maintain = "maintain"
    advance = "advance"


def evaluate_adaptive_action(correct: int, total: int) -> AdaptiveAction:
    if total <= 0:
        raise ValueError("total must be a positive number of attempted questions")
    if not (0 <= correct <= total):
        raise ValueError("correct must be between 0 and total")

    accuracy = correct / total
    if accuracy < REMEDIATE_THRESHOLD:
        return AdaptiveAction.remediate
    if accuracy >= ADVANCE_THRESHOLD:
        return AdaptiveAction.advance
    return AdaptiveAction.maintain
