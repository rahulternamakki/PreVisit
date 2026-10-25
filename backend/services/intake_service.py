import logging
import uuid
from typing import Optional, List, Dict, Any
from database import get_supabase_client
from schemas.intake import IntakeCreate, IntakeUpdate, AppendMessageRequest

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

class IntakeService:
    @staticmethod
    def create_intake(data: IntakeCreate) -> Dict[str, Any]:
        """
        Creates a new patient intake record in Supabase.
        Initial status is 'in_progress', urgency_level defaults to 'routine'.
        """
        client = get_supabase_client()
        payload = {
            "patient_name": data.patient_name,
            "patient_age": data.patient_age,
            "chief_complaint": data.chief_complaint,
            "chat_transcript": [],
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
        
        # Only include non-None fields
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
        Ensures persistence after every exchange so refreshing the browser never loses state.
        """
        valid_id = validate_uuid(intake_id)
        current_intake = IntakeService.get_intake_by_id(valid_id)
        transcript = current_intake.get("chat_transcript") or []
        
        new_entry = {
            "role": message_data.role,
            "content": message_data.content,
            "timestamp": message_data.timestamp
        }
        transcript.append(new_entry)

        client = get_supabase_client()
        res = client.table("intakes").update({"chat_transcript": transcript}).eq("id", valid_id).execute()
        if not res.data:
            raise RuntimeError(f"Failed to append message to intake '{valid_id}'.")
        return res.data[0]

    @staticmethod
    def delete_intake(intake_id: str) -> bool:
        """
        Deletes an intake record by ID.
        Used for data cleanup, administrative management, and automated testing.
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
        Used by the Doctor Dashboard queue.
        """
        client = get_supabase_client()
        query = client.table("intakes").select("*")

        if status:
            query = query.eq("status", status)
        if urgency_level:
            query = query.eq("urgency_level", urgency_level)

        # Sort by creation timestamp descending
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        res = query.execute()
        return res.data or []
