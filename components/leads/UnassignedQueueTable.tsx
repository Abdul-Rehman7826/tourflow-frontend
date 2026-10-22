"use client";

import React from "react";
import { Lead } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Users,
  Compass,
} from "lucide-react";

interface UnassignedQueueTableProps {
  leads: Lead[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAssignToMe: (leadId: string) => void;
  onAssignRep: (leadId: string, repName: string) => void;
  onOpenDrawer: (lead: Lead) => void;
  activeReps: string[];
}

export function UnassignedQueueTable({
  leads,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAssignToMe,
  onAssignRep,
  onOpenDrawer,
  activeReps,
}: UnassignedQueueTableProps) {
  const { formatMoney } = useAgencySettings();
  const { user } = useAuth();
  const isAllSelected = leads.length > 0 && selectedIds.length === leads.length;

  if (leads.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          No Unassigned Leads
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          All inbound leads are assigned to active travel consultants. New walk-ins or web inquiries will appear here automatically.
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
            <th className="w-[26%] px-4 py-3">Lead / Contact</th>
            <th className="w-[22%] px-4 py-3">Interest / Package</th>
            <th className="w-[16%] px-4 py-3">Est. Budget</th>
            <th className="w-[16%] px-4 py-3">Source &amp; Inflow</th>
            <th className="w-[20%] px-4 py-3 text-right">Quick Allocation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
          {leads.map((lead) => {
            const isSelected = selectedIds.includes(lead.id);
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

                {/* Interest & Destination */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                        {lead.interestType.replace(/_/g, " ")}
                      </span>
                      {typeof lead.groupSize === "number" && lead.groupSize > 1 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-500">
                          <Users className="w-3 h-3" /> {lead.groupSize} Pax
                        </span>
                      )}
                    </div>
                    {lead.destinationInterest && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 truncate flex items-center gap-1">
                        <Compass className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.destinationInterest}</span>
                      </p>
                    )}
                  </div>
                </td>

                {/* Budget */}
                <td className="px-4 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                  {lead.budget ? (
                    formatMoney(lead.budget)
                  ) : (
                    <span className="text-gray-400 font-normal">Unspecified</span>
                  )}
                </td>

                {/* Source & Inflow Date */}
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                      {lead.source}
                    </span>
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {lead.createdAt?.slice(0, 10) || "Today"}
                    </p>
                  </div>
                </td>

                {/* 1-Click Allocation & Actions */}
                <td
                  className="px-4 py-3.5 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onAssignToMe(lead.id)}
                      className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] px-3 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all active:scale-95 [&>svg]:text-white [&>span]:text-white"
                      title="Assign this lead to current session user"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-white" />
                      <span className="text-white">Assign to Me</span>
                    </button>

                    {/* Admin/Manager Rep Assign Dropdown */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignRep(lead.id, e.target.value);
                        }
                      }}
                      className="text-[11px] bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:border-[#1B7167] focus:outline-none"
                    >
                      <option value="">Delegate...</option>
                      {activeReps
                        .filter((rep) => rep !== user?.name)
                        .map((rep) => (
                          <option key={rep} value={rep}>
                            {rep}
                          </option>
                        ))}
                    </select>
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
