import pytest

from app.services.adaptive_policy import AdaptiveAction, evaluate_adaptive_action


@pytest.mark.parametrize("correct", [0, 1, 2])
def test_five_question_round_0_to_2_correct_remediates(correct):
    assert evaluate_adaptive_action(correct, 5) == AdaptiveAction.remediate


@pytest.mark.parametrize("correct", [3, 4])
def test_five_question_round_3_to_4_correct_maintains(correct):
    assert evaluate_adaptive_action(correct, 5) == AdaptiveAction.maintain


def test_five_question_round_perfect_score_advances():
    assert evaluate_adaptive_action(5, 5) == AdaptiveAction.advance


def test_policy_normalizes_across_different_round_sizes():
    # 2/10 = 20% -> same bucket as 1/5 = 20%
    assert evaluate_adaptive_action(2, 10) == AdaptiveAction.remediate
    # 7/10 = 70% -> same bucket as 3.5/5
    assert evaluate_adaptive_action(7, 10) == AdaptiveAction.maintain
    # 3/3 = 100% -> advance regardless of round size
    assert evaluate_adaptive_action(3, 3) == AdaptiveAction.advance


def test_boundary_at_sixty_percent_is_maintain_not_remediate():
    assert evaluate_adaptive_action(3, 5) == AdaptiveAction.maintain


def test_rejects_invalid_inputs():
    with pytest.raises(ValueError):
        evaluate_adaptive_action(1, 0)
    with pytest.raises(ValueError):
        evaluate_adaptive_action(-1, 5)
    with pytest.raises(ValueError):
        evaluate_adaptive_action(6, 5)
