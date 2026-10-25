import unittest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError
from fastapi.testclient import TestClient

from main import app
from schemas.intake import RedFlag, StructuredSummary, ClinicalExtraction
from services.llm_service import (
    is_quote_grounded_in_transcript,
    parse_and_validate_summary_json,
    build_summary_system_prompt,
    LLMService
)
from services.intake_service import IntakeService

class TestPhase3SummaryValidation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.test_uuid = "01ad3434-94be-4138-b1fb-bcfee7ce101c"
        self.sample_transcript = [
            {"role": "assistant", "content": "Hello Alex, what symptom is bringing you in today?"},
            {"role": "user", "content": "I have been having burning chest pain for 3 days and severe shortness of breath."},
            {"role": "assistant", "content": "On a scale of 1 to 10, how severe is the pain?"},
            {"role": "user", "content": "It feels like an 8 out of 10. No radiation to jaw."},
            {"role": "assistant", "content": "Are you currently taking any regular medications?"},
            {"role": "user", "content": "I take metformin 500mg daily. No other medications or supplements."},
            {"role": "assistant", "content": "Do you have any drug or environmental allergies?"},
            {"role": "user", "content": "I have no known allergies to anything."}
        ]

    def test_01_strict_red_flag_schema_validation(self):
        """Verifies strict validation on RedFlag: non-empty quote, non-empty reason, valid severity."""
        # Valid red flag
        rf = RedFlag(
            reason="Acute cardiac concern",
            patient_quote="burning chest pain for 3 days",
            severity="emergency"
        )
        self.assertEqual(rf.severity, "emergency")
        self.assertEqual(rf.patient_quote, "burning chest pain for 3 days")

        # Blank reason rejected
        with self.assertRaises(ValidationError):
            RedFlag(reason="   ", patient_quote="valid quote", severity="urgent")

        # Blank quote rejected
        with self.assertRaises(ValidationError):
            RedFlag(reason="Valid reason", patient_quote="   ", severity="urgent")

        # Invalid severity rejected
        with self.assertRaises(ValidationError):
            RedFlag(reason="Valid reason", patient_quote="valid quote", severity="mild")  # type: ignore

    def test_02_structured_summary_schema_and_empty_detail_handling(self):
        """Verifies structured summary adheres strictly to schema and handles unmentioned fields without guessing."""
        # Clean defaults
        summary = StructuredSummary(
            chief_complaint="Chest pain",
            history_of_present_illness="Patient reports 3 days of burning chest pain.",
            symptoms=["chest pain", "shortness of breath"],
            medical_history=[],  # Explicitly empty
            medications=["metformin 500mg"],
            allergies=[],
            urgency="emergency",
            suggested_questions=["Have you had an ECG performed recently?"]
        )
        self.assertEqual(summary.medical_history, [])
        self.assertEqual(summary.allergies, [])
        self.assertEqual(summary.urgency, "emergency")

        # Whitespace stripping and null-safety
        dirty = StructuredSummary(
            chief_complaint="  Chest pain  ",
            symptoms=["  cough  ", "", "  ", "fever  "],
            medications=None,
            allergies=["penicillin "]
        )
        self.assertEqual(dirty.chief_complaint, "Chest pain")
        self.assertEqual(dirty.symptoms, ["cough", "fever"])
        self.assertEqual(dirty.medications, [])
        self.assertEqual(dirty.allergies, ["penicillin"])

    def test_03_patient_quote_grounding_verification(self):
        """Verifies that quotes must exist in patient statements to pass grounding."""
        # Exact quote from user
        self.assertTrue(is_quote_grounded_in_transcript(
            "burning chest pain for 3 days", self.sample_transcript
        ))

        # Substring quote from user
        self.assertTrue(is_quote_grounded_in_transcript(
            "shortness of breath", self.sample_transcript
        ))

        # Minor punctuation or casing variations
        self.assertTrue(is_quote_grounded_in_transcript(
            "It feels like an 8 out of 10", self.sample_transcript
        ))

        # Hallucinated quote NEVER spoken by patient
        self.assertFalse(is_quote_grounded_in_transcript(
            "I passed out at work yesterday and hit my head", self.sample_transcript
        ))

        # Assistant quote must NOT count as patient quote
        self.assertFalse(is_quote_grounded_in_transcript(
            "what symptom is bringing you in today", self.sample_transcript
        ))

    def test_04_parse_and_validate_summary_json(self):
        """Verifies parsing and validation of raw JSON string output into ClinicalExtraction."""
        valid_json = """
        {
            "summary": {
                "chief_complaint": "Burning chest pain and shortness of breath",
                "history_of_present_illness": "Patient has had burning chest pain (8/10) for 3 days associated with shortness of breath.",
                "symptoms": ["burning chest pain", "shortness of breath"],
                "medical_history": [],
                "medications": ["metformin 500mg daily"],
                "allergies": [],
                "urgency": "emergency",
                "suggested_questions": ["When did the shortness of breath peak?"]
            },
            "red_flags": [
                {
                    "reason": "Severe acute chest pain with shortness of breath",
                    "patient_quote": "burning chest pain for 3 days and severe shortness of breath",
                    "severity": "emergency"
                }
            ],
            "urgency": "emergency"
        }
        """
        extraction = parse_and_validate_summary_json(valid_json, self.sample_transcript, "Alex")
        self.assertEqual(extraction.summary.chief_complaint, "Burning chest pain and shortness of breath")
        self.assertEqual(len(extraction.red_flags), 1)
        self.assertEqual(extraction.red_flags[0].severity, "emergency")
        self.assertEqual(extraction.urgency, "emergency")

    def test_05_parse_rejects_hallucinated_red_flag_quote(self):
        """Verifies parse_and_validate_summary_json raises ValueError when a red flag quote is fabricated."""
        fabricated_quote_json = """
        {
            "summary": {
                "chief_complaint": "Chest pain",
                "history_of_present_illness": "Chest pain for 3 days.",
                "symptoms": ["chest pain"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "emergency",
                "suggested_questions": []
            },
            "red_flags": [
                {
                    "reason": "Sudden loss of vision",
                    "patient_quote": "I went completely blind in my left eye this morning",
                    "severity": "emergency"
                }
            ],
            "urgency": "emergency"
        }
        """
        with self.assertRaises(ValueError) as ctx:
            parse_and_validate_summary_json(fabricated_quote_json, self.sample_transcript, "Alex")
        self.assertIn("not found in the patient's messages", str(ctx.exception))

    @patch("services.llm_service.LLMService.get_client")
    def test_06_retry_mechanism_on_validation_failure(self, mock_get_client):
        """
        Verifies that if attempt 1 returns invalid JSON or an ungrounded quote,
        the LLM is called a second time (retry 1 of 1) with corrective feedback,
        and if attempt 2 is valid, the summary succeeds.
        """
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Attempt 1: Output with fabricated quote (fails validation)
        invalid_reply_1 = MagicMock()
        invalid_reply_1.choices = [MagicMock(message=MagicMock(content="""
        {
            "summary": {
                "chief_complaint": "Chest pain",
                "history_of_present_illness": "Chest pain.",
                "symptoms": ["chest pain"],
                "urgency": "emergency"
            },
            "red_flags": [
                {"reason": "Stroke sign", "patient_quote": "I cannot move my right arm at all", "severity": "emergency"}
            ],
            "urgency": "emergency"
        }
        """))]

        # Attempt 2: Fixed output with grounded quote
        valid_reply_2 = MagicMock()
        valid_reply_2.choices = [MagicMock(message=MagicMock(content="""
        {
            "summary": {
                "chief_complaint": "Burning chest pain and shortness of breath",
                "history_of_present_illness": "Patient reports burning chest pain (8/10) for 3 days with shortness of breath.",
                "symptoms": ["burning chest pain", "severe shortness of breath"],
                "medical_history": [],
                "medications": ["metformin 500mg daily"],
                "allergies": [],
                "urgency": "emergency",
                "suggested_questions": ["Do you have family history of heart disease?"]
            },
            "red_flags": [
                {"reason": "Acute cardiac concern", "patient_quote": "burning chest pain for 3 days", "severity": "emergency"}
            ],
            "urgency": "emergency"
        }
        """))]

        mock_client.chat.completions.create.side_effect = [invalid_reply_1, valid_reply_2]

        result = LLMService.generate_summary_and_red_flags(
            patient_name="Alex",
            patient_age=45,
            transcript=self.sample_transcript,
            chief_complaint="Burning chest pain"
        )

        # Assert exactly two calls were made to completions.create (initial + 1 retry)
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)
        # Check retry payload included error feedback
        second_call_messages = mock_client.chat.completions.create.call_args_list[1][1]["messages"]
        self.assertTrue(any("failed validation" in m.get("content", "") for m in second_call_messages))

        # Result is the corrected one
        self.assertEqual(result.summary.chief_complaint, "Burning chest pain and shortness of breath")
        self.assertEqual(len(result.red_flags), 1)
        self.assertEqual(result.red_flags[0].patient_quote, "burning chest pain for 3 days")

    @patch("services.llm_service.LLMService.get_client")
    def test_07_retry_failure_raises_runtime_error(self, mock_get_client):
        """Verifies that if both attempt 1 and attempt 2 fail, RuntimeError is raised."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        bad_reply = MagicMock()
        bad_reply.choices = [MagicMock(message=MagicMock(content="INVALID_NOT_JSON"))]
        mock_client.chat.completions.create.side_effect = [bad_reply, bad_reply]

        with self.assertRaises(RuntimeError) as ctx:
            LLMService.generate_summary_and_red_flags(
                patient_name="Alex",
                patient_age=45,
                transcript=self.sample_transcript
            )
        self.assertIn("failed validation after retry", str(ctx.exception))
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)

    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_summary_and_red_flags")
    def test_08_summary_api_endpoints(self, mock_gen_summary, mock_get_client):
        """Verifies POST /api/intakes/{id}/summary and GET /api/intakes/{id}/summary."""
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        mock_extraction = ClinicalExtraction(
            summary=StructuredSummary(
                chief_complaint="Burning chest pain",
                history_of_present_illness="Patient reports burning chest pain for 3 days.",
                symptoms=["chest pain"],
                medical_history=[],
                medications=["metformin 500mg"],
                allergies=[],
                urgency="emergency",
                suggested_questions=["Check troponin levels."]
            ),
            red_flags=[
                RedFlag(reason="Chest pain", patient_quote="burning chest pain for 3 days", severity="emergency")
            ],
            urgency="emergency"
        )
        mock_gen_summary.return_value = mock_extraction

        base_intake = {
            "id": self.test_uuid,
            "patient_name": "Alex",
            "patient_age": 45,
            "chief_complaint": "Burning chest pain",
            "chat_transcript": self.sample_transcript,
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        persisted_intake = dict(base_intake)
        persisted_intake["summary"] = mock_extraction.summary.model_dump()
        persisted_intake["red_flags"] = [rf.model_dump() for rf in mock_extraction.red_flags]
        persisted_intake["urgency_level"] = "emergency"
        persisted_intake["status"] = "completed"

        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[base_intake])
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[persisted_intake])

        # 1. POST /api/intakes/{id}/summary
        post_res = self.client.post(f"/api/intakes/{self.test_uuid}/summary")
        self.assertEqual(post_res.status_code, 200)
        data = post_res.json()
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["urgency_level"], "emergency")
        self.assertIsNotNone(data["summary"])
        self.assertEqual(len(data["red_flags"]), 1)

        # 2. GET /api/intakes/{id}/summary
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[persisted_intake])
        get_res = self.client.get(f"/api/intakes/{self.test_uuid}/summary")
        self.assertEqual(get_res.status_code, 200)
        summary_data = get_res.json()
        self.assertEqual(summary_data["intake_id"], self.test_uuid)
        self.assertEqual(summary_data["urgency_level"], "emergency")
        self.assertEqual(summary_data["summary"]["chief_complaint"], "Burning chest pain")
        self.assertEqual(len(summary_data["red_flags"]), 1)

if __name__ == "__main__":
    unittest.main()
