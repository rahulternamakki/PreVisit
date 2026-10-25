"use client";

import React from "react";
import {
  Search,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Users,
  Inbox,
  Activity,
} from "lucide-react";
import { DoctorQueueItem, DoctorQueueStats } from "@/types/doctor";

interface DoctorQueueViewProps {
  items: DoctorQueueItem[];
  stats: DoctorQueueStats;
  isLoading: boolean;
  onSelectIntake: (intakeId: string) => void;
  onRefresh: () => void;
  onSeedSamples: () => void;
  isSeeding: boolean;
  selectedUrgency: string;
  onSelectUrgency: (urgency: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DoctorQueueView({
  items,
  stats,
  isLoading,
  onSelectIntake,
  onRefresh,
  onSeedSamples,
  isSeeding,
  selectedUrgency,
  onSelectUrgency,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
}: DoctorQueueViewProps) {
  // Helper for relative time
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return "Just now";
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left">
      {/* 1. Triage Metrics & Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Queue */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Queue Total</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {stats.total}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Active patients in system</p>
        </div>

        {/* Priority / Urgent */}
        <div
          onClick={() => onSelectUrgency(selectedUrgency === "urgent" ? "all" : "urgent")}
          className={`cursor-pointer transition-all bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-sm hover:border-red-400 ${
            selectedUrgency === "urgent" || selectedUrgency === "emergency"
              ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20"
              : "border-zinc-200/80 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Priority Urgent
            </span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {stats.urgent + stats.emergency}
          </div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">
            Needs immediate attention
          </p>
        </div>

        {/* Routine */}
        <div
          onClick={() => onSelectUrgency(selectedUrgency === "routine" ? "all" : "routine")}
          className={`cursor-pointer transition-all bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-sm hover:border-emerald-400 ${
            selectedUrgency === "routine"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20"
              : "border-zinc-200/80 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Routine</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.routine}
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            Standard pre-consult cases
          </p>
        </div>

        {/* Reviewed */}
        <div
          onClick={() => onSelectStatus(selectedStatus === "reviewed" ? "all" : "reviewed")}
          className={`cursor-pointer transition-all bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-sm hover:border-indigo-400 ${
            selectedStatus === "reviewed"
              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
              : "border-zinc-200/80 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Reviewed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.reviewed}
          </div>
          <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
            Signed off by physician
          </p>
        </div>
      </div>

      {/* 2. Controls: Search, Filters & Action Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search queue by patient name or chief complaint..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Urgency Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => onSelectUrgency("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedUrgency === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            All Urgencies
          </button>
          <button
            type="button"
            onClick={() => onSelectUrgency("urgent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedUrgency === "urgent"
                ? "bg-red-600 text-white"
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Urgent ({stats.urgent + stats.emergency})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectUrgency("routine")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedUrgency === "routine"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
            }`}
          >
            Routine ({stats.routine})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={onSeedSamples}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors disabled:opacity-60"
            title="Seed 1 Urgent and 1 Routine intake for testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isSeeding ? "Seeding..." : "Load Clinical Demos"}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-60"
            title="Refresh patient queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. Patient Queue List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Triage Queue ({items.length} Patients) • Sorted Urgent First
          </span>
          <span className="text-[11px] text-zinc-400">
            Click any patient to review structured summary & red flags
          </span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                No patients found matching criteria
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No intakes currently match your search or filter. You can seed realistic clinical cases to test the triage queue.
              </p>
            </div>
            <button
              type="button"
              onClick={onSeedSamples}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Clinical Demo Cases</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const isUrgent = item.urgency_level === "urgent";
              const isEmergency = item.urgency_level === "emergency";
              const isPriority = isUrgent || isEmergency;
              const isReviewed = item.status === "reviewed";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectIntake(item.id)}
                  className={`group cursor-pointer rounded-2xl p-4 sm:p-5 transition-all bg-white dark:bg-zinc-900 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:shadow-md ${
                    isPriority
                      ? "border-red-200 dark:border-red-950/60 hover:border-red-400 bg-red-50/10 dark:bg-red-950/10"
                      : "border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Left Column: Urgency Badge + Name + Chief Complaint */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Urgency Badge */}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isEmergency
                            ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 animate-pulse"
                            : isUrgent
                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {item.urgency_level}
                      </span>

                      {/* Red Flags Badge */}
                      {item.red_flags_count > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>{item.red_flags_count} Red Flags</span>
                        </span>
                      )}

                      {/* Status */}
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isReviewed
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Patient Name & Age */}
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.patient_name}
                      </h4>
                      <span className="text-xs text-zinc-500 font-medium">
                        ({item.patient_age} yrs)
                      </span>
                    </div>

                    {/* Chief Complaint */}
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium line-clamp-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Complaint:{" "}
                      </span>
                      {item.chief_complaint || "Routine preliminary clinical consultation"}
                    </p>
                  </div>

                  {/* Right Column: Time & Review CTA */}
                  <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{getRelativeTime(item.created_at)}</span>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-600 group-hover:text-white text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
