"use client";

import React, { useState } from "react";
import { CheckCircle2, FileText, ChevronDown, ChevronUp, PlusCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import { IntakeSession } from "@/types/intake";

interface IntakeCompletedViewProps {
  intake: IntakeSession;
  onNewIntake: () => void;
}

export function IntakeCompletedView({
  intake,
  onNewIntake,
}: IntakeCompletedViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const isEmergency = intake.urgency_level === "emergency";
  const isUrgent = intake.urgency_level === "urgent";

  const assistantMessages = intake.chat_transcript.filter((m) => m.role === "assistant");
  const lastAssistantMessage = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/40 dark:shadow-none p-6 sm:p-8 space-y-6 text-center sm:text-left transition-colors">
        {/* Success Icon & Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Intake Completed & Saved
            </span>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Thank You, {intake.patient_name}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your intake responses have been securely recorded in our clinical database.
              A structured one-page summary is now being prepared for your healthcare provider.
            </p>
          </div>
        </div>

        {/* Assistant Closing Message */}
        {lastAssistantMessage && (
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 text-xs space-y-1.5 text-left">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
              PreVisit Assistant Summary Note:
            </span>
            <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {lastAssistantMessage.content}
            </p>
          </div>
        )}

        {/* Triage / Urgency Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            isEmergency
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300"
              : isUrgent
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300"
              : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {(isEmergency || isUrgent) && <AlertTriangle className="w-4 h-4 shrink-0 text-current" />}
            <span>
              Triage Assessment Status:{" "}
              <strong className="capitalize">{intake.urgency_level} Priority</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            ID: {intake.id.slice(0, 8)}...
          </span>
        </div>

        {/* Checklist of collected domains */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 sm:p-5 border border-zinc-200/60 dark:border-zinc-700/60 text-left space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Clinical Information Captured:
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Chief Complaint: {intake.chief_complaint || "Recorded"}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Onset, Duration & Severity</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Associated Symptoms</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Past Medical & Surgical History</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Current Medications & Supplements</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Drug & Environmental Allergies</span>
            </li>
          </ul>
        </div>

        {/* Collapsible Transcript Review */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-left">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Review Recorded Chat Transcript ({intake.chat_transcript.length} messages)</span>
            </span>
            {showTranscript ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showTranscript && (
            <div className="p-4 bg-white dark:bg-zinc-900 space-y-3 max-h-80 overflow-y-auto text-xs border-t border-zinc-200 dark:border-zinc-800">
              {intake.chat_transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 ml-4"
                      : "bg-zinc-100/80 dark:bg-zinc-800/80 mr-4"
                  }`}
                >
                  <span className="font-bold text-[10px] uppercase text-zinc-500 block mb-1">
                    {msg.role === "user" ? intake.patient_name : "PreVisit Assistant"}
                  </span>
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Steps & Action */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Persisted to Supabase under intake #{intake.id.slice(0, 8)}</span>
          </div>

          <button
            onClick={onNewIntake}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Intake</span>
          </button>
        </div>
      </div>
    </div>
  );
}
