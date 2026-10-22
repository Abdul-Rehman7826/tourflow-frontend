"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClockAlert,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { canFinalizeAttendanceDate, localDateKey } from "@/lib/attendance-operations";

interface AttendanceReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalized: (message: string) => void;
}

export function AttendanceReconciliationModal({
  isOpen,
  onClose,
  onFinalized,
}: AttendanceReconciliationModalProps) {
  const { user } = useAuth();
  const {
    attendanceCutoffTime,
    attendanceRecords,
    employees,
    finalizeDailyAttendance,
    previewDailyAttendance,
    updateAttendanceCutoffTime,
  } = useData();
  const [targetDate, setTargetDate] = useState(() => localDateKey());
  const [draftCutoff, setDraftCutoff] = useState(attendanceCutoffTime);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const preview = previewDailyAttendance(targetDate);
  const employeeName = (id: string) => employees.find((employee) => employee.id === id)?.fullName ?? id;
  const cutoffValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(draftCutoff);
  const canFinalize = cutoffValid && canFinalizeAttendanceDate(targetDate, draftCutoff);

  const activeEmployees = employees.filter(
    (employee) => employee.tenantId === user?.tenantId && employee.status === "ACTIVE",
  );
  const totalActiveHeadcount = activeEmployees.length;
  const presentTodayCount = attendanceRecords.filter(
    (r) =>
      r.tenantId === user?.tenantId &&
      (r.attendanceDate === targetDate || r.date === targetDate) &&
      (r.status === "PRESENT" || r.status === "LATE" || Boolean(r.checkInAt)),
  ).length;

  const affectedCount = preview.absentEmployeeIds.length + preview.leaveEmployeeIds.length + preview.missingCheckoutEmployeeIds.length;

  const confirmFinalization = async () => {
    setError("");
    setIsSaving(true);
    try {
      if (draftCutoff !== attendanceCutoffTime) updateAttendanceCutoffTime(draftCutoff);
      const summary = await finalizeDailyAttendance(targetDate, user?.name || "Attendance Administrator");
      onFinalized(
        `Daily attendance finalized. ${summary.absentEmployeeIds.length} unexcused absence(s) recorded.`,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to finalize this attendance date.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconciliation-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
        <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-white/10">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[#1B7167]/20 bg-[#1B7167]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1B7167] dark:text-[#2DD4BF]">
              <ShieldCheck className="h-3.5 w-3.5" /> Executive reconciliation
            </div>
            <h2 id="reconciliation-title" className="text-xl font-black tracking-tight text-gray-950 dark:text-white">Finalize Daily Attendance</h2>
            <p className="mt-1 text-xs text-gray-500">Resolve missing punches after the operational cutoff and preserve a complete audit trail.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close reconciliation modal" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:hover:bg-white/10 dark:hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Attendance Date</span>
              <input type="date" max={localDateKey()} value={targetDate} onChange={(event) => { if (event.target.value) setTargetDate(event.target.value); setError(""); }} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tenant Cutoff (PKT)</span>
              <input type="time" value={draftCutoff} onChange={(event) => { setDraftCutoff(event.target.value); setError(""); }} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]" />
            </label>
          </div>

          {!canFinalize && (
            <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="text-sm font-bold">Cutoff has not been reached</p><p className="mt-0.5 text-xs">Today can be finalized after {draftCutoff} PKT. Earlier dates remain available for reconciliation.</p></div>
            </div>
          )}

          {/* 5-Card Operational Impact Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryCard label="Active Roster" value={totalActiveHeadcount} icon={Building2} tone="slate" />
            <SummaryCard label="Present Today" value={presentTodayCount} icon={UserCheck} tone="emerald" />
            <SummaryCard label="Approved Leave" value={preview.leaveEmployeeIds.length} icon={CheckCircle2} tone="sky" />
            <SummaryCard label="Mark Absent" value={preview.absentEmployeeIds.length} icon={UserMinus} tone="rose" />
            <SummaryCard label="Missing Check-out" value={preview.missingCheckoutEmployeeIds.length} icon={ClockAlert} tone="amber" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ImpactList
              title="Automatic resolutions"
              emptyText="No missing attendance rows require resolution."
              rows={[
                ...preview.absentEmployeeIds.map((id) => ({ id, name: employeeName(id), detail: "ABSENT / 0 worked minutes", className: "text-rose-600 dark:text-rose-400" })),
                ...preview.leaveEmployeeIds.map((id) => ({ id, name: employeeName(id), detail: "ON LEAVE / approved request", className: "text-sky-600 dark:text-sky-400" })),
              ]}
            />
            <ImpactList
              title="Manual HR audit queue"
              emptyText="No incomplete check-outs were detected."
              rows={preview.missingCheckoutEmployeeIds.map((id) => ({ id, name: employeeName(id), detail: "Check-out remains blank", className: "text-amber-600 dark:text-amber-400" }))}
            />
          </div>

          <div className="flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.025]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-5 text-gray-600 dark:text-gray-300">Finalization never fabricates a check-out timestamp. Employees who checked in but did not check out are flagged for an audited manual correction.</p>
          </div>

          {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-gray-500">{affectedCount} employee record{affectedCount === 1 ? "" : "s"} affected / {preview.unchangedEmployeeIds.length} unchanged</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10">Cancel</button>
            <button type="button" onClick={confirmFinalization} disabled={!canFinalize || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-purple-600/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:text-white [&>span]:text-white">
              <FileCheck2 className="h-4 w-4 text-white" /><span className="text-white font-medium">{isSaving ? "Finalizing..." : "Confirm & Lock Daily Cutoff"}</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export const FinalizeDayModal = AttendanceReconciliationModal;

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof UserMinus; tone: "slate" | "emerald" | "rose" | "sky" | "amber" }) {
  const tones = {
    slate: "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5 text-gray-700 dark:text-gray-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return <article className={`rounded-xl border p-3.5 ${tones[tone]}`}><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider">{label}</p><Icon className="h-4 w-4" /></div><p className="mt-2 font-mono text-2xl font-black">{value}</p></article>;
}

interface ImpactRow { id: string; name: string; detail: string; className: string }

function ImpactList({ title, rows, emptyText }: { title: string; rows: ImpactRow[]; emptyText: string }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-950 dark:text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/[0.025]">{emptyText}</p> : rows.map((row) => <div key={`${row.id}-${row.detail}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-white/[0.025]"><p className="truncate text-xs font-bold text-gray-900 dark:text-white">{row.name}</p><p className={`shrink-0 text-[10px] font-bold ${row.className}`}>{row.detail}</p></div>)}
      </div>
    </section>
  );
}
