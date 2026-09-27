import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_machines():
    response = client.get("/api/machines")
    assert response.status_code == 200
    machines = response.json()
    assert isinstance(machines, list)
    assert len(machines) > 0

def test_get_foods():
    response = client.get("/api/nutrition/foods")
    assert response.status_code == 200
    foods = response.json()
    assert isinstance(foods, dict)
    assert "banana" in foods or "chicken_breast" in foods

def test_member_registration_and_login():
    rfid_test = "TEST_RFID_123"
    member_data = {
        "name": "Integration Test Runner",
        "email": "integration_test@fitsense.local",
        "age": 28,
        "weight_kg": 72.5,
        "height_cm": 178.0,
        "fitness_level_score": 4,
        "rfid_uid": rfid_test
    }
    # Create or fetch
    res = client.post("/api/members", json=member_data)
    if res.status_code == 200:
        member = res.json()
    else:
        # If email exists, login
        login_res = client.post("/api/members/login", json={"rfid_uid": rfid_test})
        assert login_res.status_code == 200
        member = login_res.json()
    
    assert member["name"] == "Integration Test Runner"

    # Test nutrition score
    score_res = client.get(f"/api/nutrition/{member['id']}/score")
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert "score" in score_data

def test_analytics_overview():
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_sessions_today" in data
    assert "active_machines" in data
