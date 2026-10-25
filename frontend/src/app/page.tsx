"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ProgressTracker } from "@/components/ProgressTracker";
import { PatientEntryForm } from "@/components/PatientEntryForm";
import { ChatInterface } from "@/components/ChatInterface";
import { IntakeCompletedView } from "@/components/IntakeCompletedView";
import { IntakeSession } from "@/types/intake";
import {
  createIntake,
  getIntake,
  sendChatMessage,
  completeIntake,
  checkBackendHealth,
} from "@/lib/api";
import { Loader2 } from "lucide-react";

const STORAGE_KEY = "previsit_active_intake_id";

export default function Home() {
  const [intake, setIntake] = useState<IntakeSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  // Health check on mount
  useEffect(() => {
    checkBackendHealth().then((health) => {
      setIsBackendHealthy(health.ok);
    });
  }, []);

  // Restore intake session on mount from URL or localStorage
  useEffect(() => {
    const restoreSession = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlIntakeId = urlParams.get("intakeId");
        const storedIntakeId = localStorage.getItem(STORAGE_KEY);
        const targetId = urlIntakeId || storedIntakeId;

        if (targetId) {
          const loaded = await getIntake(targetId);
          setIntake(loaded);
          // Sync URL and localStorage
          localStorage.setItem(STORAGE_KEY, targetId);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("intakeId", targetId);
          window.history.replaceState({}, "", newUrl.toString());
        }
      } catch (err: unknown) {
        console.warn("Could not restore previous intake session:", err);
        // Clear invalid saved ID
        localStorage.removeItem(STORAGE_KEY);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("intakeId");
        window.history.replaceState({}, "", newUrl.toString());
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // Handle creating a new intake session
  const handleStartIntake = async (
    name: string,
    age: number,
    chiefComplaint?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const newIntake = await createIntake(name, age, chiefComplaint);
      setIntake(newIntake);
      localStorage.setItem(STORAGE_KEY, newIntake.id);

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("intakeId", newIntake.id);
      window.history.pushState({}, "", newUrl.toString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start intake.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending a chat message
  const handleSendMessage = async (message: string) => {
    if (!intake) return;
    const previousIntake = intake;

    // Optimistically show user message immediately
    const optimisticMessage = {
      role: "user" as const,
      content: message,
      timestamp: new Date().toISOString(),
    };
    setIntake({
      ...intake,
      chat_transcript: [...intake.chat_transcript, optimisticMessage],
    });

    setIsLoading(true);
    setError(null);

    try {
      const chatResponse = await sendChatMessage(intake.id, message);
      setIntake(chatResponse.intake);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message.";
      setError(msg);
      // Revert optimistic transcript on error
      setIntake(previousIntake);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle explicit completion
  const handleCompleteIntake = async () => {
    if (!intake) return;
    setIsLoading(true);
    setError(null);

    try {
      const completed = await completeIntake(intake.id);
      setIntake(completed);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to complete intake.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle starting over / new intake
  const handleNewIntake = () => {
    localStorage.removeItem(STORAGE_KEY);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("intakeId");
    window.history.pushState({}, "", newUrl.toString());
    setIntake(null);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <Header
        intake={intake}
        onNewIntake={handleNewIntake}
        isBackendConnected={isBackendHealthy}
      />

      {/* Progress Tracker */}
      {intake && (
        <ProgressTracker
          transcript={intake.chat_transcript}
          isCompleted={intake.status === "completed"}
        />
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 24px)",
          justifyContent: !intake ? "center" : "flex-start",
          alignItems: "center",
        }}
      >
        {isInitializing ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "80px 20px",
              color: "var(--text-quaternary)",
            }}
          >
            {/* Skeleton loader instead of raw spinner */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: "var(--bg-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader2
                  style={{
                    width: "22px",
                    height: "22px",
                    color: "var(--pv-blue-500)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-quaternary)" }}>
                Restoring your session…
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "320px" }}>
                <div className="skeleton" style={{ height: "16px", width: "60%" }} />
                <div className="skeleton" style={{ height: "12px", width: "80%" }} />
                <div className="skeleton" style={{ height: "12px", width: "45%" }} />
              </div>
            </div>
          </div>
        ) : !intake ? (
          <PatientEntryForm
            onSubmit={handleStartIntake}
            isLoading={isLoading}
            error={error}
          />
        ) : intake.status === "completed" ? (
          <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <IntakeCompletedView
              intake={intake}
              onNewIntake={handleNewIntake}
              onUpdateIntake={setIntake}
            />
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flex: 1, justifyContent: "center" }}>
            <ChatInterface
              intake={intake}
              onSendMessage={handleSendMessage}
              onCompleteIntake={handleCompleteIntake}
              isLoading={isLoading}
              error={error}
              onClearError={() => setError(null)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="print:hidden"
        style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
          fontSize: "0.6875rem",
          color: "var(--text-quaternary)",
        }}
      >
        <span>PreVisit Clinical Intake · HIPAA-conscious architecture</span>
        <span>Secured in PostgreSQL with Row-Level Security</span>
      </footer>
    </div>
  );
}
