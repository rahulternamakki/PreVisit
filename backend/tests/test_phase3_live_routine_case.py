import unittest
from schemas.intake import IntakeCreate
from services.intake_service import IntakeService

class TestPhase3LiveRoutineCase(unittest.TestCase):
    def test_live_routine_case_no_red_flags_and_zero_hallucinations(self):
        print("\n=================================================================")
        print("TESTING PHASE 3 LIVE ROUTINE CASE (NO RED FLAGS, CLEAN GROUNDING)")
        print("=================================================================")

        # 1. Create Patient Intake for a routine case
        intake = IntakeService.create_intake(IntakeCreate(
            patient_name="Lucas Miller",
            patient_age=24,
            chief_complaint="Mild sprained right wrist"
        ))
        intake_id = intake["id"]
        print(f"[+] Created routine test intake {intake_id} for Lucas Miller (Age 24)")

        # Realistic routine conversation: sprained wrist, no chronic illnesses, no daily meds, no allergies
        patient_turns = [
            "I tripped while skateboarding yesterday afternoon and bent my right wrist backward.",
            "On a scale of 1 to 10, the pain is about a 3. Mostly just aches when I try to push open doors.",
            "There is no numbness, tingling, or skin breaks, just mild soreness on the top of the wrist.",
            "I have no chronic medical conditions, no asthma, diabetes, or past surgeries.",
            "I don't take any regular medications or supplements, just put an ice pack on it yesterday.",
            "I have no allergies to any medications, foods, or latex."
        ]

        try:
            # Feed turns
            for i, user_reply in enumerate(patient_turns, 1):
                safe_user = user_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"[Turn {i} - Patient]: {safe_user}")
                res = IntakeService.process_chat_turn(intake_id, user_reply)
                assistant_reply = res["message"]["content"]
                safe_reply = assistant_reply.encode('ascii', errors='replace').decode('ascii')
                print(f"[Turn {i} - PreVisit]: {safe_reply[:120]}...")

            # Generate summary
            print("\n[+] Generating structured clinical summary for routine case...")
            completed = IntakeService.generate_and_save_summary(intake_id)

            self.assertEqual(completed["status"], "completed")
            summary = completed.get("summary")
            self.assertIsNotNone(summary)

            print("\n---------------- ROUTINE STRUCTURED SUMMARY ----------------")
            print(f"Chief Complaint: {summary.get('chief_complaint')}")
            print(f"Urgency Level:   {completed.get('urgency_level')}")
            print(f"HPI:             {summary.get('history_of_present_illness')}")
            print(f"Symptoms:        {summary.get('symptoms')}")
            print(f"Medical History: {summary.get('medical_history')}")
            print(f"Medications:     {summary.get('medications')}")
            print(f"Allergies:       {summary.get('allergies')}")
            print(f"Questions:       {summary.get('suggested_questions')}")
            print(f"Red Flags:       {completed.get('red_flags')}")
            print("------------------------------------------------------------")

            # 1. Chief complaint should reflect wrist injury
            self.assertTrue("wrist" in str(summary.get("chief_complaint", "")).lower())

            # 2. Urgency MUST be routine
            self.assertEqual(completed.get("urgency_level"), "routine")

            # 3. Red flags MUST be empty (no acute cardiac, neuro, or respiratory signs)
            self.assertEqual(len(completed.get("red_flags", [])), 0, "Routine sprain must not generate red flags!")

            # 4. Zero hallucination: medical history, medications, allergies must not have invented drugs/diseases
            # If stated none, should be empty or explicit 'None' representation
            med_hist = summary.get("medical_history", [])
            self.assertTrue(len(med_hist) == 0 or all("none" in str(x).lower() or "no" in str(x).lower() for x in med_hist))

            meds = summary.get("medications", [])
            self.assertTrue(len(meds) == 0 or all("none" in str(x).lower() or "no" in str(x).lower() or "ice" in str(x).lower() for x in meds))

            allergies = summary.get("allergies", [])
            self.assertTrue(len(allergies) == 0 or all("none" in str(x).lower() or "no" in str(x).lower() for x in allergies))

            # 5. Suggested questions
            self.assertTrue(len(summary.get("suggested_questions", [])) >= 2)

            print("\n[+] SUCCESS: Routine case produced zero red flags, routine urgency, and zero hallucinated details!")

        finally:
            IntakeService.delete_intake(intake_id)
            print(f"[+] Cleaned up test record: {intake_id}")
            print("=================================================================\n")

if __name__ == "__main__":
    unittest.main()
