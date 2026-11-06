"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lead } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  ChevronDown,
  Calendar,
  Users,
  Compass,
  Trash2,
  AlertCircle,
  Loader2,
  Pencil,
} from "lucide-react";

export interface AssigneeStaffOption {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

interface UnassignedQueueTableProps {
  leads: Lead[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAssignToMe: (leadId: string) => Promise<void> | void;
  onAssignRep: (leadId: string, repName: string) => Promise<void> | void;
  onOpenDrawer: (lead: Lead) => void;
  onOpenEditModal?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => Promise<void> | void;
  activeReps: string[];
  staffOptions?: AssigneeStaffOption[];
}

export function UnassignedQueueTable({
  leads,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAssignToMe,
  onAssignRep,
  onOpenDrawer,
  onOpenEditModal,
  onDeleteLead,
  activeReps,
  staffOptions = [],
}: UnassignedQueueTableProps) {
  const { formatMoney } = useAgencySettings();
  const { user } = useAuth();
  const isAllSelected = leads.length > 0 && leads.every((l) => selectedIds.includes(l.id));

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = ["AGENCY_ADMIN", "SUPER_ADMIN"].includes(user?.role || "");

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest(".delegate-popover-container")) {
        setOpenMenuLeadId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute available reps for delegation (excluding current session user)
  const delegateReps = useMemo(() => {
    if (staffOptions.length > 0) {
      return staffOptions.filter(
        (s) => s.name.trim().toLowerCase() !== user?.name?.trim().toLowerCase()
      );
    }
    return activeReps
      .filter((name) => name.trim().toLowerCase() !== user?.name?.trim().toLowerCase())
      .map((name) => ({ id: name, name, role: "Front Desk" }));
  }, [staffOptions, activeReps, user?.name]);

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
          All inbound leads are assigned to active travel consultants. New walk-ins
          or web inquiries will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 font-mono text-[11px] uppercase tracking-wider">
            <th className="w-10 px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-[#1B7167] focus:ring-[#1B7167] cursor-pointer"
              />
            </th>
            <th className="px-4 py-3">Lead / Contact</th>
            <th className="px-4 py-3">Interest / Package</th>
            <th className="px-4 py-3">Est. Budget</th>
            <th className="px-4 py-3">Source &amp; Inflow</th>
            <th className="px-4 py-3 text-right">Quick Allocation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {leads.map((lead) => {
            const isSelected = selectedIds.includes(lead.id);
            const isMenuOpen = openMenuLeadId === lead.id;
            const isAssigningThis = assigningId === lead.id;

            return (
              <tr
                key={lead.id}
                onClick={() => onOpenDrawer(lead)}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#1B7167]/5 dark:bg-[#1B7167]/10"
                    : "hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                }`}
              >
                {/* Multi-Select Checkbox */}
                <td
                  className="w-10 px-4 py-3.5 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(lead.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
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
                  className="px-4 py-3.5 text-right relative delegate-popover-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {/* 1-Click Self-Assign Button */}
                    <button
                      type="button"
                      disabled={isAssigningThis}
                      onClick={async () => {
                        setAssigningId(lead.id);
                        try {
                          await onAssignToMe(lead.id);
                        } finally {
                          setAssigningId(null);
                        }
                      }}
                      className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] disabled:opacity-60 px-3 py-1.5 rounded-lg shadow-sm text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Assign this lead to current session user"
                    >
                      {isAssigningThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-white" />
                          <span>Assign to Me</span>
                        </>
                      )}
                    </button>

                    {/* Delegate Popover Dropdown Button (Agency Admin / Manager only) */}
                    {isAdmin && (
                      <div className="relative delegate-popover-container">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuLeadId(isMenuOpen ? null : lead.id)
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-[#1B7167] bg-white dark:bg-[#030712] text-gray-700 dark:text-gray-200 text-xs font-medium flex items-center gap-1 shadow-sm hover:shadow transition-all cursor-pointer"
                          title="Delegate this lead to another representative"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[#1B7167]" />
                          <span>Delegate</span>
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>

                        {/* Modern Popover Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-30 p-2 text-left animate-in fade-in zoom-in-95 duration-100">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
                              Assign Lead Inquiry
                            </div>

                            {/* Quick Assign to Session User */}
                            {user?.name && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setOpenMenuLeadId(null);
                                  setAssigningId(lead.id);
                                  try {
                                    await onAssignToMe(lead.id);
                                  } finally {
                                    setAssigningId(null);
                                  }
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-[#1B7167] dark:hover:text-teal-400 transition-colors text-left cursor-pointer"
                              >
                                <div className="w-6 h-6 rounded-full bg-[#1B7167] text-white flex items-center justify-center text-[10px] font-bold">
                                  {user.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 truncate">
                                  <div className="truncate">{user.name}</div>
                                  <div className="text-[10px] text-gray-400 font-normal">
                                    You (Current User)
                                  </div>
                                </div>
                              </button>
                            )}

                            <div className="border-t border-gray-100 dark:border-white/10 my-1" />
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
                              Active Representatives
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              {delegateReps.length === 0 ? (
                                <div className="p-3 text-center text-xs text-gray-400">
                                  No other active staff available
                                </div>
                              ) : (
                                delegateReps.map((rep) => (
                                  <button
                                    key={rep.id || rep.name}
                                    type="button"
                                    onClick={async () => {
                                      setOpenMenuLeadId(null);
                                      setAssigningId(lead.id);
                                      try {
                                        await onAssignRep(lead.id, rep.name);
                                      } finally {
                                        setAssigningId(null);
                                      }
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 flex items-center justify-center text-[10px] font-bold">
                                      {rep.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="flex-1 truncate">
                                      <div className="truncate font-semibold">
                                        {rep.name}
                                      </div>
                                      <div className="text-[10px] text-gray-400 truncate">
                                        {rep.role || "Front Desk"}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Agency Admin Edit Button */}
                    {isAdmin && onOpenEditModal && (
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(lead)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-500/10 transition-colors cursor-pointer"
                        title="Edit lead inquiry details (Agency Admin)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Agency Admin Delete Button */}
                    {isAdmin && onDeleteLead && (
                      <button
                        type="button"
                        onClick={() => setLeadToDelete(lead)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete lead permanently (Agency Admin only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Delete Confirmation Modal (Agency Admin Only) */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete Lead Permanently
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agency Administrator Permission Required
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to delete lead{" "}
              <strong className="text-gray-900 dark:text-white">
                {leadToDelete.fullName}
              </strong>{" "}
              ({leadToDelete.phone})? All associated inquiry logs and audit notes
              will be permanently removed from the database. This action cannot be
              undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteLead) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteLead(leadToDelete.id);
                    setLeadToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
