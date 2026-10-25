"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { ChatMessage, IntakeSession } from "@/types/intake";
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

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [intake.chat_transcript, isLoading]);

  // Focus textarea when done loading
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isLoading) return;

    // Trigger immediate emergency banner before network round-trip if emergency words detected
    if (checkClientEmergency(text)) {
      setClientEmergencyDetected(true);
    }

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSendMessage(text);
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

  // Determine smart quick reply chips based on transcript context
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
    <div className="flex flex-col flex-1 max-w-4xl w-full mx-auto bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/40 dark:shadow-none overflow-hidden h-[75vh] min-h-[550px] transition-colors">
      {/* Top Banner if Emergency */}
      {isEmergency && (
        <div className="p-3 border-b border-red-200 dark:border-red-900">
          <EmergencyBanner redFlags={intake.red_flags} />
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {intake.chat_transcript.map((msg, index) => {
          const isUser = msg.role === "user";
          const isAssistant = msg.role === "assistant";

          // Format timestamp
          const timeStr = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                isUser ? "flex-row-reverse" : "flex-row"
              } animate-fadeIn`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs shadow-xs ${
                  isUser
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-500/10"
                    : "bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200/60 dark:border-zinc-700/60"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {timeStr && (
                  <div
                    className={`mt-1.5 text-[10px] text-right ${
                      isUser
                        ? "text-blue-100/80"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {timeStr}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-900 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-none p-3.5 border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>PreVisit is preparing your next question...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error notification bar */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border-t border-red-200 dark:border-red-900 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={onClearError}
            className="underline hover:text-red-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Suggested Quick Response Chips */}
      {!isLoading && quickChips.length > 0 && (
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
            Quick Reply:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickReply(chip)}
              className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors shadow-2xs active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Footer */}
      <div className="p-3 sm:p-4 bg-zinc-50/90 dark:bg-zinc-950/60 border-t border-zinc-200/80 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
          <div className="relative flex-1">
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
              placeholder="Type your answer here... (Press Enter to send)"
              className="w-full resize-none max-h-32 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-normal"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Send Message"
            aria-label="Send Message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
          <span>Asking one short question at a time to prepare for your doctor.</span>
          <button
            type="button"
            onClick={onCompleteIntake}
            className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 underline font-medium"
          >
            Finished all answers? Complete Intake
          </button>
        </div>
      </div>
    </div>
  );
}
