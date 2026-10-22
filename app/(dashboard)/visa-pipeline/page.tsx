"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { VisaCaseDetailDrawer, VISA_STAGES, CUSTODY_LOCATIONS, visaLabel } from "@/components/visa/VisaCaseDetailDrawer";
import { CreateVisaCaseModal } from "@/components/visa/CreateVisaCaseModal";
import { VisaOperationsModal } from "@/components/visa/VisaOperationsModal";
import type { VisaCase, VisaStage } from "@/types/erp";
import {
  ShieldCheck,
  Building2,
  Lock,
  Search,
  Plus,
  Flame,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function VisaPipelinePage() {
  const { user, isHydrated } = useAuth();
  const { formatMoney } = useAgencySettings();
  const { visaPipelineCases: cases, tours: tourPackages, saveVisaPipelineCase, setVisaCaseArchived } = useData();

  // Navigation & Filtering States
  const [activeView, setActiveView] = useState<"PIPELINE" | "VAULT" | "ARCHIVE">("PIPELINE");
  const [searchQuery, setSearchQuery] = useState("");
  const [departureFilter, setDepartureFilter] = useState("ALL");
  const [custodyFilter, setCustodyFilter] = useState<string>("ALL");

  // Selection & Modal States
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtered cases calculation
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // View check
      if (activeView === "ARCHIVE" && !c.isArchived) return false;
      if (activeView === "PIPELINE" && c.isArchived) return false;

      // Departure group check
      if (departureFilter !== "ALL") {
        if (departureFilter === "STANDALONE" && c.sourceType !== "STANDALONE_CONSULTANCY") return false;
        if (departureFilter !== "STANDALONE" && c.tourId !== departureFilter) return false;
      }

      // Custody location check
      if (custodyFilter !== "ALL" && c.passportCustody !== custodyFilter) {
        return false;
      }

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const haystack = `${c.caseNumber} ${c.applicantName} ${c.applicantPhone} ${c.passportNumber} ${c.country} ${c.visaType}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [cases, activeView, departureFilter, custodyFilter, searchQuery]);

  // Group Departures Map for Filter
  const departureOptions = useMemo(() => {
    const map = new Map<string, string>();
    tourPackages.forEach((t) => map.set(t.id, `${t.title} (${t.departureDate})`));
    cases.forEach((c) => {
      if (c.tourId && !map.has(c.tourId)) {
        map.set(c.tourId, c.tourTitle || c.tourId);
      }
    });
    return map;
  }, [tourPackages, cases]);

  // Selected case for Drawer
  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  if (!isHydrated || !user) return <p role="status">Loading visa pipeline...</p>;

  // Role Gate check (403 Forbidden)
  const isAuthorized = ["SUPER_ADMIN", "AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"].includes(user.role);

  if (!isAuthorized) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center">
        <div className="rounded-full bg-rose-500/10 p-4 text-rose-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
        <p className="max-w-md text-sm text-gray-500">
          You do not have administrative or visa operational privileges to view the Visa Processing Hub.
        </p>
      </div>
    );
  }

  // Stage Move Handler
  const handleMoveStage = (caseId: string, nextStage: VisaStage) => {
    try {
      saveVisaPipelineCase(caseId, { stage: nextStage } as unknown as Record<string, unknown>);
      setStatusMessage({
        type: "success",
        text: `Case moved to ${visaLabel(nextStage)}. Note: Physical passport location remains unchanged.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to move stage.",
      });
    }
  };

  // Archive / Restore Handler
  const handleToggleArchive = (c: VisaCase) => {
    const isArchiving = !c.isArchived;
    if (
      !window.confirm(
        isArchiving
          ? `Archive visa case ${c.caseNumber}? Physical passport custody will remain unchanged.`
          : `Restore visa case ${c.caseNumber} to active pipeline?`
      )
    )
      return;

    try {
      setVisaCaseArchived(c.id, isArchiving);
      setStatusMessage({
        type: "success",
        text: isArchiving ? "Case archived." : "Case restored to active pipeline.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update archive state.",
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#161A17] dark:text-[#F1F5F2]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-[#1B7167]/10 px-2.5 py-1 text-xs font-bold text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Module 4: Visa Processing & Custody Vault
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#161A17] dark:text-[#F1F5F2] sm:text-3xl">
            Visa Operations & Safe Custody Hub
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Applicant readiness tracking, embassy appointment logistics, and physical passport custody audits.
          </p>
        </div>

        <button
          onClick={() => setIsNewCaseOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#1B7167] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#155A52] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Standalone Case</span>
        </button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Active Pipeline Cases",
            value: cases.filter((c) => !c.isArchived).length,
            icon: Layers,
            color: "text-[#1B7167] dark:text-[#2DD4BF]",
          },
          {
            label: "In Office Safe",
            value: cases.filter((c) => c.custodyConfirmed && c.passportCustody === "OFFICE_SAFE").length,
            icon: Lock,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "At Embassy / VFS",
            value: cases.filter(
              (c) => c.custodyConfirmed && ["AT_EMBASSY", "SUBMITTED_TO_VFS_GERRYS"].includes(c.passportCustody)
            ).length,
            icon: Building2,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Custody Unconfirmed",
            value: cases.filter((c) => !c.custodyConfirmed).length,
            icon: AlertTriangle,
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#080C14]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className={`mt-2 font-mono text-2xl font-bold tracking-tight ${kpi.color}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* View Tabs & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#080C14] sm:flex-row sm:items-center sm:justify-between">
        {/* View Switcher */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-[#EFF1EB]/60 p-1 text-xs font-bold dark:border-white/10 dark:bg-[#030712]">
          {(
            [
              { id: "PIPELINE", label: "Pipeline Kanban", count: cases.filter((c) => !c.isArchived).length },
              { id: "VAULT", label: "Passport Custody Vault", count: cases.filter((c) => c.custodyConfirmed).length },
              { id: "ARCHIVE", label: "Archive", count: cases.filter((c) => c.isArchived).length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveView(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                activeView === t.id
                  ? "bg-[#1B7167] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeView === t.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Location Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case, name, passport..."
              className="w-full rounded-lg border border-gray-200 bg-[#EFF1EB]/40 pl-9 pr-3 py-1.5 text-xs text-[#161A17] placeholder-gray-400 focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
            />
          </div>

          <select
            value={custodyFilter}
            onChange={(e) => setCustodyFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-[#EFF1EB]/40 px-3 py-1.5 text-xs text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
          >
            <option value="ALL">All Custody Locations</option>
            {CUSTODY_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {visaLabel(loc)}
              </option>
            ))}
          </select>

          <select
            value={departureFilter}
            onChange={(e) => setDepartureFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-[#EFF1EB]/40 px-3 py-1.5 text-xs text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
          >
            <option value="ALL">All Departures & Consultancy</option>
            <option value="STANDALONE">Standalone Consultancy</option>
            {Array.from(departureOptions.entries()).map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: KANBAN PIPELINE */}
      {activeView === "PIPELINE" && (
        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1300px] grid-cols-6 gap-3.5">
            {VISA_STAGES.map((colStage, colIdx) => {
              const colCases = filteredCases.filter((c) => c.stage === colStage);

              return (
                <div
                  key={colStage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId = e.dataTransfer.getData("text/plain");
                    if (droppedId) handleMoveStage(droppedId, colStage);
                  }}
                  className="flex min-h-[520px] flex-col rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 dark:border-white/5 dark:bg-[#080C14]"
                >
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-white/10">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {visaLabel(colStage)}
                    </span>
                    <span className="rounded-full bg-[#1B7167]/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
                      {colCases.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 space-y-2.5">
                    {colCases.map((c) => {
                      const isUrgent = Boolean(
                        c.appointmentDate &&
                          new Date(c.appointmentDate).getTime() - Date.now() > 0 &&
                          new Date(c.appointmentDate).getTime() - Date.now() <= 48 * 3600 * 1000
                      );
                      const verifiedCount = c.documentChecklist?.filter((d) => d.verified).length || 0;
                      const totalDocs = c.documentChecklist?.length || 0;

                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                          className="group relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-[#1B7167]/60 hover:shadow-md dark:border-white/10 dark:bg-[#121C18]"
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-[11px] font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                              {c.caseNumber}
                            </span>
                            {isUrgent && (
                              <span className="flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                <Flame className="h-3 w-3" />
                                48h
                              </span>
                            )}
                          </div>

                          {/* Applicant Info */}
                          <button
                            onClick={() => setSelectedCaseId(c.id)}
                            className="mt-1.5 w-full text-left"
                          >
                            <h4 className="text-xs font-bold text-[#161A17] group-hover:text-[#1B7167] dark:text-white dark:group-hover:text-[#2DD4BF]">
                              {c.applicantName}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {c.country} • {c.visaType}
                            </p>
                          </button>

                          {/* Source & Readiness Badges */}
                          <div className="mt-2.5 space-y-1.5 border-t border-gray-100 pt-2 text-[11px] dark:border-white/5">
                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                              <span>Checklist:</span>
                              <span className="font-mono font-medium text-gray-700 dark:text-gray-200">
                                {verifiedCount}/{totalDocs} Verified
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                              <span>Custody:</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  c.passportCustody === "OFFICE_SAFE"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : c.passportCustody === "DISPATCHED_COURIER"
                                    ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
                                }`}
                              >
                                {visaLabel(c.passportCustody)}
                              </span>
                            </div>

                            {c.appointmentDate && (
                              <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(c.appointmentDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Stage Transition Quick Actions */}
                          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-white/5">
                            {colIdx > 0 ? (
                              <button
                                onClick={() => handleMoveStage(c.id, VISA_STAGES[colIdx - 1])}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                title={`Revert to ${visaLabel(VISA_STAGES[colIdx - 1])}`}
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <div />
                            )}

                            <button
                              onClick={() => setSelectedCaseId(c.id)}
                              className="text-[11px] font-semibold text-[#1B7167] hover:underline dark:text-[#2DD4BF]"
                            >
                              Details
                            </button>

                            {colIdx < VISA_STAGES.length - 1 ? (
                              <button
                                onClick={() => handleMoveStage(c.id, VISA_STAGES[colIdx + 1])}
                                className="text-gray-400 hover:text-[#1B7167] dark:hover:text-[#2DD4BF]"
                                title={`Advance to ${visaLabel(VISA_STAGES[colIdx + 1])}`}
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleArchive(c)}
                                className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {colCases.length === 0 && (
                      <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-400 dark:border-white/5">
                        <span>No cases</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SAFE CUSTODY VAULT TABLE */}
      {activeView === "VAULT" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#080C14]">
          <div className="border-b border-gray-200 p-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#1B7167] dark:text-[#2DD4BF]" />
              <h3 className="text-sm font-bold text-[#161A17] dark:text-[#F1F5F2]">
                Physical Passport Safe Custody Ledger
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Audit log of physical passports held in agency safe, with case officers, or dispatched to embassies/couriers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-[#EFF1EB]/50 text-gray-500 dark:bg-[#030712] dark:text-gray-400">
                <tr>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Case & Applicant</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Passport Number</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Physical Custody</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Locker / Courier Ref</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Pipeline Stage</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Verification Status</th>
                  <th className="p-3.5 text-right font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3.5">
                      <span className="font-bold text-[#161A17] dark:text-white">
                        {c.applicantName}
                      </span>
                      <span className="block font-mono text-[11px] text-[#1B7167] dark:text-[#2DD4BF]">
                        {c.caseNumber}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {c.country} • {c.visaType}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold tracking-tight text-[#161A17] dark:text-white">
                      {c.passportNumber || "Not Provided"}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                          c.passportCustody === "OFFICE_SAFE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : c.passportCustody === "DISPATCHED_COURIER"
                            ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
                        }`}
                      >
                        {visaLabel(c.passportCustody)}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      {c.passportCustody === "OFFICE_SAFE" ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {c.custodySafeLockerId || "Locker Pending"}
                        </span>
                      ) : c.passportCustody === "DISPATCHED_COURIER" ? (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {c.courierTrackingCode || "Tracking Pending"}
                        </span>
                      ) : (
                        <span className="text-gray-400">{c.embassyTrackingRef || "—"}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300">
                      {visaLabel(c.stage)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          c.custodyConfirmed
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {c.custodyConfirmed ? "Staff Confirmed" : "Unconfirmed"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedCaseId(c.id)}
                        className="rounded-md bg-[#1B7167]/10 px-2.5 py-1 text-xs font-semibold text-[#1B7167] hover:bg-[#1B7167]/20 dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]"
                      >
                        Transfer / Inspect
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-gray-400">
                      No physical passports match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: ARCHIVE TAB */}
      {activeView === "ARCHIVE" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#080C14]">
          <div className="border-b border-gray-200 p-4 dark:border-white/10">
            <h3 className="text-sm font-bold text-[#161A17] dark:text-[#F1F5F2]">
              Archived Visa Records
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Completed and delivered visa cases. Physical passports have been returned to clients or archived.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-[#EFF1EB]/50 text-gray-500 dark:bg-[#030712] dark:text-gray-400">
                <tr>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Case & Applicant</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Passport Number</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Destination & Type</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Final Decision</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider">Consultancy Fee</th>
                  <th className="p-3.5 text-right font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold text-[#161A17] dark:text-white">{c.applicantName}</span>
                      <span className="block font-mono text-[11px] text-[#1B7167] dark:text-[#2DD4BF]">
                        {c.caseNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[#161A17] dark:text-white">
                      {c.passportNumber || "—"}
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300">
                      {c.country} ({c.visaType})
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          c.decision === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : c.decision === "REFUSED"
                            ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                            : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                        }`}
                      >
                        {visaLabel(c.decision)}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                      {formatMoney(c.consultancyFee + (c.embassyFeePaid || 0))}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCaseId(c.id)}
                        className="text-xs font-semibold text-[#1B7167] hover:underline dark:text-[#2DD4BF]"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleToggleArchive(c)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-gray-400">
                      No archived visa cases found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Right-Side Slide-Over Detail Drawer */}
      <VisaCaseDetailDrawer
        isOpen={Boolean(selectedCase)}
        visaCase={selectedCase}
        onClose={() => setSelectedCaseId(null)}
      />

      {selectedCase && (
        <VisaOperationsModal
          visaCase={selectedCase}
          onClose={() => setSelectedCaseId(null)}
        />
      )}

      {/* Centered Modal for New Case Creation */}
      <CreateVisaCaseModal
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onSuccess={(name) => {
          setStatusMessage({
            type: "success",
            text: `Visa dossier for ${name} initialized successfully.`,
          });
        }}
      />
    </div>
  );
}
