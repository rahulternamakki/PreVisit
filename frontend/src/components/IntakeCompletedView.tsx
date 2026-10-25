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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 print:max-w-none print:m-0 print:p-0">
      {/* Acute Emergency Banner */}
      {isEmergency && (
        <div className="print:hidden">
          <EmergencyBanner redFlags={redFlags} />
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/40 dark:shadow-none p-6 sm:p-8 space-y-6 text-left transition-colors print:shadow-none print:border-none print:p-0">
        
        {/* Header and Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 mb-1">
                Intake Completed & Processed
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                Pre-Visit Intake: {intake.patient_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Patient Age: {intake.patient_age} years | Session ID: {intake.id.slice(0, 8)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden self-end sm:self-center">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Summary</span>
            </button>
          </div>
        </div>

        {/* Triage / Urgency Status Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            isEmergency
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
              : isUrgent
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200"
              : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {(isEmergency || isUrgent) ? (
              <ShieldAlert className="w-4 h-4 shrink-0 text-current" />
            ) : (
              <Activity className="w-4 h-4 shrink-0 text-current" />
            )}
            <span>
              Clinical Triage Urgency:{" "}
              <strong className="capitalize underline underline-offset-2">
                {intake.urgency_level} Priority
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">
            Validated by Clinical Schema (Phase 3)
          </span>
        </div>

        {/* RED FLAGS ALERT PANEL (High Priority) */}
        {redFlags && redFlags.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-red-50/80 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-900/80 space-y-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>Clinical Red Flags Requiring Immediate / Prompt Doctor Attention:</span>
            </div>
            <div className="space-y-2.5">
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-red-200 dark:border-red-900 text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {flag.reason}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        flag.severity === "emergency"
                          ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300"
                      }`}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <div className="pl-3 border-l-2 border-red-400 dark:border-red-600 text-zinc-600 dark:text-zinc-300 italic font-serif">
                    Patient Quote: &ldquo;{flag.patient_quote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STRUCTURED CLINICAL SUMMARY SECTION */}
        {summary ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Structured Clinical Summary
              </h3>
            </div>

            {/* Chief Complaint */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Chief Complaint:
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {summary.chief_complaint || intake.chief_complaint || "Unspecified symptom"}
              </p>
            </div>

            {/* History of Present Illness (HPI) */}
            {summary.history_of_present_illness && (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  History of Present Illness (HPI):
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {summary.history_of_present_illness}
                </p>
              </div>
            )}

            {/* Symptoms Tag Cloud */}
            {summary.symptoms && summary.symptoms.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Reported Symptoms:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.symptoms.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-medium"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Domains 3-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Medical History */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  Medical History
                </span>
                {summary.medical_history && summary.medical_history.length > 0 ? (
                  <ul className="text-xs text-zinc-800 dark:text-zinc-200 space-y-1 list-disc list-inside">
                    {summary.medical_history.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 italic">None reported</p>
                )}
              </div>

              {/* Current Medications */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-zinc-400" />
                  Medications
                </span>
                {summary.medications && summary.medications.length > 0 ? (
                  <ul className="text-xs text-zinc-800 dark:text-zinc-200 space-y-1 list-disc list-inside">
                    {summary.medications.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 italic">None reported</p>
                )}
              </div>

              {/* Allergies */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  Allergies
                </span>
                {summary.allergies && summary.allergies.length > 0 ? (
                  <ul className="text-xs text-zinc-800 dark:text-zinc-200 space-y-1 list-disc list-inside">
                    {summary.allergies.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No allergies reported</p>
                )}
              </div>
            </div>

            {/* Suggested Doctor Questions */}
            {summary.suggested_questions && summary.suggested_questions.length > 0 && (
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Suggested Physician Consultation Questions:
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
                  {summary.suggested_questions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-indigo-500">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Generate Summary CTA if not yet available */
          <div className="p-6 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Structured Clinical Summary Ready to Generate
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Transform the patient transcript into a validated clinical summary, red flags, and doctor consultation questions.
            </p>
            {summaryError && (
              <p className="text-xs text-red-600 font-medium">{summaryError}</p>
            )}
            <button
              onClick={handleManualGenerateSummary}
              disabled={isGeneratingSummary}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-all"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating Clinical Summary...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Structured Clinical Summary</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Collapsible Transcript Review */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-left print:hidden">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Review Complete Chat Transcript ({intake.chat_transcript.length} messages)</span>
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

        {/* Next Steps & Action Footer */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 print:hidden">
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
