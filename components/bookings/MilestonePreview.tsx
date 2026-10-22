"use client";

import React from "react";
import { useAgencySettings } from "@/context/ThemeContext";
import { PaymentMethod } from "@/types/erp";
import {
  CreditCard,
  Calendar,
  Receipt,
  Clock,
  Coins,
} from "lucide-react";

interface MilestonePreviewProps {
  totalAmount: number;
  initialDeposit: number;
  onChangeInitialDeposit: (amount: number) => void;
  paymentMethod: PaymentMethod;
  onChangePaymentMethod: (method: PaymentMethod) => void;
  paymentReference: string;
  onChangePaymentReference: (ref: string) => void;
  departureDate?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "Bank Wire", "Credit Card", "Cheque"];

export function MilestonePreview({
  totalAmount,
  initialDeposit,
  onChangeInitialDeposit,
  paymentMethod,
  onChangePaymentMethod,
  paymentReference,
  onChangePaymentReference,
  departureDate,
}: MilestonePreviewProps) {
  const { formatMoney } = useAgencySettings();

  const safeDeposit = Math.max(0, Math.min(initialDeposit, totalAmount));
  const remaining = Math.max(0, totalAmount - safeDeposit);
  const midTerm = Math.round((remaining * 0.5) * 100) / 100;
  const finalBalance = Math.round((remaining - midTerm) * 100) / 100;

  const todayStr = new Date().toISOString().slice(0, 10);

  const getCalculatedDueDate = (daysBefore: number) => {
    if (!departureDate) return todayStr;
    const base = new Date(`${departureDate}T12:00:00Z`);
    if (isNaN(base.getTime())) return todayStr;
    base.setUTCDate(base.getUTCDate() - daysBefore);
    const calculated = base.toISOString().slice(0, 10);
    return calculated < todayStr ? todayStr : calculated;
  };

  const milestones = [
    {
      name: "Initial Token Deposit",
      amount: safeDeposit,
      dueDate: todayStr,
      status: safeDeposit > 0 ? "COLLECTED_NOW" : "PENDING",
      icon: Coins,
    },
    {
      name: "Mid-term Installment (50% Balance)",
      amount: midTerm,
      dueDate: getCalculatedDueDate(30),
      status: "SCHEDULED",
      icon: Clock,
    },
    {
      name: "Pre-Departure Final Balance",
      amount: finalBalance,
      dueDate: getCalculatedDueDate(14),
      status: "SCHEDULED",
      icon: Receipt,
    },
  ];

  return (
    <div className="space-y-4 text-gray-900 dark:text-white">
      {/* Commercial Summary Banner */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400">
            Total Commercial Value
          </span>
          <p className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-0.5">
            {formatMoney(totalAmount)}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400">
            Remaining Receivable
          </span>
          <p className="text-xl font-bold font-mono text-[#1B7167] dark:text-teal-400 mt-0.5">
            {formatMoney(remaining)}
          </p>
        </div>
      </div>

      {/* Initial Payment Collection Form */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-4 shadow-sm">
        <h4 className="font-bold text-xs font-sans text-gray-900 dark:text-white flex items-center gap-1.5 border-b border-gray-100 dark:border-white/10 pb-2">
          <CreditCard className="w-3.5 h-3.5 text-[#1B7167]" />
          Initial Payment Collection (Optional Token)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token Deposit Amount (PKR)
            </label>
            <input
              type="number"
              min={0}
              max={totalAmount}
              step={1000}
              value={initialDeposit}
              onChange={(e) => onChangeInitialDeposit(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => onChangePaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none font-medium"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction / Cheque Ref (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TR-990182 / HBL"
              value={paymentReference}
              onChange={(e) => onChangePaymentReference(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Live Installment Milestones Schedule */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] overflow-hidden shadow-sm">
        <div className="p-3.5 bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold font-sans text-gray-900 dark:text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#1B7167]" />
            Generated Installment Schedule
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            3-Tier Milestone Schedule
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
          {milestones.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      m.status === "COLLECTED_NOW"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-gray-900 dark:text-white font-sans">
                      {m.name}
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      Due Date: <strong className="text-gray-700 dark:text-gray-300">{m.dueDate}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold font-mono text-sm text-gray-900 dark:text-white">
                    {formatMoney(m.amount)}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                      m.status === "COLLECTED_NOW"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500"
                    }`}
                  >
                    {m.status === "COLLECTED_NOW" ? "Paid at Booking" : "Scheduled"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
