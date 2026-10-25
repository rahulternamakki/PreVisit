"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Header } from "@/components/Header";
import { DoctorLoginView } from "@/components/DoctorLoginView";
import { DoctorQueueView } from "@/components/DoctorQueueView";
import { DoctorSummaryView } from "@/components/DoctorSummaryView";
import { DoctorQueueItem, DoctorQueueStats } from "@/types/doctor";
import { IntakeSession } from "@/types/intake";
import {
  doctorVerifySession,
  getDoctorQueue,
  getDoctorIntakeDetail,
  seedDoctorClinicalSamples,
  checkBackendHealth,
} from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

const TOKEN_KEY = "previsit_doctor_token";

function DoctorDashboardContent() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  // Queue state
  const [queueItems, setQueueItems] = useState<DoctorQueueItem[]>([]);
  const [stats, setStats] = useState<DoctorQueueStats>({
    total: 0,
    emergency: 0,
    urgent: 0,
    routine: 0,
    completed: 0,
    reviewed: 0,
  });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail / Summary view state
  const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<IntakeSession | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // 1. Initial auth verification on mount
  useEffect(() => {
    checkBackendHealth().then((h) => setIsBackendHealthy(h.ok));

    const verifyExistingToken = async () => {
      setIsCheckingAuth(true);
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        const isValid = await doctorVerifySession(savedToken);
        if (isValid) {
          setToken(savedToken);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setIsAuthenticated(false);
        }
      }
      setIsCheckingAuth(false);
    };

    verifyExistingToken();
  }, []);

  // 2. Select intake to view summary
  const handleSelectIntake = useCallback(async (id: string) => {
    if (!token) return;
    setSelectedIntakeId(id);
    setIsLoadingDetail(true);
    setDetailError(null);

    // Update URL query param without full reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("id", id);
    window.history.pushState({}, "", newUrl.toString());

    try {
      const intakeDetail = await getDoctorIntakeDetail(token, id);
      setSelectedIntake(intakeDetail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load clinical intake detail.";
      setDetailError(msg);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [token]);

  // 3. Fetch queue when authenticated or filters change
  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setIsLoadingQueue(true);
    try {
      const res = await getDoctorQueue(token, {
        status: selectedStatus,
        urgency_level: selectedUrgency,
        search: searchQuery,
      });
      setQueueItems(res.items || []);
      setStats(res.stats || { total: 0, emergency: 0, urgent: 0, routine: 0, completed: 0, reviewed: 0 });
    } catch (err) {
      console.error("Error fetching queue:", err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [token, selectedStatus, selectedUrgency, searchQuery]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const timer = setTimeout(() => {
      fetchQueue();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, token, fetchQueue]);

  // 4. Handle deep link / URL sync for ?id=... on mount
  useEffect(() => {
    if (typeof window === "undefined" || !isAuthenticated || !token) return;
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get("id");
    if (idParam && idParam !== selectedIntakeId) {
      const timer = setTimeout(() => {
        handleSelectIntake(idParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, token, selectedIntakeId, handleSelectIntake]);

  // Handle Login success
  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsAuthenticated(false);
    setSelectedIntakeId(null);
    setSelectedIntake(null);
  };

  // Back to queue
  const handleBackToQueue = () => {
    setSelectedIntakeId(null);
    setSelectedIntake(null);
    setDetailError(null);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("id");
    window.history.pushState({}, "", newUrl.toString());

    // Refresh queue to sync any review updates
    fetchQueue();
  };

  // Seed sample records
  const handleSeedSamples = async () => {
    if (!token) return;
    setIsSeeding(true);
    try {
      const res = await seedDoctorClinicalSamples(token);
      setToastMessage(res.message || "Seeded demonstration clinical cases.");
      setTimeout(() => setToastMessage(null), 4000);
      await fetchQueue();
    } catch (err) {
      console.error("Error seeding samples:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Update intake callback
  const handleIntakeUpdated = (updated: IntakeSession) => {
    setSelectedIntake(updated);
    fetchQueue();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Validating doctor session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors print:bg-white print:text-black">
      <Header
        mode="doctor"
        isBackendConnected={isBackendHealthy}
        onLogout={isAuthenticated ? handleLogout : undefined}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:p-0 print:m-0 print:max-w-none">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-sm">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {!isAuthenticated ? (
          <DoctorLoginView onLoginSuccess={handleLoginSuccess} />
        ) : selectedIntakeId ? (
          /* Detailed Patient Summary View */
          isLoadingDetail ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold">Loading clinical summary & red flags...</p>
            </div>
          ) : detailError ? (
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm">Error Loading Clinical Intake</h3>
              </div>
              <p className="text-xs">{detailError}</p>
              <button
                type="button"
                onClick={handleBackToQueue}
                className="px-3.5 py-2 rounded-xl bg-red-100 text-red-800 text-xs font-bold"
              >
                Return to Queue
              </button>
            </div>
          ) : selectedIntake ? (
            <DoctorSummaryView
              intake={selectedIntake}
              token={token!}
              onBack={handleBackToQueue}
              onIntakeUpdated={handleIntakeUpdated}
            />
          ) : null
        ) : (
          /* Priority Triage Queue */
          <DoctorQueueView
            items={queueItems}
            stats={stats}
            isLoading={isLoadingQueue}
            onSelectIntake={handleSelectIntake}
            onRefresh={fetchQueue}
            onSeedSamples={handleSeedSamples}
            isSeeding={isSeeding}
            selectedUrgency={selectedUrgency}
            onSelectUrgency={setSelectedUrgency}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </main>
    </div>
  );
}

export default function DoctorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <DoctorDashboardContent />
    </Suspense>
  );
}
