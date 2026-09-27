import sys
from fastapi.testclient import TestClient
from main import app

def run_tests():
    client = TestClient(app)
    print("Testing GET /api/machines...")
    res = client.get("/api/machines")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    machines = res.json()
    assert len(machines) > 0, "Expected at least 1 machine"
    print(f"✓ Found {len(machines)} machine(s): {machines[0]['name']}")

    print("Testing GET /api/nutrition/foods...")
    res = client.get("/api/nutrition/foods")
    assert res.status_code == 200
    foods = res.json()
    assert "banana" in foods or "chicken_breast" in foods
    print(f"✓ Loaded {len(foods)} foods in database")

    print("Testing Member registration / lookup...")
    rfid_test = "TEST_RFID_RUNNER_99"
    member_data = {
        "name": "Integration Runner",
        "email": "runner99@fitsense.local",
        "age": 29,
        "weight_kg": 74.0,
        "height_cm": 177.0,
        "fitness_level_score": 4,
        "rfid_uid": rfid_test
    }
    res = client.post("/api/members", json=member_data)
    if res.status_code == 200:
        member = res.json()
    else:
        login_res = client.post("/api/members/login", json={"rfid_uid": rfid_test})
        assert login_res.status_code == 200
        member = login_res.json()
    print(f"✓ Member authenticated: {member['id']}")

    print("Testing Nutrition Score API...")
    res = client.get(f"/api/nutrition/{member['id']}/score")
    assert res.status_code == 200
    score_data = res.json()
    print(f"✓ Nutrition Score: {score_data['score']}/100")

    print("Testing Analytics Overview...")
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    overview = res.json()
    print(f"✓ Overview: {overview}")

    print("\nAll integration tests passed successfully! 🎉")

if __name__ == "__main__":
    run_tests()
