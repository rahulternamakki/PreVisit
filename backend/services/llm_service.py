import logging
import re
from typing import List, Dict, Any, Tuple, Optional
from groq import Groq
from config import settings

logger = logging.getLogger("previsit.llm_service")

# Emergency detection patterns for acute red flags
EMERGENCY_PATTERNS = [
    (r"\b(chest\s+pain|pressure\s+(in|on)\s+(the\s+)?chest|tightness\s+(in|on)\s+(the\s+)?chest|pain\s+radiating\s+to\s+(my\s+)?(arm|jaw|neck|back)|heart\s+attack)\b", "Chest pain / cardiac symptom"),
    (r"\b((can'?t|cannot|unable\s+to|trouble|difficulty|struggling\s+to)\s+breath\w*|shortness\s+of\s+breath|gasping\s+for\s+air|choking)\b", "Severe respiratory distress"),
    (r"\b(face\s+(is\s+)?droop\w*|facial\s+droop\w*|drooping\s+face|slurr\w*\s+speech|speech\s+is\s+slurr\w*|arm\s+weakness|numb(ness)?\s+(on\s+)?(one|left|right)\s+side|stroke)\b", "Potential acute stroke warning sign"),
    (r"\b(throat\s+(is\s+)?clos\w*|tongue\s+(is\s+)?swell\w*|swollen\s+(throat|tongue|lips)|anaphylax\w*)\b", "Severe acute allergic reaction / anaphylaxis"),
    (r"\b(coughing\s+up\s+blood|vomiting\s+blood|bleeding\s+profusely|gushing\s+blood|uncontrolled\s+bleeding)\b", "Severe acute bleeding"),
    (r"\b(kill\s+myself|suicid\w*|end\s+my\s+life|want\s+to\s+die|harm\s+myself)\b", "Crisis / self-harm concern"),
    (r"\b(worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache)\b", "Severe acute thunderclap headache"),
    (r"\b(passed\s+out|lost\s+consciousness|blacked\s+out)\b", "Sudden syncope / loss of consciousness"),
]

def detect_emergency(text: str) -> Optional[Dict[str, str]]:
    """
    Scans patient message for life-threatening emergency indicators.
    Returns red flag dictionary if found, otherwise None.
    """
    lowered = text.lower()
    for pattern, reason in EMERGENCY_PATTERNS:
        if re.search(pattern, lowered):
            return {
                "reason": reason,
                "patient_quote": text.strip(),
                "severity": "emergency"
            }
UNINFORMATIVE_RESPONSES = {
    "yes", "no", "ok", "okay", "hi", "hello", "hey", "sure", "fine", "good",
    "bad", "test", "idk", "nothing", "none", "thanks", "thank you", "nope", "yep"
}

def is_meaningful_complaint(text: str) -> bool:
    """
    Validates if user text looks like a meaningful health complaint rather than
    uninformative chatter, single-word filler, or consonant-only gibberish.
    """
    cleaned = text.strip().lower()
    if len(cleaned) < 3:
        return False
    if cleaned in UNINFORMATIVE_RESPONSES:
        return False
    vowels = set("aeiou")
    if len(cleaned) > 4 and not any(c in vowels for c in cleaned):
        return False
    return True

