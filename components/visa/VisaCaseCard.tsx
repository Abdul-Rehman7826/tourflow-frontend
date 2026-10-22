"use client";

import React, { useMemo } from "react";
import { LegacyVisaCase as VisaCase, LegacyVisaStage as VisaStage } from "@/types/erp";
import {
  FileText,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Flame,
  CheckCheck,
} from "lucide-react";

interface VisaCaseCardProps {
  visaCase: VisaCase;
  stageIndex: number;
  stages: { id: VisaStage; label: string }[];
  onSelectCase: (visaCase: VisaCase) => void;
  onAdvanceStage: (caseId: string, nextStage: VisaStage) => void;
  onRevertStage: (caseId: string, prevStage: VisaStage) => void;
}

export function VisaCaseCard({
  visaCase,
  stageIndex,
  stages,
  onSelectCase,
  onAdvanceStage,
  onRevertStage,
}: VisaCaseCardProps) {
  
  // 48-Hour Urgent Appointment Check
  // Determines if embassy interview or biometrics appointment is due within 48 hours
  const urgency = useMemo(() => {
    if (!visaCase.appointmentDate) return { isDueSoon: false, hoursLeft: 0, text: "" };

    // Reference time: current local app time (Sept 7, 2026 04:30) or system time
    const now = new Date("2026-09-07T05:00:00Z").getTime();
    
    // Appointment timestamp
    const apptDateStr = `${visaCase.appointmentDate}T${
      visaCase.appointmentTime ? convertTo24H(visaCase.appointmentTime) : "10:00:00"
    }Z`;
    const apptTime = new Date(apptDateStr).getTime();

    const diffMs = apptTime - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    // Due within 48 hours (and not in the distant past)
    const isDueSoon = diffHours > 0 && diffHours <= 48;

    return {
      isDueSoon,
      diffHours,
      text: isDueSoon
        ? `Biometrics / Interview in ${diffHours}h`
        : visaCase.appointmentDate,
    };
  }, [visaCase.appointmentDate, visaCase.appointmentTime]);

  // Helper for 24h conversion
  function convertTo24H(timeStr: string) {
    const [time, modifier] = timeStr.split(" ");
    const [hours, minutes] = time.split(":");
    if (hours === "12") {
      const normalizedHours = "00";
      return `${normalizedHours.padStart(2, "0")}:${minutes || "00"}:00`;
    }
    if (modifier === "PM") {
      const normalizedHours = (parseInt(hours, 10) + 12).toString();
      return `${normalizedHours.padStart(2, "0")}:${minutes || "00"}:00`;
    }
    return `${hours.padStart(2, "0")}:${minutes || "00"}:00`;
  }

  // Document checklist progress
  const docProgress = useMemo(() => {
    const docs = visaCase.documents || [
      { id: "1", name: "Original Passport", required: true, status: "Verified" as const },
      { id: "2", name: "6-Month Bank Statement", required: true, status: "Verified" as const },
      { id: "3", name: "Photograph", required: true, status: "Verified" as const },
      { id: "4", name: "Embassy Application Form", required: true, status: "Verified" as const },
    ];
    const verified = docs.filter((d) => d.status === "Verified").length;
    const total = docs.length;
    const percent = total > 0 ? Math.round((verified / total) * 100) : 0;
    const isAllDone = verified === total;

    return { verified, total, percent, isAllDone };
  }, [visaCase.documents]);

  // Determine stage colors
  const prevStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
  const nextStage = stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;

  return (
    <div
      onClick={() => onSelectCase(visaCase)}
      className="group relative rounded-xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 hover:border-purple-500/40 hover:shadow-md transition-all cursor-pointer overflow-hidden p-4 space-y-3.5 shadow-sm"
    >
      {/* Top Bar: Country Flag & Visa Category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl shadow-sm leading-none" title={visaCase.country}>
            {visaCase.flagEmoji}
          </span>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {visaCase.country}
            </h4>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
              {visaCase.passportNo}
            </span>
          </div>
        </div>

        {/* Visa Type Badge */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          visaCase.visaType.toLowerCase().includes("student")
            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            : visaCase.visaType.toLowerCase().includes("business")
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
        }`}>
          {visaCase.visaType.split("(")[0].trim()}
        </span>
      </div>

      {/* 48-HOUR URGENT APPOINTMENT HIGHLIGHT BADGE */}
      {urgency.isDueSoon && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 shadow-sm animate-pulse">
          <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 truncate">
            <span>🚨 {urgency.text}</span>
            {visaCase.appointmentTime && (
              <span className="text-amber-600 dark:text-amber-300 ml-1">({visaCase.appointmentTime})</span>
            )}
          </div>
        </div>
      )}

      {/* Client Name & Consultant */}
      <div className="space-y-1">
        <p className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center justify-between">
          <span>{visaCase.clientName}</span>
          {visaCase.decisionStatus === "Approved" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Approved
            </span>
          )}
          {visaCase.decisionStatus === "Rejected" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              Refused
            </span>
          )}
        </p>

        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <span className="truncate max-w-[120px]">{visaCase.consultantName.split("(")[0]}</span>
          </span>
          {visaCase.submissionDate && (
            <span className="text-[10px] text-gray-400 font-mono">
              Sub: {visaCase.submissionDate}
            </span>
          )}
        </div>
      </div>

      {/* Document Checklist Progress Pill */}
      <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Checklist Status:
          </span>
          <span className={`font-mono font-bold ${
            docProgress.isAllDone ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            {docProgress.verified} of {docProgress.total} Verified
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-[#030712] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              docProgress.isAllDone
                ? "bg-emerald-500"
                : docProgress.percent >= 50
                ? "bg-amber-500"
                : "bg-purple-500"
            }`}
            style={{ width: `${docProgress.percent}%` }}
          />
        </div>
      </div>

      {/* Notes / Special Instructions if any */}
      {visaCase.notes && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 italic line-clamp-1">
          &quot; {visaCase.notes} &quot;
        </p>
      )}

      {/* Move Buttons / Quick Stage Handlers */}
      <div
        className="pt-2 flex items-center justify-between gap-1.5"
        onClick={(e) => e.stopPropagation()} // don't open drawer when clicking buttons
      >
        {prevStage ? (
          <button
            onClick={() => onRevertStage(visaCase.id, prevStage.id)}
            title={`Move back to ${prevStage.label}`}
            className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-semibold flex items-center gap-1 border border-gray-200 dark:border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Back</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => onSelectCase(visaCase)}
          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20 transition-colors cursor-pointer"
        >
          Checklist
        </button>

        {nextStage ? (
          <button
            onClick={() => onAdvanceStage(visaCase.id, nextStage.id)}
            title={`Advance to ${nextStage.label}`}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer ml-auto"
          >
            <span>Advance</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
        )}
      </div>

    </div>
  );
}
