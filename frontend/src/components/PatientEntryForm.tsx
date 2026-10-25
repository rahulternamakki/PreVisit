"use client";

import React, { useState } from "react";
import { User, Calendar, Stethoscope, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";

interface PatientEntryFormProps {
  onSubmit: (name: string, age: number, chiefComplaint?: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function PatientEntryForm({
  onSubmit,
  isLoading,
  error,
}: PatientEntryFormProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [acknowledged, setAcknowledged] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Please enter your full name.");
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setValidationError("Please enter a valid age between 0 and 130.");
      return;
    }

    if (!acknowledged) {
      setValidationError("Please acknowledge the intake disclaimer to continue.");
      return;
    }

    await onSubmit(trimmedName, parsedAge, chiefComplaint.trim() || undefined);
  };

  const displayError = validationError || error;

  return (
    <div
      className="w-full mx-auto animate-slide-up"
      style={{ maxWidth: "480px" }}
    >
      {/* Hero heading above card */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        {/* Badge */}
        <div
          className="animate-fade-in"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "9999px",
            background: "var(--pv-blue-50)",
            border: "1px solid var(--pv-blue-200)",
            color: "var(--pv-blue-700)",
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          <Stethoscope style={{ width: "12px", height: "12px" }} />
          Pre-Visit Clinical Intake
        </div>

        <h1
          style={{
            fontSize: "clamp(1.625rem, 4vw, 2.125rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            lineHeight: 1.15,
            margin: "0 0 10px",
          }}
        >
          Welcome to PreVisit
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
            maxWidth: "360px",
            margin: "0 auto",
          }}
        >
          Answer a few questions so your doctor arrives prepared for your visit.
        </p>
      </div>

      {/* Card */}
      <div
        className="pv-card-elevated"
        style={{ padding: "28px 28px 24px" }}
      >
        {/* Disclaimer */}
        <MedicalDisclaimer />

        {/* Error */}
        {displayError && (
          <div
            className="animate-fade-in animate-shake"
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--pv-danger-bg)",
              border: "1px solid var(--pv-danger-border)",
              color: "#b91c1c",
              fontSize: "0.8125rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "0.875rem" }}>⚠</span>
            {displayError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Name */}
          <div>
            <label
              htmlFor="patient_name"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Patient Full Name <span style={{ color: "var(--pv-danger)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-quaternary)",
                  pointerEvents: "none",
                  display: "flex",
                }}
              >
                <User style={{ width: "16px", height: "16px" }} />
              </div>
              <input
                id="patient_name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="pv-input"
                style={{ paddingLeft: "40px" }}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="patient_age"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Age <span style={{ color: "var(--pv-danger)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-quaternary)",
                  pointerEvents: "none",
                  display: "flex",
                }}
              >
                <Calendar style={{ width: "16px", height: "16px" }} />
              </div>
              <input
                id="patient_age"
                type="number"
                min={0}
                max={130}
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 34"
                className="pv-input"
                style={{ paddingLeft: "40px" }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label
              htmlFor="chief_complaint"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Reason for Today&apos;s Visit{" "}
              <span style={{ fontWeight: 400, color: "var(--text-quaternary)" }}>(optional)</span>
            </label>
            <input
              id="chief_complaint"
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Sore throat and fever for 2 days"
              className="pv-input"
              disabled={isLoading}
            />
          </div>

          {/* Consent */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              cursor: "pointer",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{
                marginTop: "1px",
                width: "16px",
                height: "16px",
                accentColor: "var(--pv-blue-600)",
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", lineHeight: 1.55 }}>
              I understand this assistant collects information for my doctor and does not provide
              medical diagnosis, advice, or replace emergency care.
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="pv-btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: "0.9375rem", marginTop: "4px" }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />
                <span>Initializing Intake...</span>
              </>
            ) : (
              <>
                <span>Begin Intake Chat</span>
                <ArrowRight style={{ width: "18px", height: "18px" }} />
              </>
            )}
          </button>
        </form>

        {/* Security footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "18px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "0.6875rem",
            color: "var(--text-quaternary)",
          }}
        >
          <ShieldCheck style={{ width: "13px", height: "13px", color: "var(--pv-success)" }} />
          <span>Encrypted with Row-Level Security · Supabase</span>
        </div>
      </div>
    </div>
  );
}
