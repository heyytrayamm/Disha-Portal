import pytest

def test_register_and_login_flow(client):
    # 1. Register User
    reg_payload = {
        "email": "officer@legalmetrology.gov.in",
        "full_name": "Inspector Rajesh Kumar",
        "password": "Password123!",
        "role": "ENFORCEMENT_OFFICER",
        "location_unit": "Delhi Zone 4"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "officer@legalmetrology.gov.in"

    # 2. Login User
    login_payload = {
        "email": "officer@legalmetrology.gov.in",
        "password": "Password123!"
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    token = token_data["access_token"]

    # 3. Get /me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Inspector Rajesh Kumar"
    assert me_resp.json()["role"] == "ENFORCEMENT_OFFICER"

def test_auth_invalid_credentials_and_duplicate(client):
    reg_payload = {
        "email": "officer@legalmetrology.gov.in",
        "full_name": "Test Officer",
        "password": "Password123!",
        "role": "ENFORCEMENT_OFFICER"
    }
    # Register once
    res1 = client.post("/api/v1/auth/register", json=reg_payload)
    assert res1.status_code == 201

    # Register duplicate email
    res2 = client.post("/api/v1/auth/register", json=reg_payload)
    assert res2.status_code == 400

    # Invalid password login test
    bad_login = {
        "email": "officer@legalmetrology.gov.in",
        "password": "WrongPassword!"
    }
    res_bad = client.post("/api/v1/auth/login", json=bad_login)
    assert res_bad.status_code == 400

def test_admin_role_registration(client):
    admin_payload = {
        "email": "admin@legalmetrology.gov.in",
        "full_name": "System Administrator",
        "password": "AdminPassword123!",
        "role": "SYSTEM_ADMIN",
        "location_unit": "HQ Enforcement Cell"
    }
    res = client.post("/api/v1/auth/register", json=admin_payload)
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "SYSTEM_ADMIN"
