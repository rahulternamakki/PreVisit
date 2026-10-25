import unittest
from schemas.intake import IntakeCreate
from services.intake_service import IntakeService

class TestFullClinicalIntakeSimulation(unittest.TestCase):
    def test_complete_intake_conversation_covering_all_topics(self):
        print("\n=================================================================")
        print("SIMULATING FULL 7-TOPIC CLINICAL INTAKE WITH LIVE GROQ & SUPABASE")
        print("=================================================================")

        # 1. Patient Entry
        intake = IntakeService.create_intake(IntakeCreate(
            patient_name="Priya Sharma",
            patient_age=38,
            chief_complaint=None
        ))
        intake_id = intake["id"]
        print(f"\n[Turn 0 - Opening]:\nPreVisit: {intake['chat_transcript'][0]['content']}")

        # Simulated patient turns covering all domains
        patient_responses = [
            # Topic 1 & 2: Chief Complaint & Onset
            "I have been having burning chest pain and acid taste in my mouth for about 4 days, mostly after dinner.",
            # Topic 3: Severity & Character
            "On a scale of 1 to 10, it's about a 4 or 5. It feels like a burning sensation behind my breastbone, no pressure.",
            # Topic 4: Associated Symptoms
            "No fever or vomiting, but I feel bloated and have a dry throat when lying down.",
            # Topic 5: Past Medical History
            "I had gestational diabetes 5 years ago, no chronic illnesses or surgeries.",
            # Topic 6: Medications
            "I take calcium and vitamin D supplements, and I tried an over-the-counter antacid yesterday.",
            # Topic 7: Allergies & Closing
            "I have an allergy to sulfa antibiotics which gave me a rash. No other allergies.",
        ]

        turns_recorded = []
        try:
            for i, user_reply in enumerate(patient_responses, 1):
                safe_user = user_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"\n[Turn {i} - Patient]: {safe_user}")
                res = IntakeService.process_chat_turn(intake_id, user_reply)
                assistant_reply = res["message"]["content"]
                safe_assistant = assistant_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"[Turn {i} - PreVisit]: {safe_assistant}")
                turns_recorded.append(assistant_reply)

                # Verify each response from assistant is NOT empty
                self.assertTrue(len(assistant_reply.strip()) > 5)
                # Verify no diagnoses made
                self.assertNotIn("you have gerd", assistant_reply.lower())
                self.assertNotIn("i diagnose", assistant_reply.lower())

            # Verify in Supabase
            final_record = IntakeService.get_intake_by_id(intake_id)
            print(f"\n[+] Total transcript messages in Supabase: {len(final_record['chat_transcript'])}")
            # 1 opening + 6 user + 6 assistant = 13 messages
            self.assertEqual(len(final_record["chat_transcript"]), 13)

            # Check that every single message has role, content, and valid timestamp
            for msg in final_record["chat_transcript"]:
                self.assertIn(msg["role"], ["user", "assistant"])
                self.assertTrue(len(msg["content"]) > 0)
                self.assertIsNotNone(msg.get("timestamp"))

            # Explicitly complete intake if not already completed
            completed = IntakeService.complete_intake(intake_id)
            self.assertEqual(completed["status"], "completed")
            print("[+] Successfully completed full clinical intake simulation!")

        finally:
            IntakeService.delete_intake(intake_id)
            print(f"[+] Cleaned up test record: {intake_id}")
            print("=================================================================")

if __name__ == "__main__":
    unittest.main()
