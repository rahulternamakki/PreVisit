"use client";

import React, { useState } from "react";
import { Info, ShieldAlert, X } from "lucide-react";

export function MedicalDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between rounded-lg">
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5" />
          PreVisit is an intake assistant only — not medical advice.
        </span>
        <button
          onClick={() => setDismissed(false)}
          className="underline hover:text-amber-800 text-[11px]"
        >
          View Notice
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-300 shadow-xs relative transition-all">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1 pr-6">
          <p className="font-semibold text-amber-950 dark:text-amber-200 text-sm">
            Important Medical Disclaimer
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            PreVisit is designed solely to gather preliminary health history for your
            doctor before your appointment. This service <strong>does not provide medical diagnoses,
            treatment recommendations, or emergency services</strong>.
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/80">
            If you are experiencing life-threatening symptoms (such as acute chest pain,
            difficulty breathing, or severe bleeding), immediately call <strong>911</strong> or
            proceed to the nearest emergency department.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          title="Dismiss disclaimer"
          aria-label="Dismiss disclaimer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
