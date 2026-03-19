"""
Backend API Tests for NannyElite DIDIT Identity Verification
Tests: health check, create-session, webhook, manual-verify endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_returns_ok(self):
        """Health check should return ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "nannyelite-api"
        print("✓ Health check passed")


class TestDIDITCreateSession:
    """DIDIT create-session endpoint tests (mock mode)"""
    
    def test_create_session_success(self):
        """Create session should return mock session when no API key configured"""
        response = requests.post(
            f"{BASE_URL}/api/didit/create-session",
            json={
                "user_id": "test_user_123",
                "callback_url": "http://localhost:3000/dashboard"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "session_id" in data
        assert "verification_url" in data
        
        # Validate mock mode response (no DIDIT_API_KEY configured)
        assert "mock" in data["session_id"]
        assert "mock" in data["verification_url"]
        print(f"✓ Create session returned mock session: {data['session_id']}")
    
    def test_create_session_missing_user_id(self):
        """Create session should fail with missing user_id"""
        response = requests.post(
            f"{BASE_URL}/api/didit/create-session",
            json={
                "callback_url": "http://localhost:3000/dashboard"
            }
        )
        # Pydantic validation should reject
        assert response.status_code == 422
        print("✓ Create session correctly rejected missing user_id")
    
    def test_create_session_missing_callback_url(self):
        """Create session should fail with missing callback_url"""
        response = requests.post(
            f"{BASE_URL}/api/didit/create-session",
            json={
                "user_id": "test_user_123"
            }
        )
        assert response.status_code == 422
        print("✓ Create session correctly rejected missing callback_url")


class TestDIDITWebhook:
    """DIDIT webhook endpoint tests"""
    
    def test_webhook_approved_status(self):
        """Webhook should return verified=true for approved status"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_123",
                "vendor_data": "test_user_webhook",
                "status": "approved"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["verified"] is True
        print("✓ Webhook correctly processed approved status")
    
    def test_webhook_verified_status(self):
        """Webhook should return verified=true for verified status"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_456",
                "vendor_data": "test_user_verified",
                "status": "verified"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        print("✓ Webhook correctly processed verified status")
    
    def test_webhook_completed_status(self):
        """Webhook should return verified=true for completed status"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_789",
                "vendor_data": "test_user_completed",
                "status": "completed"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        print("✓ Webhook correctly processed completed status")
    
    def test_webhook_pending_status(self):
        """Webhook should return verified=false for pending status"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_pending",
                "vendor_data": "test_user_pending",
                "status": "pending"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        print("✓ Webhook correctly processed pending status")
    
    def test_webhook_rejected_status(self):
        """Webhook should return verified=false for rejected status"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_rejected",
                "vendor_data": "test_user_rejected",
                "status": "rejected"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        print("✓ Webhook correctly processed rejected status")
    
    def test_webhook_missing_vendor_data(self):
        """Webhook should fail with missing vendor_data (user_id)"""
        response = requests.post(
            f"{BASE_URL}/api/didit/webhook",
            json={
                "session_id": "mock_session_no_user",
                "status": "approved"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "vendor_data" in data.get("detail", "").lower() or "user_id" in data.get("detail", "").lower()
        print("✓ Webhook correctly rejected missing vendor_data")


class TestDIDITManualVerify:
    """DIDIT manual-verify endpoint tests"""
    
    def test_manual_verify_success(self):
        """Manual verify should return success for valid user_id"""
        response = requests.post(
            f"{BASE_URL}/api/didit/manual-verify",
            json={
                "user_id": "test_manual_user",
                "admin_id": "admin_123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["manually_verified"] is True
        print("✓ Manual verify returned success")
    
    def test_manual_verify_missing_user_id(self):
        """Manual verify should fail with missing user_id"""
        response = requests.post(
            f"{BASE_URL}/api/didit/manual-verify",
            json={
                "admin_id": "admin_123"
            }
        )
        assert response.status_code == 400
        print("✓ Manual verify correctly rejected missing user_id")
    
    def test_manual_verify_without_admin_id(self):
        """Manual verify should work even without admin_id (logged for audit)"""
        response = requests.post(
            f"{BASE_URL}/api/didit/manual-verify",
            json={
                "user_id": "test_manual_user_no_admin"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["manually_verified"] is True
        print("✓ Manual verify works without admin_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
