"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Pill,
  Activity,
  HelpCircle,
  History,
  MessageSquare,
  User,
  Bot,
} from "lucide-react";
import { IntakeSession } from "@/types/intake";
import { updateDoctorIntakeStatus } from "@/lib/api";

interface DoctorSummaryViewProps {
  intake: IntakeSession;
  token: string;
  onBack: () => void;
  onIntakeUpdated?: (updated: IntakeSession) => void;
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.6875rem",
        fontWeight: 800,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--text-quaternary)",
        marginBottom: "10px",
      }}
    >
      {icon}
      {children}
    </div>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontStyle: "italic" }}>None reported</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {items.map((item, idx) => (
        <span
          key={idx}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "0.8125rem",
            fontWeight: 500,
            background: `${color}12`,
            color: color,
            border: `1px solid ${color}25`,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function DoctorSummaryView({
  intake,
  token,
  onBack,
  onIntakeUpdated,
}: DoctorSummaryViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isEmergency = intake.urgency_level === "emergency";
  const isUrgent = intake.urgency_level === "urgent";
  const isReviewed = intake.status === "reviewed";

  const summary = intake.summary;
  const redFlags = intake.red_flags || summary?.red_flags || [];

  const urgencyColor = isEmergency ? "var(--pv-danger)" : isUrgent ? "var(--pv-warning)" : "var(--pv-success)";
  const urgencyBg = isEmergency ? "var(--pv-danger-bg)" : isUrgent ? "var(--pv-warning-bg)" : "var(--pv-success-bg)";
  const urgencyBorder = isEmergency ? "var(--pv-danger-border)" : isUrgent ? "var(--pv-warning-border)" : "var(--pv-success-border)";

  const handleToggleReviewed = async () => {
    setIsUpdatingStatus(true);
    const newStatus = isReviewed ? "completed" : "reviewed";
    try {
      const updated = await updateDoctorIntakeStatus(token, intake.id, newStatus);
      if (onIntakeUpdated) {
        onIntakeUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to update intake status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrint = () => window.print();

  const formattedDate = intake.created_at
    ? new Date(intake.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Recently Submitted";

  return (
    <div
      className="animate-fade-in"
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Action bar */}
      <div
        className="pv-card print:hidden"
        style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}
      >
        <button onClick={onBack} type="button" className="pv-btn-secondary" style={{ gap: "6px" }}>
          <ArrowLeft style={{ width: "15px", height: "15px" }} />
          Back to Queue
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleToggleReviewed}
            disabled={isUpdatingStatus}
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "10px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: isUpdatingStatus ? "wait" : "pointer",
              border: "1px solid",
              transition: "all var(--duration-normal)",
              ...(isReviewed
                ? {
                    background: "var(--pv-success-bg)",
                    borderColor: "var(--pv-success-border)",
                    color: "var(--pv-success)",
                  }
                : {
                    background: "var(--bg-subtle)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-secondary)",
                  }),
            }}
          >
            <CheckCircle style={{ width: "14px", height: "14px" }} />
            {isReviewed ? "Reviewed ✓" : "Mark Reviewed"}
          </button>

          <button
            onClick={handlePrint}
            type="button"
            className="pv-btn-primary"
            style={{
              padding: "7px 14px",
              fontSize: "0.8125rem",
              background: "linear-gradient(135deg, var(--pv-indigo-600), #7c3aed)",
              boxShadow: "var(--shadow-indigo)",
              gap: "6px",
            }}
          >
            <Printer style={{ width: "14px", height: "14px" }} />
            Print Summary
          </button>
        </div>
      </div>

      {/* Main clinical document */}
      <div
        className="pv-card-elevated print:border-none print:shadow-none"
        style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: "24px" }}
      >
        {/* Document header */}
        <div
          style={{
            paddingBottom: "20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "9999px",
                background: "var(--pv-indigo-50)",
                border: "1px solid var(--pv-indigo-100, #e0e7ff)",
                color: "var(--pv-indigo-700)",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              PreVisit Clinical Summary
            </span>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "9999px",
                background: urgencyBg,
                border: `1px solid ${urgencyBorder}`,
                color: urgencyColor,
                fontSize: "0.6875rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                animation: isEmergency ? "pulse 1.5s infinite" : "none",
              }}
            >
              {intake.urgency_level} Priority
            </span>
            {isReviewed && (
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: "9999px",
                  background: "var(--pv-success-bg)",
                  border: "1px solid var(--pv-success-border)",
                  color: "var(--pv-success)",
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                ✓ Reviewed
              </span>
            )}
          </div>

          {/* Patient info */}
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                margin: "0 0 4px",
              }}
            >
              {intake.patient_name}
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)" }}>
              Age: <strong style={{ color: "var(--text-secondary)" }}>{intake.patient_age} yrs</strong>
              {" · "}
              Submitted: <strong style={{ color: "var(--text-secondary)" }}>{formattedDate}</strong>
              {" · "}
              ID: <code style={{ fontFamily: "var(--font-mono), monospace", fontSize: "0.75rem" }}>{intake.id.slice(0, 8)}</code>
            </p>
          </div>
        </div>

        {/* Red flags */}
        {redFlags && redFlags.length > 0 ? (
          <div
            style={{
              background: "var(--pv-danger-bg)",
              border: "2px solid var(--pv-danger-border)",
              borderRadius: "var(--radius-xl)",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert style={{ width: "18px", height: "18px", color: "var(--pv-danger)", flexShrink: 0 }} />
              <div>
                <h2 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#991b1b", margin: 0 }}>
                  Clinical Red Flags · Immediate Physician Attention ({redFlags.length})
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#b91c1c", margin: "2px 0 0" }}>
                  Critical findings with corroborating patient statements.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--pv-danger-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pv-danger)" }}>
                      Finding #{idx + 1}: {flag.reason}
                    </span>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "9999px",
                        background: "var(--pv-danger)",
                        color: "#fff",
                        fontSize: "0.625rem",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {flag.severity || "urgent"}
                    </span>
                  </div>
                  <div
                    style={{
                      borderLeft: "3px solid var(--pv-danger)",
                      paddingLeft: "12px",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontStyle: "normal", color: "var(--pv-danger)" }}>
                      Patient&apos;s words:{" "}
                    </span>
                    &ldquo;{flag.patient_quote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "var(--radius-lg)",
              background: "var(--pv-success-bg)",
              border: "1px solid var(--pv-success-border)",
              color: "var(--pv-success)",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            <CheckCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>
              <strong>No acute red flags</strong> — intake completed without emergency or critical triage triggers.
            </span>
          </div>
        )}

        {/* Chief complaint */}
        <SectionCard>
          <SectionLabel icon={null}>Chief Complaint</SectionLabel>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {summary?.chief_complaint || intake.chief_complaint || "None specified"}
          </p>
        </SectionCard>

        {/* HPI */}
        <SectionCard>
          <SectionLabel icon={null}>History of Present Illness (HPI)</SectionLabel>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {summary?.history_of_present_illness || "No narrative history available."}
          </p>
        </SectionCard>

        {/* 2×2 clinical grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {/* Symptoms */}
          <SectionCard>
            <SectionLabel icon={<Activity style={{ width: "12px", height: "12px", color: "var(--pv-blue-500)" }} />}>
              Associated Symptoms
            </SectionLabel>
            <TagList items={summary?.symptoms || []} color="var(--pv-blue-600)" />
          </SectionCard>

          {/* History */}
          <SectionCard>
            <SectionLabel icon={<History style={{ width: "12px", height: "12px", color: "var(--pv-indigo-500)" }} />}>
              Past Medical History
            </SectionLabel>
            {summary?.medical_history && summary.medical_history.length > 0 ? (
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                {summary.medical_history.map((h, idx) => <li key={idx}>{h}</li>)}
              </ul>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontStyle: "italic" }}>No chronic conditions</p>
            )}
          </SectionCard>

          {/* Medications */}
          <SectionCard>
            <SectionLabel icon={<Pill style={{ width: "12px", height: "12px", color: "var(--pv-success)" }} />}>
              Current Medications
            </SectionLabel>
            {summary?.medications && summary.medications.length > 0 ? (
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                {summary.medications.map((m, idx) => <li key={idx}>{m}</li>)}
              </ul>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontStyle: "italic" }}>No daily medications</p>
            )}
          </SectionCard>

          {/* Allergies */}
          <SectionCard>
            <SectionLabel icon={<AlertTriangle style={{ width: "12px", height: "12px", color: "var(--pv-warning)" }} />}>
              Known Allergies
            </SectionLabel>
            {summary?.allergies && summary.allergies.length > 0 ? (
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "0.875rem", color: "var(--pv-warning)", fontWeight: 600, lineHeight: 1.8 }}>
                {summary.allergies.map((a, idx) => <li key={idx}>{a}</li>)}
              </ul>
            ) : (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontStyle: "italic" }}>NKDA — No Known Drug Allergies</p>
            )}
          </SectionCard>
        </div>

        {/* Suggested questions */}
        {summary?.suggested_questions && summary.suggested_questions.length > 0 && (
          <div
            style={{
              background: "var(--pv-indigo-50)",
              border: "1px solid var(--pv-indigo-100, #e0e7ff)",
              borderRadius: "var(--radius-xl)",
              padding: "18px 20px",
            }}
          >
            <SectionLabel icon={<HelpCircle style={{ width: "12px", height: "12px", color: "var(--pv-indigo-600)" }} />}>
              Suggested Clinical Questions
            </SectionLabel>
            <ol
              style={{
                margin: 0,
                padding: "0 0 0 18px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {summary.suggested_questions.map((q, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Transcript toggle */}
        <div
          className="print:hidden"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
              transition: "background var(--duration-normal)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-subtle)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MessageSquare style={{ width: "15px", height: "15px", color: "var(--text-quaternary)" }} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Full Conversation Transcript
              </span>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: "9999px",
                  background: "var(--bg-muted)",
                  color: "var(--text-quaternary)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                }}
              >
                {intake.chat_transcript?.length || 0} messages
              </span>
            </div>
            {showTranscript ? (
              <ChevronUp style={{ width: "15px", height: "15px", color: "var(--text-quaternary)" }} />
            ) : (
              <ChevronDown style={{ width: "15px", height: "15px", color: "var(--text-quaternary)" }} />
            )}
          </button>

          {showTranscript && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: "10px",
                padding: "16px",
                borderRadius: "var(--radius-xl)",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
                maxHeight: "380px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {intake.chat_transcript && intake.chat_transcript.length > 0 ? (
                intake.chat_transcript.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "4px",
                          fontSize: "0.6875rem",
                          color: "var(--text-quaternary)",
                        }}
                      >
                        {isUser ? <User style={{ width: "11px", height: "11px" }} /> : <Bot style={{ width: "11px", height: "11px" }} />}
                        <span style={{ fontWeight: 600 }}>
                          {isUser ? intake.patient_name : "Intake Assistant"}
                        </span>
                        {msg.timestamp && (
                          <span>
                            · {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          maxWidth: "85%",
                          padding: "10px 14px",
                          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                          ...(isUser
                            ? {
                                background: "linear-gradient(135deg, var(--pv-indigo-600), #7c3aed)",
                                color: "#fff",
                                boxShadow: "var(--shadow-indigo)",
                              }
                            : {
                                background: "var(--bg-surface)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border-default)",
                              }),
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: "0.875rem", color: "var(--text-quaternary)", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
                  No transcript available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Print footer */}
        <div className="hidden print:flex" style={{ paddingTop: "12px", borderTop: "1px solid #ddd", justifyContent: "space-between", fontSize: "0.6875rem", color: "#555" }}>
          <span>PreVisit Clinical Intake · Generated for Physician Review</span>
          <span>Confidential · Medical Record</span>
        </div>
      </div>
    </div>
  );
}
