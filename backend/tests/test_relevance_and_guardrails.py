import unittest
from schemas.intake import IntakeCreate
from services.intake_service import IntakeService
from services.llm_service import is_meaningful_complaint, build_intake_system_prompt

class TestRelevanceAndGuardrails(unittest.TestCase):
    def test_01_is_meaningful_complaint_unit_cases(self):
        # Meaningful health complaints
        self.assertTrue(is_meaningful_complaint("Severe headache behind eyes"))
        self.assertTrue(is_meaningful_complaint("Chest tightness for 2 days"))
        self.assertTrue(is_meaningful_complaint("Knee pain after running"))
        self.assertTrue(is_meaningful_complaint("Sore throat and fever"))

        # Uninformative or filler responses
        self.assertFalse(is_meaningful_complaint("yes"))
        self.assertFalse(is_meaningful_complaint("no"))
        self.assertFalse(is_meaningful_complaint("ok"))
        self.assertFalse(is_meaningful_complaint("hi"))
        self.assertFalse(is_meaningful_complaint("hello"))
        self.assertFalse(is_meaningful_complaint("sure"))
        self.assertFalse(is_meaningful_complaint("idk"))
        self.assertFalse(is_meaningful_complaint("a"))
        self.assertFalse(is_meaningful_complaint("  "))

        # Gibberish without vowels
        self.assertFalse(is_meaningful_complaint("qwrtyp"))
        self.assertFalse(is_meaningful_complaint("zzzzzz"))

    def test_02_system_prompt_includes_relevance_validation_rule(self):
        prompt = build_intake_system_prompt("Test Patient", 25, None)
        self.assertIn("RELEVANCE & OFF-TOPIC VALIDATION", prompt)
        self.assertIn("YOU MUST NOT ADVANCE TO THE NEXT INTAKE TOPIC", prompt)

    def test_03_irrelevant_answers_live_groq_handling(self):
        """
        Tests live conversational turn with irrelevant responses:
        1. User replies 'I like pizza' to opening question -> assistant re-asks for symptoms and chief_complaint is NOT set to pizza.
        2. User replies with real symptom -> assistant advances and chief_complaint is recorded.
        3. User replies 'can you write a poem about flowers' to severity -> assistant stays on severity.
        """
        intake = IntakeService.create_intake(IntakeCreate(
            patient_name="Relevance Test User",
            patient_age=32,
            chief_complaint=None
        ))
        intake_id = intake["id"]

        try:
            # Turn 1: Irrelevant pizza answer
            res1 = IntakeService.process_chat_turn(intake_id, "I like eating pizza and watching movies")
            reply1 = res1["message"]["content"]
            safe_reply1 = reply1.encode('ascii', errors='replace').decode('ascii')
            print(f"\n[Irrelevant Turn 1 Reply]: {safe_reply1}")

            # Must re-ask about symptoms/reasons, must NOT set chief complaint to pizza
            self.assertIn("?", reply1)
            reloaded1 = IntakeService.get_intake_by_id(intake_id)
            self.assertNotEqual(reloaded1.get("chief_complaint"), "I like eating pizza and watching movies")

            # Turn 2: Valid symptom provided
            res2 = IntakeService.process_chat_turn(intake_id, "I have had a high fever and painful cough for 3 days")
            reply2 = res2["message"]["content"]
            safe_reply2 = reply2.encode('ascii', errors='replace').decode('ascii')
            print(f"[Valid Turn 2 Reply]: {safe_reply2}")

            reloaded2 = IntakeService.get_intake_by_id(intake_id)
            # Chief complaint should now be captured
            self.assertTrue(reloaded2.get("chief_complaint") is not None)
            self.assertIn("cough", reloaded2.get("chief_complaint", "").lower())

            # Turn 3: Off-topic request during follow-up
            res3 = IntakeService.process_chat_turn(intake_id, "can you write a poem about flowers")
            reply3 = res3["message"]["content"]
            safe_reply3 = reply3.encode('ascii', errors='replace').decode('ascii')
            print(f"[Irrelevant Turn 3 Reply]: {safe_reply3}")

            # Must NOT advance to a new medical checklist topic (like medical history or allergies),
            # must re-ask or maintain focus on the cough/fever/severity
            self.assertIn("?", reply3)
            reply3_lower = reply3.lower()
            refocused = any(w in reply3_lower for w in ["cough", "fever", "symptom", "pain", "doctor", "health", "visit", "appointment"])
            self.assertTrue(refocused, "Assistant failed to refocus on the healthcare visit.")

        finally:
            IntakeService.delete_intake(intake_id)

if __name__ == "__main__":
    unittest.main()
