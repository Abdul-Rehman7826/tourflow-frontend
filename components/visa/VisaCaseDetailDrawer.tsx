"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import type {
  VisaCase,
  VisaStage,
  VisaDecision,
  PassportCustodyLocation,
  VisaDocumentItem,
  PassportCustodyEvent,
} from "@/types/erp";
import {
  X,
  Lock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Flame,
  Paperclip,
} from "lucide-react";

export const VISA_STAGES: VisaStage[] = [
  "DOCUMENTS_PENDING",
  "APPOINTMENT_BOOKED",
  "SUBMITTED_TO_EMBASSY",
  "DECISION_RECEIVED",
  "PASSPORT_READY_FOR_PICKUP",
  "COMPLETED",
];

export const CUSTODY_LOCATIONS: PassportCustodyLocation[] = [
  "CLIENT_HOLDING",
  "OFFICE_SAFE",
  "WITH_CASE_OFFICER",
  "SUBMITTED_TO_VFS_GERRYS",
  "AT_EMBASSY",
  "DISPATCHED_COURIER",
];

export const visaLabel = (value?: string) => {
  if (!value) return "";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

interface VisaCaseDetailDrawerProps {
  isOpen: boolean;
  visaCase: VisaCase | null;
  onClose: () => void;
  onSave?: (updatedCase: VisaCase) => void;
}

export function VisaCaseDetailDrawer({
  isOpen,
  visaCase,
  onClose,
  onSave,
}: VisaCaseDetailDrawerProps) {
  if (!isOpen || !visaCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <VisaCaseDrawerContent
        key={visaCase.id}
        visaCase={visaCase}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}

function VisaCaseDrawerContent({
  visaCase,
  onClose,
  onSave,
}: {
  visaCase: VisaCase;
  onClose: () => void;
  onSave?: (updatedCase: VisaCase) => void;
}) {
  const { user, staffUsers = [] } = useAuth();
  const isVaultEnabled = Boolean(user?.tenant?.enabled_modules?.vault);
  const { formatMoney } = useAgencySettings();
  const { saveVisaPipelineCase } = useData();

  // Active sub-tab in drawer
  const [activeTab, setActiveTab] = useState<"DETAILS" | "DOCS" | "CUSTODY" | "HISTORY">("DETAILS");

  // Editable Form State initialized directly from props
  const [stage, setStage] = useState<VisaStage>(visaCase.stage);
  const [decision, setDecision] = useState<VisaDecision>(visaCase.decision);
  const [assignedStaffId, setAssignedStaffId] = useState(visaCase.assignedStaffId || "");
  const [appointmentDate, setAppointmentDate] = useState(visaCase.appointmentDate || "");
  const [centerName, setCenterName] = useState(visaCase.centerName || "");
  const [embassyTrackingRef, setEmbassyTrackingRef] = useState(visaCase.embassyTrackingRef || "");
  const [passportNumber, setPassportNumber] = useState(visaCase.passportNumber || "");
  const [notes, setNotes] = useState(visaCase.notes || "");

  // Document checklist local state
  const [checklist, setChecklist] = useState<VisaDocumentItem[]>(visaCase.documentChecklist || []);
  const [newDocName, setNewDocName] = useState("");

  // Physical Custody Transfer Form State
  const [targetCustody, setTargetCustody] = useState<PassportCustodyLocation>(visaCase.passportCustody || "CLIENT_HOLDING");
  const [custodyLockerId, setCustodyLockerId] = useState(visaCase.custodySafeLockerId || "");
  const [courierTracking, setCourierTracking] = useState(visaCase.courierTrackingCode || "");
  const [custodyNotes, setCustodyNotes] = useState("");
  const [custodyConfirmed, setCustodyConfirmed] = useState(false);

  // Status & Error Messages
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Urgent appointment check
  const isUrgent = Boolean(
    appointmentDate &&
      new Date(appointmentDate).getTime() > 0 &&
      new Date(appointmentDate).getTime() - new Date("2026-09-18T00:00:00Z").getTime() > 0 &&
      new Date(appointmentDate).getTime() - new Date("2026-09-18T00:00:00Z").getTime() <= 48 * 3600 * 1000
  );

  // Handle saving general case updates
  const handleSaveDetails = () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const assignedStaff = staffUsers.find((s) => s.id === assignedStaffId);
      const updates: Partial<VisaCase> = {
        stage,
        decision,
        assignedStaffId,
        assignedStaffName: assignedStaff?.name || visaCase.assignedStaffName,
        appointmentDate,
        centerName,
        embassyTrackingRef,
        passportNumber,
        notes,
        documentChecklist: checklist,
      };

      saveVisaPipelineCase(visaCase.id, updates as unknown as Record<string, unknown>);
      if (onSave) {
        onSave({ ...visaCase, ...updates });
      }
      setFeedback({ type: "success", msg: "Case updated successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to update case.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle document checklist item status
  const handleToggleDoc = (docId: string, field: "received" | "verified") => {
    setChecklist((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const updated = { ...d, [field]: !d[field] };
        if (field === "verified" && updated.verified) {
          updated.received = true;
          updated.verifiedAt = new Date().toISOString();
        }
        return updated;
      })
    );
  };

  // Add custom document to checklist
  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    const newDoc: VisaDocumentItem = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      required: true,
      received: false,
      verified: false,
    };
    setChecklist((prev) => [...prev, newDoc]);
    setNewDocName("");
  };

  // Remove custom document from checklist
  const handleRemoveDoc = (docId: string) => {
    setChecklist((prev) => prev.filter((d) => d.id !== docId));
  };

  // Execute physical custody handover
  const handleTransferCustody = () => {
    if (!custodyConfirmed) {
      setFeedback({
        type: "error",
        msg: "Please check the box confirming you have physically inspected the passport.",
      });
      return;
    }

    if (targetCustody === "OFFICE_SAFE" && !custodyLockerId.trim()) {
      setFeedback({
        type: "error",
        msg: "Safe Locker identifier is required when transferring to Office Safe.",
      });
      return;
    }

    if (targetCustody === "DISPATCHED_COURIER" && !courierTracking.trim()) {
      setFeedback({
        type: "error",
        msg: "Courier tracking number is required when dispatching via Courier.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const now = new Date().toISOString();
      const newEvent: PassportCustodyEvent = {
        id: `evt-${Date.now()}`,
        fromLocation: visaCase.passportCustody,
        toLocation: targetCustody,
        transferredBy: user?.name || "Staff",
        transferredByStaff: user?.name || "Staff",
        staffId: user?.id,
        timestamp: now,
        safe_locker_id: targetCustody === "OFFICE_SAFE" ? custodyLockerId : undefined,
        custodySafeLockerId: targetCustody === "OFFICE_SAFE" ? custodyLockerId : undefined,
        courier_tracking_code: targetCustody === "DISPATCHED_COURIER" ? courierTracking : undefined,
        courierTrackingCode: targetCustody === "DISPATCHED_COURIER" ? courierTracking : undefined,
        notes: custodyNotes,
        details: custodyNotes,
      };

      const updatedHistory = [newEvent, ...(visaCase.custodyHistory || [])];

      const updates: Partial<VisaCase> = {
        passportCustody: targetCustody,
        custodyConfirmed: true,
        custodySafeLockerId: targetCustody === "OFFICE_SAFE" ? custodyLockerId : undefined,
        courierTrackingCode: targetCustody === "DISPATCHED_COURIER" ? courierTracking : undefined,
        custodyHistory: updatedHistory,
      };

      saveVisaPipelineCase(visaCase.id, updates as unknown as Record<string, unknown>);
      if (onSave) {
        onSave({ ...visaCase, ...updates });
      }
      setCustodyConfirmed(false);
      setCustodyNotes("");
      setFeedback({ type: "success", msg: `Passport custody transferred to ${visaLabel(targetCustody)}.` });
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to record custody transfer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiedCount = checklist.filter((d) => d.verified).length;
  const totalDocs = checklist.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visa Case ${visaCase.caseNumber}`}
      className="relative flex h-full w-full max-w-[470px] flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-[#121C18] border-l border-gray-200 dark:border-white/10"
    >
      {/* Top Header */}
      <div className="border-b border-gray-100 bg-[#EFF1EB]/40 p-5 dark:border-white/5 dark:bg-[#09110F]">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#1B7167]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
                {visaCase.caseNumber}
              </span>
              {isUrgent && (
                <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Flame className="h-3 w-3" />
                  48h Urgent
                </span>
              )}
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {visaCase.sourceType === "GROUP_TOUR" ? "Group Tour" : "Standalone"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#161A17] dark:text-[#F1F5F2]">
              {visaCase.applicantName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {visaCase.country} • {visaCase.visaType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sub-tabs */}
        <div className="mt-4 flex gap-1 rounded-lg border border-gray-200/80 bg-white p-1 text-xs font-semibold dark:border-white/10 dark:bg-[#030712]">
          {(
            [
              { id: "DETAILS", label: "Logistics" },
              { id: "DOCS", label: `Checklist (${verifiedCount}/${totalDocs})` },
              { id: "CUSTODY", label: "Passport Vault" },
              { id: "HISTORY", label: "Audit Log" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setFeedback(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${
                activeTab === t.id
                  ? "bg-[#1B7167] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mx-5 mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-[#161A17] dark:text-[#F1F5F2]">
        {/* TAB 1: DETAILS & LOGISTICS */}
        {activeTab === "DETAILS" && (
          <div className="space-y-4">
            {/* Stage Stepper Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as VisaStage)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
              >
                {VISA_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {visaLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Embassy Decision */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Embassy Decision
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as VisaDecision)}
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
              >
                <option value="PENDING">Pending Decision</option>
                <option value="APPROVED">Approved (Granted)</option>
                <option value="REFUSED">Refused / Rejected</option>
                <option value="ADDITIONAL_DOCS_REQUESTED">Additional Docs Requested</option>
              </select>
            </div>

            {/* Passport & Phone Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-mono text-sm tracking-tight text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                  placeholder="e.g. AA1234567"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Assigned Staff
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-[#161A17] focus:border-[#1B7167] focus:outline-none dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Appointment Date & VFS Center */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-[#080C14]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">
                Embassy Logistics
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Appointment / Biometrics Date
                </label>
                <input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Submission Center / VFS Location
                </label>
                <input
                  type="text"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  placeholder="e.g. VFS Global Gerrys Islamabad"
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Embassy Tracking Reference
                </label>
                <input
                  type="text"
                  value={embassyTrackingRef}
                  onChange={(e) => setEmbassyTrackingRef(e.target.value)}
                  placeholder="e.g. PAK/ISB/120926/001"
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-sm tracking-tight text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                />
              </div>
            </div>

            {/* Consultancy Fees Card */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-[#080C14]">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Consultancy & Govt Fee</p>
                <p className="font-mono text-base font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                  {formatMoney(visaCase.consultancyFee + (visaCase.embassyFeePaid || 0))}
                </p>
              </div>
              <span className="rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                Billing Synchronized
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Internal Case Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Embassy requirements, document notes or client remarks..."
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
              />
            </div>

            <button
              onClick={handleSaveDetails}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#1B7167] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#155A52] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Case Details"}
            </button>
          </div>
        )}

        {/* TAB 2: DOCUMENT CHECKLIST */}
        {activeTab === "DOCS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#161A17] dark:text-[#F1F5F2]">
                  Document Readiness Checklist
                </h3>
                <p className="text-xs text-gray-500">
                  Verify physical or digital copies before booking appointments.
                </p>
              </div>
              <span className="rounded-full bg-[#1B7167]/10 px-3 py-1 font-mono text-xs font-bold text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
                {verifiedCount} / {totalDocs}
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {checklist.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 text-xs transition-colors dark:border-white/10 dark:bg-[#080C14]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#161A17] dark:text-[#F1F5F2]">
                      {doc.name}
                      {doc.required && <span className="ml-1 text-rose-500">*</span>}
                    </span>
                    <button
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="text-gray-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {doc.notes && <p className="text-[11px] text-gray-500">{doc.notes}</p>}
                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-white/5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.received}
                        onChange={() => handleToggleDoc(doc.id, "received")}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#1B7167] focus:ring-[#1B7167]"
                      />
                      <span className="text-[11px]">Received</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.verified}
                        onChange={() => handleToggleDoc(doc.id, "verified")}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#1B7167] focus:ring-[#1B7167]"
                      />
                      <span
                        className={`text-[11px] font-medium ${
                          doc.verified
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-500"
                        }`}
                      >
                        Verified
                      </span>
                    </label>
                    {doc.verifiedAt && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(doc.verifiedAt).toLocaleDateString()}
                      </span>
                    )}
                    {isVaultEnabled && (
                      <div className="ml-auto flex items-center gap-2">
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B7167] hover:underline dark:text-[#2DD4BF]"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>Scan Attached</span>
                          </a>
                        ) : (
                          <label className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#1B7167] cursor-pointer dark:hover:text-[#2DD4BF]">
                            <Paperclip className="h-3 w-3" />
                            <span>Attach Scan</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const { uploadVaultDocument } = await import("@/lib/visa-api");
                                  const res = await uploadVaultDocument(doc.id, file);
                                  if (res.document?.fileUrl) {
                                    setChecklist((prev) =>
                                      prev.map((d) => (d.id === doc.id ? { ...d, fileUrl: res.document?.fileUrl, received: true } : d))
                                    );
                                  }
                                } catch (err: any) {
                                  alert(err.message || "Upload failed");
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Requirement */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Add required document..."
                className="flex-1 rounded-lg border border-gray-200 bg-white p-2 text-xs text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
              />
              <button
                onClick={handleAddDocument}
                className="flex items-center gap-1 rounded-lg bg-[#1B7167]/10 px-3 py-2 text-xs font-semibold text-[#1B7167] hover:bg-[#1B7167]/20 dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            <button
              onClick={handleSaveDetails}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#1B7167] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#155A52] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Checklist State"}
            </button>
          </div>
        )}

        {/* TAB 3: PASSPORT SAFE CUSTODY VAULT */}
        {activeTab === "CUSTODY" && (
          <div className="space-y-4">
            {/* Current Status Card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-[#080C14]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">Current Physical Custody</span>
                  <h4 className="mt-1 text-base font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                    {visaLabel(visaCase.passportCustody)}
                  </h4>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    visaCase.custodyConfirmed
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                  }`}
                >
                  {visaCase.custodyConfirmed ? "Confirmed & Verified" : "Unconfirmed"}
                </span>
              </div>

              {visaCase.passportCustody === "OFFICE_SAFE" && visaCase.custodySafeLockerId && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span>Safe Locker ID:</span>
                  <span className="font-mono font-bold text-[#161A17] dark:text-white">
                    {visaCase.custodySafeLockerId}
                  </span>
                </div>
              )}

              {visaCase.passportCustody === "DISPATCHED_COURIER" &&
                visaCase.courierTrackingCode && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Truck className="h-4 w-4 text-blue-500" />
                    <span>Courier Tracking:</span>
                    <span className="font-mono font-bold text-[#161A17] dark:text-white">
                      {visaCase.courierTrackingCode}
                    </span>
                  </div>
                )}
            </div>

            {/* Handover & Custody Transfer Form */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#080C14]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#161A17] dark:text-[#F1F5F2]">
                Record Physical Handover
              </h4>
              <p className="text-[11px] text-gray-500">
                Moving stages does NOT move the physical passport. Transferring custody creates an
                immutable audit event with your staff identity.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  New Custody Location
                </label>
                <select
                  value={targetCustody}
                  onChange={(e) =>
                    setTargetCustody(e.target.value as PassportCustodyLocation)
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                >
                  {CUSTODY_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {visaLabel(loc)}
                    </option>
                  ))}
                </select>
              </div>

              {targetCustody === "OFFICE_SAFE" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Safe Locker Number / Tag
                  </label>
                  <input
                    type="text"
                    value={custodyLockerId}
                    onChange={(e) => setCustodyLockerId(e.target.value.toUpperCase())}
                    placeholder="e.g. LCK-04"
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-sm tracking-tight text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                  />
                </div>
              )}

              {targetCustody === "DISPATCHED_COURIER" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Courier Consignment / Tracking Code
                  </label>
                  <input
                    type="text"
                    value={courierTracking}
                    onChange={(e) => setCourierTracking(e.target.value)}
                    placeholder="e.g. TCS-982348120"
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-sm tracking-tight text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Handover Notes / Verification Remark
                </label>
                <input
                  type="text"
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                  placeholder="Handed over to VFS officer / Placed in Locker A"
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-[#161A17] dark:border-white/10 dark:bg-[#030712] dark:text-[#F1F5F2]"
                />
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={custodyConfirmed}
                  onChange={(e) => setCustodyConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B7167] focus:ring-[#1B7167]"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  I confirm that I have physically received/inspected the passport document.
                </span>
              </label>

              <button
                onClick={handleTransferCustody}
                disabled={isSubmitting || !custodyConfirmed}
                className="w-full rounded-lg bg-[#1B7167] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#155A52] disabled:opacity-50"
              >
                {isSubmitting ? "Recording Handover..." : "Execute Handover & Log Audit Event"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: IMMUTABLE AUDIT LOG */}
        {activeTab === "HISTORY" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#161A17] dark:text-[#F1F5F2]">
              Physical Custody Handover Log
            </h3>
            <p className="text-xs text-gray-500">
              Immutable audit trail recording every physical movement of this passport.
            </p>

            {(!visaCase.custodyHistory || visaCase.custodyHistory.length === 0) && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-500 dark:border-white/5 dark:bg-[#080C14]">
                No confirmed custody handovers recorded yet.
              </div>
            )}

            <div className="space-y-2.5">
              {visaCase.custodyHistory?.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 text-xs space-y-1 dark:border-white/10 dark:bg-[#080C14]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                      {visaLabel(event.fromLocation || event.from)} →{" "}
                      {visaLabel(event.toLocation || event.to)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {(event.safe_locker_id || event.custodySafeLockerId) && (
                    <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      Locker: {event.safe_locker_id || event.custodySafeLockerId}
                    </p>
                  )}
                  {(event.courier_tracking_code || event.courierTrackingCode) && (
                    <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      Tracking: {event.courier_tracking_code || event.courierTrackingCode}
                    </p>
                  )}
                  {(event.notes || event.details) && (
                    <p className="text-gray-700 dark:text-gray-300">
                      {event.notes || event.details}
                    </p>
                  )}
                  <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 dark:border-white/5">
                    Transferred by: {event.transferredByStaff || event.transferredBy || "Staff"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
