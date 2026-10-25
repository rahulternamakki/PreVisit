import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from services.auth_service import create_doctor_token
from services.llm_service import (
    detect_emergency,
    is_quote_grounded_in_transcript,
    LLMService,
    EMERGENCY_PATTERNS
)
from services.intake_service import IntakeService

class TestPhase5SafetyAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.doctor_token = create_doctor_token()
        cls.auth_headers = {"Authorization": f"Bearer {cls.doctor_token}"}
        cls.sample_uuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"

    # =========================================================================
    # 1. EMERGENCY HANDLING & DETECTION
    # =========================================================================
    def test_emergency_cardiac_symptoms(self):
        cases = [
            "I have intense chest pain right now",
            "There is tight pressure on my chest and it hurts to move",
            "Severe pain radiating to my left arm and jaw",
            "I feel like I am having a heart attack",
            "Crushing chest pain that started 20 minutes ago"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")
            self.assertIn("cardiac", res["reason"].lower())

    def test_emergency_respiratory_distress(self):
        cases = [
            "I cannot breathe properly and my lips are turning blue",
            "I am having severe difficulty breathing",
            "I am gasping for air and struggling to breathe",
            "My throat feels tight and I am suffocating",
            "Having a severe asthma attack and inhaler is not working"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect respiratory emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")
            self.assertIn("respiratory", res["reason"].lower())

    def test_emergency_stroke_warning_signs(self):
        cases = [
            "The left side of my face is drooping",
            "My speech is slurred and my family says I don't make sense",
            "Sudden numbness on one side of my body and arm weakness",
            "I think I might be having a stroke"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect stroke emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")
            self.assertIn("stroke", res["reason"].lower())

    def test_emergency_anaphylaxis(self):
        cases = [
            "My throat is closing and my tongue is swollen after eating peanuts",
            "Swollen lips and tongue with anaphylaxis",
            "I am having a severe allergic reaction to seafood"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect anaphylaxis emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")

    def test_emergency_acute_hemorrhage(self):
        cases = [
            "I am coughing up blood and feeling very faint",
            "I have been vomiting blood for the last hour",
            "Bleeding profusely from a deep wound, uncontrolled bleeding"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect hemorrhage emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")

    def test_emergency_crisis_self_harm(self):
        cases = [
            "I want to kill myself",
            "Having active thoughts of suicide today",
            "I want to harm myself and end my life"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect crisis emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")

    def test_emergency_thunderclap_and_syncope(self):
        cases = [
            "This is the worst headache of my life, came on like a thunderclap",
            "I passed out in the kitchen and blacked out completely",
            "I lost consciousness for about two minutes",
            "My child had a seizure and was convulsing"
        ]
        for c in cases:
            res = detect_emergency(c)
            self.assertIsNotNone(res, f"Failed to detect neurological emergency for: '{c}'")
            self.assertEqual(res["severity"], "emergency")

    def test_routine_cases_do_not_trigger_emergency(self):
        routine_cases = [
            "I have a mild sore throat and runny nose since Tuesday",
            "I twisted my ankle playing soccer yesterday",
            "I need a refill on my blood pressure prescription",
            "Experiencing seasonal pollen allergies with sneezing",
            "Mild lower back ache after moving furniture",
            "A dry cough for 3 days with no fever"
        ]
        for r in routine_cases:
            res = detect_emergency(r)
            self.assertIsNone(res, f"False positive emergency triggered for routine case: '{r}'")

    # =========================================================================
    # 2. INITIAL CHIEF COMPLAINT EMERGENCY DETECTION
    # =========================================================================
    @patch("services.intake_service.get_supabase_client")
    def test_chief_complaint_emergency_initialization(self, mock_get_client):
        mock_supabase = MagicMock()
        mock_get_client.return_value = mock_supabase

        def fake_insert(payload):
            mock_ret = MagicMock()
            row = dict(payload)
            row["id"] = self.sample_uuid
            row["created_at"] = "2026-10-25T10:00:00Z"
            row["updated_at"] = "2026-10-25T10:00:00Z"
            mock_ret.execute.return_value.data = [row]
            return mock_ret

        mock_supabase.table().insert.side_effect = fake_insert

        from schemas.intake import IntakeCreate
        data = IntakeCreate(
            patient_name="Alex Mercer",
            patient_age=45,
            chief_complaint="Sudden severe crushing chest pain radiating to left arm"
        )
        record = IntakeService.create_intake(data)

        # Must be initialized as emergency
        self.assertEqual(record["urgency_level"], "emergency")
        self.assertEqual(len(record["red_flags"]), 1)
        self.assertIn("chest", record["red_flags"][0]["reason"].lower())
        # Opening question must include prominent safety alert
        opening = record["chat_transcript"][0]["content"]
        self.assertIn("SAFETY NOTICE", opening)
        self.assertIn("911", opening)

    # =========================================================================
    # 3. PATIENT DATA PRIVACY & ACCESS CONTROL
    # =========================================================================
    def test_unauthenticated_intake_listing_forbidden(self):
        # Patient data listing MUST NOT be public
        res = self.client.get("/api/intakes")
        self.assertEqual(res.status_code, 401)
        self.assertIn("detail", res.json())

    def test_unauthenticated_intake_deletion_forbidden(self):
        # Deleting an intake MUST NOT be public
        res = self.client.delete(f"/api/intakes/{self.sample_uuid}")
        self.assertEqual(res.status_code, 401)

    def test_doctor_login_invalid_passcode(self):
        # Passcode verification must reject invalid credentials
        res = self.client.post("/api/doctor/login", json={"passcode": "wrong_code"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("Incorrect doctor passcode", res.json()["detail"])

    def test_doctor_login_valid_passcode(self):
        from config import settings
        res = self.client.post("/api/doctor/login", json={"passcode": settings.DOCTOR_PASSCODE})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

    # =========================================================================
    # 4. CORS AND HTTP SECURITY HEADERS
    # =========================================================================
    def test_security_headers_present_on_responses(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        # Verify OWASP defense-in-depth headers
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(res.headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertEqual(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")

    def test_cors_origin_control(self):
        # Configured frontend origin should be permitted
        res = self.client.options(
            "/api/intakes",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST"
            }
        )
        self.assertIn(res.headers.get("access-control-allow-origin"), ["http://localhost:3000", "*"])

    # =========================================================================
    # 5. STRICT FACTUAL GROUNDING & HALLUCINATION PREVENTION
    # =========================================================================
    def test_quote_grounding_verification(self):
        transcript = [
            {"role": "assistant", "content": "Hello Arthur, what symptoms are you having?"},
            {"role": "user", "content": "I have been having sharp chest pain that hurts worse when I inhale deeply."},
            {"role": "assistant", "content": "When did this first begin?"},
            {"role": "user", "content": "It started about 3 hours ago after lunch."}
        ]

        # Valid verbatim quotes
        self.assertTrue(is_quote_grounded_in_transcript(
            "sharp chest pain that hurts worse when I inhale deeply",
            transcript
        ))
        self.assertTrue(is_quote_grounded_in_transcript(
            "started about 3 hours ago after lunch",
            transcript
        ))

        # Fabricated or hallucinated quotes (NOT in transcript)
        self.assertFalse(is_quote_grounded_in_transcript(
            "I passed out in my garden yesterday",
            transcript
        ))
        self.assertFalse(is_quote_grounded_in_transcript(
            "My left arm is completely numb",
            transcript
        ))
        self.assertFalse(is_quote_grounded_in_transcript(
            "I have been coughing up dark blood for 5 days",
            transcript
        ))
        # Empty or None quote
        self.assertFalse(is_quote_grounded_in_transcript("", transcript))

    # =========================================================================
    # 6. MODEL FALLBACK RESILIENCE UNDER RATE LIMIT
    # =========================================================================
    @patch("services.llm_service.LLMService.get_client")
    def test_model_fallback_on_primary_rate_limit(self, mock_get_client):
        mock_groq = MagicMock()
        mock_get_client.return_value = mock_groq

        # Simulate 429 RateLimit on primary model and success on fallback model
        def fake_create(**kwargs):
            model = kwargs.get("model")
            if "120b" in model:
                raise Exception("Rate limit reached for model openai/gpt-oss-120b (429)")
            # Fallback model succeeds
            mock_choice = MagicMock()
            mock_choice.message.content = "On a scale of 1 to 10, how severe is your discomfort?"
            mock_response = MagicMock()
            mock_response.choices = [mock_choice]
            return mock_response

        mock_groq.chat.completions.create.side_effect = fake_create

        reply, is_complete = LLMService.generate_next_intake_question(
            patient_name="Sara",
            patient_age=32,
            transcript=[
                {"role": "assistant", "content": "Welcome to PreVisit."},
                {"role": "user", "content": "I have an earache."}
            ]
        )

        self.assertIn("scale of 1 to 10", reply)
        self.assertFalse(is_complete)
        # Verify both models were called (primary then fallback)
        self.assertGreaterEqual(mock_groq.chat.completions.create.call_count, 2)

if __name__ == "__main__":
    unittest.main()
