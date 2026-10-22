"use client";

import React, { useState } from "react";
import { Lead } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import {
  User,
  Phone,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface ArchivedDealsTableProps {
  leads: Lead[];
  onOpenDrawer: (lead: Lead) => void;
  onReopenLead: (leadId: string) => void;
}

export function ArchivedDealsTable({
  leads,
  onOpenDrawer,
  onReopenLead,
}: ArchivedDealsTableProps) {
  const { formatMoney } = useAgencySettings();
  const [subFilter, setSubFilter] = useState<"ALL" | "CONVERTED" | "LOST">("ALL");

  const filteredLeads = leads.filter((lead) => {
    if (subFilter === "CONVERTED") return lead.status === "CONVERTED";
    if (subFilter === "LOST") return lead.status === "LOST";
    return true;
  });

  const convertedCount = leads.filter((l) => l.status === "CONVERTED").length;
  const lostCount = leads.filter((l) => l.status === "LOST").length;

  return (
    <div className="space-y-4">
      {/* Sub-Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setSubFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              subFilter === "ALL"
                ? "bg-white dark:bg-[#030712] text-gray-900 dark:text-white shadow-xs font-bold"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            All Closed ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setSubFilter("CONVERTED")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              subFilter === "CONVERTED"
                ? "bg-white dark:bg-[#030712] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Converted Deals ({convertedCount})
          </button>
          <button
            type="button"
            onClick={() => setSubFilter("LOST")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              subFilter === "LOST"
                ? "bg-white dark:bg-[#030712] text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Lost Inquiries ({lostCount})
          </button>
        </div>
      </div>

      {/* Table Container */}
      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            No Closed Inquiries Found
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            No deals in the archive match the selected filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full table-fixed text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="w-[24%] px-4 py-3">Lead / Client</th>
                <th className="w-[20%] px-4 py-3">Interest / Package</th>
                <th className="w-[18%] px-4 py-3">Outcome Status</th>
                <th className="w-[22%] px-4 py-3">Reason / Conversion Value</th>
                <th className="w-[16%] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
              {filteredLeads.map((lead) => {
                const isConverted = lead.status === "CONVERTED";

                return (
                  <tr
                    key={lead.id}
                    className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => onOpenDrawer(lead)}
                  >
                    {/* Lead Contact Info */}
                    <td className="px-4 py-3.5 truncate">
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white truncate">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{lead.fullName}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {lead.phone}
                        </p>
                      </div>
                    </td>

                    {/* Interest & Destination */}
                    <td className="px-4 py-3.5 truncate">
                      <div className="space-y-1 truncate">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                          {lead.interestType.replace(/_/g, " ")}
                        </span>
                        {lead.destinationInterest && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate">
                            {lead.destinationInterest}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Outcome Status */}
                    <td className="px-4 py-3.5">
                      {isConverted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed Booking
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Marked Lost
                        </span>
                      )}
                    </td>

                    {/* Reason or Revenue */}
                    <td className="px-4 py-3.5 truncate">
                      {isConverted ? (
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {lead.budget ? formatMoney(lead.budget) : "Booking Created"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Rep: {lead.assignedTo || "Direct"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5 truncate">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 truncate">
                            {lead.lossReason || "Unspecified Reason"}
                          </span>
                          {lead.notes && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {lead.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isConverted && (
                        <button
                          type="button"
                          onClick={() => onReopenLead(lead.id)}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ml-auto"
                          title="Re-open inquiry into Active Sales queue"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-open</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
