"""VARK-style questionnaire scoring, storage, provenance, and the learning plan."""

import pytest

from app.db.seed import seed_initial_data
from tests.conftest import register


def answers(*modalities_per_question):
    return {f"q{i}": [f"q{i}:{m}" for m in mods] for i, mods in enumerate(modalities_per_question, start=1)}


def test_questionnaire_hides_nothing_secret_and_has_twelve_items(client):
    body = client.get("/api/v1/vark/questionnaire").json()
    assert body["version"] == "edunex-1"
    assert len(body["questions"]) == 12 and all(len(q["options"]) == 4 for q in body["questions"])
    assert "isn't a measure of ability" in body["disclaimer"]


def test_scoring_allows_mixed_preferences_and_stores_provenance(client):
    account = register(client)
    responses = answers(*([["kinesthetic"]] * 6 + [["visual", "kinesthetic"]] * 4 + [["read_write"]] * 2))
    result = client.post(f"/api/v1/learners/{account['id']}/vark-assessments", json={"version": "edunex-1", "responses": responses})
    assert result.status_code == 201
    body = result.json()
    assert body["scores"] == {"visual": 4, "auditory": 0, "read_write": 2, "kinesthetic": 10}
    assert body["preferred"] == ["kinesthetic"]

    prefs = client.get(f"/api/v1/learners/{account['id']}/preferences").json()
    assert prefs["vark_preferences"] == ["kinesthetic"]
    assert prefs["vark_source"] == "questionnaire" and prefs["vark_scores"]["kinesthetic"] == 10

    # Changing the selection by hand keeps the scores but marks it self-selected.
    client.put(f"/api/v1/learners/{account['id']}/preferences", json={"vark_preferences": ["visual"], "vark_source": "questionnaire"})
    prefs = client.get(f"/api/v1/learners/{account['id']}/preferences").json()
    assert prefs["vark_source"] == "self_selected" and prefs["vark_scores"]["kinesthetic"] == 10
    assert len(client.get(f"/api/v1/learners/{account['id']}/vark-assessments").json()) == 1


def test_even_profile_is_multimodal(client):
    account = register(client)
    responses = answers(*([["visual", "auditory", "read_write", "kinesthetic"]] * 8))
    body = client.post(f"/api/v1/learners/{account['id']}/vark-assessments", json={"version": "edunex-1", "responses": responses}).json()
    assert body["preferred"] == ["visual", "auditory", "read_write", "kinesthetic"]
    assert "mix all four" in body["explanation"]


@pytest.mark.parametrize(
    "payload",
    [
        {"version": "old", "responses": answers(*([["visual"]] * 12))},
        {"version": "edunex-1", "responses": answers(*([["visual"]] * 7))},
        {"version": "edunex-1", "responses": {**answers(*([["visual"]] * 12)), "q1": ["q2:visual"]}},
        {"version": "edunex-1", "responses": {**answers(*([["visual"]] * 12)), "q99": ["q99:visual"]}},
    ],
)
def test_invalid_submissions_are_rejected(client, payload):
    account = register(client)
    assert client.post(f"/api/v1/learners/{account['id']}/vark-assessments", json=payload).status_code == 422


def test_vark_data_is_private(client):
    first = register(client)
    register(client)
    payload = {"version": "edunex-1", "responses": answers(*([["visual"]] * 12))}
    assert client.post(f"/api/v1/learners/{first['id']}/vark-assessments", json=payload).status_code == 403
    assert client.get(f"/api/v1/learners/{first['id']}/learning-plan").status_code == 403


def test_learning_plan_orders_formats_by_preference_but_topics_by_evidence(client, db_session):
    seed_initial_data(db_session)
    account = register(client)
    plan = client.get(f"/api/v1/learners/{account['id']}/learning-plan").json()
    assert plan["vark_preferences"] == [] and "balanced" in plan["items"][0]["reason"]
    baseline_topics = [i["topic_id"] for i in plan["items"]]

    client.put(f"/api/v1/learners/{account['id']}/preferences", json={"vark_preferences": ["auditory"]})
    plan = client.get(f"/api/v1/learners/{account['id']}/learning-plan").json()
    assert [i["topic_id"] for i in plan["items"]] == baseline_topics  # preference never changes *what*
    first = plan["items"][0]
    assert first["activities"][0]["modality"] == "auditory" and first["activities"][0]["preferred"] is True
    assert {a["modality"] for a in first["activities"]} == {"visual", "auditory", "read_write", "kinesthetic"}
    assert "Aural" in first["reason"]
