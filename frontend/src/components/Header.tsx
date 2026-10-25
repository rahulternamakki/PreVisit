"use client";

import React from "react";
import Link from "next/link";
import { Activity, ShieldCheck, PlusCircle, Stethoscope, ArrowLeft } from "lucide-react";
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
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href={isDoctor ? "/doctor" : "/"} className="flex items-center gap-3 group">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 ${
              isDoctor
                ? "bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/20"
                : "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/20"
            }`}
          >
            {isDoctor ? (
              <Stethoscope className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
                PreVisit
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isDoctor
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
                }`}
              >
                {isDoctor ? "Doctor Portal" : "Patient Intake"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {isDoctor
                ? "Clinical Queue & Structured Pre-Visit Summaries"
                : "Intelligent Pre-Appointment Clinical Preparation"}
            </p>
          </div>
        </Link>

        {/* Right Info / Actions */}
        <div className="flex items-center gap-3">
          {/* Active Intake Badge in Patient Mode */}
          {!isDoctor && intake && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {intake.patient_name} ({intake.patient_age} yrs)
                </span>
                <span className="text-[11px] text-zinc-500 capitalize">
                  {intake.status.replace("_", " ")}
                </span>
              </div>
              {onNewIntake && (
                <button
                  onClick={onNewIntake}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  title="Start a fresh intake session"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Intake</span>
                </button>
              )}
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? "bg-emerald-500" : "bg-amber-500 animate-ping"
              }`}
            />
            <span className="hidden lg:inline">
              {isBackendConnected ? "Secure API Connected" : "Connecting..."}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-0.5" />
          </div>

          {/* Cross Portal Navigation Button */}
          {isDoctor ? (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Patient View</span>
              </Link>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/60 text-xs font-semibold transition-colors"
                >
                  Log Out
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/doctor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors shadow-sm"
              title="Access physician queue and review summaries"
            >
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Doctor Portal</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
