"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  KeyRound,
  Database,
} from "lucide-react";
import { DEMO_ACCOUNTS, DemoAccount } from "@/lib/demo-auth";
import { useAuth } from "@/context/AuthContext";
import { seedAllDemoData } from "@/lib/demo-data";

interface DemoLoginCardProps {
  onFillCredentials?: (email: string, password: string) => void;
  className?: string;
}

export function DemoLoginCard({ onFillCredentials, className = "" }: DemoLoginCardProps) {
  const router = useRouter();
  const { loginWithDemo } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("emp-001");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [seededMessage, setSeededMessage] = useState<string | null>(null);

  const selectedAccount = DEMO_ACCOUNTS.find((a) => a.id === selectedAccountId) || DEMO_ACCOUNTS[0];

  const handleLaunchDemo = (account: DemoAccount) => {
    setLaunchingId(account.id);
    try {
      const result = loginWithDemo(account);
      if (result.success && result.targetRoute) {
        router.replace(result.targetRoute);
      }
    } catch (err) {
      console.error("Demo login error:", err);
      setLaunchingId(null);
    }
  };

  const handleCopy = (text: string, field: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleFill = (account: DemoAccount) => {
    if (onFillCredentials) {
      onFillCredentials(account.email, account.password);
    }
  };

  const handleResetData = () => {
    seedAllDemoData("tenant-world-class", true);
    setSeededMessage("Demo ERP datasets refreshed!");
    setTimeout(() => setSeededMessage(null), 3000);
  };

  return (
    <div
      className={`rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-white/95 to-emerald-50/30 p-5 sm:p-6 shadow-xl backdrop-blur-xl dark:border-emerald-500/20 dark:from-[#081512]/95 dark:to-[#040E0C]/90 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B7167] to-[#0E5C53] text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                Quick Demo Access
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#1B7167] dark:text-emerald-300 border border-emerald-500/20">
                Instant 1-Click
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Explore TourFlow ERP with pre-loaded demo records
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          title="Reset and refresh all demo records to initial state"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition cursor-pointer"
        >
          <Database className="w-3 h-3 text-[#1B7167] dark:text-emerald-400" />
          <span>Reset Data</span>
        </button>
      </div>

      {seededMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-medium text-[11px]">{seededMessage}</span>
        </div>
      )}

      {/* Role Selector Pills */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const isSelected = account.id === selectedAccountId;
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => setSelectedAccountId(account.id)}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                isSelected
                  ? "bg-[#1B7167]/10 dark:bg-emerald-500/15 border-[#1B7167] dark:border-emerald-500/50 shadow-xs"
                  : "bg-white/60 dark:bg-white/5 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15"
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-[10px] shadow-xs"
                style={{ backgroundColor: account.avatarColor }}
              >
                {account.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {account.name.split(" ")[0]}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-medium">
                  {account.roleTitle.split("&")[0].trim()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Selected Role Card Details */}
      <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-[#071310] border border-slate-200/90 dark:border-white/10 space-y-3.5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedAccount.name}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedAccount.badgeColor}`}>
                {selectedAccount.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {selectedAccount.roleTitle} &bull; {selectedAccount.department}
            </p>
          </div>

          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/40 shrink-0">
            <KeyRound className="w-3 h-3" />
            PIN: {selectedAccount.quickPin}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {selectedAccount.description}
        </p>

        {/* Key Features Pill Matrix */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {selectedAccount.keyPermissions.map((perm, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
            >
              <Check className="w-3.5 h-3.5 text-[#1B7167] dark:text-emerald-400 shrink-0" />
              <span className="truncate">{perm}</span>
            </div>
          ))}
        </div>

        {/* Credentials and Actions Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/30 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-white/5 overflow-hidden">
            <span className="truncate max-w-[190px]">{selectedAccount.email}</span>
            <button
              type="button"
              onClick={() => handleCopy(selectedAccount.email, "email")}
              title="Copy demo email"
              className="hover:text-[#1B7167] dark:hover:text-emerald-400 transition ml-auto shrink-0 cursor-pointer"
            >
              {copiedField === "email" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onFillCredentials && (
              <button
                type="button"
                onClick={() => handleFill(selectedAccount)}
                className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition cursor-pointer"
              >
                Fill Form
              </button>
            )}

            <button
              type="button"
              disabled={launchingId === selectedAccount.id}
              onClick={() => handleLaunchDemo(selectedAccount)}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#1B7167] to-[#0E5C53] hover:from-[#165B53] hover:to-[#0C4740] rounded-xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {launchingId === selectedAccount.id ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entering...
                </span>
              ) : (
                <>
                  <span>1-Click Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
