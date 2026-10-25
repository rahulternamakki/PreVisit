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
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header
        intake={intake}
        onNewIntake={handleNewIntake}
        isBackendConnected={isBackendHealthy}
      />

      {/* Progress Tracker (when intake exists) */}
      {intake && (
        <ProgressTracker
          transcript={intake.chat_transcript}
          isCompleted={intake.status === "completed"}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 justify-center">
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Restoring patient intake session...</p>
          </div>
        ) : !intake ? (
          <PatientEntryForm
            onSubmit={handleStartIntake}
            isLoading={isLoading}
            error={error}
          />
        ) : intake.status === "completed" ? (
          <IntakeCompletedView
            intake={intake}
            onNewIntake={handleNewIntake}
            onUpdateIntake={setIntake}
          />
        ) : (
          <ChatInterface
            intake={intake}
            onSendMessage={handleSendMessage}
            onCompleteIntake={handleCompleteIntake}
            isLoading={isLoading}
            error={error}
            onClearError={() => setError(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PreVisit Clinical Intake Assistant &bull; HIPAA-conscious architecture</span>
          <span>Data secured in PostgreSQL with Row Level Security</span>
        </div>
      </footer>
    </div>
  );
}
