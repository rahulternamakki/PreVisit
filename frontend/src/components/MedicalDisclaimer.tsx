"use client";

import React, { useState } from "react";
import { Info, ShieldAlert, X, ChevronDown } from "lucide-react";

export function MedicalDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "8px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          color: "var(--pv-warning)",
          fontSize: "0.75rem",
          fontWeight: 500,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          transition: "background var(--duration-normal)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.08)";
        }}
      >
        <Info style={{ width: "13px", height: "13px", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Important: PreVisit is an intake assistant — not medical advice</span>
        <ChevronDown style={{ width: "13px", height: "13px", opacity: 0.6 }} />
      </button>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        background: "var(--pv-warning-bg)",
        border: "1px solid var(--pv-warning-border)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        position: "relative",
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          color: "var(--pv-warning)",
          cursor: "pointer",
          opacity: 0.7,
          transition: "opacity var(--duration-fast), background var(--duration-fast)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
        title="Dismiss"
        aria-label="Dismiss disclaimer"
      >
        <X style={{ width: "13px", height: "13px" }} />
      </button>

      <div style={{ display: "flex", gap: "12px", paddingRight: "24px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "rgba(245,158,11,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--pv-warning)",
          }}
        >
          <ShieldAlert style={{ width: "16px", height: "16px" }} />
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#92400e",
              marginBottom: "4px",
              lineHeight: 1.3,
            }}
          >
            Important Medical Disclaimer
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#b45309",
              lineHeight: 1.55,
              marginBottom: "4px",
            }}
          >
            PreVisit collects preliminary health history for your doctor.{" "}
            <strong>It does not provide diagnoses, treatment recommendations, or emergency services.</strong>
          </p>
          <p style={{ fontSize: "0.75rem", color: "#b45309", lineHeight: 1.55 }}>
            For life-threatening symptoms — call <strong>911</strong> or go to the nearest emergency department immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
