"use client";

import React from "react";
import { Check, Dot } from "lucide-react";
import { ChatMessage } from "@/types/intake";

interface ProgressTrackerProps {
  transcript: ChatMessage[];
  isCompleted: boolean;
}

export function ProgressTracker({ transcript, isCompleted }: ProgressTrackerProps) {
  const userMessagesCount = transcript.filter((m) => m.role === "user").length;

  const steps = [
    { id: 1, label: "Chief Complaint" },
    { id: 2, label: "Symptoms & Onset" },
    { id: 3, label: "Medical History" },
    { id: 4, label: "Meds & Allergies" },
    { id: 5, label: "Ready" },
  ];

  // Calculate current active step index (0-indexed)
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

  return (
    <div className="w-full bg-zinc-50/80 dark:bg-zinc-900/60 border-y border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
        {steps.map((step, idx) => {
          const isDone = isCompleted || idx < currentStepIndex;
          const isCurrent = !isCompleted && idx === currentStepIndex;

          return (
            <div key={step.id} className="flex items-center gap-1.5 flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px] transition-colors ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-2 ring-blue-400/30"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : step.id}
                </span>
                <span
                  className={`hidden md:inline font-medium ${
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : isDone
                      ? "text-zinc-700 dark:text-zinc-300"
                      : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full transition-colors hidden sm:block ${
                    idx < currentStepIndex || isCompleted
                      ? "bg-emerald-400 dark:bg-emerald-600"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
