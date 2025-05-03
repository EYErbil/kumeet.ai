import pytest
from fastapi.testclient import TestClient
from main import app
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create test client
client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data

def test_meetings_endpoint():
    """Test the meetings endpoint"""
    response = client.get("/api/meetings")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "meetings" in data

def test_recent_meetings_endpoint():
    """Test the recent meetings endpoint"""
    response = client.get("/api/meetings/recent")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "meetings" in data

def test_action_items_endpoint():
    """Test the action items endpoint"""
    response = client.get("/api/meetings/action-items/all")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "action_items" in data

def test_nonexistent_meeting():
    """Test retrieving a non-existent meeting"""
    response = client.get("/api/meetings/99999")  # Non-existent ID
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "message" in data
    assert "Meeting not found" in data["message"]

if __name__ == "__main__":
    # Run tests manually if script is executed directly
    logger.info("Testing root endpoint")
    test_root_endpoint()
    logger.info("Testing meetings endpoint")
    test_meetings_endpoint()
    logger.info("Testing recent meetings endpoint")
    test_recent_meetings_endpoint()
    logger.info("Testing action items endpoint")
    test_action_items_endpoint()
    logger.info("Testing non-existent meeting endpoint")
    test_nonexistent_meeting()
    logger.info("All tests passed!") 