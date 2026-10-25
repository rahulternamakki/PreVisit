"use client";

import React from "react";
import { AlertOctagon, PhoneCall, HeartPulse } from "lucide-react";
import { RedFlag } from "@/types/intake";

interface EmergencyBannerProps {
  redFlags?: RedFlag[];
  customMessage?: string;
}

export function EmergencyBanner({ redFlags, customMessage }: EmergencyBannerProps) {
  return (
    <div className="bg-red-500 text-white p-4 rounded-xl shadow-lg border-2 border-red-600 animate-pulse">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <AlertOctagon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
              <span>URGENT: Potential Medical Emergency Detected</span>
            </h3>
            <p className="text-sm text-red-50 font-medium mt-0.5 leading-snug">
              {customMessage ||
                "Your reported symptoms may require immediate clinical attention. Please do not wait for your scheduled appointment."}
            </p>
            {redFlags && redFlags.length > 0 && (
              <div className="mt-2 text-xs bg-red-600/60 p-2 rounded-md">
                <span className="font-semibold">Flagged: </span>
                {redFlags.map((rf, idx) => (
                  <span key={idx} className="italic">
                    &ldquo;{rf.patient_quote}&rdquo; ({rf.reason})
                    {idx < redFlags.length - 1 ? "; " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <a
            href="tel:911"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-white text-red-600 font-bold px-4 py-2.5 rounded-lg shadow-sm hover:bg-red-50 transition-colors text-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call 911</span>
          </a>
          <a
            href="tel:988"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-3 py-2.5 rounded-lg transition-colors text-xs"
            title="Suicide & Crisis Lifeline"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Lifeline (988)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
