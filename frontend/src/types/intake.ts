export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

export interface RedFlag {
  reason: string;
  patient_quote: string;
  severity: "urgent" | "emergency";
}

export type UrgencyLevel = "routine" | "urgent" | "emergency";
export type IntakeStatus = "in_progress" | "completed" | "reviewed" | "archived";

export interface IntakeSession {
  id: string;
  patient_name: string;
  patient_age: number;
  chief_complaint?: string | null;
  chat_transcript: ChatMessage[];
  summary?: Record<string, unknown> | null;
  red_flags: RedFlag[];
  urgency_level: UrgencyLevel;
  status: IntakeStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  message: ChatMessage;
  intake: IntakeSession;
  is_complete: boolean;
  emergency_detected: boolean;
  new_red_flags: RedFlag[];
}
