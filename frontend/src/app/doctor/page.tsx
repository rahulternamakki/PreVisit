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
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "13px",
              background: "var(--pv-indigo-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Loader2
              style={{
                width: "22px",
                height: "22px",
                color: "var(--pv-indigo-600)",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
          <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-quaternary)" }}>
            Validating session…
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "280px" }}>
            <div className="skeleton" style={{ height: "14px", width: "70%" }} />
            <div className="skeleton" style={{ height: "10px", width: "50%" }} />
          </div>
        </div>
      </div>
    );
  }

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
      className="print:bg-white print:text-black"
    >
      <Header
        mode="doctor"
        isBackendConnected={isBackendHealthy}
        onLogout={isAuthenticated ? handleLogout : undefined}
      />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 24px)",
        }}
        className="print:p-0 print:m-0 print:max-w-none"
      >
        {/* Toast */}
        {toastMessage && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "var(--radius-xl)",
              background: "var(--pv-indigo-50)",
              border: "1px solid var(--pv-indigo-100, #e0e7ff)",
              color: "var(--pv-indigo-700)",
              fontSize: "0.875rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span>✓ {toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--pv-indigo-600)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                textDecoration: "underline",
                padding: "0 0 0 8px",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {!isAuthenticated ? (
          <DoctorLoginView onLoginSuccess={handleLoginSuccess} />
        ) : selectedIntakeId ? (
          isLoadingDetail ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                padding: "80px 20px",
                color: "var(--text-quaternary)",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: "var(--pv-indigo-50)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader2
                  style={{
                    width: "22px",
                    height: "22px",
                    color: "var(--pv-indigo-600)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                Loading clinical summary & red flags…
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "400px", maxWidth: "100%" }}>
                <div className="skeleton" style={{ height: "80px", borderRadius: "var(--radius-xl)" }} />
                <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius-xl)" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="skeleton" style={{ height: "60px", borderRadius: "var(--radius-lg)" }} />
                  <div className="skeleton" style={{ height: "60px", borderRadius: "var(--radius-lg)" }} />
                </div>
              </div>
            </div>
          ) : detailError ? (
            <div
              className="animate-fade-in"
              style={{
                padding: "24px",
                borderRadius: "var(--radius-xl)",
                background: "var(--pv-danger-bg)",
                border: "1px solid var(--pv-danger-border)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxWidth: "600px",
                margin: "32px auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--pv-danger)" }}>
                <AlertCircle style={{ width: "18px", height: "18px" }} />
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0, color: "#b91c1c" }}>
                  Error Loading Clinical Intake
                </h3>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#b91c1c", margin: 0 }}>{detailError}</p>
              <button
                type="button"
                onClick={handleBackToQueue}
                className="pv-btn-secondary"
                style={{ alignSelf: "flex-start", fontSize: "0.875rem" }}
              >
                ← Return to Queue
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
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-base)",
          }}
        >
          <Loader2
            style={{
              width: "24px",
              height: "24px",
              color: "var(--pv-indigo-600)",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      }
    >
      <DoctorDashboardContent />
    </Suspense>
  );
}

