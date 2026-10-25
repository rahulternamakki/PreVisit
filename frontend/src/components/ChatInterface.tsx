"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, AlertTriangle, X } from "lucide-react";
import { IntakeSession } from "@/types/intake";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { checkClientEmergency } from "@/lib/safety";

interface ChatInterfaceProps {
  intake: IntakeSession;
  onSendMessage: (message: string) => Promise<void>;
  onCompleteIntake: () => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export function ChatInterface({
  intake,
  onSendMessage,
  onCompleteIntake,
  isLoading,
  error,
  onClearError,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [clientEmergencyDetected, setClientEmergencyDetected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [intake.chat_transcript, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isLoading) return;

    if (checkClientEmergency(text)) {
      setClientEmergencyDetected(true);
    }

    const previousText = text;
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await onSendMessage(text);
    } catch {
      setInputText(previousText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const getContextualChips = (): string[] => {
    const transcript = intake.chat_transcript;
    if (transcript.length === 0) return [];
    const lastMsg = transcript[transcript.length - 1];
    if (lastMsg.role !== "assistant") return [];

    const content = lastMsg.content.toLowerCase();
    if (content.includes("allerg")) {
      return ["No known allergies", "Penicillin allergy", "Latex allergy", "Seasonal allergies"];
    }
    if (content.includes("medication") || content.includes("medicine") || content.includes("supplement")) {
      return ["No current medications", "Only daily vitamins", "Blood pressure medication", "None"];
    }
    if (content.includes("condition") || content.includes("history") || content.includes("chronic") || content.includes("illness")) {
      return ["No chronic conditions", "Hypertension", "Type 2 Diabetes", "Asthma", "None"];
    }
    if (content.includes("scale") || content.includes("severe") || content.includes("1 to 10") || content.includes("1-10")) {
      return ["Mild (2/10)", "Moderate (5/10)", "Severe (8/10)", "Constant throbbing", "Sharp stabbing"];
    }
    if (content.includes("when") || content.includes("long") || content.includes("start")) {
      return ["Started today", "2-3 days ago", "About a week ago", "A few hours ago", "Over a month"];
    }
    if (content.includes("other symptom") || content.includes("also experiencing") || content.includes("fever")) {
      return ["No other symptoms", "Mild fever and fatigue", "Nausea and dizziness", "Chills"];
    }
    return ["None", "Yes", "No", "Not sure"];
  };

  const quickChips = getContextualChips();
  const isEmergency = intake.urgency_level === "emergency" || clientEmergencyDetected;

  return (
    <div
      className="flex flex-col flex-1 w-full mx-auto animate-scale-in"
      style={{
        maxWidth: "860px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--shadow-xl)",
        overflow: "hidden",
        height: "75vh",
        minHeight: "520px",
        maxHeight: "820px",
      }}
    >
      {/* Emergency banner */}
      {isEmergency && (
        <div style={{ padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
          <EmergencyBanner redFlags={intake.red_flags} />
        </div>
      )}

      {/* Chat header strip */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--bg-subtle)",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "9px",
            background: "linear-gradient(135deg, var(--pv-blue-600), var(--pv-indigo-600))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bot style={{ width: "16px", height: "16px", color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
            PreVisit Intake Assistant
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)" }}>
            {intake.patient_name} · {intake.patient_age} yrs
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.6875rem",
            color: "var(--pv-success)",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "var(--pv-success)",
              animation: isLoading ? "none" : "pulse 2s infinite",
            }}
          />
          {isLoading ? "Thinking..." : "Live"}
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {intake.chat_transcript.length === 0 && !isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "8px",
              color: "var(--text-quaternary)",
              padding: "40px 20px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "var(--bg-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "4px",
              }}
            >
              <Bot style={{ width: "24px", height: "24px" }} />
            </div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
              Starting your intake...
            </p>
          </div>
        )}

        {intake.chat_transcript.map((msg, index) => {
          const isUser = msg.role === "user";
          const timeStr = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";
          const isLast = index === intake.chat_transcript.length - 1;

          return (
            <div
              key={index}
              className={isLast ? "animate-fade-in" : ""}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "10px",
                flexDirection: isUser ? "row-reverse" : "row",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  ...(isUser
                    ? {
                        background: "linear-gradient(135deg, var(--pv-blue-600), var(--pv-indigo-600))",
                        color: "#fff",
                      }
                    : {
                        background: "var(--bg-muted)",
                        border: "1px solid var(--border-default)",
                        color: "var(--pv-indigo-500)",
                      }),
                }}
              >
                {isUser ? (
                  <User style={{ width: "14px", height: "14px" }} />
                ) : (
                  <Bot style={{ width: "14px", height: "14px" }} />
                )}
              </div>

              {/* Bubble */}
              <div
                style={{
                  maxWidth: "78%",
                  ...(isUser
                    ? {
                        background: "linear-gradient(135deg, var(--pv-blue-600), var(--pv-indigo-600))",
                        color: "#fff",
                        borderRadius: "18px 18px 4px 18px",
                        boxShadow: "var(--shadow-blue)",
                      }
                    : {
                        background: "var(--bg-subtle)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "18px 18px 18px 4px",
                        boxShadow: "var(--shadow-xs)",
                      }),
                  padding: "12px 16px",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                {timeStr && (
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "0.6875rem",
                      textAlign: "right",
                      opacity: 0.6,
                    }}
                  >
                    {timeStr}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div
            className="animate-fade-in"
            style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--pv-indigo-500)",
              }}
            >
              <Bot style={{ width: "14px", height: "14px" }} />
            </div>
            <div
              style={{
                padding: "14px 18px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px 18px 18px 4px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span className="typing-dot" style={{ color: "var(--text-quaternary)" }} />
              <span className="typing-dot" style={{ color: "var(--text-quaternary)" }} />
              <span className="typing-dot" style={{ color: "var(--text-quaternary)" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--pv-danger-bg)",
            borderTop: "1px solid var(--pv-danger-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "0.8125rem",
            color: "#b91c1c",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <AlertTriangle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--pv-danger)",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            )}
            <button
              onClick={onClearError}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "#b91c1c",
                cursor: "pointer",
                opacity: 0.7,
              }}
            >
              <X style={{ width: "13px", height: "13px" }} />
            </button>
          </div>
        </div>
      )}

      {/* Quick reply chips */}
      {!isLoading && quickChips.length > 0 && (
        <div
          className="no-scrollbar"
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-subtle)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
          }}
        >
          <span
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--text-quaternary)",
              flexShrink: 0,
            }}
          >
            Quick Reply:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickReply(chip)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 12px",
                borderRadius: "9999px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all var(--duration-fast) var(--ease-out)",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.borderColor = "var(--pv-blue-400)";
                btn.style.color = "var(--pv-blue-600)";
                btn.style.background = "var(--pv-blue-50)";
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                btn.style.borderColor = "var(--border-default)";
                btn.style.color = "var(--text-secondary)";
                btn.style.background = "var(--bg-surface)";
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input footer */}
      <div
        style={{
          padding: "12px 16px 14px",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Type your answer… (Enter to send)"
              style={{
                width: "100%",
                resize: "none",
                maxHeight: "120px",
                padding: "11px 14px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                fontSize: "0.9375rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text-primary)",
                lineHeight: 1.5,
                outline: "none",
                transition: "border-color var(--duration-normal), box-shadow var(--duration-normal)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--pv-blue-500)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            title="Send Message"
            aria-label="Send Message"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: inputText.trim() && !isLoading
                ? "linear-gradient(135deg, var(--pv-blue-600), var(--pv-indigo-600))"
                : "var(--bg-muted)",
              color: inputText.trim() && !isLoading ? "#fff" : "var(--text-quaternary)",
              border: "none",
              cursor: inputText.trim() && !isLoading ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "all var(--duration-normal) var(--ease-out)",
              boxShadow: inputText.trim() && !isLoading ? "var(--shadow-blue)" : "none",
            }}
          >
            {isLoading ? (
              <svg
                style={{
                  width: "18px",
                  height: "18px",
                  animation: "spin 1s linear infinite",
                  color: "var(--pv-blue-500)",
                }}
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
            ) : (
              <Send style={{ width: "18px", height: "18px" }} />
            )}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "7px",
            paddingLeft: "2px",
          }}
        >
          <span style={{ fontSize: "0.6875rem", color: "var(--text-quaternary)" }}>
            One question at a time — preparing your doctor&apos;s brief
          </span>
          <button
            type="button"
            onClick={onCompleteIntake}
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-quaternary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationColor: "var(--border-strong)",
              transition: "color var(--duration-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--pv-blue-600)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-quaternary)";
            }}
          >
            Finished? Complete Intake →
          </button>
        </div>
      </div>
    </div>
  );
}
