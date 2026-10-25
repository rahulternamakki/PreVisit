from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class DoctorLoginRequest(BaseModel):
    passcode: str = Field(..., min_length=1, description="Doctor security passcode")

class DoctorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 hours in seconds

class DoctorVerifyResponse(BaseModel):
    authenticated: bool = True
    role: str = "doctor"

class DoctorQueueItem(BaseModel):
    id: str
    patient_name: str
    patient_age: int
    chief_complaint: Optional[str] = None
    urgency_level: Literal["routine", "urgent", "emergency"] = "routine"
    status: Literal["in_progress", "completed", "reviewed", "archived"] = "completed"
    red_flags_count: int = 0
    has_summary: bool = False
    created_at: str
    updated_at: str

class DoctorQueueStats(BaseModel):
    total: int = 0
    emergency: int = 0
    urgent: int = 0
    routine: int = 0
    completed: int = 0
    reviewed: int = 0

class DoctorQueueResponse(BaseModel):
    stats: DoctorQueueStats
    items: List[DoctorQueueItem]

class DoctorStatusUpdateRequest(BaseModel):
    status: Literal["in_progress", "completed", "reviewed", "archived"]
