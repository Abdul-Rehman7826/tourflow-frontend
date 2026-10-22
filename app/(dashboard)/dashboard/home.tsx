"use client";

import { useAgencySettings } from "@/context/ThemeContext";
import { paymentReminders, unpaidMilestones } from "@/lib/agency-settings";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { profileHomeRoute } from "@/lib/profile-session";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { useTenant } from "@/context/TenantContext";
import { calculateExecutiveAnalytics } from "@/lib/analytics-governance";
import {
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  Send,
  ArrowRight,
  Sparkles,
  Plane,
  BarChart3,
  Lock,
} from "lucide-react";

export default function ExecutiveDashboardPage() {
  const { settings, formatMoney } = useAgencySettings();
  const { invoices, tours, bookings, expenses, officeExpenses, leads } = useData();
  const { role } = useRole();
  const { tenant } = useTenant();

  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Amounts are shown as plain numbers in the agency workspace.


  const router = useRouter();

  useEffect(() => {
    if (role && role !== "AGENCY_ADMIN") {
      const dest = profileHomeRoute(role);
      if (dest && dest !== "/dashboard") {
        router.replace(dest);
      }
    }
  }, [role, router]);

  // ==========================================================================
  // 1. ROLE GUARD: REDIRECT TO ROLE WORKSPACE IF NOT AGENCY ADMIN
  // ==========================================================================
  if (role !== "AGENCY_ADMIN") {
    const dest = profileHomeRoute(role);
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Executive Space Restricted
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Executive Financial Intelligence is reserved for Agency Admins. Taking you to your assigned workspace...
            </p>
          </div>
          <Link
            href={dest}
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-lg bg-[#1B7167] hover:bg-[#155b53] text-white font-medium text-xs shadow-sm transition-all"
          >
            <span>Open Your Assigned Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. FINANCIAL & OPERATIONAL KPIS
  // ==========================================================================
  const REFERENCE_DATE = new Date();

  const financialKPIs = (() => {
    const analytics = calculateExecutiveAnalytics(
      tenant.id,
      invoices,
      tours,
      bookings,
      expenses,
      REFERENCE_DATE.toISOString().slice(0, 10),
      officeExpenses,
    );
    const totalCapacity = tours.reduce((sum, t) => sum + t.maxCapacity, 0);
    const totalBooked = tours.reduce((sum, t) => sum + t.bookedSeats, 0);
    const occupancyPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    return {
      grossRevenue: analytics.grossBilled,
      totalCollected: analytics.realizedCash,
      totalDue: analytics.outstandingTotal,
      occupancyPercent,
      totalBooked,
      totalCapacity,
      realizedROI: analytics.tourRoiPercent,
      netProfit: analytics.netTourProfit,
      tourMarginPercent: analytics.tourMarginPercent,
      officeOverheads: analytics.officeOverheads,
      aging: analytics.outstandingAging,
    };
  })();

  // Cash Flow Comparison Data (May - Oct 2026)
  const cashFlowData = [
    { month: "May", inflow: 12500000, outflow: 8200000, label: "May 2026" },
    { month: "Jun", inflow: 16800000, outflow: 10400000, label: "Jun 2026" },
    { month: "Jul", inflow: 19400000, outflow: 12100000, label: "Jul 2026" },
    { month: "Aug", inflow: 24200000, outflow: 14800000, label: "Aug 2026" },
    { month: "Sep", inflow: 28600000, outflow: 16200000, label: "Sep 2026 (Current)" },
    { month: "Oct", inflow: 22100000, outflow: 13500000, label: "Oct 2026 (Forecast)" },
  ];

  const maxCashFlow = Math.max(...cashFlowData.map((d) => Math.max(d.inflow, d.outflow)));

  // Upcoming Due Balances (Due within 7 Days or Overdue)
  const upcomingDueInvoices = (() => {
    return invoices.filter((inv) => inv.dueAmount > 0).flatMap((inv) => {
        const milestones = unpaidMilestones(inv);
        return paymentReminders(milestones, settings.reminderDays, REFERENCE_DATE).map((ms) => ({
          ...inv, id: inv.id, reminderId: inv.id + "-" + ms.id,
          serviceDescription: inv.serviceDescription + " / " + ms.title,
          dueDate: ms.dueDate, dueAmount: ms.amount,
          diffDays: Math.ceil((Date.parse(ms.dueDate) - Date.UTC(REFERENCE_DATE.getFullYear(), REFERENCE_DATE.getMonth(), REFERENCE_DATE.getDate())) / 86400000),
        }));
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  })();

  return (
    <div className="space-y-8">

      {/* EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              {settings.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Executive Analytics
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-1.5">
            Operations &amp; Financial Overview
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cash flow performance, aging receivables ledger, departure load factors, and realized ROI.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/invoices"
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors shadow-xs flex items-center gap-2"
          >
            <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Invoices Ledger</span>
          </Link>
          <Link
            href="/tours"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors shadow-sm shadow-purple-600/25 flex items-center gap-1.5"
          >
            <Plane className="w-4 h-4" />
            <span>Tour Departures</span>
          </Link>
        </div>
      </div>

      {tours.length === 0 && invoices.length === 0 && leads.length === 0 && (
        <section
          role="status"
          className="rounded-2xl border border-dashed border-[#1B7167]/30 bg-[#1B7167]/5 p-6 dark:bg-[#1B7167]/10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-white">No operational activity yet</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
                KPIs are safely showing zero. Add an inquiry or create a tour departure to begin building the executive overview.
              </p>
            </div>
            <Link
              href="/leads"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#155b53]"
            >
              Open Lead Intake
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 5 TOP EXECUTIVE KPI CARDS (iToolVerse Card Pattern) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Gross Invoiced Revenue */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 transition-all duration-200 hover:border-purple-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              +18.4%
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Gross Billed</div>
            <div className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-0.5">
              {formatMoney(financialKPIs.grossRevenue)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Issued, non-cancelled invoices
          </p>
        </div>

        {/* 2. Total Collected (Cash Inflow) */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 transition-all duration-200 hover:border-purple-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {financialKPIs.grossRevenue > 0
                ? Math.round((financialKPIs.totalCollected / financialKPIs.grossRevenue) * 100)
                : 0}% Paid
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Realized Cash</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatMoney(financialKPIs.totalCollected)}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Verified receipts only; pending claims excluded
          </p>
        </div>

        {/* 3. Total Accounts Receivable (Aging Breakdown) */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 transition-all duration-200 hover:border-purple-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Receivables
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Accounts Receivable</div>
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {formatMoney(financialKPIs.totalDue)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] pt-0.5">
            <span className="text-gray-500 dark:text-gray-400">Current: {formatMoney(financialKPIs.aging.current)}</span>
            <span className="text-amber-600">1-30d: {formatMoney(financialKPIs.aging.days1To30)}</span>
            <span className="text-orange-600">31-60d: {formatMoney(financialKPIs.aging.days31To60)}</span>
            <span className="text-rose-500 font-semibold">61d+: {formatMoney(financialKPIs.aging.days61Plus)}</span>
          </div>
        </div>

        {/* 4. Active Tour Occupancy % */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 transition-all duration-200 hover:border-purple-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              {financialKPIs.occupancyPercent}%
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tour Occupancy</div>
            <div className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-0.5">
              {financialKPIs.totalBooked} / {financialKPIs.totalCapacity}
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${financialKPIs.occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* 5. Net Realized ROI % */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 transition-all duration-200 hover:border-purple-500/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              Active
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Net Realized ROI</div>
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              +{financialKPIs.realizedROI}%
            </div>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Net Profit: {formatMoney(financialKPIs.netProfit)} | Office overheads: {formatMoney(financialKPIs.officeOverheads)}
          </p>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* CASH FLOW COMPARISON BAR CHART (Monthly Inflow vs Vendor Outflow) */}
      {/* ==================================================================== */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-xs space-y-6 hover:border-purple-500/40 transition-all">
        
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Cash Flow Comparison (Monthly Inflow vs. Vendor Outflow)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Monthly gross customer collections against direct airline, hotel, and supplier disbursements.
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-600 shadow-xs" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Customer Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500 shadow-xs" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Vendor Outflow</span>
            </div>
          </div>
        </div>

        {/* SVG/CSS Responsive Interactive Bar Chart */}
        <div className="relative pt-4">
          <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-56 w-full border-b border-gray-200 dark:border-white/10 pb-3">
            {cashFlowData.map((item, idx) => {
              const inflowHeight = Math.round((item.inflow / maxCashFlow) * 100);
              const outflowHeight = Math.round((item.outflow / maxCashFlow) * 100);
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={item.month}
                  className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-30 p-2.5 rounded-lg bg-gray-900 dark:bg-black text-white text-[11px] shadow-xl border border-gray-800 whitespace-nowrap pointer-events-none animate-in fade-in duration-100">
                      <div className="font-bold border-b border-gray-800 pb-1 mb-1">{item.label}</div>
                      <div className="flex items-center gap-2 text-purple-400">
                        <span>Inflow:</span>
                        <span className="font-mono">{formatMoney(item.inflow)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-400">
                        <span>Outflow:</span>
                        <span className="font-mono">{formatMoney(item.outflow)}</span>
                      </div>
                    </div>
                  )}

                  {/* Dual Bars */}
                  <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 w-full h-full">
                    {/* Inflow Bar */}
                    <div
                      className="w-4 sm:w-8 bg-purple-600 hover:bg-purple-500 rounded-t-md transition-all duration-300 shadow-xs"
                      style={{ height: `${inflowHeight}%` }}
                      title={`Inflow: ${formatMoney(item.inflow)}`}
                    />
                    {/* Outflow Bar */}
                    <div
                      className="w-4 sm:w-8 bg-amber-500/80 hover:bg-amber-500 rounded-t-md transition-all duration-300 shadow-xs"
                      style={{ height: `${outflowHeight}%` }}
                      title={`Outflow: ${formatMoney(item.outflow)}`}
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-2">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-2">
            <span>Historical Ledger &amp; Q3 Projection</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">+51% Operating Cash Flow Surplus</span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* UPCOMING DUE BALANCES TABLE (WITH WHATSAPP REMINDER) */}
      {/* ==================================================================== */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-xs overflow-hidden">
        
        {/* Table Header Section */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Upcoming Due Balances (Within {settings.reminderDays} Days or Overdue)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Travelers with pending installment milestones due for collection before tour departure clearance.
            </p>
          </div>

          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {upcomingDueInvoices.length} Pending Clearance
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Traveler / Client</th>
                <th className="py-3 px-4">Service Description</th>
                <th className="py-3 px-4 text-right">Total Invoiced</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {upcomingDueInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 dark:text-white">All upcoming installments cleared!</p>
                    <p className="text-xs text-gray-500">No unpaid milestones are overdue or due within the next {settings.reminderDays} days.</p>
                  </td>
                </tr>
              ) : (
                upcomingDueInvoices.map((inv) => {
                  const isUrgentDue = inv.diffDays <= 3;

                  return (
                    <tr key={inv.reminderId} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      
                      {/* Client Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-gray-900 dark:text-white text-xs">{inv.clientName}</p>
                          {inv.clientPhone && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {inv.clientPhone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Service / Tour */}
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {inv.serviceDescription}
                      </td>

                      {/* Total Invoiced */}
                      <td className="py-3.5 px-4 text-right font-mono text-gray-500 dark:text-gray-400">
                        {formatMoney(inv.totalAmount)}
                      </td>

                      {/* Remaining Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {formatMoney(inv.dueAmount)}
                      </td>

                      {/* Due Schedule & Days Left */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-gray-900 dark:text-white text-xs block font-semibold">
                            {inv.dueDate}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            inv.diffDays < 0
                              ? "text-rose-500"
                              : isUrgentDue
                              ? "text-rose-500"
                              : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {inv.diffDays < 0
                              ? `Overdue by ${Math.abs(inv.diffDays)} days`
                              : inv.diffDays === 0
                              ? "Due Today"
                              : `Due in ${inv.diffDays} days`}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.status === "OVERDUE"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Action: Send WhatsApp Reminder & View Invoice */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* WhatsApp Reminder Button */}
                          <a
                            href={`https://wa.me/${(inv.clientPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Assalam-o-Alaikum ${inv.clientName},\n\nThis is a payment courtesy reminder from ${settings.name} regarding your upcoming installment for ${inv.serviceDescription}.\n\nOutstanding Balance Due: ${formatMoney(inv.dueAmount)}\nScheduled Due Date: ${inv.dueDate}\n\nPlease share your bank transfer confirmation once cleared. Feel free to contact us for queries.\n\nWarm regards,\n${settings.name} Finance Desk`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition-colors"
                            title="Send pre-filled WhatsApp reminder"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title="View Invoice & Record Payment"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
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

        {/* Table Footer */}
        <div className="p-4 bg-gray-50/70 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-900 dark:text-white">{upcomingDueInvoices.length}</strong> invoices with imminent clearance milestones
          </span>
          <Link
            href="/invoices"
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold text-xs flex items-center gap-1"
          >
            <span>Full Invoices Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
}
