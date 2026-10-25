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
  Filter,
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

function UrgencyBadge({ level }: { level: string }) {
  const configs: Record<string, { bg: string; color: string; border: string; dot?: string }> = {
    emergency: {
      bg: "rgba(239,68,68,0.1)",
      color: "#dc2626",
      border: "rgba(239,68,68,0.3)",
      dot: "#ef4444",
    },
    urgent: {
      bg: "rgba(245,158,11,0.1)",
      color: "#d97706",
      border: "rgba(245,158,11,0.3)",
    },
    routine: {
      bg: "rgba(16,185,129,0.1)",
      color: "#059669",
      border: "rgba(16,185,129,0.3)",
    },
  };

  const cfg = configs[level] || configs.routine;
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        borderRadius: "9999px",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: "0.6875rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: cfg.dot,
            animation: "pulse 1.5s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
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

  const statCards = [
    {
      label: "Queue Total",
      value: stats.total,
      icon: <Users style={{ width: "15px", height: "15px" }} />,
      sub: "Active patients",
      color: "var(--text-tertiary)",
      bg: "var(--bg-subtle)",
      border: "var(--border-default)",
      onClick: undefined,
      active: false,
    },
    {
      label: "Priority",
      value: stats.urgent + stats.emergency,
      icon: <ShieldAlert style={{ width: "15px", height: "15px" }} />,
      sub: "Needs attention",
      color: "var(--pv-danger)",
      bg: "rgba(239,68,68,0.06)",
      border: selectedUrgency === "urgent" ? "var(--pv-danger)" : "var(--pv-danger-border)",
      onClick: () => onSelectUrgency(selectedUrgency === "urgent" ? "all" : "urgent"),
      active: selectedUrgency === "urgent" || selectedUrgency === "emergency",
    },
    {
      label: "Routine",
      value: stats.routine,
      icon: <Activity style={{ width: "15px", height: "15px" }} />,
      sub: "Standard consult",
      color: "var(--pv-success)",
      bg: "rgba(16,185,129,0.06)",
      border: selectedUrgency === "routine" ? "var(--pv-success)" : "var(--pv-success-border)",
      onClick: () => onSelectUrgency(selectedUrgency === "routine" ? "all" : "routine"),
      active: selectedUrgency === "routine",
    },
    {
      label: "Reviewed",
      value: stats.reviewed,
      icon: <CheckCircle2 style={{ width: "15px", height: "15px" }} />,
      sub: "Physician signed off",
      color: "var(--pv-indigo-600)",
      bg: "var(--pv-indigo-50)",
      border: selectedStatus === "reviewed" ? "var(--pv-indigo-600)" : "var(--pv-indigo-100, #e0e7ff)",
      onClick: () => onSelectStatus(selectedStatus === "reviewed" ? "all" : "reviewed"),
      active: selectedStatus === "reviewed",
    },
  ];

  return (
    <div
      className="w-full stagger-children animate-fade-in"
      style={{ maxWidth: "1024px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}
    >
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-4"
      >
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (card.onClick && (e.key === "Enter" || e.key === " ")) card.onClick();
            }}
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: "var(--radius-xl)",
              padding: "16px 18px",
              cursor: card.onClick ? "pointer" : "default",
              transition: "all var(--duration-normal) var(--ease-out)",
              boxShadow: card.active ? `0 0 0 2px ${card.color}20` : "var(--shadow-xs)",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (card.onClick) {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
              }
            }}
            onMouseLeave={(e) => {
              if (card.onClick) {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = card.active ? `0 0 0 2px ${card.color}20` : "var(--shadow-xs)";
              }
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
                color: card.color,
              }}
            >
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {card.label}
              </span>
              {card.icon}
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: card.color,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                marginBottom: "4px",
              }}
            >
              {card.value}
            </div>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)", fontWeight: 500 }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "var(--shadow-xs)",
        }}
        className="md:flex-row md:items-center"
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            style={{
              width: "15px",
              height: "15px",
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-quaternary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by patient name or complaint…"
            className="pv-input"
            style={{
              paddingLeft: "36px",
              fontSize: "0.875rem",
              background: "var(--bg-subtle)",
            }}
          />
        </div>

        {/* Filter tabs */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {[
            { id: "all", label: "All" },
            { id: "urgent", label: `Urgent (${stats.urgent + stats.emergency})`, danger: true },
            { id: "routine", label: `Routine (${stats.routine})`, success: true },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectUrgency(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all var(--duration-fast)",
                border: "1px solid transparent",
                ...(selectedUrgency === tab.id
                  ? tab.danger
                    ? { background: "var(--pv-danger)", color: "#fff", boxShadow: "0 2px 6px rgba(239,68,68,0.25)" }
                    : tab.success
                    ? { background: "var(--pv-success)", color: "#fff", boxShadow: "0 2px 6px rgba(16,185,129,0.25)" }
                    : { background: "var(--text-primary)", color: "var(--bg-surface)" }
                  : tab.danger
                  ? { background: "var(--pv-danger-bg)", color: "var(--pv-danger)", borderColor: "var(--pv-danger-border)" }
                  : tab.success
                  ? { background: "var(--pv-success-bg)", color: "var(--pv-success)", borderColor: "var(--pv-success-border)" }
                  : { background: "var(--bg-subtle)", color: "var(--text-tertiary)", borderColor: "var(--border-default)" }),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}
        >
          <button
            type="button"
            onClick={onSeedSamples}
            disabled={isSeeding}
            className="pv-btn-secondary"
            style={{ padding: "7px 12px", fontSize: "0.8125rem", gap: "6px" }}
            title="Seed demo clinical cases"
          >
            <Sparkles style={{ width: "14px", height: "14px", color: "var(--pv-indigo-500)" }} />
            <span>{isSeeding ? "Loading…" : "Demo Cases"}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="pv-btn-secondary"
            style={{ padding: "7px 10px", fontSize: "0.8125rem", minWidth: "36px" }}
            title="Refresh queue"
          >
            <RefreshCw
              style={{
                width: "14px",
                height: "14px",
                animation: isLoading ? "spin 0.8s linear infinite" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Queue list */}
      <div>
        {/* List header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            padding: "0 2px",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 800,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--text-quaternary)",
            }}
          >
            {items.length} Patient{items.length !== 1 ? "s" : ""} · Urgent First
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)" }}>
            Click any row to review
          </span>
        </div>

        {/* Loading skeleton */}
        {isLoading && items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "90px", borderRadius: "var(--radius-xl)" }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-2xl)",
              padding: "56px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                color: "var(--text-quaternary)",
              }}
            >
              <Inbox style={{ width: "24px", height: "24px" }} />
            </div>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              No patients in queue
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-tertiary)",
                maxWidth: "300px",
                margin: "0 auto 20px",
                lineHeight: 1.6,
              }}
            >
              No intakes match your current filters. Try seeding demo clinical cases to test the triage queue.
            </p>
            <button
              type="button"
              onClick={onSeedSamples}
              disabled={isSeeding}
              className="pv-btn-primary"
              style={{
                margin: "0 auto",
                background: "linear-gradient(135deg, var(--pv-indigo-600), #7c3aed)",
                boxShadow: "var(--shadow-indigo)",
              }}
            >
              <Sparkles style={{ width: "16px", height: "16px" }} />
              {isSeeding ? "Loading Demo Cases…" : "Load Clinical Demo Cases"}
            </button>
          </div>
        )}

        {/* Patient rows */}
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map((item, rowIdx) => {
              const isUrgent = item.urgency_level === "urgent";
              const isEmergency = item.urgency_level === "emergency";
              const isPriority = isUrgent || isEmergency;
              const isReviewed = item.status === "reviewed";

              return (
                <div
                  key={item.id}
                  className="animate-fade-in"
                  onClick={() => onSelectIntake(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectIntake(item.id);
                  }}
                  style={{
                    animationDelay: `${rowIdx * 40}ms`,
                    background: "var(--bg-surface)",
                    border: `1px solid ${isPriority ? "var(--pv-danger-border)" : "var(--border-default)"}`,
                    borderRadius: "var(--radius-xl)",
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    transition: "all var(--duration-normal) var(--ease-out)",
                    boxShadow: isPriority
                      ? "0 0 0 0 rgba(239,68,68,0.1)"
                      : "var(--shadow-xs)",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-1px)";
                    el.style.boxShadow = isPriority
                      ? "0 4px 16px rgba(239,68,68,0.12)"
                      : "var(--shadow-md)";
                    el.style.borderColor = isPriority
                      ? "var(--pv-danger)"
                      : "var(--pv-indigo-400)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = isPriority ? "0 0 0 0 rgba(239,68,68,0.1)" : "var(--shadow-xs)";
                    el.style.borderColor = isPriority ? "var(--pv-danger-border)" : "var(--border-default)";
                  }}
                >
                  {/* Priority stripe */}
                  <div
                    style={{
                      width: "3px",
                      alignSelf: "stretch",
                      borderRadius: "2px",
                      flexShrink: 0,
                      background: isEmergency
                        ? "var(--pv-danger)"
                        : isUrgent
                        ? "var(--pv-warning)"
                        : "var(--pv-success)",
                    }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                      <UrgencyBadge level={item.urgency_level} />

                      {item.red_flags_count > 0 && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            background: "var(--pv-danger-bg)",
                            border: "1px solid var(--pv-danger-border)",
                            color: "var(--pv-danger)",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                          }}
                        >
                          <ShieldAlert style={{ width: "10px", height: "10px" }} />
                          {item.red_flags_count} Red Flag{item.red_flags_count > 1 ? "s" : ""}
                        </span>
                      )}

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          background: isReviewed ? "var(--pv-indigo-50)" : "var(--bg-subtle)",
                          border: `1px solid ${isReviewed ? "var(--pv-indigo-100, #e0e7ff)" : "var(--border-default)"}`,
                          color: isReviewed ? "var(--pv-indigo-600)" : "var(--text-quaternary)",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "capitalize",
                        }}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "6px",
                        marginBottom: "3px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {item.patient_name}
                      </h4>
                      <span
                        style={{ fontSize: "0.8125rem", color: "var(--text-quaternary)", fontWeight: 500 }}
                      >
                        {item.patient_age} yrs
                      </span>
                    </div>

                    {/* Complaint */}
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--text-tertiary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Complaint:{" "}
                      </span>
                      {item.chief_complaint || "Routine preliminary clinical consultation"}
                    </p>
                  </div>

                  {/* Right side */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.75rem",
                        color: "var(--text-quaternary)",
                      }}
                    >
                      <Clock style={{ width: "11px", height: "11px" }} />
                      {getRelativeTime(item.created_at)}
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-default)",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        transition: "all var(--duration-fast)",
                      }}
                    >
                      Review
                      <ChevronRight style={{ width: "13px", height: "13px" }} />
                    </div>
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
