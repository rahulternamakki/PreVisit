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
} from "lucide-react";
import { IntakeSession } from "@/types/intake";
import { updateDoctorIntakeStatus } from "@/lib/api";

interface DoctorSummaryViewProps {
  intake: IntakeSession;
  token: string;
  onBack: () => void;
  onIntakeUpdated?: (updated: IntakeSession) => void;
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

  const handlePrint = () => {
    window.print();
  };

  // Format timestamp
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
    <div className="w-full max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none text-left">
      {/* Non-Print Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 rounded-2xl shadow-sm print:hidden">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Queue</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Status Toggle */}
          <button
            onClick={handleToggleReviewed}
            disabled={isUpdatingStatus}
            type="button"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isReviewed
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${isReviewed ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
            <span>{isReviewed ? "Marked as Reviewed" : "Mark as Reviewed"}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print 1-Page Summary</span>
          </button>
        </div>
      </div>

      {/* Main Clinical Document Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-none p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:space-y-4">
        
        {/* Document Header (Print & Screen) */}
        <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                PreVisit Clinical Summary
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isEmergency
                    ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 animate-pulse"
                    : isUrgent
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                    : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                }`}
              >
                {intake.urgency_level} Priority
              </span>
              {isReviewed && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  Reviewed
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
              {intake.patient_name}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Age: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{intake.patient_age} yrs</span> • Submitted: {formattedDate} • Intake ID: {intake.id.slice(0, 8)}
            </p>
          </div>

          <div className="text-right hidden sm:block print:block">
            <span className="text-[11px] font-mono text-zinc-400">PreVisit EMR v1.0</span>
            <div className="text-xs text-zinc-500">Confidential Medical Record</div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 1. RED FLAGS PANEL (FIRST - AS REQUIRED)                           */}
        {/* ================================================================== */}
        {redFlags && redFlags.length > 0 ? (
          <div className="p-5 rounded-2xl bg-red-50/90 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800/80 space-y-3.5 print:bg-red-50 print:border-red-400 print:break-avoid">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 animate-bounce" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-red-900 dark:text-red-200">
                  Clinical Red Flags Requiring Immediate Physician Attention ({redFlags.length})
                </h2>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Critical findings detected during intake with corroborating patient statements.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="bg-white/90 dark:bg-zinc-900/90 border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">
                      Finding #{idx + 1}: {flag.reason}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                      {flag.severity || "urgent"}
                    </span>
                  </div>

                  <div className="bg-red-50/60 dark:bg-zinc-800/60 border-l-3 border-red-500 pl-3 py-1.5 text-xs italic text-zinc-700 dark:text-zinc-200">
                    <span className="font-semibold not-italic text-red-600 dark:text-red-400 mr-1.5">
                      Patient&apos;s Own Words:
                    </span>
                    &ldquo;{flag.patient_quote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">No Acute Red Flags: </span>
              <span>Patient intake conversation completed without acute emergency or critical triage triggers.</span>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 2. STRUCTURED CLINICAL SUMMARY                                      */}
        {/* ================================================================== */}
        <div className="space-y-5 print:space-y-3.5 print:break-avoid">
          {/* Chief Complaint */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
              Chief Complaint
            </span>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {summary?.chief_complaint || intake.chief_complaint || "None specified"}
            </p>
          </div>

          {/* History of Present Illness (HPI) */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
              History of Present Illness (HPI)
            </span>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {summary?.history_of_present_illness || "No narrative history available."}
            </p>
          </div>

          {/* Clinical Grid: Symptoms, History, Medications, Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
            {/* Symptoms */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Associated Symptoms</span>
              </div>
              {summary?.symptoms && summary.symptoms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {summary.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">None reported</p>
              )}
            </div>

            {/* Past Medical History */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>Past Medical History</span>
              </div>
              {summary?.medical_history && summary.medical_history.length > 0 ? (
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
                  {summary.medical_history.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">No chronic conditions reported</p>
              )}
            </div>

            {/* Current Medications */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <Pill className="w-3.5 h-3.5 text-emerald-500" />
                <span>Current Medications</span>
              </div>
              {summary?.medications && summary.medications.length > 0 ? (
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
                  {summary.medications.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">No daily medications reported</p>
              )}
            </div>

            {/* Known Allergies */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Known Allergies</span>
              </div>
              {summary?.allergies && summary.allergies.length > 0 ? (
                <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
                  {summary.allergies.map((a, idx) => (
                    <li key={idx} className="font-semibold text-amber-700 dark:text-amber-400">
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">No known drug allergies (NKDA)</p>
              )}
            </div>
          </div>

          {/* Suggested Physician Questions */}
          {summary?.suggested_questions && summary.suggested_questions.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 print:break-avoid">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                  Suggested Clinical Questions for Examination
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200 pl-1">
                {summary.suggested_questions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      Q{idx + 1}:
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* 3. VERIFICATION: COLLAPSIBLE FULL TRANSCRIPT                       */}
        {/* ================================================================== */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 print:hidden">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Full Conversation Transcript (Clinical Verification Source)
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {intake.chat_transcript?.length || 0} messages
              </span>
            </div>
            {showTranscript ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {showTranscript && (
            <div className="mt-3 p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 max-h-96 overflow-y-auto space-y-3">
              {intake.chat_transcript && intake.chat_transcript.length > 0 ? (
                intake.chat_transcript.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-zinc-400">
                        <span className="font-semibold uppercase">
                          {isUser ? intake.patient_name : "Intake Assistant"}
                        </span>
                        {msg.timestamp && (
                          <span>
                            • {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-br-none shadow-xs"
                            : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-bl-none shadow-xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-400 italic text-center py-2">
                  No transcript messages found for this intake session.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Print Footer */}
        <div className="hidden print:block pt-3 border-t border-zinc-300 text-[10px] text-zinc-500 flex justify-between">
          <span>PreVisit Clinical Intake • Generated automatically for Physician Review</span>
          <span>Confidential • Medical Record</span>
        </div>
      </div>
    </div>
  );
}
