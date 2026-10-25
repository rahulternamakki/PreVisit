import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
from groq import Groq
from pydantic import ValidationError
from config import settings
from schemas.intake import RedFlag, StructuredSummary, ClinicalExtraction

logger = logging.getLogger("previsit.llm_service")

# Emergency detection patterns for acute red flags
EMERGENCY_PATTERNS = [
    (r"\b(chest\s+(pain|pressure|tightness|discomfort)|((crushing|sharp|severe|tight)\s+(chest\s+)?(pain|pressure|tightness))|(pain|pressure|tightness)\s+(in|on)\s+(the\s+|my\s+)?chest|pain\s+radiating\s+to\s+(my\s+)?(arm|jaw|neck|back)|heart\s+attack|cardiac\s+arrest)\b", "Chest pain / cardiac emergency"),
    (r"\b((can'?t|cannot|unable\s+to|trouble|difficulty|struggling\s+to)\s+breath\w*|shortness\s+of\s+breath|gasping\s+for\s+air|choking|suffocat\w*|severe\s+asthma\s+attack|respiratory\s+arrest)\b", "Severe respiratory distress"),
    (r"\b(face\s+(is\s+)?droop\w*|facial\s+droop\w*|drooping\s+face|slurr\w*\s+speech|speech\s+is\s+slurr\w*|arm\s+weakness|numb(ness)?\s+(on\s+)?(one|left|right)\s+side|stroke|transient\s+ischemic)\b", "Acute stroke / neurological warning sign"),
    (r"\b(throat\s+(is\s+)?clos\w*|tongue\s+(is\s+)?swell\w*|swollen\s+(throat|tongue|lips)|anaphylax\w*|severe\s+allergic\s+reaction)\b", "Severe acute allergic reaction / anaphylaxis"),
    (r"\b(coughing\s+up\s+blood|vomiting\s+blood|bleeding\s+profusely|gushing\s+blood|uncontrolled\s+bleeding|severe\s+hemorrhage)\b", "Severe acute hemorrhage / internal bleeding"),
    (r"\b(kill\s+myself|suicid\w*|end\s+my\s+life|want\s+to\s+die|harm\s+myself|take\s+my\s+own\s+life)\b", "Crisis / acute self-harm concern"),
    (r"\b(worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache|sudden\s+explosive\s+headache)\b", "Severe acute thunderclap headache"),
    (r"\b(passed\s+out|lost\s+consciousness|blacked\s+out|unresponsive|fainted\s+suddenly)\b", "Acute syncope / loss of consciousness"),
    (r"\b(seiz\w*|convuls\w*|fit\s+and\s+shaking|having\s+a\s+fit)\b", "Active seizure / convulsing episode"),
    (r"\b(overdose|poison\w*|swallowed\s+(pills|chemical|toxic)|drank\s+bleach)\b", "Acute poisoning / overdose emergency"),
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
    return None
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

def format_transcript_for_summary(transcript: List[Dict[str, Any]], patient_name: str) -> str:
    """Formats chat transcript for the summary prompt."""
    formatted_lines = []
    for msg in transcript:
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        speaker = patient_name if role == "user" else "PreVisit Assistant"
        formatted_lines.append(f"{speaker}: {content}")
    return "\n".join(formatted_lines)

def is_quote_grounded_in_transcript(quote: str, transcript: List[Dict[str, Any]]) -> bool:
    """
    Verifies if a red-flag patient quote is authentically grounded in what the
    patient actually said during the conversation, preventing AI hallucinations.
    """
    if not quote or not quote.strip():
        return False

    patient_statements = [
        msg.get("content", "").strip()
        for msg in transcript
        if msg.get("role") == "user"
    ]
    if not patient_statements:
        return False

    def normalize_text(text: str) -> str:
        text = re.sub(r"[^\w\s]", " ", text.lower())
        return " ".join(text.split())

    norm_quote = normalize_text(quote)
    if not norm_quote:
        return False

    combined_norm_statements = " ".join(normalize_text(s) for s in patient_statements)

    # 1. Exact or normalized substring match
    if norm_quote in combined_norm_statements:
        return True

    for s in patient_statements:
        if norm_quote in normalize_text(s):
            return True

    # 2. Substantial word overlap for minor variations
    quote_words = norm_quote.split()
    if len(quote_words) <= 2:
        return False

    matched_words = sum(1 for w in quote_words if w in combined_norm_statements)
    if (matched_words / len(quote_words)) >= 0.85:
        return True

    return False

def build_summary_system_prompt(patient_name: str, patient_age: int) -> str:
    """Constructs the strict clinical system prompt for summary and red flag generation."""
    return f"""You are PreVisit's Senior Clinical AI Documentation and Triage Specialist.
Your task is to analyze the complete intake transcript between {patient_name} (age {patient_age}) and the PreVisit assistant, and produce a structured clinical summary and identify any clinical red flags for the attending doctor.

PATIENT PROFILE:
- Name: {patient_name}
- Age: {patient_age}

MANDATORY CLINICAL & SAFETY RULES:
1. STRICT FACTUAL GROUNDING (ZERO HALLUCINATION):
   - You MUST rely EXCLUSIVELY on facts explicitly stated by the patient in the transcript.
   - NEVER assume, guess, extrapolate, or invent missing clinical details.
   - If an intake domain (such as past medical history, current medications, or allergies) was not discussed or not mentioned by the patient, output an EMPTY list ([]).
   - If the patient explicitly stated they have none (e.g. "no medications", "no past history", "no allergies"), record ["None reported"] or an empty list ([]).
   - NEVER invent diagnoses or suggest hypothetical conditions.

2. SUMMARY SECTIONS REQUIRED:
   - chief_complaint: The primary symptom or reason for visit stated by the patient (concise phrase).
   - history_of_present_illness: Factual, chronologically organized clinical narrative covering onset, duration, location, severity, character, aggravating/alleviating factors, and related course.
   - symptoms: List of all distinct symptoms explicitly reported by the patient.
   - medical_history: List of pre-existing conditions, chronic illnesses, or past surgeries explicitly mentioned. Empty list if none mentioned.
   - medications: List of current prescriptions, over-the-counter drugs, vitamins, or supplements explicitly mentioned. Empty list if none mentioned.
   - allergies: List of drug, food, or environmental allergies mentioned by the patient. Empty list if none mentioned.
   - urgency: Overall triage urgency: "routine", "urgent", or "emergency".
   - suggested_questions: 3 to 5 clinically high-yield, specific questions for the doctor to ask during the consultation.

3. RED FLAGS GENERATION (CRITICAL):
   - Review the transcript for findings that need the doctor's immediate or prompt attention.
   - For EACH red flag identified, you MUST provide:
     * "reason": Precise clinical rationale explaining why this symptom or statement requires priority doctor evaluation.
     * "patient_quote": The EXACT, VERBATIM words or phrase spoken by the patient in the transcript. Do NOT paraphrase, summarize, or fabricate quotes.
     * "severity": Either "urgent" (prompt review within 24h) or "emergency" (acute life-threatening danger, such as chest pain, severe shortness of breath, stroke signs, anaphylaxis, severe hemorrhage, self-harm).
   - If there are no red flags, return an empty list ([]).

4. URGENCY LEVEL CONSISTENCY:
   - If ANY red flag has severity "emergency", the overall urgency MUST be "emergency".
   - If ANY red flag has severity "urgent" and none are "emergency", the overall urgency MUST be "urgent".
   - If there are no red flags, the urgency is "routine".

OUTPUT FORMAT:
Return a strictly valid JSON object matching this schema:
{{
  "summary": {{
    "chief_complaint": "string or null",
    "history_of_present_illness": "string",
    "symptoms": ["string"],
    "medical_history": ["string"],
    "medications": ["string"],
    "allergies": ["string"],
    "urgency": "routine" | "urgent" | "emergency",
    "suggested_questions": ["string"]
  }},
  "red_flags": [
    {{
      "reason": "string",
      "patient_quote": "exact words spoken by patient",
      "severity": "urgent" | "emergency"
    }}
  ],
  "urgency": "routine" | "urgent" | "emergency"
}}
"""

def parse_and_validate_summary_json(content: str, transcript: List[Dict[str, Any]], patient_name: str = "Patient") -> ClinicalExtraction:
    """
    Parses and validates the raw JSON response from Groq using Pydantic.
    Enforces quote grounding against the patient transcript.
    """
    clean_content = content.strip()
    if clean_content.startswith("```"):
        clean_content = re.sub(r"^```(?:json)?\s*", "", clean_content)
        clean_content = re.sub(r"\s*```$", "", clean_content)

    try:
        raw_data = json.loads(clean_content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON response: {e}")

    if not isinstance(raw_data, dict):
        raise ValueError("LLM response must be a valid JSON dictionary.")

    # Support nested {"summary": {...}, "red_flags": [...], "urgency": "..."}
    # or flat {"chief_complaint": ..., "red_flags": [...]}
    if "summary" in raw_data and isinstance(raw_data["summary"], dict):
        summary_dict = dict(raw_data["summary"])
        red_flags_list = raw_data.get("red_flags", [])
        urgency_val = raw_data.get("urgency", summary_dict.get("urgency", "routine"))
    else:
        summary_dict = dict(raw_data)
        red_flags_list = summary_dict.pop("red_flags", [])
        urgency_val = summary_dict.get("urgency", "routine")

    if not isinstance(red_flags_list, list):
        raise ValueError("'red_flags' must be a list.")

    # Validate red flags
    validated_red_flags: List[RedFlag] = []
    for item in red_flags_list:
        if not isinstance(item, dict):
            raise ValueError("Each red flag must be a JSON object with reason, patient_quote, and severity.")
        rf = RedFlag(**item)
        if not is_quote_grounded_in_transcript(rf.patient_quote, transcript):
            raise ValueError(
                f"Red flag patient_quote '{rf.patient_quote}' was not found in the patient's messages in the transcript. "
                "All red flag quotes must be exact words spoken by the patient."
            )
        validated_red_flags.append(rf)

    # Determine final urgency
    final_urgency = urgency_val if urgency_val in ["routine", "urgent", "emergency"] else "routine"
    if any(rf.severity == "emergency" for rf in validated_red_flags):
        final_urgency = "emergency"
    elif any(rf.severity == "urgent" for rf in validated_red_flags) and final_urgency != "emergency":
        final_urgency = "urgent"

    summary_dict["urgency"] = final_urgency
    summary_dict["red_flags"] = validated_red_flags

    # Validate StructuredSummary with Pydantic
    summary_obj = StructuredSummary(**summary_dict)

    return ClinicalExtraction(
        summary=summary_obj,
        red_flags=validated_red_flags,
        urgency=final_urgency
    )

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

        models_to_try = [settings.GROQ_MODEL]
        if getattr(settings, "GROQ_FALLBACK_MODEL", None) and settings.GROQ_FALLBACK_MODEL != settings.GROQ_MODEL:
            models_to_try.append(settings.GROQ_FALLBACK_MODEL)

        last_err = None
        for model_name in models_to_try:
            try:
                logger.info(f"Calling Groq model {model_name} with {len(messages)} messages.")
                response = client.chat.completions.create(
                    model=model_name,
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
                last_err = e
                logger.warning(f"Groq chat generation failed with model {model_name}: {type(e).__name__}. Trying fallback...")
                continue

        logger.error(f"Error calling Groq LLM across available models: {type(last_err).__name__}")
        raise RuntimeError(f"LLM generation failed: {last_err}")

    @classmethod
    def generate_summary_and_red_flags(
        cls,
        patient_name: str,
        patient_age: int,
        transcript: List[Dict[str, Any]],
        chief_complaint: Optional[str] = None
    ) -> ClinicalExtraction:
        """
        Transforms the patient intake conversation into a validated, structured clinical summary
        and detects urgent red flags with exact patient quotes.
        
        Strictly validates output using Pydantic and automatically retries once if validation fails.
        Logs are strictly de-identified to comply with healthcare privacy regulations.
        """
        # Ensure there are patient statements
        user_messages = [m for m in transcript if m.get("role") == "user"]
        if not user_messages:
            raise ValueError("Cannot generate summary: Transcript has no messages from the patient.")

        client = cls.get_client()
        system_prompt = build_summary_system_prompt(patient_name, patient_age)
        formatted_transcript = format_transcript_for_summary(transcript, patient_name)
        
        user_prompt = (
            f"Here is the completed intake conversation for {patient_name} (Age {patient_age}):\n\n"
            f"--- TRANSCRIPT START ---\n"
            f"{formatted_transcript}\n"
            f"--- TRANSCRIPT END ---\n\n"
            f"Generate the structured summary and identify red flags now according to the required JSON schema. "
            f"Remember: use ONLY facts explicitly stated by {patient_name}. Leave unmentioned items empty ([]). "
            f"Every red flag patient_quote MUST be an exact quote from {patient_name}'s messages above."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        def call_groq_json(target_messages: List[Dict[str, str]]) -> str:
            """Calls Groq with primary model and automatic fallback on transient failure."""
            models_to_try = [settings.GROQ_MODEL]
            if getattr(settings, "GROQ_FALLBACK_MODEL", None) and settings.GROQ_FALLBACK_MODEL != settings.GROQ_MODEL:
                models_to_try.append(settings.GROQ_FALLBACK_MODEL)
            
            call_err = None
            for model_name in models_to_try:
                try:
                    res = client.chat.completions.create(
                        model=model_name,
                        messages=target_messages,
                        temperature=0.1,
                        max_tokens=2000,
                        response_format={"type": "json_object"}
                    )
                    return res.choices[0].message.content or ""
                except Exception as e:
                    call_err = e
                    logger.warning(f"Groq summary call failed with model {model_name}: {type(e).__name__}. Trying fallback...")
                    continue
            raise RuntimeError(f"Groq summary call failed across all models: {call_err}")

        # Attempt 1 (De-identified logging for privacy)
        logger.info("Generating clinical summary (Attempt 1 of 2)...")
        raw_output_attempt_1 = ""
        last_error_msg = ""
        try:
            raw_output_attempt_1 = call_groq_json(messages)
            return parse_and_validate_summary_json(raw_output_attempt_1, transcript, patient_name)

        except (json.JSONDecodeError, ValidationError, ValueError) as err:
            last_error_msg = str(err)
            logger.warning(
                "Summary generation attempt 1 failed validation. Initiating automatic retry 1 of 1 with corrective feedback..."
            )

        # Attempt 2 (Automatic Retry with Schema & Grounding Feedback)
        corrective_user_message = (
            f"Your previous JSON response failed validation with the following error:\n{last_error_msg}\n\n"
            f"Please regenerate the complete JSON object, strictly fixing this error:\n"
            f"- Ensure valid JSON format.\n"
            f"- Adhere strictly to the required schema: 'summary' object, 'red_flags' array, and 'urgency'.\n"
            f"- In 'red_flags', ensure 'patient_quote' is an EXACT, VERBATIM quote spoken by {patient_name} in the transcript.\n"
            f"- Do NOT assume, extrapolate, or invent missing facts; use empty list ([]) if not mentioned."
        )

        retry_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": raw_output_attempt_1 or "{}"},
            {"role": "user", "content": corrective_user_message}
        ]

        try:
            logger.info("Retrying clinical summary generation (Attempt 2 of 2)...")
            raw_output_attempt_2 = call_groq_json(retry_messages)
            validated = parse_and_validate_summary_json(raw_output_attempt_2, transcript, patient_name)
            logger.info("Clinical summary generation succeeded on retry.")
            return validated

        except Exception as retry_err:
            logger.error(f"Clinical summary generation failed after retry: {type(retry_err).__name__}")
            raise RuntimeError(f"Clinical summary generation failed validation after retry: {retry_err}")
