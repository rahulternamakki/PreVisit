import unittest
import time
from schemas.intake import IntakeCreate
from services.intake_service import IntakeService

def safe_print(text: str):
    print(text.encode("ascii", errors="replace").decode("ascii"))

class TestLivePhase2E2E(unittest.TestCase):
    def test_full_patient_intake_lifecycle_live_supabase(self):
        safe_print("\n==================================================")
        safe_print("Starting Live Phase 2 End-to-End Clinical Chat Test")
        safe_print("==================================================")

        # 1. Start Intake
        patient_data = IntakeCreate(
            patient_name="E2E Test Patient",
            patient_age=45,
            chief_complaint=None
        )
        created = IntakeService.create_intake(patient_data)
        intake_id = created["id"]
        safe_print(f"[+] 1. Intake Session Created: {intake_id}")
        self.assertIsNotNone(intake_id)
        self.assertEqual(created["status"], "in_progress")
        self.assertEqual(len(created["chat_transcript"]), 1)
        opening_msg = created["chat_transcript"][0]
        safe_print(f"    Assistant Opening: {opening_msg['content']}")
        self.assertEqual(opening_msg["role"], "assistant")

        try:
            # 2. Turn 1: Patient gives chief complaint & duration
            safe_print("\n[*] 2. Patient Turn 1: Primary Complaint & Duration")
            user_msg_1 = "I have had a throbbing pain in the left side of my head for 3 days with nausea"
            res_1 = IntakeService.process_chat_turn(intake_id, user_msg_1)
            safe_print(f"    Patient: {user_msg_1}")
            safe_print(f"    Assistant Reply: {res_1['message']['content']}")
            self.assertEqual(len(res_1["intake"]["chat_transcript"]), 3)
            self.assertFalse(res_1["emergency_detected"])
            self.assertEqual(res_1["intake"]["urgency_level"], "routine")

            # 3. Verify Database Persistence (Simulate Page Refresh)
            safe_print("\n[*] 3. Simulating Browser Refresh: Fetching session from Supabase by ID")
            reloaded = IntakeService.get_intake_by_id(intake_id)
            self.assertEqual(len(reloaded["chat_transcript"]), 3)
            self.assertEqual(reloaded["chat_transcript"][1]["content"], user_msg_1)
            self.assertEqual(reloaded["chat_transcript"][2]["content"], res_1["message"]["content"])
            safe_print("    [+] Browser refresh persistence verified: all messages intact in Supabase!")

            # 4. Turn 2: Severity & Character
            safe_print("\n[*] 4. Patient Turn 2: Severity & Character")
            user_msg_2 = "It is about a 7 out of 10 on the pain scale and sensitive to light"
            res_2 = IntakeService.process_chat_turn(intake_id, user_msg_2)
            safe_print(f"    Patient: {user_msg_2}")
            safe_print(f"    Assistant Reply: {res_2['message']['content']}")
            self.assertEqual(len(res_2["intake"]["chat_transcript"]), 5)

            # 5. Turn 3: Test Emergency Red Flag Injection
            safe_print("\n[*] 5. Testing Healthcare Safety: Emergency Red Flag Trigger")
            emergency_text = "Wait, now I feel severe crushing chest pain radiating to my left arm and jaw and can not breathe"
            emergency_res = IntakeService.process_chat_turn(intake_id, emergency_text)
            safe_print(f"    Patient: {emergency_text}")
            safe_print(f"    Assistant Reply: {emergency_res['message']['content']}")
            safe_print(f"    Emergency Detected: {emergency_res['emergency_detected']}")
            safe_print(f"    Urgency Level: {emergency_res['intake']['urgency_level']}")
            safe_print(f"    Red Flags Recorded: {emergency_res['intake']['red_flags']}")

            self.assertTrue(emergency_res["emergency_detected"])
            self.assertEqual(emergency_res["intake"]["urgency_level"], "emergency")
            self.assertTrue(len(emergency_res["intake"]["red_flags"]) >= 1)
            # Verify exact quote was preserved
            self.assertEqual(
                emergency_res["intake"]["red_flags"][-1]["patient_quote"],
                emergency_text
            )

            # 6. Verify Complete Status
            print("\n[*] 6. Testing Intake Completion")
            completed = IntakeService.complete_intake(intake_id)
            self.assertEqual(completed["status"], "completed")
            print("    [+] Intake marked as completed successfully!")

        finally:
            # 7. Cleanup
            IntakeService.delete_intake(intake_id)
            print(f"\n[+] Cleaned up live test intake record: {intake_id}")
            print("==================================================")
            print("Live Phase 2 End-to-End Chat Test PASSED!")
            print("==================================================")

if __name__ == "__main__":
    unittest.main()
