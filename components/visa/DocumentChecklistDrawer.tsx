"use client";

import { useAgencySettings } from "@/context/ThemeContext";

import React, { useState, useEffect } from "react";
import {
  LegacyVisaCase as VisaCase,
  LegacyVisaStage as VisaStage,
  LegacyVisaDocumentItem as VisaDocumentItem,
} from "@/types/erp";
import { useData } from "@/context/DataContext";
import {
  X,
  CheckCircle2,
  Flame,
  Calendar,
  User,
  Send,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

interface DocumentChecklistDrawerProps {
  isOpen: boolean;
  visaCase: VisaCase | null;
  stages: { id: VisaStage; label: string }[];
  onClose: () => void;
  onAdvanceStage: (caseId: string, newStage: VisaStage) => void;
}

const DEFAULT_DOCUMENTS: Omit<VisaDocumentItem, "id">[] = [
  {
    name: "Original Passport",
    required: true,
    status: "Verified",
    notes: "Must have at least 6 months validity & minimum 2 blank visa pages",
  },
  {
    name: "6-Month Bank Statement",
    required: true,
    status: "Pending",
    notes:
      "Original bank stamp required; closing balance verified against country threshold",
  },
  {
    name: "Photograph",
    required: true,
    status: "Verified",
    notes: "White background, matte finish, 35x45mm (or 50x50mm for US/Canada)",
  },
  {
    name: "Embassy Application Form",
    required: true,
    status: "Pending",
    notes:
      "Accurately completed with biometric barcode appointment confirmation",
  },
];

export function DocumentChecklistDrawer({
  isOpen,
  visaCase,
  stages,
  onClose,
  onAdvanceStage: _onAdvanceStage,
}: DocumentChecklistDrawerProps) {
  const { updateVisaDocuments, updateVisaStage } = useData();
  const { formatMoney } = useAgencySettings();

  // Local state for documents list
  const [documents, setDocuments] = useState<VisaDocumentItem[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Initialize documents when visaCase changes
  useEffect(() => {
    if (!visaCase) return;

    const existingDocuments = visaCase.documents;

    if (existingDocuments && existingDocuments.length > 0) {
      queueMicrotask(() => {
        setDocuments(existingDocuments);
      });
    } else {
      const seeded = DEFAULT_DOCUMENTS.map((doc, idx) => ({
        ...doc,
        id: `doc_${idx + 1}`,
      }));
      queueMicrotask(() => {
        setDocuments(seeded);
      });
    }
  }, [visaCase]);

  if (!isOpen || !visaCase) return null;

  // Toggle document status
  const handleToggleDoc = (docId: string) => {
    const updated = documents.map((d) => {
      if (d.id === docId) {
        const nextStatus: "Verified" | "Pending" =
          d.status === "Verified" ? "Pending" : "Verified";
        return {
          ...d,
          status: nextStatus,
          verifiedAt:
            nextStatus === "Verified" ? new Date().toISOString() : undefined,
        };
      }
      return d;
    });

    setDocuments(updated);
    updateVisaDocuments(visaCase.id, updated);
  };

  // Add custom document to checklist
  const handleAddCustomDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newDoc: VisaDocumentItem = {
      id: `doc-custom-${Date.now()}`,
      name: newDocName.trim(),
      required: true,
      status: "Pending",
    };

    const updated = [...documents, newDoc];
    setDocuments(updated);
    updateVisaDocuments(visaCase.id, updated);
    setNewDocName("");
    setIsAddingDoc(false);
  };

  // Delete custom document
  const handleDeleteDoc = (docId: string) => {
    const updated = documents.filter((d) => d.id !== docId);
    setDocuments(updated);
    updateVisaDocuments(visaCase.id, updated);
  };

  // Checklist verification counts & progress
  const verifiedCount = documents.filter((d) => d.status === "Verified").length;
  const totalCount = documents.length;
  const percentVerified =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;
  const isAllVerified = totalCount > 0 && verifiedCount === totalCount;

  // Check 48-Hour Urgency
  const isUrgentAppointment = () => {
    if (!visaCase.appointmentDate) return false;
    const now = new Date("2026-09-07T05:00:00Z").getTime();
    const appt = new Date(`${visaCase.appointmentDate}T10:00:00Z`).getTime();
    const diff = (appt - now) / (1000 * 60 * 60);
    return diff > 0 && diff <= 48;
  };

  const isUrgent = isUrgentAppointment();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white dark:bg-[#0B0F19] border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col">
          {/* DRAWER HEADER */}
          <div className="p-5 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#080C14]/80 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{visaCase.flagEmoji}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
                  {visaCase.country}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Case #{visaCase.id}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {visaCase.clientName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {visaCase.visaType} • Passport:{" "}
                <strong className="font-mono text-gray-800 dark:text-gray-200">
                  {visaCase.passportNo}
                </strong>
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* URGENT 48-HOUR BANNER */}
          {isUrgent && (
            <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-3">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-xs">
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  Urgent: Appointment Due Within 48 Hours!
                </strong>
                <p className="text-rose-500/90 dark:text-rose-400/80 text-[11px]">
                  Scheduled for {visaCase.appointmentDate}{" "}
                  {visaCase.appointmentTime
                    ? `at ${visaCase.appointmentTime}`
                    : ""}
                  . Ensure all 4 mandatory documents are verified today.
                </p>
              </div>
            </div>
          )}

          {/* DRAWER BODY (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
            {/* DYNAMIC PROGRESS INDICATOR */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                    Verification Progress
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                    {verifiedCount} of {totalCount} Verified
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                    isAllVerified
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {percentVerified}% Ready
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-gray-200 dark:bg-[#080C14] rounded-full overflow-hidden p-[1px] border border-gray-200 dark:border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAllVerified
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-amber-500 to-purple-500"
                  }`}
                  style={{ width: `${percentVerified}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>
                  {isAllVerified
                    ? "✓ Dossier complete for embassy submission"
                    : `⚠️ ${totalCount - verifiedCount} required documents still pending`}
                </span>
                {isAllVerified && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready
                  </span>
                )}
              </div>
            </div>

            {/* PIPELINE STAGE CONTROLLER */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-2.5">
              <label className="text-gray-700 dark:text-gray-300 font-bold block text-xs">
                Active Pipeline Stage:
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={visaCase.stage}
                  onChange={(e) => {
                    const newStage = e.target.value as VisaStage;
                    updateVisaStage(visaCase.id, newStage);
                  }}
                  className="flex-1 px-3 py-2 bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {stages.map((st) => (
                    <option
                      key={st.id}
                      value={st.id}
                      className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white"
                    >
                      {st.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const currIdx = stages.findIndex(
                      (s) => s.id === visaCase.stage,
                    );
                    if (currIdx < stages.length - 1) {
                      updateVisaStage(visaCase.id, stages[currIdx + 1].id);
                    }
                  }}
                  disabled={
                    stages.findIndex((s) => s.id === visaCase.stage) >=
                    stages.length - 1
                  }
                  className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                >
                  Advance Stage →
                </button>
              </div>
            </div>

            {/* MANDATORY CHECKLIST ITEMS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Required Document Checklist
                </h3>
                <span className="text-[11px] text-gray-500">
                  Toggle to update verification
                </span>
              </div>

              <div className="space-y-2.5">
                {documents.map((doc) => {
                  const isVerified = doc.status === "Verified";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                        isVerified
                          ? "bg-emerald-500/5 dark:bg-[#0B0F19] border-emerald-500/40 hover:border-emerald-500"
                          : "bg-white dark:bg-[#030712] border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      {/* Interactive Toggle Checkbox Pill */}
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isVerified
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-transparent"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold text-xs ${
                              isVerified
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {doc.name}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isVerified
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isVerified ? "✓ Verified" : "Pending"}
                          </span>
                        </div>

                        {doc.notes && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                            {doc.notes}
                          </p>
                        )}

                        {doc.verifiedAt && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-mono">
                            Verified on{" "}
                            {new Date(doc.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Delete Custom Doc Button if custom */}
                      {doc.id.startsWith("doc-custom-") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoc(doc.id);
                          }}
                          className="text-gray-400 hover:text-rose-500 p-1 rounded transition-colors"
                          title="Remove custom document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Document Form */}
              {isAddingDoc ? (
                <form
                  onSubmit={handleAddCustomDoc}
                  className="p-3 bg-gray-50 dark:bg-[#030712] rounded-xl border border-gray-200 dark:border-white/10 space-y-2"
                >
                  <label className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold block">
                    Document Title / Requirement:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. FBR Tax Return or Travel Insurance Policy"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-2 py-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingDoc(true)}
                  className="w-full py-2 border border-dashed border-gray-300 dark:border-white/10 hover:border-purple-500/50 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Additional Document to Checklist</span>
                </button>
              )}
            </div>

            {/* CASE METADATA & PARTICULARS */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Application Particulars
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] block">
                    Embassy Appointment
                  </span>
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    {visaCase.appointmentDate || "Not Scheduled"}
                  </p>
                  {visaCase.appointmentTime && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {visaCase.appointmentTime}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] block">
                    Consultant Assigned
                  </span>
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    {visaCase.consultantName}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Visa Processing Desk
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] block">
                    Advisory &amp; Visa Fee
                  </span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {formatMoney(visaCase.feeAmount)}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Official fees &amp; service charge
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] block">
                    Consular Tracking #
                  </span>
                  <p className="font-mono text-gray-800 dark:text-gray-200 font-semibold truncate">
                    {visaCase.trackingNumber || "Pending Submission"}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    VAC / Embassy Barcode
                  </p>
                </div>
              </div>

              {visaCase.notes && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold block">
                    Special Case Notes:
                  </span>
                  <p className="text-gray-700 dark:text-gray-300 text-xs italic">
                    {visaCase.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* DRAWER FOOTER */}
          <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#080C14] flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium text-xs transition-colors cursor-pointer"
            >
              Close Drawer
            </button>

            <button
              onClick={() => {
                const currIdx = stages.findIndex(
                  (s) => s.id === visaCase.stage,
                );
                if (currIdx < stages.length - 1) {
                  updateVisaStage(visaCase.id, stages[currIdx + 1].id);
                  onClose();
                }
              }}
              disabled={
                stages.findIndex((s) => s.id === visaCase.stage) >=
                stages.length - 1
              }
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Save &amp; Advance to Next Stage</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
