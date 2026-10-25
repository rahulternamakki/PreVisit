"""
PreVisit - Database Connection & Verification Script
Phase 1: Database Setup and Supabase Integration Verification
"""

import sys
from config import settings
from database import get_supabase_client, check_database_connection

def main():
    print("=" * 60)
    print("PreVisit - Phase 1 Database Integration Verifier")
    print("=" * 60)

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY

    print(f"Supabase URL: {url}")
    print(f"Service Role Key Configured: {'Yes (Length: ' + str(len(key)) + ')' if key and 'your_supabase' not in key else 'No (Placeholder)'}")
    print("-" * 60)

    if not url or not key or "your-project" in url or "your_supabase" in key:
        print("[!] NOTICE: Supabase credentials in 'backend/.env' are currently placeholders.")
        print("\nTo complete connection verification against live Supabase:")
        print("1. Create a Supabase project at https://supabase.com")
        print("2. Open the SQL Editor in Supabase and execute the script in 'backend/schema.sql'")
        print("3. In Supabase Dashboard -> Project Settings -> API:")
        print("   - Copy 'Project URL' to SUPABASE_URL in backend/.env")
        print("   - Copy 'service_role' key (secret) to SUPABASE_SERVICE_ROLE_KEY in backend/.env")
        print("4. Re-run this test script: python test_db_connection.py")
        print("=" * 60)
        return

    print("[*] Testing live connection to Supabase...")
    health = check_database_connection()
    if not health.get("connected"):
        print(f"[-] Connection Failed: {health.get('message')}")
        sys.exit(1)

    print("[+] Supabase connection and 'intakes' table verified!")
    print("[*] Performing test CRUD lifecycle...")

    client = get_supabase_client()

    # 1. Test Insert
    test_record = {
        "patient_name": "Database Verification Test",
        "patient_age": 42,
        "chief_complaint": "Testing persistent storage and RLS",
        "chat_transcript": [{"role": "assistant", "content": "Hello, how can I help?"}],
        "urgency_level": "routine",
        "status": "in_progress"
    }
    
    insert_res = client.table("intakes").insert(test_record).execute()
    if not insert_res.data:
        print("[-] Insert failed!")
        sys.exit(1)

    created = insert_res.data[0]
    test_id = created["id"]
    print(f"[+] Record inserted successfully! ID: {test_id}")

    # 2. Test Fetch
    fetch_res = client.table("intakes").select("*").eq("id", test_id).execute()
    assert fetch_res.data and fetch_res.data[0]["id"] == test_id
    print(f"[+] Record retrieved successfully! Patient: {fetch_res.data[0]['patient_name']}")

    # 3. Test Update
    update_res = client.table("intakes").update({
        "urgency_level": "urgent",
        "status": "completed"
    }).eq("id", test_id).execute()
    assert update_res.data and update_res.data[0]["urgency_level"] == "urgent"
    print(f"[+] Record updated successfully! Urgency: {update_res.data[0]['urgency_level']}")

    # 4. Clean up test record
    client.table("intakes").delete().eq("id", test_id).execute()
    print(f"[+] Cleaned up test record.")

    print("=" * 60)
    print("[SUCCESS] Phase 1 Database Setup and Backend Integration is 100% Verified!")
    print("=" * 60)

if __name__ == "__main__":
    main()
