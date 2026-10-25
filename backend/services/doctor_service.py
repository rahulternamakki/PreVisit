import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from database import get_supabase_client
from schemas.doctor import (
    DoctorQueueItem,
    DoctorQueueStats,
    DoctorQueueResponse,
)
from services.intake_service import validate_uuid, IntakeNotFoundError

logger = logging.getLogger("previsit.services.doctor")

# Urgency priority mapping: emergency (0) > urgent (1) > routine (2)
URGENCY_ORDER = {
    "emergency": 0,
    "urgent": 1,
    "routine": 2,
}

class DoctorService:

    @staticmethod
    def get_queue(
        status_filter: Optional[str] = None,
        urgency_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> DoctorQueueResponse:
        """
        Retrieves patient intake queue sorted with urgent cases first,
        calculates triage statistics, and applies filters.
        """
        client = get_supabase_client()
        
        # Fetch active intakes
        query = client.table("intakes").select("*")
        if status_filter and status_filter.lower() == "archived":
            query = query.eq("status", "archived")
        else:
            # By default include all active (non-archived)
            query = query.neq("status", "archived")
            
        res = query.execute()
        all_records: List[Dict[str, Any]] = res.data or []

        # Calculate statistics across all active records
        stats = DoctorQueueStats(
            total=len(all_records),
            emergency=sum(1 for r in all_records if r.get("urgency_level") == "emergency"),
            urgent=sum(1 for r in all_records if r.get("urgency_level") == "urgent"),
            routine=sum(1 for r in all_records if r.get("urgency_level") == "routine"),
            completed=sum(1 for r in all_records if r.get("status") == "completed"),
            reviewed=sum(1 for r in all_records if r.get("status") == "reviewed"),
        )

        filtered = all_records

        # Filter by status if specific status requested
        if status_filter and status_filter.lower() not in ("all", "archived"):
            filtered = [r for r in filtered if r.get("status") == status_filter.lower()]

        # Filter by urgency if requested (urgent filter includes both urgent and emergency)
        if urgency_filter and urgency_filter.lower() != "all":
            uf = urgency_filter.lower()
            if uf == "urgent":
                filtered = [r for r in filtered if r.get("urgency_level") in ("urgent", "emergency")]
            else:
                filtered = [r for r in filtered if r.get("urgency_level") == uf]

        # Filter by search string (patient name or chief complaint)
        if search_query and search_query.strip():
            sq = search_query.strip().lower()
            filtered = [
                r for r in filtered
                if sq in (r.get("patient_name") or "").lower()
                or sq in (r.get("chief_complaint") or "").lower()
            ]

        # Sorting key:
        # 1. Urgency priority: emergency (0) < urgent (1) < routine (2) < other (3)
        # 2. Timestamp: newest created_at first (reverse timestamp)
        def sort_key(item: Dict[str, Any]):
            urgency_score = URGENCY_ORDER.get(item.get("urgency_level", "routine"), 3)
            # Parse created_at timestamp
            created_str = item.get("created_at")
            created_ts = 0.0
            if created_str:
                try:
                    # Parse ISO timestamp
                    clean_ts = created_str.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(clean_ts)
                    created_ts = dt.timestamp()
                except Exception:
                    created_ts = 0.0
            return (urgency_score, -created_ts)

        filtered.sort(key=sort_key)

        # Apply pagination
        paginated = filtered[offset : offset + limit]

        # Convert to queue items
        items: List[DoctorQueueItem] = []
        for r in paginated:
            red_flags = r.get("red_flags") or []
            summary = r.get("summary")
            item = DoctorQueueItem(
                id=str(r.get("id")),
                patient_name=r.get("patient_name", "Unknown"),
                patient_age=r.get("patient_age", 0),
                chief_complaint=r.get("chief_complaint"),
                urgency_level=r.get("urgency_level", "routine"),
                status=r.get("status", "completed"),
                red_flags_count=len(red_flags) if isinstance(red_flags, list) else 0,
                has_summary=bool(summary and isinstance(summary, dict) and summary.get("chief_complaint")),
                created_at=r.get("created_at", ""),
                updated_at=r.get("updated_at", ""),
            )
            items.append(item)

        return DoctorQueueResponse(stats=stats, items=items)

    @staticmethod
    def get_intake_detail(intake_id: str) -> Dict[str, Any]:
        """
        Retrieves full intake details for doctor review.
        """
        valid_id = validate_uuid(intake_id)
        client = get_supabase_client()
        res = client.table("intakes").select("*").eq("id", valid_id).execute()
        if not res.data:
            raise IntakeNotFoundError(f"Intake with ID '{valid_id}' not found.")
        return res.data[0]

    @staticmethod
    def update_status(intake_id: str, new_status: str) -> Dict[str, Any]:
        """
        Updates the clinical review status of an intake (e.g. marked as reviewed or archived).
        """
        valid_id = validate_uuid(intake_id)
        valid_statuses = {"in_progress", "completed", "reviewed", "archived"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")

        client = get_supabase_client()
        res = client.table("intakes").update({"status": new_status}).eq("id", valid_id).execute()
        if not res.data:
            raise IntakeNotFoundError(f"Intake with ID '{valid_id}' not found.")
        return res.data[0]

    @staticmethod
    def seed_demonstration_samples() -> List[Dict[str, Any]]:
        """
        Seeds 2 realistic clinical demonstration records into Supabase:
        1. Urgent Case: Marcus Vance (58M) - Acute cardiac symptoms with red flags
        2. Routine Case: Emily Watson (34F) - Seasonal allergic rhinitis
        """
        client = get_supabase_client()
        now_iso = datetime.now(timezone.utc).isoformat()
        
        urgent_intake = {
            "patient_name": "Marcus Vance",
            "patient_age": 58,
            "chief_complaint": "Severe crushing chest tightness radiating to left arm and jaw",
            "urgency_level": "urgent",
            "status": "completed",
            "created_at": now_iso,
            "updated_at": now_iso,
            "chat_transcript": [
                {
                    "role": "assistant",
                    "content": "Hello Marcus, welcome to PreVisit! I'm here to gather a few preliminary details for your doctor. What symptoms brought you in today?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "It feels like an elephant sitting on my chest and radiating down my left arm and up to my jaw.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Thank you for letting me know. When exactly did this chest tightness and radiating pain start, and did it come on suddenly?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "It started about 45 minutes ago while I was climbing stairs. It hasn't let up.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "On a scale of 1 to 10, how severe is the chest discomfort right now, and are you feeling short of breath, nauseous, or sweaty?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "It is an 8 out of 10. I feel nauseous and broke into a heavy cold sweat.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Do you have any past medical history, such as high blood pressure, diabetes, or heart conditions?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "I have hypertension and high cholesterol.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Are you taking any daily prescription medications?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "Lisinopril 20mg and Atorvastatin 40mg daily.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Do you have any known allergies to medications or substances?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "Severe allergy to Penicillin, gives me hives.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Thank you, Marcus. I have prepared your intake summary. Because you are having acute chest pressure with radiation and sweating, our staff has alerted your doctor immediately.",
                    "timestamp": now_iso
                }
            ],
            "red_flags": [
                {
                    "reason": "Crushing chest tightness with radiation to left arm and jaw indicates high risk for acute coronary syndrome (ACS).",
                    "patient_quote": "It feels like an elephant sitting on my chest and radiating down my left arm and up to my jaw.",
                    "severity": "emergency"
                },
                {
                    "reason": "Accompanying diaphoresis and nausea alongside acute 8/10 chest pain requires immediate cardiac evaluation.",
                    "patient_quote": "It is an 8 out of 10. I feel nauseous and broke into a heavy cold sweat.",
                    "severity": "emergency"
                }
            ],
            "summary": {
                "chief_complaint": "Severe crushing chest tightness radiating to left arm and jaw",
                "history_of_present_illness": "Marcus Vance is a 58-year-old male presenting with acute, non-resolving crushing substernal chest pressure that started 45 minutes ago during physical exertion (climbing stairs). Discomfort is rated 8/10 in severity and radiates to his left arm and left jaw, accompanied by nausea and marked diaphoresis.",
                "symptoms": [
                    "Crushing chest tightness (8/10)",
                    "Radiation to left arm and jaw",
                    "Nausea",
                    "Cold diaphoresis"
                ],
                "medical_history": [
                    "Essential Hypertension",
                    "Hyperlipidemia"
                ],
                "medications": [
                    "Lisinopril 20mg daily",
                    "Atorvastatin 40mg daily"
                ],
                "allergies": [
                    "Penicillin (causes hives)"
                ],
                "urgency": "urgent",
                "suggested_questions": [
                    "Obtain immediate 12-lead ECG and bedside troponin stat.",
                    "Has the patient taken any sublingual nitroglycerin or aspirin prior to arrival?",
                    "Is there any past history of angina, myocardial infarction, or family history of premature CAD?",
                    "Confirm current blood pressure and pulse symmetry across both upper extremities."
                ],
                "red_flags": [
                    {
                        "reason": "Crushing chest tightness with radiation to left arm and jaw indicates high risk for acute coronary syndrome (ACS).",
                        "patient_quote": "It feels like an elephant sitting on my chest and radiating down my left arm and up to my jaw.",
                        "severity": "emergency"
                    },
                    {
                        "reason": "Accompanying diaphoresis and nausea alongside acute 8/10 chest pain requires immediate cardiac evaluation.",
                        "patient_quote": "It is an 8 out of 10. I feel nauseous and broke into a heavy cold sweat.",
                        "severity": "emergency"
                    }
                ]
            }
        }

        routine_intake = {
            "patient_name": "Emily Watson",
            "patient_age": 34,
            "chief_complaint": "Seasonal allergic rhinitis with nasal congestion and ocular itching",
            "urgency_level": "routine",
            "status": "completed",
            "created_at": now_iso,
            "updated_at": now_iso,
            "chat_transcript": [
                {
                    "role": "assistant",
                    "content": "Hello Emily, welcome to PreVisit! What symptoms are you experiencing today?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "I have seasonal allergies every spring. Nasal congestion, clear runny nose, and itchy watery eyes.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "How long have these symptoms been going on this season, and how severe would you rate them from 1 to 10?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "About two weeks now. It is mild to moderate, around 3 or 4 out of 10. Mostly annoying when outside.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Do you have any fever, facial pain, sore throat, or shortness of breath?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "No fever, no pain, breathing is completely normal.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Do you have any chronic medical conditions or prior surgeries?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "No chronic conditions, generally very healthy.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Are you taking any medications or over-the-counter remedies currently?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "Just over-the-counter Cetirizine 10mg as needed.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Do you have any drug or food allergies?",
                    "timestamp": now_iso
                },
                {
                    "role": "user",
                    "content": "No drug allergies, only environmental tree pollen.",
                    "timestamp": now_iso
                },
                {
                    "role": "assistant",
                    "content": "Thank you, Emily! Your intake summary is prepared for your doctor's appointment.",
                    "timestamp": now_iso
                }
            ],
            "red_flags": [],
            "summary": {
                "chief_complaint": "Seasonal allergic rhinitis with nasal congestion and ocular itching",
                "history_of_present_illness": "Emily Watson is a 34-year-old female presenting with 2 weeks of spring seasonal allergic rhinitis symptoms, including bilateral nasal congestion, clear rhinorrhea, and itchy watery eyes. Symptoms are rated 3-4/10 in severity and worsen with outdoor pollen exposure. No fever, sore throat, or respiratory distress.",
                "symptoms": [
                    "Nasal congestion",
                    "Clear rhinorrhea",
                    "Bilateral ocular pruritus and tearing"
                ],
                "medical_history": [
                    "Seasonal environmental allergies"
                ],
                "medications": [
                    "Cetirizine 10mg PRN"
                ],
                "allergies": [
                    "Tree pollen (environmental)",
                    "No known drug allergies (NKDA)"
                ],
                "urgency": "routine",
                "suggested_questions": [
                    "Does oral Cetirizine provide adequate symptomatic relief, or is breakthrough congestion present?",
                    "Consider initiating an intranasal corticosteroid spray (e.g. Fluticasone) for enhanced symptom control.",
                    "Assess whether ocular antihistamine drops (e.g. Olopatadine) are warranted for persistent eye pruritus."
                ],
                "red_flags": []
            }
        }

        inserted = []
        for intake_data in [urgent_intake, routine_intake]:
            res = client.table("intakes").insert(intake_data).execute()
            if res.data:
                inserted.append(res.data[0])
                
        return inserted
