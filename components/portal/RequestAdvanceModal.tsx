"use client";

import React, { useState } from "react";
import { Coins, ShieldAlert, Sparkles, X } from "lucide-react";

export interface RequestAdvanceModalProps {
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    payrollMonth: string;
    reason: string;
    acknowledged: boolean;
  }) => Promise<void> | void;
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 30000];

export function RequestAdvanceModal({ onClose, onSubmit }: RequestAdvanceModalProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const defaultNextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const [amount, setAmount] = useState<number>(10000);
  const [payrollMonth, setPayrollMonth] = useState<string>(defaultNextMonth);
  const [reason, setReason] = useState<string>("");
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError("Please enter a valid salary advance amount in PKR.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a descriptive explanation for your advance request.");
      return;
    }
    if (reason.trim().length < 6) {
      setError("Reason must be at least 6 characters long.");
      return;
    }
    if (!acknowledged) {
      setError("You must acknowledge and authorize the salary deduction.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        amount,
        payrollMonth,
        reason: reason.trim(),
        acknowledged,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to submit advance request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-advance-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19] text-gray-900 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-white/10 bg-gradient-to-r from-gray-50 to-white dark:from-white/[0.02] dark:to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider uppercase border border-emerald-500/20 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Employee Self-Service
              </span>
              <span className="font-mono text-xs text-gray-400">SRS §4.9.9</span>
            </div>
            <h2 id="request-advance-modal-title" className="text-xl font-black text-gray-950 dark:text-white">
              Request Salary Advance
            </h2>
            <p className="text-xs text-gray-500">
              Submit advance compensation request for management and HR approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advance request modal"
            className="rounded-xl p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Amount Field with Quick Preset Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Advance Amount (PKR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-gray-400">
                PKR
              </span>
              <input
                type="number"
                min="1000"
                step="500"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="e.g. 10000"
                className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#030712] font-mono text-sm font-bold text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                required
              />
            </div>

            {/* Quick Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-medium">Quick Presets:</span>
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                    amount === val
                      ? "bg-[#1B7167] text-white shadow-xs"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  PKR {val.toLocaleString("en-PK")}
                </button>
              ))}
            </div>
          </div>

          {/* Target Repayment Month */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Target Recovery Payroll Month <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              min={currentMonth}
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#030712] text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
              required
            />
            <p className="text-[10px] text-gray-400">
              Approved advance will be deducted from your net pay in this month&apos;s payroll cycle.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Stated Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for this advance request (e.g., Medical emergency, personal travel expenses)..."
              className="w-full resize-none px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#030712] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
              required
            />
          </div>

          {/* Policy Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-sm border-gray-300 text-[#1B7167] focus:ring-[#1B7167]"
            />
            <span className="text-gray-600 dark:text-gray-300 font-medium text-[11px] leading-relaxed">
              I authorize World Class Holidays (Pvt) Ltd. to recover this amount directly from my net payable salary in the selected payroll cycle.
            </span>
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !reason.trim() || !acknowledged}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer [&>svg]:text-white [&>span]:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-white font-medium">
                {isSubmitting ? "Submitting Request..." : "Submit Advance Request"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
