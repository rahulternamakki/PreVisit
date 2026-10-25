import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from services.llm_service import detect_emergency, build_intake_system_prompt

class TestPhase2IntakeChat(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.test_uuid = "01ad3434-94be-4138-b1fb-bcfee7ce101c"

    def test_emergency_detector_patterns(self):
        # Cardiac emergency
        match1 = detect_emergency("I'm feeling severe crushing chest pain radiating to my left arm")
        self.assertIsNotNone(match1)
        self.assertEqual(match1["severity"], "emergency")

        # Stroke symptoms
        match2 = detect_emergency("My mother's face is drooping and her speech is slurred")
        self.assertIsNotNone(match2)
        self.assertEqual(match2["severity"], "emergency")

        # Severe dyspnea
        match3 = detect_emergency("I cannot breathe and my chest is tight")
        self.assertIsNotNone(match3)

        # Anaphylaxis
        match4 = detect_emergency("I ate peanuts and my throat is closing up")
        self.assertIsNotNone(match4)

        # Non-emergency routine symptom
        match_none = detect_emergency("I have had a mild dry cough for 3 days and runny nose")
        self.assertIsNone(match_none)

    def test_system_prompt_mandatory_rules(self):
        prompt = build_intake_system_prompt("Alex", 42, "Knee pain")
        self.assertIn("Alex", prompt)
        self.assertIn("42", prompt)
        self.assertIn("ASK ONLY ONE SHORT QUESTION AT A TIME", prompt)
        self.assertIn("NO DIAGNOSES OR TREATMENT ADVICE", prompt)
        self.assertIn("[INTAKE_COMPLETE]", prompt)

    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_next_intake_question")
    def test_chat_turn_routine(self, mock_llm_gen, mock_get_client):
        mock_llm_gen.return_value = ("When did the knee pain first start?", False)
        
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        existing_record = {
            "id": self.test_uuid,
            "patient_name": "Alex",
            "patient_age": 42,
            "chief_complaint": "Knee pain",
            "chat_transcript": [
                {
                    "role": "assistant",
                    "content": "Hello Alex, what brings you in today?",
                    "timestamp": "2026-10-25T08:00:00Z"
                }
            ],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        updated_record = dict(existing_record)
        updated_record["chat_transcript"] = [
            existing_record["chat_transcript"][0],
            {"role": "user", "content": "I hurt my right knee playing tennis", "timestamp": "2026-10-25T08:01:00Z"},
            {"role": "assistant", "content": "When did the knee pain first start?", "timestamp": "2026-10-25T08:01:02Z"}
        ]

        # Select mock returns existing_record
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[existing_record])
        # Update mock returns updated_record
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[updated_record])

        response = self.client.post(
            f"/api/intakes/{self.test_uuid}/chat",
            json={"message": "I hurt my right knee playing tennis"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"]["role"], "assistant")
        self.assertEqual(data["message"]["content"], "When did the knee pain first start?")
        self.assertFalse(data["emergency_detected"])
        self.assertFalse(data["is_complete"])
        self.assertEqual(len(data["intake"]["chat_transcript"]), 3)

    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_next_intake_question")
    def test_chat_turn_emergency_detection(self, mock_llm_gen, mock_get_client):
        mock_llm_gen.return_value = (
            "Please call 911 or go to the nearest emergency department right away.",
            False
        )
        
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        existing_record = {
            "id": self.test_uuid,
            "patient_name": "Robert",
            "patient_age": 65,
            "chief_complaint": None,
            "chat_transcript": [],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        updated_record = dict(existing_record)
        updated_record["urgency_level"] = "emergency"
        updated_record["red_flags"] = [{
            "reason": "Chest pain / cardiac symptom",
            "patient_quote": "I have crushing chest pain and shortness of breath",
            "severity": "emergency"
        }]

        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[existing_record])
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[updated_record])

        response = self.client.post(
            f"/api/intakes/{self.test_uuid}/chat",
            json={"message": "I have crushing chest pain and shortness of breath"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["emergency_detected"])
        self.assertEqual(data["intake"]["urgency_level"], "emergency")
        self.assertEqual(len(data["new_red_flags"]), 1)

    @patch("services.intake_service.get_supabase_client")
    def test_complete_intake_endpoint(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        completed_record = {
            "id": self.test_uuid,
            "patient_name": "Robert",
            "patient_age": 65,
            "chief_complaint": "Migraine",
            "chat_transcript": [],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "completed",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[completed_record])

        response = self.client.post(f"/api/intakes/{self.test_uuid}/complete")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "completed")

if __name__ == "__main__":
    unittest.main()
