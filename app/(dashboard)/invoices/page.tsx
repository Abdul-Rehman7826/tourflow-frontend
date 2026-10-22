"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { VerifyPaymentModal } from "@/components/invoices/VerifyPaymentModal";
import type { Invoice } from "@/types/erp";
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  TrendingUp,
} from "lucide-react";

// Reference date for simulation / calculations
const SIMULATION_DATE = "2026-09-15";

type AgingBucket = "ALL" | "CURRENT" | "1-15_DAYS" | "16-30_DAYS" | "31+_DAYS";

export default function InvoicesPage() {
  const { settings, formatMoney } = useAgencySettings();
  const { invoices, paymentProofClaims } = useData();
  const { tenant } = useTenant();
  const { user } = useAuth();

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [agingFilter, setAgingFilter] = useState<AgingBucket>("ALL");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [isVerificationQueueOpen, setIsVerificationQueueOpen] = useState(true);
  const [reviewingClaimId, setReviewingClaimId] = useState<string | null>(null);

  // Helper to calculate aging bucket
  const getAgingBucket = (inv: Invoice): "CURRENT" | "1-15_DAYS" | "16-30_DAYS" | "31+_DAYS" => {
    const dueAmount = inv.dueAmount ?? inv.outstandingAmount ?? 0;
    if (inv.status === "PAID" || inv.status === "CANCELLED" || dueAmount <= 0) {
      return "CURRENT";
    }
    const dueDateStr = inv.dueDate || inv.finalDueDate;
    if (!dueDateStr) return "CURRENT";
    const due = new Date(dueDateStr).getTime();
    const ref = new Date(SIMULATION_DATE).getTime();
    const diffDays = Math.floor((ref - due) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "CURRENT";
    if (diffDays <= 15) return "1-15_DAYS";
    if (diffDays <= 30) return "16-30_DAYS";
    return "31+_DAYS";
  };

  const getOverdueDays = (inv: Invoice): number => {
    const dueAmount = inv.dueAmount ?? inv.outstandingAmount ?? 0;
    if (inv.status === "PAID" || inv.status === "CANCELLED" || dueAmount <= 0) {
      return 0;
    }
    const dueDateStr = inv.dueDate || inv.finalDueDate;
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr).getTime();
    const ref = new Date(SIMULATION_DATE).getTime();
    return Math.max(0, Math.floor((ref - due) / (1000 * 60 * 60 * 24)));
  };

  // Pending verification claims for this agency
  const pendingClaims = useMemo(() => {
    return paymentProofClaims.filter((claim) => {
      if (claim.status !== "PENDING_VERIFICATION") return false;
      const linkedInvoice = invoices.find((inv) => inv.id === claim.invoiceId);
      return linkedInvoice && linkedInvoice.tenantId === tenant.id;
    });
  }, [paymentProofClaims, invoices, tenant.id]);

  // Aging totals calculation
  const agingStats = useMemo(() => {
    const counts = {
      CURRENT: { count: 0, amount: 0 },
      "1-15_DAYS": { count: 0, amount: 0 },
      "16-30_DAYS": { count: 0, amount: 0 },
      "31+_DAYS": { count: 0, amount: 0 },
    };

    invoices.forEach((inv) => {
      const bucket = getAgingBucket(inv);
      const outstanding = inv.dueAmount ?? inv.outstandingAmount ?? 0;
      counts[bucket].count += 1;
      counts[bucket].amount += outstanding;
    });

    return counts;
  }, [invoices]);

  // Aggregate KPI Stats
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce(
      (sum, i) => sum + (i.status === "CANCELLED" ? i.refund?.cancellationFeeRetained ?? 0 : i.totalAmount),
      0
    );
    const totalPaid = invoices.reduce(
      (sum, i) => sum + i.paidAmount - (i.refund?.refundAmountIssued ?? 0),
      0
    );
    const totalDue = invoices.reduce((sum, i) => sum + (i.dueAmount ?? i.outstandingAmount ?? 0), 0);
    const overdueCount = invoices.filter((i) => {
      if (i.status === "CANCELLED" || i.status === "PAID") return false;
      return i.status === "OVERDUE" || getOverdueDays(i) > 0;
    }).length;

    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    return { totalBilled, totalPaid, totalDue, overdueCount, collectionRate };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchBooking = inv.bookingRef?.toLowerCase().includes(q);
        const matchClient = inv.clientName?.toLowerCase().includes(q);
        const matchPhone = inv.clientPhone?.toLowerCase().includes(q);
        const matchDesc = (inv.serviceDescription || inv.packageTitle || "").toLowerCase().includes(q);
        if (!matchNum && !matchBooking && !matchClient && !matchPhone && !matchDesc) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "OVERDUE") {
          const isOverdue = inv.status === "OVERDUE" || (inv.status !== "PAID" && inv.status !== "CANCELLED" && getOverdueDays(inv) > 0);
          if (!isOverdue) return false;
        } else if (inv.status !== statusFilter) {
          return false;
        }
      }

      // Aging filter
      if (agingFilter !== "ALL") {
        const bucket = getAgingBucket(inv);
        if (bucket !== agingFilter) return false;
      }

      // Service category filter
      if (serviceFilter !== "ALL") {
        const category = inv.serviceCategory || "GROUP_TOUR";
        if (category !== serviceFilter) return false;
      }

      return true;
    });
  }, [invoices, searchQuery, statusFilter, agingFilter, serviceFilter]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1B7167]/10 text-[#1B7167] dark:text-emerald-400 border border-[#1B7167]/20 uppercase tracking-wider">
              {settings.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Finance &amp; Receivables Desk
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
            Milestone Invoices &amp; AR Desk
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Two-Step Financial Clearance Gate, milestone installment schedules, accounts receivable aging, and tax invoicing.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {pendingClaims.length > 0 && (user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN") && (
            <button
              onClick={() => setIsVerificationQueueOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1B7167] hover:bg-[#155A52] text-white text-xs font-bold shadow-md shadow-[#1B7167]/25 transition-all cursor-pointer animate-pulse"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{pendingClaims.length} Claim{pendingClaims.length > 1 ? "s" : ""} Awaiting Review</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TWO-STEP CLEARANCE GATE BANNER (IF PENDING PROOFS) */}
      {pendingClaims.length > 0 && (
        <div className="rounded-2xl border border-[#1B7167]/30 bg-[#1B7167]/[0.06] dark:bg-[#1B7167]/10 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B7167]/20 text-[#1B7167] dark:text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Two-Step Financial Clearance Gate</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1B7167] text-white">
                    {pendingClaims.length} Action{pendingClaims.length > 1 ? "s" : ""} Required
                  </span>
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Customer payment claims submitted by Front Desk require Agency Admin verification before settling milestone balances.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVerificationQueueOpen(!isVerificationQueueOpen)}
              className="px-3 py-1.5 rounded-lg border border-[#1B7167]/30 text-[#1B7167] dark:text-emerald-400 hover:bg-[#1B7167]/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isVerificationQueueOpen ? "Hide Queue" : "View Claims"}</span>
              {isVerificationQueueOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isVerificationQueueOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#1B7167]/20">
              {pendingClaims.map((claim) => {
                const linkedInv = invoices.find((i) => i.id === claim.invoiceId);
                return (
                  <div
                    key={claim.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] space-y-3 shadow-sm hover:border-[#1B7167]/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-[#1B7167] dark:text-emerald-400">
                          {linkedInv?.invoiceNumber || "Invoice"}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                          {linkedInv?.clientName || "Client"}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Verification Pending
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Claim Amount:</span>
                        <strong className="font-mono text-gray-900 dark:text-white text-sm">
                          {formatMoney(claim.amount)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Reference:</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{claim.bankReference}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Submitted By:</span>
                        <span>{claim.staffName}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/5">
                      <Link
                        href={`/invoices/${claim.invoiceId}`}
                        className="text-[11px] font-semibold text-[#1B7167] dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open Invoice</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN" ? (
                        <button
                          onClick={() => setReviewingClaimId(claim.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#1B7167] hover:bg-[#155A52] text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Review &amp; Clear</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Admin Clearance Required</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. FINANCIAL KPI SUMMARY STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Invoiced Volume</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-white">{formatMoney(stats.totalBilled)}</p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{invoices.length} Registered Invoices</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Cash Inflow</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(stats.totalPaid)}</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400/90 font-semibold">
              {stats.collectionRate}% Collection Efficiency
            </span>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Accounts Receivable (AR)</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{formatMoney(stats.totalDue)}</p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Unsettled Milestone Balances</span>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overdue Installments</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{stats.overdueCount}</p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Recovery desk follow-up</span>
          </div>
        </div>
      </div>

      {/* 4. ACCOUNTS RECEIVABLE AGING DESK */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Accounts Receivable Aging Schedule (As of {SIMULATION_DATE})</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Monitor debt maturity, overdue risk buckets, and prioritize milestone collection.
            </p>
          </div>
          {agingFilter !== "ALL" && (
            <button
              onClick={() => setAgingFilter("ALL")}
              className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Clear Aging Filter
            </button>
          )}
        </div>

        {/* Aging Buckets Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Current / Not Due */}
          <div
            onClick={() => setAgingFilter(agingFilter === "CURRENT" ? "ALL" : "CURRENT")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              agingFilter === "CURRENT"
                ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                : "border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-[#080C14] hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Current (Not Due)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                {agingStats.CURRENT.count}
              </span>
            </div>
            <p className="text-lg font-black font-mono text-gray-900 dark:text-white mt-2">
              {formatMoney(agingStats.CURRENT.amount)}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Due in future milestone dates</p>
          </div>

          {/* 1 - 15 Days Overdue */}
          <div
            onClick={() => setAgingFilter(agingFilter === "1-15_DAYS" ? "ALL" : "1-15_DAYS")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              agingFilter === "1-15_DAYS"
                ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20"
                : "border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-[#080C14] hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                1 - 15 Days Past Due
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300">
                {agingStats["1-15_DAYS"].count}
              </span>
            </div>
            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
              {formatMoney(agingStats["1-15_DAYS"].amount)}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Send friendly WhatsApp reminder</p>
          </div>

          {/* 16 - 30 Days Overdue */}
          <div
            onClick={() => setAgingFilter(agingFilter === "16-30_DAYS" ? "ALL" : "16-30_DAYS")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              agingFilter === "16-30_DAYS"
                ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20"
                : "border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-[#080C14] hover:border-orange-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                16 - 30 Days Past Due
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-600 dark:text-orange-300">
                {agingStats["16-30_DAYS"].count}
              </span>
            </div>
            <p className="text-lg font-black font-mono text-orange-600 dark:text-orange-400 mt-2">
              {formatMoney(agingStats["16-30_DAYS"].amount)}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Log telephone recovery call</p>
          </div>

          {/* 31+ Days Overdue */}
          <div
            onClick={() => setAgingFilter(agingFilter === "31+_DAYS" ? "ALL" : "31+_DAYS")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              agingFilter === "31+_DAYS"
                ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20"
                : "border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-[#080C14] hover:border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                31+ Days (High Risk)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300">
                {agingStats["31+_DAYS"].count}
              </span>
            </div>
            <p className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-2">
              {formatMoney(agingStats["31+_DAYS"].amount)}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Escalated management clearance</p>
          </div>
        </div>
      </div>

      {/* 5. SEARCH & ADVANCED FILTERS */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, booking ref, client name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid in Full</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Service Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400 text-[11px]">Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer transition-colors"
            >
              <option value="ALL">All Categories</option>
              <option value="GROUP_TOUR">Group Tours</option>
              <option value="VISA_CONSULTANCY">Visa Consultancy</option>
              <option value="UMRAH">Umrah Services</option>
              <option value="CUSTOM_PACKAGE">Custom Packages</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. INVOICES DATA TABLE */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#080C14] text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-white/10">
                <th className="py-3.5 px-4 font-semibold">Invoice &amp; Booking</th>
                <th className="py-3.5 px-4 font-semibold">Client Name &amp; Phone</th>
                <th className="py-3.5 px-4 font-semibold">Service / Package</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Billed</th>
                <th className="py-3.5 px-4 font-semibold text-right">Paid / Progress</th>
                <th className="py-3.5 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3.5 px-4 font-semibold text-center">Aging</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 dark:text-gray-500">
                    No invoices match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const outstanding = inv.dueAmount ?? inv.outstandingAmount ?? 0;
                  const overdueDays = getOverdueDays(inv);
                  const paidPct = inv.totalAmount > 0 ? Math.min(100, Math.round((inv.paidAmount / inv.totalAmount) * 100)) : 0;
                  const hasPendingProof = pendingClaims.some((c) => c.invoiceId === inv.id);

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Invoice & Booking Ref */}
                      <td className="py-3.5 px-4 font-mono">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        {inv.bookingRef && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-mono">
                            {inv.bookingRef}
                          </span>
                        )}
                      </td>

                      {/* Client Details */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white text-xs">{inv.clientName}</p>
                        {inv.clientPhone && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{inv.clientPhone}</p>
                        )}
                      </td>

                      {/* Service / Category */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 mb-0.5">
                          {(inv.serviceCategory || "GROUP_TOUR").replaceAll("_", " ")}
                        </span>
                        <p className="text-gray-900 dark:text-white truncate font-medium">
                          {inv.packageTitle || inv.serviceDescription}
                        </p>
                      </td>

                      {/* Total Billed */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                        {formatMoney(inv.totalAmount)}
                      </td>

                      {/* Paid & Progress */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(inv.paidAmount)}
                        </span>
                        <div className="w-20 ml-auto bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${paidPct >= 100 ? "bg-emerald-500" : "bg-purple-600"}`}
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}>
                          {formatMoney(outstanding)}
                        </span>
                      </td>

                      {/* Aging Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {outstanding === 0 ? (
                          <span className="text-[10px] text-gray-400 font-mono">Cleared</span>
                        ) : overdueDays === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Current
                          </span>
                        ) : overdueDays <= 15 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {overdueDays}d past due
                          </span>
                        ) : overdueDays <= 30 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            {overdueDays}d past due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                            {overdueDays}d Critical
                          </span>
                        )}
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : inv.status === "PARTIALLY_PAID"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : inv.status === "CANCELLED"
                              ? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPendingProof && user?.role === "AGENCY_ADMIN" && (
                            <span
                              title="Proof Claim Pending Admin Review"
                              className="w-2 h-2 rounded-full bg-amber-500 animate-ping"
                            />
                          )}

                          <Link
                            href={`/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1B7167] hover:bg-[#155A52] text-white font-semibold text-xs shadow-sm shadow-[#1B7167]/20 transition-all"
                          >
                            <span>View / Pay</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal for Admin */}
      {reviewingClaimId && (
        <VerifyPaymentModal
          claimId={reviewingClaimId}
          onClose={() => setReviewingClaimId(null)}
        />
      )}
    </div>
  );
}
