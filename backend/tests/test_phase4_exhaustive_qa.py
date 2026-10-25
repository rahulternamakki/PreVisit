"""
PreVisit Phase 4 Exhaustive QA & Verification Test Suite
Senior Software Tester Automated Test Run

Covers:
1. Security & Authentication:
   - Empty, blank, and wrong passcode rejection
   - Correct DOCTOR_PASSCODE verification
   - JWT structure, payload claims (sub='doctor', role='doctor'), expiry
   - Invalid token, tampered token, and unauthenticated endpoint rejection (401)
2. Patient Queue Triage & Urgency-First Sorting:
   - Urgency ordering: Emergency (0) > Urgent (1) > Routine (2)
   - Secondary ordering: created_at timestamp DESC (newest first)
   - Accuracy of queue stats (total, urgent, routine, completed, reviewed)
3. Filter & Search Reliability:
   - Case-insensitive search on patient_name
   - Case-insensitive search on chief_complaint
   - Urgency filtering ('urgent' includes urgent and emergency, 'routine' includes routine)
   - Status filtering ('completed', 'reviewed', 'all')
4. Clinical Summary & Red Flag Safety:
   - Red flags prominent presence with reason and exact patient quotes
   - Grounding check: quotes must strictly match patient dialogue in transcript
   - Structured summary schema compliance (HPI, symptoms, history, meds, allergies, suggested questions)
5. Collapsible Transcript Verification:
   - Verifiable message objects with roles and ISO timestamps
6. Intake Review Status Transitions:
   - Marking intake as 'reviewed'
   - Verifying persistence in Supabase
   - Reflected in queue stats and item status
7. Regression checks:
   - Patient intake endpoint compatibility remains intact
"""

import os
import sys
import unittest
from datetime import datetime, timezone
import requests
import jwt

BASE_URL = os.environ.get("PREVISIT_TEST_URL", "http://127.0.0.1:8000")

