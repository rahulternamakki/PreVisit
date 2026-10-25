"use client";

import React from "react";
import Link from "next/link";
import { Activity, ShieldCheck, PlusCircle, Stethoscope, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { IntakeSession } from "@/types/intake";

interface HeaderProps {
  intake?: IntakeSession | null;
  onNewIntake?: () => void;
  isBackendConnected?: boolean;
  mode?: "patient" | "doctor";
  onLogout?: () => void;
}

export function Header({
  intake,
  onNewIntake,
  isBackendConnected = true,
  mode = "patient",
  onLogout,
}: HeaderProps) {
  const isDoctor = mode === "doctor";

  return (
    <header
      className="sticky top-0 z-40 print:hidden"
      style={{
        background: "var(--bg-overlay)",
        backdropFilter: "blur(16px) saturate(200%)",
        WebkitBackdropFilter: "blur(16px) saturate(200%)",
        borderBottom: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 0 var(--border-subtle)",
      }}
    >
      <div
        className="max-w-6xl mx-auto px-4 sm:px-6"
        style={{ height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
      >
        {/* Brand */}
        <Link
          href={isDoctor ? "/doctor" : "/"}
          className="flex items-center gap-3 group"
          style={{ textDecoration: "none" }}
        >
          {/* Logo mark */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: isDoctor
                ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                : "linear-gradient(135deg, #2563eb, #4f46e5)",
              boxShadow: isDoctor ? "var(--shadow-indigo)" : "var(--shadow-blue)",
              transition: "transform var(--duration-normal) var(--ease-spring)",
              color: "#fff",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06) rotate(-2deg)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0)")}
          >
            {isDoctor ? (
              <Stethoscope style={{ width: "18px", height: "18px" }} />
            ) : (
              <Activity style={{ width: "18px", height: "18px" }} />
            )}
          </div>

          {/* Brand text */}
          <div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "1.0625rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                PreVisit
              </span>
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: "9999px",
                  border: `1px solid ${isDoctor ? "var(--pv-indigo-200, #c7d2fe)" : "var(--pv-blue-200)"}`,
                  background: isDoctor ? "var(--pv-indigo-50)" : "var(--pv-blue-50)",
                  color: isDoctor ? "var(--pv-indigo-700)" : "var(--pv-blue-700)",
                  lineHeight: 1.4,
                }}
              >
                {isDoctor ? "Doctor" : "Patient"}
              </span>
            </div>
            <p
              className="hidden sm:block"
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-quaternary)",
                marginTop: "2px",
                lineHeight: 1,
              }}
            >
              {isDoctor
                ? "Clinical Queue & Pre-Visit Summaries"
                : "Intelligent Pre-Appointment Intake"}
            </p>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Patient active session badge */}
          {!isDoctor && intake && (
            <div className="hidden sm:flex items-center gap-3">
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {intake.patient_name}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)", marginTop: "1px" }}>
                  {intake.patient_age} yrs · {intake.status.replace("_", " ")}
                </div>
              </div>
              {onNewIntake && (
                <button
                  onClick={onNewIntake}
                  className="pv-btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.8125rem", gap: "6px" }}
                  title="Start a fresh intake session"
                >
                  <PlusCircle style={{ width: "14px", height: "14px" }} />
                  <span>New</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile new intake */}
          {!isDoctor && intake && onNewIntake && (
            <button
              onClick={onNewIntake}
              className="sm:hidden pv-btn-secondary"
              style={{ padding: "7px", borderRadius: "10px" }}
              title="New Intake"
            >
              <PlusCircle style={{ width: "16px", height: "16px" }} />
            </button>
          )}

          {/* Connection pill */}
          <div
            className="hidden md:flex items-center gap-1.5"
            style={{
              padding: "5px 10px",
              borderRadius: "9999px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.6875rem",
              color: "var(--text-quaternary)",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isBackendConnected ? "var(--pv-success)" : "var(--pv-warning)",
                boxShadow: isBackendConnected
                  ? "0 0 0 2px rgba(16,185,129,0.2)"
                  : "0 0 0 2px rgba(245,158,11,0.2)",
                flexShrink: 0,
              }}
            />
            {isBackendConnected ? (
              <>
                <ShieldCheck style={{ width: "12px", height: "12px", color: "var(--pv-success)" }} />
                <span className="hidden lg:inline">Secure</span>
              </>
            ) : (
              <>
                <WifiOff style={{ width: "12px", height: "12px", color: "var(--pv-warning)" }} />
                <span className="hidden lg:inline">Reconnecting</span>
              </>
            )}
          </div>

          {/* Nav actions */}
          {isDoctor ? (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="pv-btn-secondary"
                style={{ padding: "7px 12px", fontSize: "0.8125rem", gap: "6px", textDecoration: "none" }}
              >
                <ArrowLeft style={{ width: "14px", height: "14px" }} />
                <span className="hidden sm:inline">Patient View</span>
              </Link>
              {onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "10px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--pv-danger)",
                    background: "var(--pv-danger-bg)",
                    border: "1px solid var(--pv-danger-border)",
                    cursor: "pointer",
                    transition: "all var(--duration-normal) var(--ease-out)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--pv-danger-bg)";
                  }}
                >
                  Log Out
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/doctor"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "10px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--pv-indigo-700)",
                background: "var(--pv-indigo-50)",
                border: "1px solid var(--pv-indigo-100, #e0e7ff)",
                textDecoration: "none",
                transition: "all var(--duration-normal) var(--ease-out)",
                boxShadow: "0 1px 2px rgba(79,70,229,0.08)",
              }}
              title="Access physician queue and review summaries"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--pv-indigo-100)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--pv-indigo-50)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              <Stethoscope style={{ width: "14px", height: "14px" }} />
              <span>Doctor Portal</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