def build_intake_system_prompt(patient_name: str, patient_age: int, chief_complaint: Optional[str] = None) -> str:
    cc_text = f"- Initial Reason stated: {chief_complaint}" if chief_complaint else "- Initial Reason: Not yet specified."
    return f"""You are PreVisit's AI clinical intake assistant. Your role is to conduct a warm, empathetic, and professional pre-visit interview to collect necessary health information for the patient's doctor before their appointment.

PATIENT PROFILE:
- Name: {patient_name}
- Age: {patient_age}
{cc_text}

MANDATORY RULES:
1. ASK ONLY ONE SHORT QUESTION AT A TIME: Every single response you give must contain exactly ONE brief, focused question. Never combine two questions or follow-ups into one message.
2. NO DIAGNOSES OR TREATMENT ADVICE: Never diagnose conditions, predict outcomes, or recommend medications/treatments. If asked, state politely: "As an intake assistant, I cannot provide diagnoses or treatment recommendations. Your doctor will discuss this with you during your appointment."
3. ADAPTIVE CONVERSATION: Adapt dynamically based on what the patient has already told you. If they already mentioned duration, medications, or allergies, acknowledge it and do not re-ask.
4. INTAKE CHECKLIST: Ensure the following areas are gathered sequentially or adaptively:
   - Chief Complaint (primary symptom/reason for visit)
   - History of Present Illness (onset/duration, location, severity on 1-10 scale, character of symptom)
   - Associated Symptoms (fever, chills, nausea, dizziness, etc.)
   - Past Medical History (chronic conditions like hypertension, diabetes, asthma, surgeries)
   - Current Medications (prescriptions, over-the-counter, vitamins/supplements)
   - Allergies (medications, foods, latex, or confirm none)
5. RELEVANCE & OFF-TOPIC VALIDATION (CRITICAL):
   Before advancing to any new question or topic, evaluate whether the patient's latest message answers the question asked or provides relevant clinical information.
   - VALID RESPONSES: Relevant descriptions of symptoms, bodily sensations, timelines, medical conditions, medications, or explicit declarations like 'none', 'no', 'not sure', 'nothing', 'N/A', or 'I don't have any'.
   - IRRELEVANT / OFF-TOPIC RESPONSES: If the patient's response is:
     * Off-topic (e.g., food, weather, sports, movies, hobbies, jokes, programming, random chatter)
     * Nonsensical or gibberish (e.g., 'asdfghjk', 'zzz', '12345')
     * An uninformative single-word reply to an open question (e.g., answering 'yes' or 'ok' to 'What brings you in today?' or 'Where is the pain located?')
   YOU MUST NOT ADVANCE TO THE NEXT INTAKE TOPIC.
   Instead, acknowledge politely and re-ask the SAME question:
   Politely explain that to help their doctor prepare for their appointment, you need to understand that detail, and re-ask the current question in a clear, friendly manner.
   Never proceed to a new topic until the current question is answered or explicitly answered with 'none/no/not sure'.
6. EMPATHY & CLARITY: Maintain a supportive, reassuring tone. Use 6th-grade reading level. Keep responses brief (1 to 2 sentences maximum, ending with your single question).
7. EMERGENCY PROTOCOL: If the patient mentions life-threatening symptoms (e.g. chest pain, severe shortness of breath, stroke signs, thoughts of self-harm), urgently instruct them to call 911 or go to the nearest emergency room immediately.
8. COMPLETION TRIGGER: When all intake domains (symptoms, onset/duration, severity, associated symptoms, medical history, medications, allergies) have been answered, wrap up the interview warmly by telling {patient_name} that all necessary preliminary details have been recorded for their doctor.
   Always write a friendly closing message first, and then append the token [INTAKE_COMPLETE] at the very end. Never output [INTAKE_COMPLETE] by itself without the closing message text.
"""

class LLMService:
    @staticmethod
    def get_client() -> Groq:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured in backend/.env")
        return Groq(api_key=api_key)

    @classmethod
    def generate_opening_message(cls, patient_name: str, patient_age: int, chief_complaint: Optional[str] = None) -> str:
        """
        Generates the initial warm intake question to kick off the chat.
        """
        if chief_complaint and chief_complaint.strip():
            return (
                f"Hello {patient_name}, welcome to PreVisit! I'm your intake assistant, here to gather a few preliminary details "
                f"for your doctor before your visit. You noted that you're coming in regarding \"{chief_complaint.strip()}\". "
                f"Could you tell me a bit more about when this first started?"
            )
        return (
            f"Hello {patient_name}, welcome to PreVisit! I'm your pre-visit intake assistant. "
            f"I'm here to gather a few details to help your doctor prepare for your appointment today. "
            f"To get started, what is the main symptom or health concern bringing you in?"
        )

    @classmethod
    def generate_next_intake_question(
        cls,
        patient_name: str,
        patient_age: int,
        transcript: List[Dict[str, Any]],
        chief_complaint: Optional[str] = None
    ) -> Tuple[str, bool]:
        """
        Calls Groq LLM with system prompt and chat transcript.
        Returns (assistant_message, is_completed).
        """
        client = cls.get_client()
        system_prompt = build_intake_system_prompt(patient_name, patient_age, chief_complaint)

        # Build messages list for Groq
        messages = [{"role": "system", "content": system_prompt}]
        for msg in transcript:
            role = msg.get("role")
            if role in ["user", "assistant"]:
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })

        try:
            logger.info(f"Calling Groq model {settings.GROQ_MODEL} with {len(messages)} messages.")
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=1000,
            )

            raw_reply = response.choices[0].message.content or ""
            raw_reply = raw_reply.strip()

            # Check for completion token
            is_completed = False
            if "[INTAKE_COMPLETE]" in raw_reply:
                is_completed = True
                cleaned_reply = raw_reply.replace("[INTAKE_COMPLETE]", "").strip()
            else:
                cleaned_reply = raw_reply

            # Ensure closing or question content is never blank
            if is_completed and not cleaned_reply:
                cleaned_reply = (
                    f"Thank you, {patient_name}. I have collected all the necessary details for your visit. "
                    "Your doctor will review this information before your consultation."
                )
            elif not cleaned_reply:
                cleaned_reply = "Could you tell me a little more about your current symptoms or medications?"

            return cleaned_reply, is_completed

        except Exception as e:
            logger.error(f"Error calling Groq LLM: {e}")
            raise RuntimeError(f"LLM generation failed: {e}")
