"use client";

import React from "react";
import { Check, ClipboardList } from "lucide-react";
import { ChatMessage } from "@/types/intake";

interface ProgressTrackerProps {
  transcript: ChatMessage[];
  isCompleted: boolean;
}

export function ProgressTracker({ transcript, isCompleted }: ProgressTrackerProps) {
  const userMessagesCount = transcript.filter((m) => m.role === "user").length;

  const steps = [
    { id: 1, label: "Chief Complaint", short: "Complaint" },
    { id: 2, label: "Symptoms & Onset", short: "Symptoms" },
    { id: 3, label: "Medical History", short: "History" },
    { id: 4, label: "Meds & Allergies", short: "Meds" },
    { id: 5, label: "Complete", short: "Done" },
  ];

  let currentStepIndex = 0;
  if (isCompleted) {
    currentStepIndex = 4;
  } else if (userMessagesCount >= 4) {
    currentStepIndex = 3;
  } else if (userMessagesCount >= 2) {
    currentStepIndex = 2;
  } else if (userMessagesCount >= 1) {
    currentStepIndex = 1;
  } else {
    currentStepIndex = 0;
  }

  const progressPercent = isCompleted ? 100 : (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "10px 0",
      }}
      className="print:hidden"
    >
      <div
        className="max-w-4xl mx-auto px-4 sm:px-6"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        {/* Step labels */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {steps.map((step, idx) => {
            const isDone = isCompleted || idx < currentStepIndex;
            const isCurrent = !isCompleted && idx === currentStepIndex;

            return (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flex: idx < steps.length - 1 ? 1 : "none",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {/* Step circle */}
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: "all var(--duration-normal) var(--ease-out)",
                      ...(isDone
                        ? {
                            background: "var(--pv-success)",
                            color: "#fff",
                            boxShadow: "0 0 0 3px rgba(16,185,129,0.15)",
                          }
                        : isCurrent
                        ? {
                            background: "var(--pv-blue-600)",
                            color: "#fff",
                            boxShadow: "0 0 0 3px rgba(37,99,235,0.15)",
                          }
                        : {
                            background: "var(--bg-muted)",
                            color: "var(--text-quaternary)",
                          }),
                    }}
                  >
                    {isDone ? (
                      <Check style={{ width: "11px", height: "11px" }} />
                    ) : (
                      step.id
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className="hidden md:inline"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: isCurrent ? 600 : 500,
                      color: isDone
                        ? "var(--text-secondary)"
                        : isCurrent
                        ? "var(--pv-blue-600)"
                        : "var(--text-quaternary)",
                      whiteSpace: "nowrap",
                      transition: "color var(--duration-normal)",
                    }}
                  >
                    {step.label}
                  </span>
                  <span
                    className="inline md:hidden"
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: isCurrent ? 600 : 500,
                      color: isDone
                        ? "var(--text-secondary)"
                        : isCurrent
                        ? "var(--pv-blue-600)"
                        : "var(--text-quaternary)",
                    }}
                  >
                    {step.short}
                  </span>
                </div>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: "2px",
                      borderRadius: "2px",
                      margin: "0 6px",
                      background:
                        idx < currentStepIndex || isCompleted
                          ? "var(--pv-success)"
                          : "var(--bg-muted)",
                      transition: "background var(--duration-slow) var(--ease-out)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            background: "var(--bg-muted)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: isCompleted
                ? "var(--pv-success)"
                : "linear-gradient(90deg, var(--pv-blue-500), var(--pv-indigo-500))",
              borderRadius: "2px",
              transition: "width 0.5s var(--ease-out)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
