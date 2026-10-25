import unittest
from schemas.intake import IntakeCreate
from services.intake_service import IntakeService
from services.llm_service import is_quote_grounded_in_transcript

class TestPhase3LiveSummaryGeneration(unittest.TestCase):
    def test_live_summary_and_red_flag_generation_with_groq_and_supabase(self):
        print("\n=================================================================")
        print("TESTING PHASE 3 LIVE CLINICAL SUMMARY & RED FLAGS WITH GROQ & SUPABASE")
        print("=================================================================")

        # 1. Create Patient Intake
        intake = IntakeService.create_intake(IntakeCreate(
            patient_name="Devika Patel",
            patient_age=52,
            chief_complaint="Chest pressure and dizziness"
        ))
        intake_id = intake["id"]
        print(f"[+] Created test intake {intake_id} for Devika Patel (Age 52)")

        # Realistic patient responses with acute red-flag symptoms and explicit facts
        patient_turns = [
            "I have been having tight chest pressure and sudden dizziness since early this morning, about 5 hours ago.",
            "On a scale of 1 to 10, the chest tightness is around a 7. It gets worse when I try to walk up stairs.",
            "I also feel short of breath and broke into a cold sweat an hour ago.",
            "I have a history of hypertension for 8 years and had an appendectomy 20 years ago. No diabetes.",
            "I take amlodipine 5mg once daily for my blood pressure. No other medications or herbal supplements.",
            "I have a severe allergy to penicillin which causes hives and facial swelling. No food allergies."
        ]

        try:
            # 2. Feed turns into conversation
            for i, user_reply in enumerate(patient_turns, 1):
                safe_user = user_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"[Turn {i} - Patient]: {safe_user}")
                res = IntakeService.process_chat_turn(intake_id, user_reply)
                assistant_reply = res["message"]["content"]
                safe_reply = assistant_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"[Turn {i} - PreVisit]: {safe_reply[:120]}...")

            # 3. Explicitly generate and save summary
            print("\n[+] Calling IntakeService.generate_and_save_summary()...")
            completed_record = IntakeService.generate_and_save_summary(intake_id)

            # 4. Verify Supabase record state
            self.assertEqual(completed_record["status"], "completed")
            self.assertIsNotNone(completed_record["summary"])
            summary = completed_record["summary"]

            print("\n---------------- GENERATED STRUCTURED SUMMARY ----------------")
            print(f"Chief Complaint: {summary.get('chief_complaint')}")
            print(f"Urgency Level:   {completed_record.get('urgency_level')}")
            print(f"HPI:             {summary.get('history_of_present_illness')}")
            print(f"Symptoms:        {summary.get('symptoms')}")
            print(f"Medical History: {summary.get('medical_history')}")
            print(f"Medications:     {summary.get('medications')}")
            print(f"Allergies:       {summary.get('allergies')}")
            print(f"Questions:       {summary.get('suggested_questions')}")
            print("--------------------------------------------------------------")

            # Assert structured summary fields
            self.assertTrue(len(summary.get("chief_complaint", "")) > 0)
            self.assertTrue(len(summary.get("history_of_present_illness", "")) > 10)
            self.assertTrue(len(summary.get("symptoms", [])) >= 2)
            self.assertTrue(any("hypertension" in str(m).lower() for m in summary.get("medical_history", [])))
            self.assertTrue(any("amlodipine" in str(m).lower() for m in summary.get("medications", [])))
            self.assertTrue(any("penicillin" in str(a).lower() for a in summary.get("allergies", [])))
            self.assertTrue(len(summary.get("suggested_questions", [])) >= 2)

            # Check red flags
            red_flags = completed_record.get("red_flags", [])
            print(f"\n[+] Total Identified Red Flags: {len(red_flags)}")
            for idx, rf in enumerate(red_flags, 1):
                safe_reason = str(rf.get("reason", "")).encode("ascii", errors="replace").decode("ascii")
                safe_quote = str(rf.get("patient_quote", "")).encode("ascii", errors="replace").decode("ascii")
                print(f"  Flag {idx}: [{rf.get('severity').upper()}] {safe_reason}")
                print(f"          Quote: \"{safe_quote}\"")

            self.assertTrue(len(red_flags) >= 1, "Expected at least 1 clinical red flag for chest pressure and dyspnea.")

            # Validate each red flag quote is strictly grounded in patient transcript
            transcript = completed_record.get("chat_transcript", [])
            for rf in red_flags:
                quote = rf.get("patient_quote")
                self.assertTrue(
                    is_quote_grounded_in_transcript(quote, transcript),
                    f"Red flag quote '{quote}' was NOT found in patient statements!"
                )
                self.assertIn(rf.get("severity"), ["urgent", "emergency"])
                self.assertTrue(len(rf.get("reason", "")) >= 3)

            # Triage urgency must be elevated to urgent or emergency
            self.assertIn(completed_record.get("urgency_level"), ["urgent", "emergency"])

            print("\n[+] SUCCESS: Live clinical summary and red flags verified against all Phase 3 requirements!")

        finally:
            IntakeService.delete_intake(intake_id)
            print(f"[+] Cleaned up test intake record: {intake_id}")
            print("=================================================================\n")

if __name__ == "__main__":
    unittest.main()
