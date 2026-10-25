import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from schemas.doctor import (
    DoctorLoginRequest,
    DoctorLoginResponse,
    DoctorVerifyResponse,
    DoctorQueueResponse,
    DoctorStatusUpdateRequest,
)
from schemas.intake import IntakeResponse
from services.auth_service import (
    verify_doctor_passcode,
    create_doctor_token,
    get_current_doctor,
)
from services.doctor_service import DoctorService
from services.intake_service import IntakeNotFoundError

logger = logging.getLogger("previsit.routers.doctor")
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/doctor", tags=["Doctor Dashboard"])

@router.post(
    "/login",
    response_model=DoctorLoginResponse,
    summary="Authenticate doctor with passcode"
)
@limiter.limit("60/minute")
def doctor_login(request: Request, payload: DoctorLoginRequest):
    """
    Verifies the doctor security passcode and returns a secure JWT session token.
    Protects clinical triage queue and patient PHI from unauthenticated access.
    """
    is_valid = verify_doctor_passcode(payload.passcode)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect doctor passcode. Please verify and try again.",
        )
    
    token = create_doctor_token()
    return DoctorLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
    )

@router.get(
    "/verify",
    response_model=DoctorVerifyResponse,
    summary="Verify current doctor session token"
)
def doctor_verify_session(doctor: dict = Depends(get_current_doctor)):
    """
    Validates that the doctor's current session token is active and unexpired.
    """
    return DoctorVerifyResponse(authenticated=True, role=doctor.get("role", "doctor"))

@router.get(
    "/queue",
    response_model=DoctorQueueResponse,
    summary="Get patient intake queue sorted with urgent cases first"
)
def get_patient_queue(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (completed, reviewed, all, archived)"),
    urgency_filter: Optional[str] = Query(None, alias="urgency_level", description="Filter by urgency (emergency, urgent, routine, all)"),
    search: Optional[str] = Query(None, description="Search by patient name or chief complaint"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    doctor: dict = Depends(get_current_doctor),
):
    """
    Returns the doctor intake triage queue.
    Crucial requirement: Always sorted with urgent and emergency cases first,
    followed by routine cases, ordered newest first within each urgency tier.
    """
    try:
        return DoctorService.get_queue(
            status_filter=status_filter,
            urgency_filter=urgency_filter,
            search_query=search,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(f"Error fetching doctor queue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient queue from database.",
        )

@router.get(
    "/intakes/{intake_id}",
    response_model=IntakeResponse,
    summary="Retrieve full intake details for doctor clinical review"
)
def get_doctor_intake_detail(
    intake_id: str,
    doctor: dict = Depends(get_current_doctor),
):
    """
    Retrieves full patient intake data, structured summary, red flags,
    and complete conversational transcript for clinical review.
    """
    try:
        return DoctorService.get_intake_detail(intake_id)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving intake {intake_id} for doctor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load intake clinical details.",
        )

@router.patch(
    "/intakes/{intake_id}/status",
    response_model=IntakeResponse,
    summary="Update patient intake review status"
)
def update_intake_review_status(
    intake_id: str,
    payload: DoctorStatusUpdateRequest,
    doctor: dict = Depends(get_current_doctor),
):
    """
    Updates the intake status (e.g. marked as 'reviewed' after doctor clinical review).
    """
    try:
        return DoctorService.update_status(intake_id, payload.status)
    except IntakeNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating status for intake {intake_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update intake status.",
        )

@router.post(
    "/seed-samples",
    summary="Seed realistic clinical demonstration cases (urgent + routine)"
)
def seed_clinical_samples(
    doctor: dict = Depends(get_current_doctor),
):
    """
    Seeds realistic demonstration intakes (1 urgent cardiac case with red flags,
    1 routine seasonal allergy case) to immediately showcase the queue and triage.
    """
    try:
        created = DoctorService.seed_demonstration_samples()
        return {
            "message": f"Successfully seeded {len(created)} clinical demonstration intakes.",
            "seeded_count": len(created),
            "samples": [
                {
                    "id": c.get("id"),
                    "name": c.get("patient_name"),
                    "urgency": c.get("urgency_level"),
                    "complaint": c.get("chief_complaint"),
                }
                for c in created
            ]
        }
    except Exception as e:
        logger.error(f"Error seeding demo intakes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed demonstration samples: {e}",
        )
