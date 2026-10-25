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

class TestPhase3DeepVerification(unittest.TestCase):
    """
    Exhaustive senior developer & tester verification suite for Phase 3:
    1. Schema validation integrity
    2. Zero-hallucination & grounding constraints
    3. Red-flag clinical rationale and verbatim patient quote verification
    4. One-retry mechanism with feedback loop
    5. Urgency prioritization and preservation
    6. Supabase database payload structure
    7. API endpoint robustness
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # -------------------------------------------------------------------------
    # TEST 1: Strict Pydantic Schema Constraints
    # -------------------------------------------------------------------------
    def test_01_pydantic_schema_strictness(self):
        """Tests that Pydantic enforces all required types, enums, and non-blank rules."""
        # 1. RedFlag non-blank strings
        with self.assertRaises(ValidationError):
            RedFlag(reason="", patient_quote="valid quote", severity="urgent")

        with self.assertRaises(ValidationError):
            RedFlag(reason="Valid reason", patient_quote="   ", severity="urgent")

        with self.assertRaises(ValidationError):
            RedFlag(reason="Short", patient_quote="quote", severity="invalid_severity")  # type: ignore

        # 2. StructuredSummary urgency must be routine, urgent, or emergency
        with self.assertRaises(ValidationError):
            StructuredSummary(urgency="critical")  # type: ignore

        # 3. Valid StructuredSummary
        valid = StructuredSummary(
            chief_complaint="Right knee swelling",
            history_of_present_illness="Twisted right knee 2 days ago playing soccer.",
            symptoms=["knee swelling", "joint stiffness"],
            medical_history=[],
            medications=[],
            allergies=[],
            urgency="routine",
            suggested_questions=["Can you bear weight on the right leg?"]
        )
        self.assertEqual(valid.urgency, "routine")
        self.assertEqual(valid.medical_history, [])
        self.assertEqual(valid.medications, [])

    # -------------------------------------------------------------------------
    # TEST 2: Factual Grounding & Zero-Guessing Validation
    # -------------------------------------------------------------------------
    def test_02_factual_grounding_unmentioned_domains_empty(self):
        """
        Verifies that when a patient does NOT mention medical history or allergies,
        the summary leaves them strictly empty ([]), never guessing.
        """
        sparse_transcript = [
            {"role": "assistant", "content": "What is the reason for your visit?"},
            {"role": "user", "content": "I twisted my left ankle while jogging this morning."},
            {"role": "assistant", "content": "How severe is the pain?"},
            {"role": "user", "content": "It is about a 4 out of 10. A little swollen."}
        ]

        valid_sparse_json = """
        {
            "summary": {
                "chief_complaint": "Twisted left ankle",
                "history_of_present_illness": "Patient twisted left ankle while jogging this morning with mild swelling (4/10 pain).",
                "symptoms": ["ankle pain", "mild swelling"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "routine",
                "suggested_questions": ["Are you able to bear weight on the left foot?"]
            },
            "red_flags": [],
            "urgency": "routine"
        }
        """

        extraction = parse_and_validate_summary_json(valid_sparse_json, sparse_transcript, "Sam")
        self.assertEqual(extraction.summary.medical_history, [])
        self.assertEqual(extraction.summary.medications, [])
        self.assertEqual(extraction.summary.allergies, [])
        self.assertEqual(len(extraction.red_flags), 0)
        self.assertEqual(extraction.urgency, "routine")

    # -------------------------------------------------------------------------
    # TEST 3: Red-Flag Detection with Exact Patient Words
    # -------------------------------------------------------------------------
    def test_03_red_flag_quote_grounding_acceptance_and_rejection(self):
        """
        Verifies that red flags with verbatim patient quotes pass grounding,
        while fabricated/hallucinated quotes are strictly rejected.
        """
        cardiac_transcript = [
            {"role": "assistant", "content": "What brings you in?"},
            {"role": "user", "content": "I have sudden crushing chest tightness radiating down my left arm since 1 hour ago."},
            {"role": "assistant", "content": "Are you having any trouble breathing?"},
            {"role": "user", "content": "Yes, I cannot catch my breath and feel like I might faint."}
        ]

        # Case A: Exact verbatim quote -> PASS
        self.assertTrue(is_quote_grounded_in_transcript(
            "crushing chest tightness radiating down my left arm", cardiac_transcript
        ))

        # Case B: Verbatim second quote -> PASS
        self.assertTrue(is_quote_grounded_in_transcript(
            "cannot catch my breath and feel like I might faint", cardiac_transcript
        ))

        # Case C: Hallucinated quote never spoken by patient -> REJECT
        self.assertFalse(is_quote_grounded_in_transcript(
            "I have been coughing up dark blood all day", cardiac_transcript
        ))

        # Case D: Assistant's words attributed to patient -> REJECT
        self.assertFalse(is_quote_grounded_in_transcript(
            "Are you having any trouble breathing", cardiac_transcript
        ))

    # -------------------------------------------------------------------------
    # TEST 4: Automatic 1-Retry Mechanism with Corrective Prompt
    # -------------------------------------------------------------------------
    @patch("services.llm_service.LLMService.get_client")
    def test_04_automatic_single_retry_on_schema_violation(self, mock_get_client):
        """
        Verifies that when Attempt 1 fails validation (e.g. invalid JSON syntax),
        the system initiates retry 1 of 1 with error feedback, and succeeds on Attempt 2.
        """
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Attempt 1: Malformed JSON syntax
        reply_1 = MagicMock()
        reply_1.choices = [MagicMock(message=MagicMock(content="""{ "summary": { "chief_complaint": "Headache", BROKEN_JSON """))]

        # Attempt 2: Correct, strictly valid JSON
        reply_2 = MagicMock()
        reply_2.choices = [MagicMock(message=MagicMock(content="""
        {
            "summary": {
                "chief_complaint": "Throbbing headache",
                "history_of_present_illness": "Patient has had a throbbing headache for 2 days.",
                "symptoms": ["throbbing headache"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "routine",
                "suggested_questions": ["Any visual disturbances or nausea?"]
            },
            "red_flags": [],
            "urgency": "routine"
        }
        """))]

        mock_client.chat.completions.create.side_effect = [reply_1, reply_2]

        transcript = [
            {"role": "assistant", "content": "What is bothering you?"},
            {"role": "user", "content": "I have had a throbbing headache for 2 days now."}
        ]

        result = LLMService.generate_summary_and_red_flags(
            patient_name="Carlos",
            patient_age=34,
            transcript=transcript
        )

        # Assert exactly 2 calls were made (1 initial + 1 retry)
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)
        # Assert retry prompt contained the validation error feedback
        retry_call_args = mock_client.chat.completions.create.call_args_list[1][1]
        retry_messages = retry_call_args["messages"]
        self.assertTrue(any("failed validation" in m.get("content", "") for m in retry_messages))

        # Assert resulting summary was parsed cleanly
        self.assertEqual(result.summary.chief_complaint, "Throbbing headache")
        self.assertEqual(result.urgency, "routine")

    # -------------------------------------------------------------------------
    # TEST 5: Automatic Retry on Ungrounded Quote
    # -------------------------------------------------------------------------
    @patch("services.llm_service.LLMService.get_client")
    def test_05_automatic_retry_on_ungrounded_quote(self, mock_get_client):
        """
        Verifies that when Attempt 1 contains a fabricated patient quote,
        the quote grounding check fails, triggering retry 1 of 1.
        """
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Attempt 1: Red flag with fabricated quote
        reply_1 = MagicMock()
        reply_1.choices = [MagicMock(message=MagicMock(content="""
        {
            "summary": {
                "chief_complaint": "Stomach pain",
                "history_of_present_illness": "Stomach pain for 1 day.",
                "symptoms": ["stomach pain"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "urgent",
                "suggested_questions": []
            },
            "red_flags": [
                {"reason": "Severe acute abdomen", "patient_quote": "I am vomiting copious amounts of green bile", "severity": "urgent"}
            ],
            "urgency": "urgent"
        }
        """))]

        # Attempt 2: Fixed with exact patient quote from transcript
        reply_2 = MagicMock()
        reply_2.choices = [MagicMock(message=MagicMock(content="""
        {
            "summary": {
                "chief_complaint": "Severe lower right abdominal pain",
                "history_of_present_illness": "Patient reports severe lower right abdominal pain that started suddenly.",
                "symptoms": ["lower right abdominal pain"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "urgent",
                "suggested_questions": ["Does the pain worsen with movement?"]
            },
            "red_flags": [
                {"reason": "Possible acute appendicitis concern", "patient_quote": "severe lower right abdominal pain", "severity": "urgent"}
            ],
            "urgency": "urgent"
        }
        """))]

        mock_client.chat.completions.create.side_effect = [reply_1, reply_2]

        transcript = [
            {"role": "assistant", "content": "What symptoms are you having?"},
            {"role": "user", "content": "I have severe lower right abdominal pain that started this morning."}
        ]

        result = LLMService.generate_summary_and_red_flags(
            patient_name="Fatima",
            patient_age=28,
            transcript=transcript
        )

        self.assertEqual(mock_client.chat.completions.create.call_count, 2)
        self.assertEqual(len(result.red_flags), 1)
        self.assertEqual(result.red_flags[0].patient_quote, "severe lower right abdominal pain")
        self.assertEqual(result.urgency, "urgent")

    # -------------------------------------------------------------------------
    # TEST 6: Urgency Preservation (Emergency Never Downgraded)
    # -------------------------------------------------------------------------
    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_summary_and_red_flags")
    def test_06_urgency_preservation_and_red_flag_merging(self, mock_gen_summary, mock_get_client):
        """
        Verifies that if an acute emergency flag was recorded during live chat,
        generating the summary preserves the emergency flag and urgency is never downgraded.
        """
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        test_uuid = "22222222-2222-2222-2222-222222222222"
        existing_emergency_flag = {
            "reason": "Chest pain / cardiac symptom",
            "patient_quote": "I have crushing chest pain and left arm numbness",
            "severity": "emergency"
        }

        existing_record = {
            "id": test_uuid,
            "patient_name": "Robert",
            "patient_age": 60,
            "chief_complaint": "Chest pain",
            "chat_transcript": [
                {"role": "assistant", "content": "How can I help?"},
                {"role": "user", "content": "I have crushing chest pain and left arm numbness."}
            ],
            "red_flags": [existing_emergency_flag],
            "urgency_level": "emergency",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        # Suppose LLM generated an extraction labeled "urgent"
        mock_summary = StructuredSummary(
            chief_complaint="Crushing chest pain",
            history_of_present_illness="Patient reports crushing chest pain with left arm numbness.",
            symptoms=["chest pain", "arm numbness"],
            urgency="urgent",  # LLM proposed urgent
            suggested_questions=["Check ECG immediately"]
        )
        mock_extraction = ClinicalExtraction(
            summary=mock_summary,
            red_flags=[
                RedFlag(reason="Cardiac warning sign", patient_quote="crushing chest pain", severity="urgent")
            ],
            urgency="urgent"
        )
        mock_gen_summary.return_value = mock_extraction

        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[existing_record])
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[existing_record])

        updated = IntakeService.generate_and_save_summary(test_uuid)

        # Inspect the payload sent to supabase update()
        update_call = mock_supabase.table().update.call_args[0][0]
        self.assertEqual(update_call["urgency_level"], "emergency", "Urgency must NOT be downgraded from emergency!")
        self.assertEqual(update_call["status"], "completed")
        # Existing emergency flag must be preserved in red_flags
        self.assertTrue(any(rf["severity"] == "emergency" for rf in update_call["red_flags"]))

    # -------------------------------------------------------------------------
    # TEST 7: Supabase Payload Schema Integrity
    # -------------------------------------------------------------------------
    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_summary_and_red_flags")
    def test_07_supabase_payload_structure_conformance(self, mock_gen_summary, mock_get_client):
        """
        Verifies that payload persisted to Supabase conforms strictly to schema.sql:
        - summary is JSON object
        - red_flags is JSON array
        - urgency_level is routine|urgent|emergency
        - status is completed
        """
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        test_uuid = "33333333-3333-3333-3333-333333333333"
        existing_record = {
            "id": test_uuid,
            "patient_name": "Maya",
            "patient_age": 22,
            "chief_complaint": "Seasonal allergies",
            "chat_transcript": [
                {"role": "assistant", "content": "What is bringing you in?"},
                {"role": "user", "content": "Sneezing and itchy watery eyes for 1 week."}
            ],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        mock_extraction = ClinicalExtraction(
            summary=StructuredSummary(
                chief_complaint="Seasonal allergies",
                history_of_present_illness="Patient reports 1 week of sneezing and itchy watery eyes.",
                symptoms=["sneezing", "itchy eyes", "watery eyes"],
                medical_history=[],
                medications=["cetirizine 10mg"],
                allergies=["pollen"],
                urgency="routine",
                suggested_questions=["Have antihistamines provided relief?"]
            ),
            red_flags=[],
            urgency="routine"
        )
        mock_gen_summary.return_value = mock_extraction

        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[existing_record])
        mock_supabase.table().update().eq().execute.return_value = MagicMock(data=[existing_record])

        IntakeService.generate_and_save_summary(test_uuid)

        payload = mock_supabase.table().update.call_args[0][0]

        # 1. summary must be a dict (maps to PostgreSQL jsonb object)
        self.assertIsInstance(payload["summary"], dict)
        self.assertIn("chief_complaint", payload["summary"])
        self.assertIn("history_of_present_illness", payload["summary"])
        self.assertIn("symptoms", payload["summary"])
        self.assertIn("medical_history", payload["summary"])
        self.assertIn("medications", payload["summary"])
        self.assertIn("allergies", payload["summary"])
        self.assertIn("urgency", payload["summary"])
        self.assertIn("suggested_questions", payload["summary"])

        # 2. red_flags must be a list (maps to PostgreSQL jsonb array)
        self.assertIsInstance(payload["red_flags"], list)

        # 3. urgency_level must be routine, urgent, or emergency
        self.assertIn(payload["urgency_level"], ["routine", "urgent", "emergency"])

        # 4. status must be completed
        self.assertEqual(payload["status"], "completed")

    # -------------------------------------------------------------------------
    # TEST 8: API Endpoints (POST /summary and GET /summary)
    # -------------------------------------------------------------------------
    @patch("services.intake_service.get_supabase_client")
    @patch("services.llm_service.LLMService.generate_summary_and_red_flags")
    def test_08_api_summary_generation_and_retrieval(self, mock_gen_summary, mock_get_client):
        """Verifies HTTP responses for summary generation and retrieval."""
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        test_uuid = "44444444-4444-4444-4444-444444444444"
        intake_with_summary = {
            "id": test_uuid,
            "patient_name": "Anita",
            "patient_age": 48,
            "chief_complaint": "Persistent cough",
            "chat_transcript": [
                {"role": "assistant", "content": "What is bringing you in?"},
                {"role": "user", "content": "Dry cough for 3 weeks with mild fever."}
            ],
            "red_flags": [
                {"reason": "Persistent fever with cough", "patient_quote": "Dry cough for 3 weeks with mild fever", "severity": "urgent"}
            ],
            "urgency_level": "urgent",
            "status": "completed",
            "summary": {
                "chief_complaint": "Persistent cough",
                "history_of_present_illness": "Patient has had dry cough for 3 weeks with mild fever.",
                "symptoms": ["dry cough", "mild fever"],
                "medical_history": [],
                "medications": [],
                "allergies": [],
                "urgency": "urgent",
                "suggested_questions": ["Has there been any weight loss or night sweats?"]
            },
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }

        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[intake_with_summary])

        # GET /api/intakes/{id}/summary
        res = self.client.get(f"/api/intakes/{test_uuid}/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intake_id"], test_uuid)
        self.assertEqual(data["patient_name"], "Anita")
        self.assertEqual(data["urgency_level"], "urgent")
        self.assertEqual(len(data["red_flags"]), 1)
        self.assertEqual(data["summary"]["chief_complaint"], "Persistent cough")

    # -------------------------------------------------------------------------
    # TEST 9: Empty Transcript Guard
    # -------------------------------------------------------------------------
    @patch("services.intake_service.get_supabase_client")
    def test_09_summary_generation_rejects_empty_intake(self, mock_get_client):
        """Verifies that attempting to generate a summary for an intake with 0 patient messages returns 400 Bad Request."""
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        test_uuid = "55555555-5555-5555-5555-555555555555"
        empty_intake = {
            "id": test_uuid,
            "patient_name": "Ghost Patient",
            "patient_age": 25,
            "chief_complaint": None,
            "chat_transcript": [
                {"role": "assistant", "content": "Hello, how can I help you today?"}
            ],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress",
            "summary": None,
            "created_at": "2026-10-25T08:00:00Z",
            "updated_at": "2026-10-25T08:00:00Z"
        }
        mock_supabase.table().select().eq().execute.return_value = MagicMock(data=[empty_intake])

        res = self.client.post(f"/api/intakes/{test_uuid}/summary")
        self.assertEqual(res.status_code, 400)
        self.assertIn("no patient messages", res.json()["detail"].lower())

if __name__ == "__main__":
    unittest.main()
