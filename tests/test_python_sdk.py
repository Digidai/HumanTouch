import json
import unittest
from unittest.mock import MagicMock, patch

from humantouch.client import HumanTouchClient
from humantouch.exceptions import AuthenticationError, RateLimitError
from humantouch.models import ProcessOptions, ProcessResponse


class TestHumanTouchClient(unittest.TestCase):
    def setUp(self):
        self.client = HumanTouchClient(api_key="test_key")

    @patch("requests.Session.request")
    def test_process_success(self, mock_request):
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": True,
            "data": {
                "processed_text": "Humanized text",
                "original_length": 100,
                "processed_length": 95,
                "detection_scores": {"zerogpt": 0.1, "gptzero": 0.2, "copyleaks": 0.05},
                "processing_time": 1.5,
                "rounds_used": 3,
            },
        }
        mock_request.return_value = mock_response

        result = self.client.process("AI text", ProcessOptions(rounds=2))

        self.assertIsInstance(result, ProcessResponse)
        self.assertEqual(result.processed_text, "Humanized text")
        self.assertEqual(result.rounds_used, 3)

    @patch("requests.Session.request")
    def test_auth_error(self, mock_request):
        # Mock 401 response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "error": {"code": "INVALID_API_KEY", "message": "Invalid API Key"}
        }
        mock_request.return_value = mock_response

        with self.assertRaises(AuthenticationError):
            self.client.process("test")

    @patch("requests.Session.request")
    def test_rate_limit_error(self, mock_request):
        # Mock 429 response
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.json.return_value = {
            "error": {"code": "RATE_LIMITED", "message": "Too many requests"}
        }
        mock_request.return_value = mock_response

        with self.assertRaises(RateLimitError):
            self.client.process("test")


if __name__ == "__main__":
    unittest.main()
