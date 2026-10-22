"use client";

import React, { useState } from "react";
import { Invoice, RecoveryCallOutcome } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import {
  PhoneCall,
  X,
  Clock,
  Calendar,
  Send,
  AlertTriangle,
} from "lucide-react";

interface RecoveryCallLogModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const OUTCOMES: { id: RecoveryCallOutcome; label: string; color: string }[] = [
  {
    id: "PROMISED_PAYMENT",
    label: "Promised Payment",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  {
    id: "SENT_WHATSAPP_DETAILS",
    label: "Sent Bank Details on WhatsApp",
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  },
  {
    id: "LEFT_VOICEMAIL",
    label: "Call Unanswered / Left Voicemail",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  {
    id: "UNREACHABLE",
    label: "Client Unreachable",
    color: "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10",
  },
  {
    id: "DISPUTED_AMOUNT",
    label: "Disputed Invoice Amount",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
];

export function RecoveryCallLogModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: RecoveryCallLogModalProps) {
  const { recoveryCallLogs, logRecoveryCall } = useData();
  const { formatMoney } = useAgencySettings();

  const [outcome, setOutcome] = useState<RecoveryCallOutcome>("PROMISED_PAYMENT");
  const [notes, setNotes] = useState<string>("");
  const [callbackDate, setCallbackDate] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !invoice) return null;

  const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;

  // Filter and sort calls for this invoice (reverse-chronological)
  const calls = recoveryCallLogs
    .filter((c) => c.invoiceId === invoice.id)
    .sort((a, b) => (b.timestamp || b.created_at || "").localeCompare(a.timestamp || a.created_at || ""));

  const getOutcomeInfo = (out: string) => {
    return OUTCOMES.find((o) => o.id === out) || {
      id: out as RecoveryCallOutcome,
      label: out.replaceAll("_", " "),
      color: "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10",
    };
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Please enter detailed discussion notes regarding this call.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      logRecoveryCall({
        invoiceId: invoice.id,
        outcome,
        notes: notes.trim(),
        callbackDate: callbackDate || undefined,
      });

      setNotes("");
      setCallbackDate("");
      onSuccess?.("Recovery call note logged successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save call log.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50/80 dark:bg-[#080C14]/80 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 border border-[#1B7167]/20">
                Payment Recovery
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {invoice.invoiceNumber}
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Payment Call History — {invoice.clientName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Outstanding: <strong className="text-rose-600 dark:text-rose-400">{formatMoney(outstanding)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Top Form: Log New Call */}
          <form onSubmit={handleSaveLog} className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-3.5">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <PhoneCall className="w-4 h-4 text-[#1B7167] dark:text-teal-400" />
              <span>Log Follow-Up Call Outcome</span>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Call Outcome *
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as RecoveryCallOutcome)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none font-medium"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Next Callback Date (Optional)
                </label>
                <input
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Discussion Notes *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Spoke with client. Promised to transfer balance via bank app by 4 PM..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none placeholder-gray-400"
              />
            </div>

            <div className="text-right">
              <button
                type="submit"
                disabled={isSubmitting || !notes.trim()}
                className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] disabled:opacity-50 px-3.5 py-1.5 rounded-xl shadow-sm text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer [&>svg]:text-white [&>span]:text-white"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Save Call Log</span>
              </button>
            </div>
          </form>

          {/* Bottom Section: Past Follow-up Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1B7167] dark:text-teal-400" />
                Past Collection Touchpoints ({calls.length})
              </h3>
              <span className="text-[10px] text-gray-400">Reverse chronological</span>
            </div>

            {calls.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 rounded-xl bg-gray-50/50 dark:bg-white/[0.01] border border-gray-200 dark:border-white/10">
                No recovery calls recorded for this invoice yet. Log the first touchpoint above.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200 dark:before:bg-white/10">
                {calls.map((call) => {
                  const outcomeInfo = getOutcomeInfo(call.outcome);
                  return (
                    <div key={call.id} className="relative pl-8 space-y-1.5">
                      {/* Timeline marker icon */}
                      <div className="absolute left-1.5 -translate-x-1/2 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-xs">
                        <PhoneCall className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span
                            className={`px-2 py-0.5 rounded border font-mono font-bold text-[10px] ${outcomeInfo.color}`}
                          >
                            {outcomeInfo.label}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {call.timestamp?.slice(0, 16).replace("T", " ") || call.created_at?.slice(0, 16).replace("T", " ") || "Recent"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {call.notes}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5 border-t border-gray-100 dark:border-white/5">
                          <span>
                            Logged by: <strong className="text-gray-700 dark:text-gray-300 font-medium">{call.staffName}</strong>
                          </span>
                          {call.callbackDate && (
                            <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Callback: {call.callbackDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
