from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, description="Message text")
    timestamp: Optional[str] = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp"
    )

class RedFlag(BaseModel):
    reason: str = Field(..., description="Clinical reason this symptom or statement was flagged")
    patient_quote: str = Field(..., description="Exact quote from the patient transcript")
    severity: Literal["urgent", "emergency"] = "urgent"

class StructuredSummary(BaseModel):
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    symptoms: Optional[List[str]] = Field(default_factory=list)
    medical_history: Optional[List[str]] = Field(default_factory=list)
    medications: Optional[List[str]] = Field(default_factory=list)
    allergies: Optional[List[str]] = Field(default_factory=list)
    urgency: Optional[Literal["routine", "urgent", "emergency"]] = "routine"
    suggested_questions: Optional[List[str]] = Field(default_factory=list)

class IntakeCreate(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=255, description="Full name of patient")
    patient_age: int = Field(..., ge=0, le=130, description="Patient age in years")
    chief_complaint: Optional[str] = Field(None, max_length=1000, description="Initial chief complaint if provided")

    @field_validator("patient_name")
    def name_must_not_be_blank(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Patient name cannot be empty or whitespace only")
        return v_stripped

class AppendMessageRequest(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, description="Content of the message to append")
    timestamp: Optional[str] = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp"
    )

class IntakeUpdate(BaseModel):
    patient_name: Optional[str] = Field(None, min_length=1, max_length=255)
    patient_age: Optional[int] = Field(None, ge=0, le=130)
    chief_complaint: Optional[str] = None
    chat_transcript: Optional[List[ChatMessage]] = None
    summary: Optional[Dict[str, Any]] = None
    red_flags: Optional[List[RedFlag]] = None
    urgency_level: Optional[Literal["routine", "urgent", "emergency"]] = None
    status: Optional[Literal["in_progress", "completed", "reviewed", "archived"]] = None

class IntakeResponse(BaseModel):
    id: str
    patient_name: str
    patient_age: int
    chief_complaint: Optional[str] = None
    chat_transcript: List[Dict[str, Any]] = Field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None
    red_flags: List[Dict[str, Any]] = Field(default_factory=list)
    urgency_level: str
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Patient reply message")

    @field_validator("message")
    def message_not_empty(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Message cannot be empty or blank")
        return v_stripped

class ChatResponse(BaseModel):
    message: ChatMessage
    intake: IntakeResponse
    is_complete: bool = False
    emergency_detected: bool = False
    new_red_flags: List[RedFlag] = Field(default_factory=list)
