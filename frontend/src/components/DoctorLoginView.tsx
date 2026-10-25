"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { doctorLogin } from "@/lib/api";

interface DoctorLoginViewProps {
  onLoginSuccess: (token: string) => void;
}

export function DoctorLoginView({ onLoginSuccess }: DoctorLoginViewProps) {
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the clinical passcode.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await doctorLogin(passcode.trim());
      if (res && res.access_token) {
        onLoginSuccess(res.access_token);
      } else {
        setError("Invalid response received from server.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify passcode.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemoPasscode = () => {
    setPasscode("123456");
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-none p-6 sm:p-8 space-y-6 text-left transition-all">
        {/* Top Header */}
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Doctor Portal Access
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Secure clinical triage queue & structured intake summaries.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Access Denied: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Passcode Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="passcode"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              Physician Passcode
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. 123456)"
                disabled={isLoading}
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-mono tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Passcode...</span>
              </>
            ) : (
              <>
                <span>Enter Doctor Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Track Hint */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <button
            type="button"
            onClick={handleUseDemoPasscode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Use Default Demo Passcode (123456)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
