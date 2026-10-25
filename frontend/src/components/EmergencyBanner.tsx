"use client";

import React from "react";
import { AlertOctagon, PhoneCall, HeartPulse, X } from "lucide-react";
import { RedFlag } from "@/types/intake";

interface EmergencyBannerProps {
  redFlags?: RedFlag[];
  customMessage?: string;
}

export function EmergencyBanner({ redFlags, customMessage }: EmergencyBannerProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
        borderRadius: "var(--radius-xl)",
        padding: "16px 20px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 20px rgba(220,38,38,0.35)",
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backdropFilter: "blur(4px)",
            }}
          >
            <AlertOctagon style={{ width: "22px", height: "22px", color: "#fff" }} />
          </div>

          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: "0.9375rem",
                fontWeight: 800,
                color: "#fff",
                marginBottom: "3px",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              ⚠ URGENT: Potential Medical Emergency
            </h3>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "rgba(255,255,255,0.87)",
                lineHeight: 1.5,
              }}
            >
              {customMessage ||
                "Your reported symptoms may require immediate attention. Do not wait for your scheduled appointment."}
            </p>
          </div>
        </div>

        {/* Red flags detail */}
        {redFlags && redFlags.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.87)",
              lineHeight: 1.6,
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ fontWeight: 700, color: "#fff" }}>Flagged: </span>
            {redFlags.map((rf, idx) => (
              <span key={idx} style={{ fontStyle: "italic" }}>
                &ldquo;{rf.patient_quote}&rdquo; ({rf.reason})
                {idx < redFlags.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        )}

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <a
            href="tel:911"
            style={{
              flex: 1,
              minWidth: "120px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: "#fff",
              color: "#dc2626",
              fontWeight: 800,
              fontSize: "0.875rem",
              textDecoration: "none",
              transition: "transform var(--duration-fast), box-shadow var(--duration-fast)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
            }}
          >
            <PhoneCall style={{ width: "16px", height: "16px" }} />
            Call 911
          </a>

          <a
            href="tel:988"
            style={{
              flex: 1,
              minWidth: "120px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.8125rem",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              transition: "background var(--duration-fast)",
            }}
            title="Suicide & Crisis Lifeline"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.12)";
            }}
          >
            <HeartPulse style={{ width: "16px", height: "16px" }} />
            Crisis Lifeline (988)
          </a>
        </div>
      </div>
    </div>
  );
}
