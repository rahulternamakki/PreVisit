"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, Loader2, ArrowRight, Sparkles, Stethoscope } from "lucide-react";
import { doctorLogin } from "@/lib/api";

interface DoctorLoginViewProps {
  onLoginSuccess: (token: string) => void;
}

export function DoctorLoginView({ onLoginSuccess }: DoctorLoginViewProps) {
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the clinical passcode.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await doctorLogin(passcode.trim());
      if (res && res.access_token) {
        onLoginSuccess(res.access_token);
      } else {
        setError("Invalid response received from server.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify passcode.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemoPasscode = () => {
    setPasscode("123456");
    setError(null);
  };

  return (
    <div
      className="w-full mx-auto animate-slide-up"
      style={{ maxWidth: "420px", paddingTop: "24px", paddingBottom: "40px" }}
    >
      {/* Card */}
      <div
        className="pv-card-elevated"
        style={{ padding: "32px 28px 28px", textAlign: "center" }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 20px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--pv-indigo-600), #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-indigo), 0 0 0 6px rgba(79,70,229,0.08)",
            color: "#fff",
          }}
        >
          <Lock style={{ width: "26px", height: "26px" }} />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            letterSpacing: "-0.035em",
            color: "var(--text-primary)",
            marginBottom: "6px",
            lineHeight: 1.2,
          }}
        >
          Doctor Portal Access
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", marginBottom: "24px", lineHeight: 1.5 }}>
          Secure triage queue &amp; structured intake summaries
        </p>

        {/* Error */}
        {error && (
          <div
            className="animate-fade-in animate-shake"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--pv-danger-bg)",
              border: "1px solid var(--pv-danger-border)",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            <ShieldAlert
              style={{ width: "15px", height: "15px", color: "var(--pv-danger)", flexShrink: 0, marginTop: "1px" }}
            />
            <div>
              <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#b91c1c" }}>Access Denied: </span>
              <span style={{ fontSize: "0.8125rem", color: "#b91c1c" }}>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
          <div>
            <label
              htmlFor="passcode"
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                marginBottom: "6px",
              }}
            >
              Physician Passcode
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
                <KeyRound style={{ width: "16px", height: "16px" }} />
              </div>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                disabled={isLoading}
                autoFocus
                className="pv-input"
                style={{
                  paddingLeft: "42px",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.1em",
                  fontSize: "1rem",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="pv-btn-primary"
            style={{
              width: "100%",
              padding: "13px",
              fontSize: "0.9375rem",
              background: "linear-gradient(135deg, var(--pv-indigo-600), #7c3aed)",
              boxShadow: "var(--shadow-indigo)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Enter Doctor Dashboard</span>
                <ArrowRight style={{ width: "18px", height: "18px" }} />
              </>
            )}
          </button>
        </form>

        {/* Demo hint */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border-subtle)",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={handleUseDemoPasscode}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "9px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
              color: "var(--text-tertiary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all var(--duration-normal)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-muted)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-subtle)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
            }}
          >
            <Sparkles style={{ width: "13px", height: "13px", color: "var(--pv-indigo-500)" }} />
            Use Default Demo Passcode (123456)
          </button>
        </div>
      </div>

      {/* Footnote */}
      <div
        style={{
          marginTop: "16px",
          textAlign: "center",
          fontSize: "0.6875rem",
          color: "var(--text-quaternary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
        }}
      >
        <Stethoscope style={{ width: "12px", height: "12px" }} />
        Clinical access protected — authorized physicians only
      </div>
    </div>
  );
}
