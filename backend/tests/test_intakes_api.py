import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app

class TestIntakesAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.sample_uuid = "123e4567-e89b-12d3-a456-426614174000"

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("database", data)

    def test_database_status_endpoint(self):
        response = self.client.get("/api/database/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("connected", data)

    def test_create_intake_validation_error(self):
        # Blank name validation
        response = self.client.post("/api/intakes", json={"patient_name": "   ", "patient_age": 25})
        self.assertEqual(response.status_code, 422)

        # Negative age validation
        response2 = self.client.post("/api/intakes", json={"patient_name": "John Doe", "patient_age": -5})
        self.assertEqual(response2.status_code, 422)

        # Excessive age validation
        response3 = self.client.post("/api/intakes", json={"patient_name": "John Doe", "patient_age": 140})
        self.assertEqual(response3.status_code, 422)

    def test_invalid_uuid_handling(self):
        # Must return 400 Bad Request, not 500 or 503
        response = self.client.get("/api/intakes/not-a-valid-uuid")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid UUID format", response.json()["detail"])

    @patch("services.intake_service.get_supabase_client")
    def test_create_intake_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        mock_row = {
            "id": self.sample_uuid,
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [],
            "summary": None,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        mock_supabase.table().insert().execute.return_value.data = [mock_row]

        payload = {
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough"
        }
        response = self.client.post("/api/intakes", json=payload)
        self.assertEqual(response.status_code, 201)
        res_data = response.json()
        self.assertEqual(res_data["id"], mock_row["id"])
        self.assertEqual(res_data["patient_name"], "Jane Doe")
        self.assertEqual(res_data["status"], "in_progress")

    @patch("services.intake_service.get_supabase_client")
    def test_get_intake_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        mock_row = {
            "id": self.sample_uuid,
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [{"role": "assistant", "content": "Hello", "timestamp": "2026-10-25T08:01:00Z"}],
            "summary": None,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:01:00Z"
        }

        mock_supabase.table().select().eq().execute.return_value.data = [mock_row]

        response = self.client.get(f"/api/intakes/{self.sample_uuid}")
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertEqual(res_data["id"], self.sample_uuid)
        self.assertEqual(len(res_data["chat_transcript"]), 1)

    @patch("services.intake_service.get_supabase_client")
    def test_get_intake_not_found(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase
        mock_supabase.table().select().eq().execute.return_value.data = []

        response = self.client.get(f"/api/intakes/{self.sample_uuid}")
        self.assertEqual(response.status_code, 404)

    @patch("services.intake_service.get_supabase_client")
    def test_patch_intake_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        existing_row = {
            "id": self.sample_uuid,
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [],
            "summary": None,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        updated_row = dict(existing_row)
        updated_row["urgency_level"] = "urgent"
        updated_row["status"] = "completed"

        # get check then update call
        mock_supabase.table().select().eq().execute.return_value.data = [existing_row]
        mock_supabase.table().update().eq().execute.return_value.data = [updated_row]

        response = self.client.patch(f"/api/intakes/{self.sample_uuid}", json={
            "urgency_level": "urgent",
            "status": "completed"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["urgency_level"], "urgent")
        self.assertEqual(data["status"], "completed")

    @patch("services.intake_service.get_supabase_client")
    def test_append_message_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        initial_row = {
            "id": self.sample_uuid,
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [],
            "summary": None,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        updated_row = dict(initial_row)
        updated_row["chat_transcript"] = [
            {"role": "user", "content": "I have had a dry cough for 3 days", "timestamp": "2026-10-25T08:02:00Z"}
        ]

        mock_supabase.table().select().eq().execute.return_value.data = [initial_row]
        mock_supabase.table().update().eq().execute.return_value.data = [updated_row]

        msg_payload = {
            "role": "user",
            "content": "I have had a dry cough for 3 days"
        }
        response = self.client.post(f"/api/intakes/{self.sample_uuid}/messages", json=msg_payload)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()
        self.assertEqual(len(res_data["chat_transcript"]), 1)
        self.assertEqual(res_data["chat_transcript"][0]["content"], "I have had a dry cough for 3 days")

    @patch("services.intake_service.get_supabase_client")
    def test_delete_intake_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        existing_row = {
            "id": self.sample_uuid,
            "patient_name": "Jane Doe",
            "patient_age": 34,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [],
            "summary": None,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        mock_supabase.table().select().eq().execute.return_value.data = [existing_row]
        mock_supabase.table().delete().eq().execute.return_value.data = [existing_row]

        response = self.client.delete(f"/api/intakes/{self.sample_uuid}")
        self.assertEqual(response.status_code, 204)

    @patch("services.intake_service.get_supabase_client")
    def test_list_intakes_success(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        records = [
            {
                "id": self.sample_uuid,
                "patient_name": "Jane Doe",
                "patient_age": 34,
                "chief_complaint": "Cough",
                "chat_transcript": [],
                "summary": None,
                "red_flags": [],
                "urgency_level": "routine",
                "status": "completed",
                "created_at": "2026-10-25T08:00:00Z",
                "updated_at": "2026-10-25T08:00:00Z"
            }
        ]

        query_mock = mock_supabase.table().select()
        query_mock.eq.return_value = query_mock
        query_mock.order.return_value = query_mock
        query_mock.range.return_value = query_mock
        query_mock.execute.return_value.data = records

        response = self.client.get("/api/intakes?status=completed")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["status"], "completed")

if __name__ == "__main__":
    unittest.main()
