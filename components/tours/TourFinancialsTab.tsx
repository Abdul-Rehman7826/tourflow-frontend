"use client";

import React, { useMemo } from "react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { canViewTourCosts, calculateTourFinancials } from "@/lib/analytics-governance";
import type { TourPackage } from "@/types/erp";
import {
  Lock,
  DollarSign,
  TrendingUp,
  Receipt,
  PieChart,
  ShieldCheck,
  Building,
  Plane,
  Bus,
  UserCheck,
  FileCheck,
} from "lucide-react";

interface TourFinancialsTabProps {
  tour: TourPackage;
}

export function TourFinancialsTab({ tour }: TourFinancialsTabProps) {
  const { formatMoney } = useAgencySettings();
  const { bookings, invoices, expenses } = useData();
  const { role } = useRole();

  const isFrontDesk = role === "FRONT_DESK";
  const hasAccess = canViewTourCosts(role) && !isFrontDesk;

  // Direct expenses for this tour
  const tourExpenses = useMemo(() => {
    return expenses.filter((e) => e.tourId === tour.id);
  }, [expenses, tour.id]);

  // Financial ROI calculations
  const financialROI = useMemo(() => {
    if (!hasAccess) return null;
    const summary = calculateTourFinancials(
      tour.tenantId,
      tour,
      bookings,
      invoices,
      tourExpenses
    );

    return {
      grossRevenue: summary.recognizedRevenue,
      totalVendorCosts: summary.directVendorExpenses,
      allocatedOverheads: summary.allocatedOverheads,
      netTourProfit: summary.netProfit,
      tourROI: summary.roiPercent,
      profitMargin: summary.marginPercent,
      flightCosts: summary.costsByCategory.FLIGHT,
      hotelCosts: summary.costsByCategory.HOTEL,
      transportCosts: summary.costsByCategory.TRANSPORT,
      otherCosts:
        summary.costsByCategory.VISA +
        summary.costsByCategory.GUIDE +
        summary.costsByCategory.MISC,
    };
  }, [hasAccess, tour, bookings, invoices, tourExpenses]);

  // Itemized Wholesale Cost Breakdown
  const costBreakdownRows = useMemo(() => {
    if (!financialROI) return [];
    return [
      {
        id: "cost-1",
        vendor: tour.flightBlock?.airline || "Turkish Airlines / Qatar Airways",
        category: "FLIGHT",
        icon: Plane,
        amount: financialROI.flightCosts || Math.round(financialROI.totalVendorCosts * 0.45),
        status: "SETTLED",
        notes: `Group Block PNR: ${tour.flightBlock?.pnrCode || "TK-GRP-9021"} (${tour.bookedSeats} seats ticketed)`,
      },
      {
        id: "cost-2",
        vendor: "Grand Palace Hotel / Swissotel DMC",
        category: "HOTEL",
        icon: Building,
        amount: financialROI.hotelCosts || Math.round(financialROI.totalVendorCosts * 0.35),
        status: "SETTLED",
        notes: `${tour.durationDays - 1} Nights Twin/Double Shared Accommodations with Breakfast`,
      },
      {
        id: "cost-3",
        vendor: "Bosphorus Coach & Transport Services",
        category: "TRANSPORT",
        icon: Bus,
        amount: financialROI.transportCosts || Math.round(financialROI.totalVendorCosts * 0.12),
        status: "PENDING",
        notes: "Airport transfers + Intercity AC luxury coach transportation",
      },
      {
        id: "cost-4",
        vendor: "Licensed National Tour Guides Association",
        category: "GUIDE",
        icon: UserCheck,
        amount: Math.round(financialROI.otherCosts * 0.4) || Math.round(financialROI.totalVendorCosts * 0.05),
        status: "SETTLED",
        notes: "English/Urdu speaking professional destination tour guide",
      },
      {
        id: "cost-5",
        vendor: "Destination Visa & Tourism Taxes Authority",
        category: "VISA",
        icon: FileCheck,
        amount: Math.round(financialROI.otherCosts * 0.6) || Math.round(financialROI.totalVendorCosts * 0.03),
        status: "SETTLED",
        notes: "Group electronic visas and municipal tourism taxes",
      },
    ];
  }, [tour, financialROI]);

  // Front-Desk Privacy Shield Barrier
  if (!hasAccess) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-12 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-base font-bold text-gray-900 dark:text-white font-sans">
            Access Restricted: Front-Desk Privacy Shield
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Wholesale supplier costs, direct margins, and executive financial returns are strictly restricted to <strong className="text-gray-700 dark:text-gray-300">Agency Administrators</strong> and <strong className="text-gray-700 dark:text-gray-300">Tour Managers</strong> under SRS Module 7 governance (§6.1).
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
            Current Role: {role}
          </span>
        </div>
      </div>
    );
  }

  if (!financialROI) return null;

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* 4-Card Commercial KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-[#1B7167]" />
              Gross Recognized Revenue
            </span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-[#1B7167] dark:text-teal-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-gray-900 dark:text-white pt-1">
            {formatMoney(financialROI.grossRevenue)}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            {tour.bookedSeats} Pax @ {formatMoney(tour.pricePerPerson)}
          </p>
        </div>

        {/* Committed Direct Costs */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              Committed Direct Costs
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Receipt className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 pt-1">
            {formatMoney(financialROI.totalVendorCosts)}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            Flights, DMC, Hotels, Coaches
          </p>
        </div>

        {/* Net Realized Profit */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Net Tour Profit
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 pt-1">
            {formatMoney(financialROI.netTourProfit)}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            After Direct &amp; Overhead Deductions
          </p>
        </div>

        {/* Profit Margin / ROI */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
              <PieChart className="w-3.5 h-3.5 text-indigo-500" />
              Realized Margin / ROI
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs">
              {financialROI.profitMargin}%
            </span>
          </div>
          <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 pt-1">
            {financialROI.tourROI}% ROI
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            {financialROI.profitMargin}% Gross Margin
          </p>
        </div>
      </div>

      {tourExpenses.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1B7167]/30 bg-[#1B7167]/5 p-4 text-xs text-gray-600 dark:text-gray-300 dark:bg-[#1B7167]/10 flex items-center justify-between">
          <p>No direct supplier expenses recorded yet for this departure. Departure ROI is safely initialized at <span className="font-mono font-bold text-[#1B7167] dark:text-teal-400">0.0%</span>.</p>
        </div>
      )}

      {/* Itemized Wholesale Supplier Cost Table */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white font-sans flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#1B7167]" />
              Wholesale Supplier &amp; Vendor Cost Breakdown
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
              Committed payables and supplier reconciliation for departure #{tour.id}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
            {costBreakdownRows.length} Line Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Supplier / Vendor Name</th>
                <th className="py-3 px-4">Service Description &amp; Allocation</th>
                <th className="py-3 px-4 text-right">Committed (PKR)</th>
                <th className="py-3 px-4 text-center">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {costBreakdownRows.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                        <Icon className="w-3 h-3 text-[#1B7167]" />
                        {row.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900 dark:text-white font-sans text-xs">
                        {row.vendor}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 text-xs">
                      {row.notes}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          row.status === "SETTLED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] font-bold text-xs">
                <td colSpan={3} className="py-3.5 px-4 text-gray-900 dark:text-white font-sans">
                  Total Direct Wholesale Vendor Outlay:
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                  {formatMoney(financialROI.totalVendorCosts)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
