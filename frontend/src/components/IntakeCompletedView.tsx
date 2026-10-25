"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Pill,
  Activity,
  HelpCircle,
  Sparkles,
  Stethoscope,
  Loader2,
  ShieldAlert,
  User,
  Bot,
} from "lucide-react";
import { IntakeSession } from "@/types/intake";
import { generateSummary } from "@/lib/api";
import { EmergencyBanner } from "@/components/EmergencyBanner";

interface IntakeCompletedViewProps {
  intake: IntakeSession;
  onNewIntake: () => void;
  onUpdateIntake?: (updated: IntakeSession) => void;
}

export function IntakeCompletedView({
  intake,
  onNewIntake,
  onUpdateIntake,
}: IntakeCompletedViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isEmergency = intake.urgency_level === "emergency";
  const isUrgent = intake.urgency_level === "urgent";

  const summary = intake.summary;
  const redFlags = intake.red_flags || summary?.red_flags || [];

  const urgencyColor = isEmergency ? "var(--pv-danger)" : isUrgent ? "var(--pv-warning)" : "var(--pv-blue-600)";
  const urgencyBg    = isEmergency ? "var(--pv-danger-bg)" : isUrgent ? "var(--pv-warning-bg)" : "var(--pv-info-bg)";
  const urgencyBorder = isEmergency ? "var(--pv-danger-border)" : isUrgent ? "var(--pv-warning-border)" : "var(--pv-info-border)";

  const handleManualGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const updated = await generateSummary(intake.id);
      if (onUpdateIntake) {
        onUpdateIntake(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate clinical summary.";
      setSummaryError(msg);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div
      className="w-full mx-auto animate-slide-up print:max-w-none print:m-0 print:p-0"
      style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {/* Emergency banner */}
      {isEmergency && (
        <div className="print:hidden">
          <EmergencyBanner redFlags={redFlags} />
        </div>
      )}

      {/* Main card */}
      <div
        className="pv-card-elevated print:shadow-none print:border-none print:p-0"
        style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingBottom: "20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "var(--pv-success-bg)",
                border: "1px solid var(--pv-success-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--pv-success)",
                boxShadow: "0 0 0 4px rgba(16,185,129,0.08)",
              }}
            >
              <CheckCircle2 style={{ width: "26px", height: "26px" }} />
            </div>
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 9px",
                  borderRadius: "9999px",
                  background: "var(--pv-success-bg)",
                  border: "1px solid var(--pv-success-border)",
                  color: "var(--pv-success)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}
              >
                ✓ Intake Complete
              </span>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {intake.patient_name}
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", marginTop: "2px" }}>
                {intake.patient_age} yrs · Session {intake.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="print:hidden" style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={handlePrint}
              type="button"
              className="pv-btn-secondary"
              style={{ gap: "6px", fontSize: "0.8125rem" }}
            >
              <Printer style={{ width: "14px", height: "14px" }} />
              Print
            </button>
          </div>
        </div>

        {/* Urgency banner */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-lg)",
            background: urgencyBg,
            border: `1px solid ${urgencyBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isEmergency || isUrgent ? (
              <ShieldAlert style={{ width: "15px", height: "15px", color: urgencyColor, flexShrink: 0 }} />
            ) : (
              <Activity style={{ width: "15px", height: "15px", color: urgencyColor, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: urgencyColor }}>
              Triage:{" "}
              <strong style={{ textTransform: "capitalize" }}>{intake.urgency_level} Priority</strong>
            </span>
          </div>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)", fontFamily: "var(--font-mono), monospace" }}>
            Clinically Validated
          </span>
        </div>

        {/* Red flags */}
        {redFlags && redFlags.length > 0 && (
          <div
            style={{
              background: "var(--pv-danger-bg)",
              border: "2px solid var(--pv-danger-border)",
              borderRadius: "var(--radius-xl)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--pv-danger)" }}>
              <AlertTriangle style={{ width: "15px", height: "15px" }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Clinical Red Flags — Prompt Physician Attention
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--pv-danger-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "11px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "7px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--pv-danger)", flexShrink: 0 }} />
                      {flag.reason}
                    </span>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "9999px",
                        fontSize: "0.625rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        background: flag.severity === "emergency" ? "var(--pv-danger)" : "var(--pv-warning-bg)",
                        color: flag.severity === "emergency" ? "#fff" : "var(--pv-warning)",
                        border: flag.severity === "emergency" ? "none" : "1px solid var(--pv-warning-border)",
                        flexShrink: 0,
                      }}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <div
                    style={{
                      borderLeft: "2px solid var(--pv-danger-border)",
                      paddingLeft: "12px",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{flag.patient_quote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clinical summary */}
        {summary ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Section heading */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                paddingBottom: "10px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <Stethoscope style={{ width: "15px", height: "15px", color: "var(--pv-blue-600)" }} />
              <h3
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--text-quaternary)",
                  margin: 0,
                }}
              >
                Structured Clinical Summary
              </h3>
            </div>

            {/* Chief complaint */}
            <div
              style={{
                padding: "14px 16px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-quaternary)", display: "block", marginBottom: "5px" }}>
                Chief Complaint
              </span>
              <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {summary.chief_complaint || intake.chief_complaint || "Unspecified"}
              </p>
            </div>

            {/* HPI */}
            {summary.history_of_present_illness && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-quaternary)", display: "block", marginBottom: "6px" }}>
                  History of Present Illness (HPI)
                </span>
                <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {summary.history_of_present_illness}
                </p>
              </div>
            )}

            {/* Symptoms */}
            {summary.symptoms && summary.symptoms.length > 0 && (
              <div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-quaternary)", display: "block", marginBottom: "8px" }}>
                  Reported Symptoms
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {summary.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "rgba(37,99,235,0.07)",
                        border: "1px solid rgba(37,99,235,0.15)",
                        color: "var(--pv-blue-700)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 3-col grid */}
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}
              className="sm:grid-cols-3"
            >
              {[
                {
                  label: "Medical History",
                  icon: <Activity style={{ width: "11px", height: "11px" }} />,
                  items: summary.medical_history,
                  empty: "None reported",
                },
                {
                  label: "Medications",
                  icon: <Pill style={{ width: "11px", height: "11px" }} />,
                  items: summary.medications,
                  empty: "None reported",
                },
                {
                  label: "Allergies",
                  icon: <ShieldCheck style={{ width: "11px", height: "11px" }} />,
                  items: summary.allergies,
                  empty: "No known allergies",
                },
              ].map((col) => (
                <div
                  key={col.label}
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px", color: "var(--text-quaternary)" }}>
                    {col.icon}
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {col.label}
                    </span>
                  </div>
                  {col.items && col.items.length > 0 ? (
                    <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                      {col.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontStyle: "italic", margin: 0 }}>
                      {col.empty}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Suggested questions */}
            {summary.suggested_questions && summary.suggested_questions.length > 0 && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--pv-indigo-50)",
                  border: "1px solid var(--pv-indigo-100, #e0e7ff)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", color: "var(--pv-indigo-600)" }}>
                  <HelpCircle style={{ width: "13px", height: "13px" }} />
                  <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Suggested Physician Questions
                  </span>
                </div>
                <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {summary.suggested_questions.map((q, idx) => (
                    <li key={idx} style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          /* Generate summary CTA */
          <div
            style={{
              padding: "32px 24px",
              borderRadius: "var(--radius-xl)",
              background: "var(--pv-info-bg)",
              border: "1px solid var(--pv-info-border)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "13px",
                background: "rgba(37,99,235,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--pv-blue-600)",
                marginBottom: "4px",
              }}
            >
              <Sparkles style={{ width: "22px", height: "22px" }} />
            </div>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              Generate Structured Clinical Summary
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", maxWidth: "360px", lineHeight: 1.6, margin: 0 }}>
              Transform the patient transcript into a validated clinical summary with red flags and consultation questions.
            </p>
            {summaryError && (
              <p style={{ fontSize: "0.8125rem", color: "var(--pv-danger)", fontWeight: 500 }}>{summaryError}</p>
            )}
            <button
              onClick={handleManualGenerateSummary}
              disabled={isGeneratingSummary}
              className="pv-btn-primary"
              style={{ marginTop: "4px" }}
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles style={{ width: "16px", height: "16px" }} />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        )}

        {/* Transcript toggle */}
        <div
          className="print:hidden"
          style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}
        >
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              width: "100%",
              padding: "13px 16px",
              background: "var(--bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              transition: "background var(--duration-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-subtle)";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.875rem", fontWeight: 600 }}>
              <FileText style={{ width: "14px", height: "14px", color: "var(--pv-blue-500)" }} />
              Chat Transcript ({intake.chat_transcript.length} messages)
            </span>
            {showTranscript ? (
              <ChevronUp style={{ width: "14px", height: "14px", color: "var(--text-quaternary)" }} />
            ) : (
              <ChevronDown style={{ width: "14px", height: "14px", color: "var(--text-quaternary)" }} />
            )}
          </button>

          {showTranscript && (
            <div
              className="animate-fade-in"
              style={{
                padding: "16px",
                background: "var(--bg-surface)",
                borderTop: "1px solid var(--border-subtle)",
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {intake.chat_transcript.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)", fontWeight: 600, textTransform: "uppercase", marginBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {msg.role === "user" ? <User style={{ width: "10px", height: "10px" }} /> : <Bot style={{ width: "10px", height: "10px" }} />}
                    {msg.role === "user" ? intake.patient_name : "PreVisit Assistant"}
                  </span>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 13px",
                      borderRadius: msg.role === "user" ? "13px 13px 3px 13px" : "13px 13px 13px 3px",
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      ...(msg.role === "user"
                        ? {
                            background: "rgba(37,99,235,0.07)",
                            border: "1px solid rgba(37,99,235,0.12)",
                          }
                        : {
                            background: "var(--bg-subtle)",
                            border: "1px solid var(--border-subtle)",
                          }),
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="print:hidden"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
          }}
          // sm:flex-row sm:items-center sm:justify-between
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--text-quaternary)" }}>
            <ShieldCheck style={{ width: "14px", height: "14px", color: "var(--pv-success)" }} />
            Persisted to Supabase · ID {intake.id.slice(0, 8)}
          </div>

          <button
            onClick={onNewIntake}
            className="pv-btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            <PlusCircle style={{ width: "16px", height: "16px" }} />
            Start New Intake
          </button>
        </div>
      </div>
    </div>
  );
}
