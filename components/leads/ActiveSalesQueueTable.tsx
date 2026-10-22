"use client";

import React from "react";
import { Lead, LeadStatus } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { getLeadCallbackStatus, getWhatsAppLink } from "@/lib/leads-api";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from "lucide-react";

interface ActiveSalesQueueTableProps {
  leads: Lead[];
  todayStr: string;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenDrawer: (lead: Lead) => void;
  onOpenConvertModal: (lead: Lead) => void;
}

export function ActiveSalesQueueTable({
  leads,
  todayStr,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDrawer,
  onOpenConvertModal,
}: ActiveSalesQueueTableProps) {
  const { formatMoney } = useAgencySettings();
  const isAllSelected = leads.length > 0 && selectedIds.length === leads.length;

  const getStageBadge = (status: LeadStatus) => {
    switch (status) {
      case "NEW":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
      case "CONTACTED":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
      case "QUOTE_SENT":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "FOLLOW_UP":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      default:
        return "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10";
    }
  };

  if (leads.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
          <Flame className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          No Active Inquiries Found
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No active sales leads match the current filters. Adjust your search criteria or log a new walk-in inquiry.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] overflow-hidden overflow-x-auto shadow-sm">
      <table className="w-full table-fixed text-left border-collapse">
        <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
          <tr>
            <th className="w-[44px] px-3 py-3 text-center">
              <input
                type="checkbox"
                aria-label="Select all filtered leads"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#1B7167] focus:ring-[#1B7167] cursor-pointer"
              />
            </th>
            <th className="w-[24%] px-4 py-3">Lead &amp; Contact</th>
            <th className="w-[20%] px-4 py-3">Interest / Budget</th>
            <th className="w-[18%] px-4 py-3">Rep &amp; Stage</th>
            <th className="w-[18%] px-4 py-3">Callback Schedule</th>
            <th className="w-[20%] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
          {leads.map((lead) => {
            const isSelected = selectedIds.includes(lead.id);
            const callbackStatus = getLeadCallbackStatus(lead, todayStr);
            const waLink = getWhatsAppLink(lead.phone, lead.fullName);

            return (
              <tr
                key={lead.id}
                className={`group transition-colors hover:bg-teal-50/30 dark:hover:bg-teal-950/10 cursor-pointer ${
                  isSelected ? "bg-teal-50/50 dark:bg-teal-950/20" : ""
                }`}
                onClick={() => onOpenDrawer(lead)}
              >
                {/* Selection Checkbox */}
                <td
                  className="px-3 py-3.5 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(lead.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(lead.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#1B7167] focus:ring-[#1B7167] cursor-pointer"
                  />
                </td>

                {/* Lead Contact Info */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white truncate">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{lead.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {lead.phone}
                      </span>
                      {lead.email && (
                        <span className="flex items-center gap-1 truncate text-gray-400">
                          · <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Interest & Budget */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                        {lead.interestType.replace(/_/g, " ")}
                      </span>
                      {lead.destinationInterest && (
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate">
                          {lead.destinationInterest}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono font-bold text-gray-900 dark:text-white">
                      {lead.budget ? (
                        formatMoney(lead.budget)
                      ) : (
                        <span className="text-gray-400 font-normal">Open Budget</span>
                      )}
                    </p>
                  </div>
                </td>

                {/* Assigned Rep & Stage */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200 font-medium truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{lead.assignedTo || "Unassigned"}</span>
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider ${getStageBadge(
                          lead.status
                        )}`}
                      >
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Callback Schedule Pill */}
                <td className="px-4 py-3.5">
                  {callbackStatus === "OVERDUE" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-mono text-[11px] font-bold animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Overdue ({lead.followUpDate?.slice(0, 10)})</span>
                    </div>
                  )}
                  {callbackStatus === "DUE_TODAY" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Due Today</span>
                    </div>
                  )}
                  {callbackStatus === "UPCOMING" && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{lead.followUpDate?.slice(0, 10)}</span>
                    </div>
                  )}
                  {callbackStatus === "NONE" && (
                    <span className="text-gray-400 text-[11px] font-mono">No callback set</span>
                  )}
                </td>

                {/* Quick Touchpoints & Actions */}
                <td
                  className="px-4 py-3.5 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {/* WhatsApp Action */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Open WhatsApp chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>

                    {/* Phone Call Link */}
                    <a
                      href={`tel:${lead.phone}`}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                      title="Direct phone dial"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {/* Convert to Booking Button */}
                    <button
                      type="button"
                      onClick={() => onOpenConvertModal(lead)}
                      className="bg-emerald-600 text-white font-medium hover:bg-emerald-500 px-2.5 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-1 transition-all active:scale-95 [&>svg]:text-white [&>span]:text-white"
                      title="Convert this lead to a confirmed travel booking"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span className="text-white font-semibold">Convert</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
