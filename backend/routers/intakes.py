import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Depends, status
from rate_limiter import limiter
from schemas.intake import (
    IntakeCreate,
    IntakeUpdate,
    AppendMessageRequest,
    IntakeResponse,
    ChatRequest,
    ChatResponse,
)
from services.intake_service import IntakeService, IntakeNotFoundError
from services.auth_service import get_current_doctor

logger = logging.getLogger("previsit.routers.intakes")
router = APIRouter(prefix="/api/intakes", tags=["Intakes"])

def _handle_value_error(e: ValueError):
    """Distinguishes between configuration errors (503) and client input errors (400)."""
    err_str = str(e)
    if "credentials" in err_str.lower() or "supabase" in err_str.lower():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=err_str)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_str)

@router.post(
    "",
    response_model=IntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new patient intake session"
)
@limiter.limit("20/minute")
def create_intake(request: Request, payload: IntakeCreate):
    """
    Initializes a patient intake record when the patient enters name and age.
    Securely stored in Supabase with RLS enabled.
    """
    try:
        record = IntakeService.create_intake(payload)
        return record
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error creating intake: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.get(
    "/{intake_id}",
    response_model=IntakeResponse,
    summary="Retrieve an intake session by ID"
)
def get_intake(intake_id: str):
    """
    Retrieves full intake data including chat transcript and clinical summary.
    """
    try:
        return IntakeService.get_intake_by_id(intake_id)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error retrieving intake {intake_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.patch(
    "/{intake_id}",
    response_model=IntakeResponse,
    summary="Update an intake session"
)
def update_intake(intake_id: str, payload: IntakeUpdate):
    """
    Updates intake fields such as status, urgency level, chief complaint, or summary.
    """
    try:
        return IntakeService.update_intake(intake_id, payload)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error updating intake {intake_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.post(
    "/{intake_id}/messages",
    response_model=IntakeResponse,
    summary="Append a chat message to the transcript"
)
def append_message(intake_id: str, payload: AppendMessageRequest):
    """
    Appends a user or assistant message to the chat transcript in Supabase.
    Ensures message persistence after each turn so patients never lose progress.
    """
    try:
        return IntakeService.append_message(intake_id, payload)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error appending message to intake {intake_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.post(
    "/{intake_id}/chat",
    response_model=ChatResponse,
    summary="Send a message and receive the next adaptive intake question"
)
@limiter.limit("60/minute")
def send_chat_message(request: Request, intake_id: str, payload: ChatRequest):
    """
    Submits a patient's response, checks for acute emergency indicators,
    saves the patient's message to Supabase, generates the next short,
    adaptive clinical intake question via Groq LLM, saves the assistant
    reply to Supabase, and checks if all intake domains are complete.
    """
    try:
        result = IntakeService.process_chat_turn(intake_id, payload.message)
        return result
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error processing chat turn for intake {intake_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat response from intake assistant. Please try again."
        )

@router.post(
    "/{intake_id}/complete",
    response_model=IntakeResponse,
    summary="Mark an intake session as completed"
)
def mark_intake_complete(intake_id: str):
    """
    Explicitly marks an intake session as completed.
    """
    try:
        return IntakeService.complete_intake(intake_id)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error completing intake {intake_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.post(
    "/{intake_id}/summary",
    response_model=IntakeResponse,
    summary="Generate or re-generate clinical summary and red flags"
)
@router.post(
    "/{intake_id}/generate-summary",
    response_model=IntakeResponse,
    summary="Generate or re-generate clinical summary (alias)"
)
@limiter.limit("15/minute")
def generate_summary(request: Request, intake_id: str):
    """
    Analyzes patient conversation transcript, generates a structured clinical summary,
    extracts red flags with exact patient quotes, strictly validates against Pydantic schema
    with 1 automatic retry on failure, and persists the results in Supabase.
    """
    try:
        return IntakeService.generate_and_save_summary(intake_id)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error generating summary for intake: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate clinical summary.")

@router.get(
    "/{intake_id}/summary",
    summary="Retrieve the structured clinical summary for an intake session"
)
def get_intake_summary(intake_id: str):
    """
    Retrieves the clinical summary, red flags, and triage urgency for an intake.
    """
    try:
        intake = IntakeService.get_intake_by_id(intake_id)
        if not intake.get("summary"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Clinical summary has not been generated for this intake yet."
            )
        return {
            "intake_id": intake["id"],
            "patient_name": intake["patient_name"],
            "patient_age": intake["patient_age"],
            "chief_complaint": intake.get("chief_complaint"),
            "summary": intake["summary"],
            "red_flags": intake.get("red_flags", []),
            "urgency_level": intake.get("urgency_level", "routine"),
            "status": intake.get("status")
        }
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching summary: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error.")

@router.delete(
    "/{intake_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an intake session (Doctor authorized only)"
)
def delete_intake(
    intake_id: str,
    doctor: dict = Depends(get_current_doctor)
):
    """
    Permanently deletes an intake session. Requires doctor authentication.
    """
    try:
        IntakeService.delete_intake(intake_id)
        return None
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error deleting intake: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")

@router.get(
    "",
    response_model=List[IntakeResponse],
    summary="List intakes for Doctor Dashboard (Doctor authorized only)"
)
def list_intakes(
    status: Optional[str] = Query(None, description="Filter by status (e.g. completed, in_progress)"),
    urgency_level: Optional[str] = Query(None, description="Filter by urgency (routine, urgent, emergency)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    doctor: dict = Depends(get_current_doctor)
):
    """
    Lists intake records with optional filtering. Requires doctor authentication to protect patient PHI.
    """
    try:
        return IntakeService.list_intakes(status=status, urgency_level=urgency_level, limit=limit, offset=offset)
    except ValueError as e:
        _handle_value_error(e)
    except Exception as e:
        logger.error(f"Error listing intakes: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal database error.")