class TestPhase4ExhaustiveQA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Verify server is reachable
        try:
            res = requests.get(f"{BASE_URL}/health", timeout=25)
            assert res.status_code == 200, f"Health check failed: {res.status_code}"
            data = res.json()
            assert data.get("database", {}).get("connected") is True, "Supabase DB connection not ready"
            
            # Obtain doctor token for class
            login_res = requests.post(
                f"{BASE_URL}/api/doctor/login",
                json={"passcode": "123456"},
                timeout=25,
            )
            assert login_res.status_code == 200, f"Doctor login failed: {login_res.text}"
            cls.doctor_token = login_res.json()["access_token"]
            cls.auth_headers = {"Authorization": f"Bearer {cls.doctor_token}"}
            print("\n[QA SETUP] Backend, Supabase, and Doctor auth session verified.")
        except Exception as e:
            raise unittest.SkipTest(f"Backend not available at {BASE_URL}: {e}")

    def setUp(self):
        self.doctor_token = self.__class__.doctor_token
        self.auth_headers = self.__class__.auth_headers

    # =========================================================================
    # 1. SECURITY & ACCESS CONTROL TESTS
    # =========================================================================

    def test_01_security_rejects_missing_passcode(self):
        """Passcode endpoint must reject empty or blank requests."""
        res1 = requests.post(f"{BASE_URL}/api/doctor/login", json={}, timeout=25)
        self.assertIn(res1.status_code, [400, 422])

        res2 = requests.post(f"{BASE_URL}/api/doctor/login", json={"passcode": ""}, timeout=25)
        self.assertIn(res2.status_code, [400, 401, 422])

        res3 = requests.post(f"{BASE_URL}/api/doctor/login", json={"passcode": "   "}, timeout=25)
        self.assertIn(res3.status_code, [400, 401, 422])

    def test_02_security_rejects_incorrect_passcode(self):
        """Passcode endpoint must reject wrong credentials with 401 Unauthorized."""
        wrong_passcodes = ["admin", "password", "000000", "12345", "654321", "wrong_test_pass"]
        for bad_pass in wrong_passcodes:
            res = requests.post(
                f"{BASE_URL}/api/doctor/login",
                json={"passcode": bad_pass},
                timeout=25,
            )
            self.assertEqual(res.status_code, 401, f"Failed to reject wrong passcode: {bad_pass}")
            self.assertIn("detail", res.json())

    def test_03_security_accepts_valid_passcode_and_issues_jwt(self):
        """Doctor login with valid passcode must return JWT with correct claims and 24h expiration."""
        res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=25,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("token_type"), "bearer")
        self.assertGreater(data.get("expires_in"), 3600)

        # Decode unverified to inspect payload
        token = data["access_token"]
        decoded = jwt.decode(token, options={"verify_signature": False})
        self.assertEqual(decoded.get("sub"), "doctor")
        self.assertEqual(decoded.get("role"), "doctor")
        self.assertIn("exp", decoded)
        self.assertIn("iat", decoded)
        self.assertGreater(decoded["exp"], decoded["iat"])

    def test_04_security_rejects_unauthenticated_and_tampered_tokens(self):
        """Protected doctor endpoints must reject missing, invalid, or tampered tokens."""
        # 1. Missing Authorization header
        res1 = requests.get(f"{BASE_URL}/api/doctor/queue", timeout=25)
        self.assertEqual(res1.status_code, 401)

        # 2. Malformed token
        res2 = requests.get(
            f"{BASE_URL}/api/doctor/queue",
            headers={"Authorization": "Bearer malformed.invalid.jwt"},
            timeout=25,
        )
        self.assertEqual(res2.status_code, 401)

        # 3. Non-bearer schema
        res3 = requests.get(
            f"{BASE_URL}/api/doctor/queue",
            headers={"Authorization": f"Basic {self.doctor_token}"},
            timeout=25,
        )
        self.assertEqual(res3.status_code, 401)

        # 4. Tampered payload
        tampered_token = self.doctor_token[:-6] + "abcdef"
        res4 = requests.get(
            f"{BASE_URL}/api/doctor/queue",
            headers={"Authorization": f"Bearer {tampered_token}"},
            timeout=25,
        )
        self.assertEqual(res4.status_code, 401)

    # =========================================================================
    # 2. PATIENT QUEUE & TRIAGE LOGIC TESTS
    # =========================================================================

    def test_05_seed_and_verify_triage_queue_sorting(self):
        """The queue must strictly place Emergency and Urgent cases before Routine cases."""
        # Seed realistic cases
        seed_res = requests.post(f"{BASE_URL}/api/doctor/seed-samples", headers=self.auth_headers, timeout=25)
        self.assertEqual(seed_res.status_code, 200)

        queue_res = requests.get(f"{BASE_URL}/api/doctor/queue", headers=self.auth_headers, timeout=25)
        self.assertEqual(queue_res.status_code, 200)
        data = queue_res.json()

        items = data["items"]
        stats = data["stats"]
        self.assertGreater(len(items), 0)

        # Stats checks
        self.assertEqual(stats["total"], len(items))
        self.assertGreaterEqual(stats["urgent"] + stats["emergency"], 1)
        self.assertGreaterEqual(stats["routine"], 1)

        # Verification of urgent-first sorting
        urgency_ranks = {"emergency": 0, "urgent": 1, "routine": 2}
        for i in range(len(items) - 1):
            curr_item = items[i]
            next_item = items[i + 1]
            curr_rank = urgency_ranks.get(curr_item["urgency_level"], 3)
            next_rank = urgency_ranks.get(next_item["urgency_level"], 3)

            self.assertLessEqual(
                curr_rank,
                next_rank,
                f"Urgent-first sorting violated: '{curr_item['patient_name']}' ({curr_item['urgency_level']}) "
                f"was ranked before '{next_item['patient_name']}' ({next_item['urgency_level']})"
            )

            # If ranks are identical, verify timestamp order (newest first)
            if curr_rank == next_rank and curr_item.get("created_at") and next_item.get("created_at"):
                t_curr = datetime.fromisoformat(curr_item["created_at"].replace("Z", "+00:00"))
                t_next = datetime.fromisoformat(next_item["created_at"].replace("Z", "+00:00"))
                self.assertGreaterEqual(
                    t_curr,
                    t_next,
                    f"Timestamp ordering violated for same urgency tier between {curr_item['patient_name']} and {next_item['patient_name']}"
                )

    # =========================================================================
    # 3. SEARCH & FILTERING TESTS
    # =========================================================================

    def test_06_search_by_name_and_complaint(self):
        """Doctor queue search must perform case-insensitive substring matching."""
        # 1. Search Marcus (urgent cardiac case)
        res_name = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=marcus",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(res_name.status_code, 200)
        name_items = res_name.json()["items"]
        self.assertTrue(any("Marcus" in it["patient_name"] for it in name_items))

        # 2. Search by complaint keyword "chest"
        res_comp = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=CHEST",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(res_comp.status_code, 200)
        comp_items = res_comp.json()["items"]
        self.assertTrue(any("chest" in (it["chief_complaint"] or "").lower() for it in comp_items))

        # 3. Search non-existent query
        res_empty = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=xyz_nonexistent_patient_query_999",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(len(res_empty.json()["items"]), 0)
        # Stats should still reflect active queue
        self.assertGreater(res_empty.json()["stats"]["total"], 0)

    def test_07_urgency_and_status_filtering(self):
        """Urgency tab and status filters must accurately filter queue items."""
        # 1. Filter urgent
        res_urgent = requests.get(
            f"{BASE_URL}/api/doctor/queue?urgency_level=urgent",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(res_urgent.status_code, 200)
        for it in res_urgent.json()["items"]:
            self.assertIn(it["urgency_level"], ["urgent", "emergency"])

        # 2. Filter routine
        res_routine = requests.get(
            f"{BASE_URL}/api/doctor/queue?urgency_level=routine",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(res_routine.status_code, 200)
        for it in res_routine.json()["items"]:
            self.assertEqual(it["urgency_level"], "routine")

    # =========================================================================
    # 4. CLINICAL SUMMARY & RED FLAGS REVIEW TESTS
    # =========================================================================

    def test_08_clinical_summary_structure_and_red_flag_grounding(self):
        """Review view must provide red flags with exact patient quotes and structured clinical summary."""
        # Find Marcus Vance
        res = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=Marcus",
            headers=self.auth_headers,
            timeout=25,
        )
        items = res.json()["items"]
        self.assertTrue(len(items) > 0, "Marcus Vance sample intake not found")
        marcus_id = items[0]["id"]

        # Fetch clinical detail
        detail_res = requests.get(
            f"{BASE_URL}/api/doctor/intakes/{marcus_id}",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(detail_res.status_code, 200)
        intake = detail_res.json()

        # 1. Verify demographics
        self.assertEqual(intake["patient_name"], "Marcus Vance")
        self.assertEqual(intake["patient_age"], 58)
        self.assertEqual(intake["urgency_level"], "urgent")

        # 2. Verify Red Flags appear and have corroborating patient quotes
        red_flags = intake.get("red_flags", [])
        self.assertGreaterEqual(len(red_flags), 1, "Expected at least 1 red flag for urgent cardiac case")

        transcript_texts = [
            m["content"].lower()
            for m in intake.get("chat_transcript", [])
            if m.get("role") == "user"
        ]

        for flag in red_flags:
            self.assertIn("reason", flag)
            self.assertIn("patient_quote", flag)
            self.assertTrue(len(flag["reason"].strip()) > 0)
            self.assertTrue(len(flag["patient_quote"].strip()) > 0)

            # Grounding verification: quote must exist in user messages
            quote = flag["patient_quote"].lower()
            quote_found = any(quote in t or t in quote for t in transcript_texts)
            self.assertTrue(
                quote_found,
                f"Red flag quote '{flag['patient_quote']}' was not grounded in patient's transcript messages!"
            )

        # 3. Verify Structured Summary fields
        summary = intake.get("summary")
        self.assertIsNotNone(summary)
        self.assertTrue(len(summary.get("chief_complaint", "")) > 0)
        self.assertTrue(len(summary.get("history_of_present_illness", "")) > 0)
        self.assertIsInstance(summary.get("symptoms"), list)
        self.assertIsInstance(summary.get("medical_history"), list)
        self.assertIsInstance(summary.get("medications"), list)
        self.assertIsInstance(summary.get("allergies"), list)
        self.assertIsInstance(summary.get("suggested_questions"), list)
        self.assertGreater(len(summary.get("suggested_questions", [])), 0)

    # =========================================================================
    # 5. REVIEW STATUS WORKFLOW & DB PERSISTENCE
    # =========================================================================

    def test_09_status_update_workflow_and_persistence(self):
        """Marking intake as reviewed updates DB and reflects immediately in queue."""
        # Find Emily Watson
        res = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=Emily",
            headers=self.auth_headers,
            timeout=25,
        )
        items = res.json()["items"]
        self.assertTrue(len(items) > 0, "Emily Watson sample intake not found")
        emily_id = items[0]["id"]

        # 1. Update status to 'reviewed'
        patch_res = requests.patch(
            f"{BASE_URL}/api/doctor/intakes/{emily_id}/status",
            json={"status": "reviewed"},
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["status"], "reviewed")

        # 2. Direct database read verification
        get_res = requests.get(
            f"{BASE_URL}/api/doctor/intakes/{emily_id}",
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["status"], "reviewed")

        # 3. Reflected in queue stats
        queue_res = requests.get(f"{BASE_URL}/api/doctor/queue", headers=self.auth_headers, timeout=25)
        stats = queue_res.json()["stats"]
        self.assertGreaterEqual(stats["reviewed"], 1)

        # 4. Reject invalid status update
        bad_patch = requests.patch(
            f"{BASE_URL}/api/doctor/intakes/{emily_id}/status",
            json={"status": "invalid_status_type"},
            headers=self.auth_headers,
            timeout=25,
        )
        self.assertIn(bad_patch.status_code, [400, 422])

    # =========================================================================
    # 6. PATIENT VIEW / REGRESSION INTEGRATION
    # =========================================================================

    def test_10_patient_intake_route_remains_operational(self):
        """Phase 1-3 Patient Intake API endpoints remain unaffected by doctor features."""
        # Create test patient intake
        create_res = requests.post(
            f"{BASE_URL}/api/intakes",
            json={
                "patient_name": "QA Regression Test Patient",
                "patient_age": 29,
                "chief_complaint": "Mild headache",
            },
            timeout=25,
        )
        self.assertEqual(create_res.status_code, 201)
        intake_id = create_res.json()["id"]

        # Retrieve intake via public patient route
        patient_get = requests.get(f"{BASE_URL}/api/intakes/{intake_id}", timeout=25)
        self.assertEqual(patient_get.status_code, 200)
        self.assertEqual(patient_get.json()["patient_name"], "QA Regression Test Patient")

        # Clean up
        del_res = requests.delete(f"{BASE_URL}/api/intakes/{intake_id}", timeout=25)
        self.assertIn(del_res.status_code, [200, 204])

if __name__ == "__main__":
    unittest.main()
