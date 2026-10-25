import { IntakeSession, ChatResponse } from "@/types/intake";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === "string" 
          ? errJson.detail 
          : JSON.stringify(errJson.detail);
      }
    } catch {
      errorDetail = `Server returned error status ${res.status}`;
    }
    throw new ApiError(errorDetail, res.status);
  }
  return res.json() as Promise<T>;
}

export async function createIntake(
  patientName: string,
  patientAge: number,
  chiefComplaint?: string
): Promise<IntakeSession> {
  const payload = {
    patient_name: patientName.trim(),
    patient_age: patientAge,
    chief_complaint: chiefComplaint?.trim() || null,
  };

  const res = await fetch(`${API_BASE_URL}/api/intakes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse<IntakeSession>(res);
}

export async function getIntake(intakeId: string): Promise<IntakeSession> {
  const res = await fetch(`${API_BASE_URL}/api/intakes/${encodeURIComponent(intakeId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return handleResponse<IntakeSession>(res);
}

export async function sendChatMessage(
  intakeId: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/intakes/${encodeURIComponent(intakeId)}/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    }
  );

  return handleResponse<ChatResponse>(res);
}

export async function completeIntake(intakeId: string): Promise<IntakeSession> {
  const res = await fetch(
    `${API_BASE_URL}/api/intakes/${encodeURIComponent(intakeId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  return handleResponse<IntakeSession>(res);
}

export async function generateSummary(intakeId: string): Promise<IntakeSession> {
  const res = await fetch(
    `${API_BASE_URL}/api/intakes/${encodeURIComponent(intakeId)}/summary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  return handleResponse<IntakeSession>(res);
}

export async function getSummary(intakeId: string): Promise<{
  intake_id: string;
  patient_name: string;
  patient_age: number;
  chief_complaint?: string;
  summary: any;
  red_flags: any[];
  urgency_level: string;
  status: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/intakes/${encodeURIComponent(intakeId)}/summary`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  return handleResponse(res);
}

export async function checkBackendHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, message: `Status ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, message: data.status || "healthy" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network unreachable";
    return { ok: false, message: msg };
  }
}
