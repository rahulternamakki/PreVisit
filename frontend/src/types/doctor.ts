import { UrgencyLevel, IntakeStatus } from "./intake";

export interface DoctorLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface DoctorQueueItem {
  id: string;
  patient_name: string;
  patient_age: number;
  chief_complaint?: string | null;
  urgency_level: UrgencyLevel;
  status: IntakeStatus;
  red_flags_count: number;
  has_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorQueueStats {
  total: number;
  emergency: number;
  urgent: number;
  routine: number;
  completed: number;
  reviewed: number;
}

export interface DoctorQueueResponse {
  stats: DoctorQueueStats;
  items: DoctorQueueItem[];
}
