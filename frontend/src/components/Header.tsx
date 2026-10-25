"use client";

import React from "react";
import { Activity, ShieldCheck, PlusCircle } from "lucide-react";
import { IntakeSession } from "@/types/intake";

interface HeaderProps {
  intake?: IntakeSession | null;
  onNewIntake?: () => void;
  isBackendConnected?: boolean;
}

export function Header({
  intake,
  onNewIntake,
  isBackendConnected = true,
}: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
                PreVisit
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                Patient Intake
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Intelligent Pre-Appointment Clinical Preparation
            </p>
          </div>
        </div>

        {/* Right Info / Actions */}
        <div className="flex items-center gap-3">
          {/* Active Intake Badge */}
          {intake ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {intake.patient_name} ({intake.patient_age} yrs)
                </span>
                <span className="text-[11px] text-zinc-500 capitalize">
                  {intake.status.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={onNewIntake}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Start a fresh intake session"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Intake</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected ? "bg-emerald-500" : "bg-amber-500 animate-ping"
                }`}
              />
              <span className="hidden sm:inline">
                {isBackendConnected ? "Secure Server Connected" : "Connecting..."}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-1" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
