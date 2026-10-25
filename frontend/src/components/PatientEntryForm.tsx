"use client";

import React, { useState } from "react";
import { User, Calendar, Stethoscope, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
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

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Welcome Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/40 dark:shadow-none p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Pre-Visit Clinical Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to PreVisit
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Please enter your information to begin a brief conversation with our intake assistant.
            Your answers help your doctor understand your symptoms before you walk into the exam room.
          </p>
        </div>

        {/* Medical Notice */}
        <MedicalDisclaimer />

        {/* Display Errors */}
        {(validationError || error) && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs font-medium">
            {validationError || error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="patient_name"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Patient Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="patient_name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="patient_age"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Age (Years) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Calendar className="w-4 h-4" />
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
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="chief_complaint"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Main Reason for Today&apos;s Visit{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              id="chief_complaint"
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Sore throat and fever for 2 days"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>
                I understand this assistant collects information for my doctor and does not
                provide medical diagnosis, medical advice, or replace emergency clinical care.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Intake...</span>
              </>
            ) : (
              <>
                <span>Begin Intake Chat</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted with Row-Level Security in Supabase</span>
        </div>
      </div>
    </div>
  );
}
