import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from database import get_supabase_client
from schemas.intake import IntakeCreate, IntakeUpdate, AppendMessageRequest
from services.llm_service import LLMService, detect_emergency, is_meaningful_complaint

logger = logging.getLogger("previsit.intake_service")

class IntakeNotFoundError(Exception):
    pass

def validate_uuid(val: str) -> str:
    """Validates string is a valid UUID format."""
    try:
        uuid_obj = uuid.UUID(str(val))
        return str(uuid_obj)
    except (ValueError, AttributeError, TypeError):
        raise ValueError(f"Invalid UUID format: '{val}'. Expected valid RFC 4122 UUID.")

def get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class IntakeService:
    @staticmethod
    def create_intake(data: IntakeCreate) -> Dict[str, Any]:
        """
        Creates a new patient intake record in Supabase and initializes the
        first adaptive intake question so the chat is ready immediately.
        """
        client = get_supabase_client()
        opening_text = LLMService.generate_opening_message(
            patient_name=data.patient_name,
            patient_age=data.patient_age,
            chief_complaint=data.chief_complaint
        )
        opening_message = {
            "role": "assistant",
            "content": opening_text,
            "timestamp": get_utc_now_iso()
        }

        payload = {
            "patient_name": data.patient_name,
            "patient_age": data.patient_age,
            "chief_complaint": data.chief_complaint,
            "chat_transcript": [opening_message],
            "red_flags": [],
            "urgency_level": "routine",
            "status": "in_progress"
        }
        res = client.table("intakes").insert(payload).execute()
        if not res.data:
            raise RuntimeError("Database did not return created intake record.")
        return res.data[0]

    @staticmethod
    def get_intake_by_id(intake_id: str) -> Dict[str, Any]:
        """
        Retrieves a single patient intake record by its UUID.
        """
        valid_id = validate_uuid(intake_id)
        client = get_supabase_client()
        res = client.table("intakes").select("*").eq("id", valid_id).execute()
        if not res.data:
            raise IntakeNotFoundError(f"Intake with ID '{valid_id}' not found.")
        return res.data[0]

    @staticmethod
    def update_intake(intake_id: str, data: IntakeUpdate) -> Dict[str, Any]:
        """
        Updates fields of an existing intake record.
        """
        valid_id = validate_uuid(intake_id)
        client = get_supabase_client()
        
        # Verify existence
        IntakeService.get_intake_by_id(valid_id)
        
        update_data = {}
        dumped = data.model_dump(exclude_unset=True)
        for key, val in dumped.items():
            if val is not None:
                update_data[key] = val

        if not update_data:
            return IntakeService.get_intake_by_id(valid_id)

        res = client.table("intakes").update(update_data).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to update intake '{valid_id}'.")
        return res.data[0]

    @staticmethod
    def append_message(intake_id: str, message_data: AppendMessageRequest) -> Dict[str, Any]:
        """
        Appends a message to the intake chat transcript.
        """
        valid_id = validate_uuid(intake_id)
        current_intake = IntakeService.get_intake_by_id(valid_id)
        transcript = current_intake.get("chat_transcript") or []
        
        new_entry = {
            "role": message_data.role,
            "content": message_data.content,
            "timestamp": message_data.timestamp or get_utc_now_iso()
        }
        transcript.append(new_entry)

        client = get_supabase_client()
        res = client.table("intakes").update({"chat_transcript": transcript}).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to append message to intake '{valid_id}'.")
        return res.data[0]

    @staticmethod
    def process_chat_turn(intake_id: str, user_text: str) -> Dict[str, Any]:
        """
        Handles full conversational turn:
        1. Validates intake and ensures it's open.
        2. Detects emergency red flags on user input.
        3. Appends user message to transcript.
        4. Dynamically extracts chief complaint if missing.
        5. Calls Groq LLM for the single next adaptive question.
        6. Appends assistant reply to transcript.
        7. Persists everything in Supabase.
        8. Returns response payload with updated intake and safety status.
        """
        valid_id = validate_uuid(intake_id)
        current_intake = IntakeService.get_intake_by_id(valid_id)
        
        patient_name = current_intake.get("patient_name", "Patient")
        patient_age = current_intake.get("patient_age", 30)
        chief_complaint = current_intake.get("chief_complaint")
        transcript = list(current_intake.get("chat_transcript") or [])
        red_flags = list(current_intake.get("red_flags") or [])
        urgency_level = current_intake.get("urgency_level", "routine")
        status = current_intake.get("status", "in_progress")

        # Ensure session is active
        if status != "in_progress":
            raise ValueError(f"Cannot send messages to an intake session with status '{status}'. This session is already closed.")

        # 1. Emergency Safety Check on patient text
        emergency_detected = False
        new_red_flags = []
        emergency_match = detect_emergency(user_text)
        if emergency_match:
            emergency_detected = True
            urgency_level = "emergency"
            # Avoid duplicate quotes
            if not any(rf.get("patient_quote") == emergency_match["patient_quote"] for rf in red_flags):
                red_flags.append(emergency_match)
                new_red_flags.append(emergency_match)

        # 2. Append User Message
        user_entry = {
            "role": "user",
            "content": user_text.strip(),
            "timestamp": get_utc_now_iso()
        }
        transcript.append(user_entry)

        # 3. Generate next question from Groq LLM
        assistant_reply, is_complete = LLMService.generate_next_intake_question(
            patient_name=patient_name,
            patient_age=patient_age,
            transcript=transcript,
            chief_complaint=chief_complaint
        )

        # 4. Chief Complaint auto-fill only if user provided a meaningful health complaint
        if not chief_complaint or not chief_complaint.strip():
            clean_text = user_text.strip()
            if is_meaningful_complaint(clean_text):
                reply_lower = assistant_reply.lower()
                # If assistant is still re-asking for the main symptom, do not accept as chief complaint
                is_reasking_symptom = any(phrase in reply_lower for phrase in [
                    "main symptom", "health concern", "reason for your visit", "bringing you in", "what symptom"
                ])
                if not is_reasking_symptom:
                    first_sentence = clean_text.split(".")[0].split("\n")[0]
                    chief_complaint = first_sentence[:200].strip()

        # 5. Append Assistant Message
        assistant_entry = {
            "role": "assistant",
            "content": assistant_reply,
            "timestamp": get_utc_now_iso()
        }
        transcript.append(assistant_entry)

        if is_complete:
            status = "completed"

        # 6. Persist state in Supabase
        update_payload = {
            "chat_transcript": transcript,
            "chief_complaint": chief_complaint,
            "red_flags": red_flags,
            "urgency_level": urgency_level,
            "status": status
        }
        client = get_supabase_client()
        res = client.table("intakes").update(update_payload).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to persist chat exchange in intake '{valid_id}'.")
        updated_intake = res.data[0]

        # Automatically generate clinical summary if complete
        if is_complete:
            try:
                updated_intake = IntakeService.generate_and_save_summary(valid_id)
            except Exception as e:
                logger.error(f"Automatic summary generation failed on completion for intake {valid_id}: {e}")

        return {
            "message": assistant_entry,
            "intake": updated_intake,
            "is_complete": is_complete,
            "emergency_detected": emergency_detected,
            "new_red_flags": new_red_flags
        }

    @staticmethod
    def generate_and_save_summary(intake_id: str) -> Dict[str, Any]:
        """
        Generates a validated structured clinical summary and extracts red flags
        with exact patient quotes, then persists them to Supabase.
        """
        valid_id = validate_uuid(intake_id)
        current_intake = IntakeService.get_intake_by_id(valid_id)

        patient_name = current_intake.get("patient_name", "Patient")
        patient_age = current_intake.get("patient_age", 30)
        chief_complaint = current_intake.get("chief_complaint")
        transcript = list(current_intake.get("chat_transcript") or [])
        existing_red_flags = list(current_intake.get("red_flags") or [])
        current_urgency = current_intake.get("urgency_level", "routine")

        # Must have at least one user message
        user_messages = [m for m in transcript if m.get("role") == "user"]
        if not user_messages:
            raise ValueError("Cannot generate summary: Transcript contains no patient messages.")

        # Generate summary and red flags via LLM with strict Pydantic validation & retry
        extraction = LLMService.generate_summary_and_red_flags(
            patient_name=patient_name,
            patient_age=patient_age,
            transcript=transcript,
            chief_complaint=chief_complaint
        )

        # Merge newly extracted red flags with existing emergency flags
        merged_red_flags = list(existing_red_flags)
        for rf in extraction.red_flags:
            rf_dict = rf.model_dump()
            # Check for duplicates based on quote or reason
            if not any(
                existing.get("patient_quote") == rf_dict["patient_quote"] or
                existing.get("reason") == rf_dict["reason"]
                for existing in merged_red_flags
            ):
                merged_red_flags.append(rf_dict)

        # Determine overall urgency prioritizing emergency > urgent > routine
        final_urgency = "routine"
        if any(rf.get("severity") == "emergency" for rf in merged_red_flags) or current_urgency == "emergency" or extraction.urgency == "emergency":
            final_urgency = "emergency"
        elif any(rf.get("severity") == "urgent" for rf in merged_red_flags) or current_urgency == "urgent" or extraction.urgency == "urgent":
            final_urgency = "urgent"

        summary_dict = extraction.summary.model_dump()
        summary_dict["urgency"] = final_urgency
        summary_dict["red_flags"] = merged_red_flags

        final_chief_complaint = chief_complaint or extraction.summary.chief_complaint

        update_payload = {
            "summary": summary_dict,
            "red_flags": merged_red_flags,
            "urgency_level": final_urgency,
            "status": "completed",
            "chief_complaint": final_chief_complaint
        }

        client = get_supabase_client()
        res = client.table("intakes").update(update_payload).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to persist clinical summary for intake '{valid_id}'.")
        return res.data[0]

    @staticmethod
    def complete_intake(intake_id: str) -> Dict[str, Any]:
        """
        Manually or explicitly marks an intake as completed and generates the summary.
        """
        valid_id = validate_uuid(intake_id)
        current = IntakeService.get_intake_by_id(valid_id)
        user_messages = [m for m in (current.get("chat_transcript") or []) if m.get("role") == "user"]
        
        # If user messages exist, generate summary
        if user_messages:
            return IntakeService.generate_and_save_summary(valid_id)

        client = get_supabase_client()
        res = client.table("intakes").update({"status": "completed"}).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to complete intake '{valid_id}'.")
        return res.data[0]

    @staticmethod
    def delete_intake(intake_id: str) -> bool:
        """
        Deletes an intake record by ID.
        """
        valid_id = validate_uuid(intake_id)
        IntakeService.get_intake_by_id(valid_id)
        client = get_supabase_client()
        client.table("intakes").delete().eq("id", valid_id).execute()
        return True

    @staticmethod
    def list_intakes(
        status: Optional[str] = None,
        urgency_level: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Lists intake records with optional filtering.
        """
        client = get_supabase_client()
        query = client.table("intakes").select("*")

        if status:
            query = query.eq("status", status)
        if urgency_level:
            query = query.eq("urgency_level", urgency_level)

        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        res = query.execute()
        return res.data or []
