"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { Lead, Invoice } from "@/types/erp";
import {
  callbackBadge,
  localDay,
  INTERESTS,
  OPEN_STATUSES,
  type BulkChange,
} from "@/lib/lead-operations";
import { categorizeLeadQueue, LeadQueueType } from "@/lib/leads-api";

// Queue Tables & Components
import { LeadQueueTabBar } from "@/components/leads/LeadQueueTabBar";
import { UnassignedQueueTable } from "@/components/leads/UnassignedQueueTable";
import { ActiveSalesQueueTable } from "@/components/leads/ActiveSalesQueueTable";
import { PaymentRecoveryQueueTable } from "@/components/leads/PaymentRecoveryQueueTable";
import { ArchivedDealsTable } from "@/components/leads/ArchivedDealsTable";
import { BulkActionDock } from "@/components/leads/BulkActionDock";
import { LeadInteractionDrawer } from "@/components/leads/LeadInteractionDrawer";
import { ConvertLeadModal } from "@/components/leads/ConvertLeadModal";
import { LostReasonDialog } from "@/components/leads/LostReasonDialog";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { LeadImportWorkspace } from "@/components/leads/LeadImportWorkspace";
import { DuplicateQueue } from "@/components/leads/DuplicateQueue";
import { PaymentVerificationQueue } from "@/components/invoices/PaymentRecoveryActions";
import { SubmitPaymentProofModal } from "@/components/leads/SubmitPaymentProofModal";
import { RecoveryCallLogModal } from "@/components/leads/RecoveryCallLogModal";
import { VerifyPaymentModal } from "@/components/invoices/VerifyPaymentModal";

import {
  UserPlus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Building,
  CheckCircle,
  Flame,
  X,
} from "lucide-react";

export default function FrontDeskLeadsPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  return <LeadsWorkspace key={`${tenant.id}-${user?.id || "loading"}`} />;
}

