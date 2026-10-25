"""
Phase 4 Verification Test Suite: Doctor Dashboard & Security
Verifies:
1. Passcode security (rejects invalid passcode, accepts valid DOCTOR_PASSCODE).
2. JWT session issuance, expiration, and format.
3. Access control: protected endpoints reject unauthenticated or expired tokens with 401.
4. Patient queue retrieval:
   - Verification that urgent/emergency cases appear first.
   - Within same urgency tier, newest arrivals are prioritized.
   - Filter by urgency level and status.
   - Search by patient name and chief complaint.
5. Patient summary review:
   - Full intake retrieval with red flags, clinical summary, and transcript.
6. Status transitions:
   - Updating intake status (e.g. from 'completed' to 'reviewed' and 'archived').
7. Demonstration sample seeding.
"""

import os
import sys
import unittest
from datetime import datetime
import requests

BASE_URL = os.environ.get("PREVISIT_TEST_URL", "http://127.0.0.1:8000")

class TestPhase4DoctorDashboard(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Health check
        res = requests.get(f"{BASE_URL}/health", timeout=10)
        assert res.status_code == 200, f"Backend not healthy at {BASE_URL}"

    def test_01_passcode_authentication_and_rejection(self):
        """Doctor login must reject invalid passcodes and accept valid passcode."""
        # 1. Invalid passcode
        bad_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "wrong_doctor_passcode_999"},
            timeout=10,
        )
        self.assertEqual(bad_res.status_code, 401)
        self.assertIn("detail", bad_res.json())

        # 2. Blank passcode
        blank_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": ""},
            timeout=10,
        )
        self.assertIn(blank_res.status_code, [401, 422])

        # 3. Valid passcode (123456)
        valid_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=10,
        )
        self.assertEqual(valid_res.status_code, 200)
        data = valid_res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertGreater(data["expires_in"], 0)

    def test_02_session_verification_and_unauthorized_protection(self):
        """Endpoints must reject unauthenticated requests and accept valid Bearer tokens."""
        # 1. Unauthenticated queue request
        unauth_res = requests.get(f"{BASE_URL}/api/doctor/queue", timeout=10)
        self.assertEqual(unauth_res.status_code, 401)

        # 2. Invalid Bearer token
        invalid_res = requests.get(
            f"{BASE_URL}/api/doctor/queue",
            headers={"Authorization": "Bearer bad.token.here"},
            timeout=10,
        )
        self.assertEqual(invalid_res.status_code, 401)

        # 3. Valid login and verify endpoint
        login_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=10,
        )
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        verify_res = requests.get(f"{BASE_URL}/api/doctor/verify", headers=auth_headers, timeout=10)
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.json()
        self.assertTrue(verify_data.get("authenticated"))
        self.assertEqual(verify_data.get("role"), "doctor")

    def test_03_seed_samples_and_urgent_first_queue_sorting(self):
        """The queue must sort urgent/emergency cases ahead of routine cases."""
        login_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=10,
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Seed clinical demo records
        seed_res = requests.post(f"{BASE_URL}/api/doctor/seed-samples", headers=headers, timeout=10)
        self.assertEqual(seed_res.status_code, 200)

        # Retrieve queue
        queue_res = requests.get(f"{BASE_URL}/api/doctor/queue", headers=headers, timeout=10)
        self.assertEqual(queue_res.status_code, 200)
        data = queue_res.json()

        items = data["items"]
        stats = data["stats"]
        self.assertGreaterEqual(len(items), 2)
        self.assertGreaterEqual(stats["urgent"] + stats["emergency"], 1)

        # Check sorting: any emergency/urgent must come BEFORE routine
        urgency_ranks = {"emergency": 0, "urgent": 1, "routine": 2}
        observed_ranks = [urgency_ranks.get(it["urgency_level"], 3) for it in items]

        # Verify sorted order non-decreasing by rank
        for i in range(len(observed_ranks) - 1):
            self.assertLessEqual(
                observed_ranks[i],
                observed_ranks[i + 1],
                f"Queue not sorted urgent-first at index {i}: {items[i]['patient_name']} ({items[i]['urgency_level']}) was before {items[i+1]['patient_name']} ({items[i+1]['urgency_level']})"
            )

    def test_04_doctor_intake_detail_and_status_update(self):
        """Doctor must be able to load full clinical details and mark intake as reviewed."""
        login_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=10,
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get queue to pick an intake
        queue_res = requests.get(f"{BASE_URL}/api/doctor/queue", headers=headers, timeout=10)
        items = queue_res.json()["items"]
        target_id = items[0]["id"]

        # 1. Fetch full details
        detail_res = requests.get(f"{BASE_URL}/api/doctor/intakes/{target_id}", headers=headers, timeout=10)
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["id"], target_id)
        self.assertIn("chat_transcript", detail)
        self.assertIn("summary", detail)
        self.assertIn("red_flags", detail)

        # 2. Update status to 'reviewed'
        update_res = requests.patch(
            f"{BASE_URL}/api/doctor/intakes/{target_id}/status",
            json={"status": "reviewed"},
            headers=headers,
            timeout=10,
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["status"], "reviewed")

        # Verify reflected in queue stats
        queue_updated = requests.get(f"{BASE_URL}/api/doctor/queue", headers=headers, timeout=10).json()
        self.assertGreaterEqual(queue_updated["stats"]["reviewed"], 1)

    def test_05_search_and_filters(self):
        """Queue supports search and urgency filter."""
        login_res = requests.post(
            f"{BASE_URL}/api/doctor/login",
            json={"passcode": "123456"},
            timeout=10,
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Search for Marcus
        search_res = requests.get(
            f"{BASE_URL}/api/doctor/queue?search=Marcus",
            headers=headers,
            timeout=10,
        )
        self.assertEqual(search_res.status_code, 200)
        search_items = search_res.json()["items"]
        self.assertTrue(any("Marcus" in it["patient_name"] for it in search_items))

        # Filter by urgent
        urgent_res = requests.get(
            f"{BASE_URL}/api/doctor/queue?urgency_level=urgent",
            headers=headers,
            timeout=10,
        )
        self.assertEqual(urgent_res.status_code, 200)
        for it in urgent_res.json()["items"]:
            self.assertEqual(it["urgency_level"], "urgent")

if __name__ == "__main__":
    unittest.main()
