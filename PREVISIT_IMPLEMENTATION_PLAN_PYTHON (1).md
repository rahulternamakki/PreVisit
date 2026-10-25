# PreVisit: Implementation Plan

**AI-powered patient intake that gives doctors a one-page summary before the visit.**

PreVisit collects a patient's symptoms and history through a short, adaptive chat, then converts the conversation into a structured one-page summary for the doctor. Urgent findings are highlighted as red flags, each backed by the patient's own words.

| | |
|---|---|
| **Track** | Web development, healthcare domain |
| **Frontend** | Next.js (App Router) with Tailwind CSS |
| **Backend** | Python with FastAPI |
| **Database** | Supabase (PostgreSQL) |
| **LLM** | Groq API |
| **Hosting** | Vercel (frontend), Render (backend) |

---

## Phase 0: Project Setup

**Goal:** A working application skeleton and all required accounts and keys in place.

- Create accounts for Supabase, Groq, Vercel, Render and GitHub.
- Create one repository with two folders: a `frontend` (Next.js with TypeScript and Tailwind CSS) and a `backend` (Python FastAPI service in its own virtual environment).
- Store all API keys and credentials as environment variables, never in the repository.

**Outcome:** Both the frontend and the Python backend run locally and are connected to version control.

---

## Phase 1: Database Design

**Goal:** Persistent storage for patient intakes and generated summaries.

- Design a single `intakes` table holding the patient's name and age, chief complaint, full chat transcript, structured summary, red flags, urgency level and status.
- Enable row-level security with no public access, so patient data can only be reached through the Python backend.
- Connect the FastAPI backend to Supabase using the Python client with a server-side key. The frontend never talks to the database directly.

**Outcome:** Intake records can be created, updated and retrieved securely.

---

## Phase 2: Patient Intake Chat

**Goal:** A conversational interface that gathers the information a doctor needs.

- **Architecture:** The Next.js frontend renders the chat and calls FastAPI endpoints. The backend loads the transcript, calls the Groq API, saves the reply and returns it.
- **Entry:** The patient enters their name and age to begin an intake.
- **Conversation:** The AI asks one short question at a time, adapting to earlier answers. It covers the main complaint, onset and duration, severity, associated symptoms, medical history, current medications and allergies.
- **Persistence:** Every message is saved to the database, so a refreshed page does not lose progress.
- **Completion:** When enough information has been collected, the chat ends and summary generation begins.
- **Boundaries:** The assistant never diagnoses or gives treatment advice, and redirects such questions to the doctor.

**Outcome:** A patient can complete a full intake from a phone or desktop browser.

---

## Phase 3: Summary and Red-Flag Generation

**Goal:** Convert the conversation into a reliable, structured clinical summary.

- Generate the summary in a fixed structured format covering the chief complaint, history of present illness, symptoms, medical history, medications, allergies, urgency and suggested questions for the doctor.
- Use only facts stated in the conversation. Anything not mentioned is left blank rather than guessed.
- Flag findings that need a doctor's immediate attention. Each red flag includes the reason and the patient's exact words.
- Validate every AI output against a strict Pydantic schema in the backend before saving, with one automatic retry on failure.

**Outcome:** Each completed intake produces a validated, trustworthy summary.

---

## Phase 4: Doctor Dashboard

**Goal:** Let doctors review incoming patients quickly.

- **Access:** Protected by a passcode verified by the Python backend, which issues a secure session.
- **Queue:** A list of completed intakes showing patient, complaint, urgency badge and time, sorted with urgent cases first.
- **Summary page:** Red flags appear first in a highlighted panel, followed by the structured summary.
- **Verification:** The full transcript is available in a collapsible section so the doctor can check the source.
- **Print:** A print-friendly layout fits the summary on one page.

**Outcome:** A doctor can open a patient's summary and understand the case in under a minute.

---

## Phase 5: Safety, Privacy and Reliability

**Goal:** Make the product responsible enough for a healthcare setting.

- **Disclaimer:** A clear notice that PreVisit gathers information only and does not provide medical advice, with guidance to contact emergency services when needed.
- **Emergency handling:** Messages describing possible emergencies trigger an immediate emergency banner before any AI response.
- **Accuracy:** Summaries are grounded in the transcript only, with patient quotes attached to red flags.
- **Privacy:** Patient data is accessible only through the authenticated Python backend, with CORS restricted to the frontend's domain. No message content is logged, and demonstration uses fictional data only.
- **Resilience:** Friendly loading, error and empty states, plus rate limiting on the chat endpoint to protect API usage.

**Outcome:** The system fails safely and never presents itself as a clinician.

---

## Phase 6: Deployment

**Goal:** A live, publicly accessible application.

- Deploy the FastAPI backend from GitHub to Render and the Next.js frontend to Vercel, with all environment variables configured on each.
- Point the frontend at the live backend URL and allow that origin in the backend's CORS settings.
- Test the complete flow on the live URL: patient intake, summary generation, doctor login and review.
- Add a few fictional sample intakes (one urgent, one routine) so the dashboard is populated for demonstration.

**Outcome:** A working project link that functions end to end on desktop and mobile.

---

## Phase 7: Documentation and Submission

**Goal:** Package the work for review.

- **Demo video (2-3 minutes):** The problem and solution, a live patient intake, the doctor dashboard with red flags, and a brief explanation of the architecture and safeguards.
- **Prompt documentation:** The purpose and design reasoning for each prompt, the iterations made and why, and the limitations and safeguards.
- **Project link:** The live application URL, plus the GitHub repository.

---

## Suggested Timeline

| Day | Phases |
|---|---|
| Day 1 | Setup, database, FastAPI backend and patient intake chat |
| Day 2 | Summary generation, doctor dashboard |
| Day 3 | Safety and polish, deployment, submission materials |

## Future Enhancements

- Multilingual intake, including Indian regional languages
- Integration with hospital records systems
- Voice-based intake for patients with limited literacy
- Doctor-side editing and approval of summaries