function LeadsWorkspace() {
  const {
    leads,
    invoices,
    duplicates,
    bulkUpdateLeads,
    activeReps,
    crmReady,
    crmError,
  } = useData();
  const { user, isHydrated } = useAuth();
  const { settings } = useAgencySettings();

  const isAdmin = user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "TOUR_MANAGER";
  const [adminTab, setAdminTab] = useState<"all" | "import" | "duplicates" | "verification">("all");
  const [activeQueue, setActiveQueue] = useState<LeadQueueType>(isAdmin ? "UNASSIGNED" : "ACTIVE_SALES");

  // Multi-select & Loss modal state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lostIds, setLostIds] = useState<string[]>([]);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [interestFilter, setInterestFilter] = useState<string>("ALL");

  // Modals & Drawers
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<Lead | null>(null);
  const [selectedInvoiceForProof, setSelectedInvoiceForProof] = useState<Invoice | null>(null);
  const [selectedInvoiceForCallLog, setSelectedInvoiceForCallLog] = useState<Invoice | null>(null);
  const [selectedClaimIdForVerify, setSelectedClaimIdForVerify] = useState<string | null>(null);

  // Date ticker for callback statuses
  const [todayStr, setTodayStr] = useState("");
  useEffect(() => {
    const tick = () => setTodayStr(localDay());
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  // Show Toast
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Recovery invoices
  const recoveryInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.status !== "CANCELLED" && inv.dueAmount > 0)
      .filter((inv) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          inv.clientName?.toLowerCase().includes(q) ||
          inv.clientPhone?.toLowerCase().includes(q) ||
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.bookingRef?.toLowerCase().includes(q) ||
          inv.booking_number?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [invoices, searchQuery]);

  // Filtered Leads for Active Queue
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Check Queue match
      if (categorizeLeadQueue(lead) !== activeQueue) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = lead.phone.toLowerCase().includes(q);
        const matchesDest = lead.destinationInterest?.toLowerCase().includes(q);
        const matchesNotes = lead.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesDest && !matchesNotes) {
          return false;
        }
      }

      // Source match
      if (sourceFilter !== "ALL" && lead.source !== sourceFilter) {
        return false;
      }

      // Interest match
      if (interestFilter !== "ALL" && lead.interestType !== interestFilter) {
        return false;
      }

      // Status match
      if (statusFilter !== "ALL" && lead.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [leads, activeQueue, searchQuery, sourceFilter, interestFilter, statusFilter]);

  // Queue Counts
  const queueCounts = useMemo(() => {
    let unassigned = 0;
    let activeSales = 0;
    let archive = 0;

    leads.forEach((l) => {
      const q = categorizeLeadQueue(l);
      if (q === "UNASSIGNED") unassigned++;
      else if (q === "ACTIVE_SALES") activeSales++;
      else if (q === "ARCHIVE") archive++;
    });

    return {
      unassigned,
      activeSales,
      paymentRecovery: recoveryInvoices.length,
      archive,
    };
  }, [leads, recoveryInvoices.length]);

  // Metric Computations
  const stats = useMemo(() => {
    const callbacksDue = leads.filter((l) => !!callbackBadge(l, todayStr)).length;
    const walkInsCount = leads.filter((l) => l.source === "Walk-in" || l.status === "NEW").length;
    const warmCount = leads.filter(
      (l) => l.status === "CONTACTED" || l.status === "QUOTE_SENT" || l.status === "FOLLOW_UP"
    ).length;
    const convertedCount = leads.filter((l) => l.status === "CONVERTED").length;

    return { callbacksDue, walkInsCount, warmCount, convertedCount };
  }, [leads, todayStr]);

  // Multi-Selection Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const applyBulkChange = (change: BulkChange, ids = selectedIds) => {
    if ("status" in change && change.status === "LOST") {
      setLostIds(ids);
      setIsLostDialogOpen(true);
      return;
    }
    try {
      bulkUpdateLeads(ids, change);
      setActionError("");
      setSelectedIds([]);
      showToast(`${ids.length} lead(s) updated successfully.`);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  // 1-Click Self-Assign
  const handleAssignToMe = (leadId: string) => {
    if (!user?.name) return;
    try {
      bulkUpdateLeads([leadId], { assignedTo: user.name });
      showToast(`Lead assigned to ${user.name}`);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  // Rep Delegate
  const handleAssignRep = (leadId: string, repName: string) => {
    try {
      bulkUpdateLeads([leadId], { assignedTo: repName });
      showToast(`Lead assigned to ${repName}`);
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  // Re-open lead from archive
  const handleReopenLead = (leadId: string) => {
    try {
      bulkUpdateLeads([leadId], { status: "NEW" });
      showToast("Inquiry re-opened into Active Sales queue.");
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSourceFilter("ALL");
    setInterestFilter("ALL");
    setStatusFilter("ALL");
  };

  if (!isHydrated || !user) return <p role="status" className="p-8 text-sm text-gray-500">Loading call center queues...</p>;

  const isAllowed = [
    "AGENCY_ADMIN",
    "FRONT_DESK",
    "TOUR_MANAGER",
    "VISA_CONSULTANT",
    "SUPER_ADMIN",
  ].includes(user.role);

  if (!isAllowed) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-center space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You do not have permission to view the call center workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-200">
      {crmError && <p role="alert" className="text-sm text-red-600">{crmError}</p>}
      {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}

      {/* Toast Alert Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-white dark:bg-[#0B0F19] border border-emerald-500/50 shadow-2xl text-xs text-gray-900 dark:text-white flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successToast}</span>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-[#1B7167] dark:text-teal-400 border border-teal-500/20">
              Call Center Operations
            </span>
            <span className="text-gray-300 dark:text-gray-700">&bull;</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Tenant: <strong className="text-gray-900 dark:text-white">{settings.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Call Center &amp; Inbound Leads
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            4-Queue pipeline: Unassigned inbound inquiries, active sales follow-ups, payment recoveries, and archived deals.
          </p>
        </div>

        <button
          disabled={!crmReady}
          onClick={() => setIsNewLeadModalOpen(true)}
          className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] px-4 py-2.5 rounded-xl shadow-sm text-xs flex items-center gap-2 transition-all self-start sm:self-auto shrink-0 cursor-pointer active:scale-95 [&>svg]:text-white [&>span]:text-white"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span className="text-white">New Lead Intake</span>
        </button>
      </div>

      {/* Admin Operations Navigation */}
      {isAdmin && (
        <nav
          aria-label="Lead workspaces"
          className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10 pb-3"
        >
          {[
            ["all", "Call Center Queues"],
            ["import", "Bulk CSV Importer"],
            ["duplicates", `Duplicate Queue (${duplicates.length})`],
            ["verification", "Payment Verification"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-current={adminTab === value ? "page" : undefined}
              onClick={() => {
                setAdminTab(value as typeof adminTab);
                setSelectedIds([]);
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                adminTab === value
                  ? "bg-[#1B7167] text-white shadow-sm [&>svg]:text-white [&>span]:text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* Admin Sub-Workspaces */}
      {isAdmin && adminTab === "import" && <LeadImportWorkspace />}
      {isAdmin && adminTab === "duplicates" && <DuplicateQueue />}
      {isAdmin && adminTab === "verification" && <PaymentVerificationQueue />}

      {/* Primary Call Center Workspace */}
      {(!isAdmin || adminTab === "all") && (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Callbacks Due */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Today&apos;s Callbacks Due
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {stats.callbacksDue}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Scheduled today</span>
              </div>
            </div>

            {/* KPI 2: Walk-ins Logged */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  New Walk-ins Logged
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                  {stats.walkInsCount}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Inbound inquiries</span>
              </div>
            </div>

            {/* KPI 3: Warm Inquiries */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Active Sales Pipeline
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1B7167] dark:text-teal-400 font-mono">
                  {stats.warmCount}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">In active discussion</span>
              </div>
            </div>

            {/* KPI 4: Converted to Bookings */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Converted to Bookings
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {stats.convertedCount}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Deals closed</span>
              </div>
            </div>
          </div>

          {/* 4-Queue Tab Bar */}
          <LeadQueueTabBar
            activeQueue={activeQueue}
            onChangeQueue={(q) => {
              setActiveQueue(q);
              setSelectedIds([]);
              clearFilters();
            }}
            counts={queueCounts}
            isAdmin={isAdmin}
          />

          {/* Search & Filters */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    activeQueue === "PAYMENT_RECOVERY"
                      ? "Search client, phone, or invoice number..."
                      : "Search traveler name, phone, destination, or notes..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
                />
              </div>

              {/* Filter Selects for Leads */}
              {activeQueue !== "PAYMENT_RECOVERY" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />

                  {/* Source Filter */}
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#1B7167]"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook Ads</option>
                    <option value="Google">Google Search</option>
                    <option value="Referral">Client Referral</option>
                  </select>

                  {/* Interest Filter */}
                  <select
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#1B7167]"
                  >
                    <option value="ALL">All Services</option>
                    {INTERESTS.map((int) => (
                      <option key={int} value={int}>
                        {int.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>

                  {/* Stage Filter */}
                  {activeQueue === "ACTIVE_SALES" && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#1B7167]"
                    >
                      <option value="ALL">All Stages</option>
                      {OPEN_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Queue Table Rendering */}
          {activeQueue === "UNASSIGNED" && (
            <UnassignedQueueTable
              leads={filteredLeads}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onAssignToMe={handleAssignToMe}
              onAssignRep={handleAssignRep}
              onOpenDrawer={(lead) => setSelectedLeadForDrawer(lead)}
              activeReps={activeReps}
            />
          )}

          {activeQueue === "ACTIVE_SALES" && (
            <ActiveSalesQueueTable
              leads={filteredLeads}
              todayStr={todayStr}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onOpenDrawer={(lead) => setSelectedLeadForDrawer(lead)}
              onOpenConvertModal={(lead) => setSelectedLeadForConvert(lead)}
            />
          )}

          {activeQueue === "PAYMENT_RECOVERY" && (
            <PaymentRecoveryQueueTable
              invoices={recoveryInvoices}
              todayStr={todayStr}
              onOpenProofModal={(inv) => setSelectedInvoiceForProof(inv)}
              onOpenCallLogModal={(inv) => setSelectedInvoiceForCallLog(inv)}
              onOpenVerifyModal={(claimId) => setSelectedClaimIdForVerify(claimId)}
            />
          )}

          {activeQueue === "ARCHIVE" && (
            <ArchivedDealsTable
              leads={filteredLeads}
              onOpenDrawer={(lead) => setSelectedLeadForDrawer(lead)}
              onReopenLead={handleReopenLead}
            />
          )}

          {/* Floating Bulk Action Dock */}
          <BulkActionDock
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            onApplyChange={applyBulkChange}
            onPromptMarkLost={() => {
              setLostIds(selectedIds);
              setIsLostDialogOpen(true);
            }}
            activeReps={activeReps}
          />
        </>
      )}

      {/* Slide-over Timeline Interaction Drawer */}
      <LeadInteractionDrawer
        lead={selectedLeadForDrawer ? (leads.find((l) => l.id === selectedLeadForDrawer.id) || selectedLeadForDrawer) : null}
        isOpen={!!selectedLeadForDrawer}
        onClose={() => setSelectedLeadForDrawer(null)}
        onOpenConvertModal={(lead) => {
          setSelectedLeadForDrawer(null);
          setSelectedLeadForConvert(lead);
        }}
      />

      {/* Convert Lead to Booking Modal */}
      {selectedLeadForConvert && (
        <ConvertLeadModal
          lead={selectedLeadForConvert}
          onClose={() => setSelectedLeadForConvert(null)}
          onConverted={(msg) => {
            setSelectedLeadForConvert(null);
            showToast(typeof msg === "string" ? msg : `Booking confirmed for ${selectedLeadForConvert.fullName}!`);
          }}
        />
      )}

      {/* New Lead Intake Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSuccess={(leadName) => {
          setIsNewLeadModalOpen(false);
          showToast(`New traveler lead "${leadName || "Inquiry"}" created successfully.`);
        }}
      />

      {/* Loss Reason Prompt Modal */}
      {isLostDialogOpen && (
        <LostReasonDialog
          ids={lostIds}
          onClose={() => {
            setIsLostDialogOpen(false);
            setLostIds([]);
          }}
          onSaved={() => {
            setSelectedIds([]);
            showToast(`${lostIds.length} lead(s) marked as lost.`);
          }}
        />
      )}

      {/* Submit Payment Proof Modal */}
      <SubmitPaymentProofModal
        invoice={selectedInvoiceForProof}
        isOpen={!!selectedInvoiceForProof}
        onClose={() => setSelectedInvoiceForProof(null)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Payment Recovery Call Log Modal */}
      <RecoveryCallLogModal
        invoice={selectedInvoiceForCallLog}
        isOpen={!!selectedInvoiceForCallLog}
        onClose={() => setSelectedInvoiceForCallLog(null)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Admin Verify Payment Modal */}
      {selectedClaimIdForVerify && (
        <VerifyPaymentModal
          claimId={selectedClaimIdForVerify}
          onClose={() => setSelectedClaimIdForVerify(null)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}
    </div>
  );
}
