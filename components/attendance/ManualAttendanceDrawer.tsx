"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import type { AttendanceRecord, AttendanceStatus } from "@/types/erp";
import {
  X,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";

interface ManualAttendanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record?: AttendanceRecord | null;
  attendanceDate?: string;
  mode?: "edit" | "void";
  onSuccess?: (msg: string) => void;
}

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
  { label: "Present (On-Time)", value: "PRESENT" },
  { label: "Late Arrival", value: "LATE" },
  { label: "Half-Day Shift", value: "HALF_DAY" },
  { label: "Absent", value: "ABSENT" },
  { label: "Approved Leave", value: "ON_LEAVE" },
];

function toTimeInput(value?: string | null, fallback = ""): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 5) : parsed.toTimeString().slice(0, 5);
}

export function ManualAttendanceDrawer({
  isOpen,
  onClose,
  record,
  attendanceDate,
  mode = "edit",
  onSuccess,
}: ManualAttendanceDrawerProps) {
  if (!isOpen) return null;

  return (
    <ManualAttendanceDialog
      key={`${record?.id || "manual-new"}-${mode}`}
      onClose={onClose}
      record={record}
      attendanceDate={attendanceDate}
      mode={mode}
      onSuccess={onSuccess}
    />
  );
}

function ManualAttendanceDialog({
  onClose,
  record,
  attendanceDate,
  mode,
  onSuccess,
}: {
  onClose: () => void;
  record?: AttendanceRecord | null;
  attendanceDate?: string;
  mode: "edit" | "void";
  onSuccess?: (msg: string) => void;
}) {
  const { user } = useAuth();
  const {
    attendanceRecords,
    employees,
    createManualAttendanceRecord,
    updateManualAttendanceRecord,
    voidAttendanceRecord,
  } = useData();

  const activeEmployees = employees.filter((employee) =>
    (employee.employment_status || employee.status) === "ACTIVE",
  );
  const recordFromTable = Boolean(record && !record.id.startsWith("unpunched_"));
  const initialEmployeeId = record?.employeeId || record?.employee_id || activeEmployees[0]?.id || "";
  const initialDate = record?.attendanceDate || record?.date || attendanceDate || new Date().toISOString().slice(0, 10);
  const initialRecord = recordFromTable
    ? record || null
    : attendanceRecords.find((entry) =>
        entry.employeeId === initialEmployeeId
        && (entry.attendanceDate === initialDate || entry.date === initialDate)
        && !entry.id.startsWith("unpunched_"),
      ) || null;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployeeId,
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate,
  );
  const existingRecord = recordFromTable
    ? record || null
    : attendanceRecords.find((entry) =>
        entry.employeeId === selectedEmployeeId
        && (entry.attendanceDate === selectedDate || entry.date === selectedDate)
        && !entry.id.startsWith("unpunched_"),
      ) || null;
  const isEditing = Boolean(existingRecord);
  const isVoiding = mode === "void" && isEditing;
  const [status, setStatus] = useState<AttendanceStatus>(
    () => initialRecord?.status || "PRESENT"
  );
  const [checkInTime, setCheckInTime] = useState<string>(() => {
    if (initialRecord?.check_in || initialRecord?.checkInAt) {
      try {
        const d = new Date(initialRecord.check_in || initialRecord.checkInAt || "");
        return isNaN(d.getTime()) ? (initialRecord.check_in || initialRecord.checkInAt || "09:00") : d.toTimeString().slice(0, 5);
      } catch {
        return "09:00";
      }
    }
    return "09:00";
  });
  const [checkOutTime, setCheckOutTime] = useState<string>(() => {
    if (initialRecord?.check_out || initialRecord?.checkOutAt) {
      try {
        const d = new Date(initialRecord.check_out || initialRecord.checkOutAt || "");
        return isNaN(d.getTime()) ? (initialRecord.check_out || initialRecord.checkOutAt || "18:00") : d.toTimeString().slice(0, 5);
      } catch {
        return "18:00";
      }
    }
    return "18:00";
  });
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const targetEmployee = activeEmployees.find((employee) => employee.id === selectedEmployeeId);

  const loadExistingValues = (employeeId: string, date: string) => {
    const match = attendanceRecords.find((entry) =>
      entry.employeeId === employeeId
      && (entry.attendanceDate === date || entry.date === date)
      && !entry.id.startsWith("unpunched_"),
    );
    if (!match) {
      setStatus("PRESENT");
      setCheckInTime("09:00");
      setCheckOutTime("18:00");
      return;
    }
    setStatus(match.status);
    setCheckInTime(toTimeInput(match.check_in || match.checkInAt, "09:00"));
    setCheckOutTime(toTimeInput(match.check_out || match.checkOutAt, "18:00"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correctionReason.trim()) {
      setError("A mandatory audit reason is required for manual attendance modifications.");
      return;
    }

    if (correctionReason.trim().length < 5) {
      setError("Please provide a descriptive explanation (minimum 5 characters).");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const checkInISO = checkInTime ? `${selectedDate}T${checkInTime}:00` : null;
    const checkOutISO = checkOutTime ? `${selectedDate}T${checkOutTime}:00` : null;

    try {
      if (isVoiding && existingRecord) {
        if (!window.confirm(`Void attendance for ${existingRecord.employeeName} on ${selectedDate}?`)) {
          setIsSubmitting(false);
          return;
        }
        await voidAttendanceRecord(existingRecord.id, correctionReason.trim());
      } else if (existingRecord) {
        await updateManualAttendanceRecord(
          existingRecord.id,
          {
            attendanceDate: selectedDate,
            status,
            checkInAt: checkInISO || undefined,
            checkOutAt: checkOutISO || undefined,
            check_in: checkInISO,
            check_out: checkOutISO,
          },
          correctionReason.trim()
        );
      } else {
        if (!selectedEmployeeId) throw new Error("Select a staff member before saving attendance.");
        await createManualAttendanceRecord(
          selectedEmployeeId,
          selectedDate,
          {
            status,
            checkInAt: checkInISO || undefined,
            checkOutAt: checkOutISO || undefined,
            check_in: checkInISO,
            check_out: checkOutISO,
          },
          correctionReason.trim(),
        );
      }

      onSuccess?.(
        isVoiding
          ? `Attendance for ${existingRecord?.employeeName || targetEmployee?.fullName || "Employee"} was voided with an audit trail.`
          : `Attendance for ${existingRecord?.employeeName || targetEmployee?.fullName || "Employee"} ${isEditing ? "updated" : "created"} with an audit trail.`
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record manual adjustment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0B0F19] w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-white/10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] tracking-wider uppercase border border-amber-500/20">
                Audited Adjustment
              </span>
              <span className="text-xs font-mono text-gray-400">SRS §4.9.4</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#1B7167] dark:text-teal-400" />
              {isVoiding ? "Void Attendance Record" : isEditing ? "Edit Attendance Record" : "Create Attendance Record"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isVoiding
                ? "Remove this entry from attendance totals while preserving its immutable history."
                : "Administrative attendance entry with immutable reason logging."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Employee */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Staff Member
            </label>
            {recordFromTable ? (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {existingRecord?.employeeName || existingRecord?.employee_name}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">
                    {existingRecord?.employeeCode || existingRecord?.employee_code || "WCH-EMP"}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-200/50 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                  {existingRecord?.shiftName || existingRecord?.shift_name || "Regular Shift"}
                </span>
              </div>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(event) => {
                  setSelectedEmployeeId(event.target.value);
                  loadExistingValues(event.target.value, selectedDate);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName || emp.full_name} ({emp.employeeCode || emp.employee_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Attendance Date *
            </label>
            <input
              type="date"
              required
              disabled={isVoiding}
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                loadExistingValues(selectedEmployeeId, event.target.value);
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#121824] dark:text-white"
            />
            {!recordFromTable && existingRecord && (
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                An attendance record already exists for this employee and date. Saving will edit that record.
              </p>
            )}
          </div>

          {/* Status Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Attendance Status *
            </label>
            <select
              disabled={isVoiding}
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Check-In & Check-Out Times */}
          {status !== "ABSENT" && status !== "ON_LEAVE" && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1B7167] dark:text-teal-400" />
                  Check-In Time
                </label>
                <input
                  disabled={isVoiding}
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Check-Out Time
                </label>
                <input
                  disabled={isVoiding}
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>
            </div>
          )}

          {/* Mandatory Correction Reason */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Mandatory Audit Justification *</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                Logged to Immutable Audit Ledger
              </span>
            </label>
            <textarea
              rows={3}
              required
              placeholder={isVoiding
                ? "Explain why this attendance record must be voided."
                : "Explain why this attendance record is being created or corrected."}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
            />
          </div>

          {/* Admin Identity Warning */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Modified by <strong>{user?.name || "Administrator"}</strong> ({user?.role}).
            </span>
          </div>
        </form>

        {/* Footer Controls */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2 bg-gray-50/50 dark:bg-[#070A11]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`${isVoiding ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 [&>svg]:text-white [&>span]:text-white`}
          >
            {isVoiding ? <Trash2 className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
            <span>{isSubmitting ? "Saving..." : isVoiding ? "Void Attendance" : isEditing ? "Save Attendance Changes" : "Create Attendance Record"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
