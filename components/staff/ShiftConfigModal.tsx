"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import type { Shift, WorkShift } from "@/types/erp";
import {
  Clock,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function ShiftConfigModal({
  isOpen,
  onClose,
  onSuccess,
}: ShiftConfigModalProps) {
  const { shifts, createShiftRecord } = useData();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [halfDayMinutes, setHalfDayMinutes] = useState<number>(240);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a valid shift title.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Please specify both start and end times.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload: Partial<Shift> = {
        name: name.trim(),
        startTime,
        start_time: startTime,
        endTime,
        end_time: endTime,
        gracePeriodMinutes: Number(graceMinutes) || 15,
        grace_minutes: Number(graceMinutes) || 15,
        halfDayMinutes: Number(halfDayMinutes) || 240,
        half_day_minutes: Number(halfDayMinutes) || 240,
        is_active: isActive,
        workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      };

      if (createShiftRecord) {
        await createShiftRecord(payload as unknown as WorkShift);
      }

      setIsCreating(false);
      setName("");
      setStartTime("09:00");
      setEndTime("18:00");
      setGraceMinutes(15);
      setHalfDayMinutes(240);
      onSuccess?.(`Shift "${payload.name}" successfully saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save work shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 font-bold text-[10px] tracking-wider uppercase border border-[#1B7167]/20">
                Shift Engine
              </span>
              <span className="text-xs font-mono text-gray-400">
                Authoritative Work Schedules
              </span>
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1B7167] dark:text-teal-400" />
              Operational Work Shifts
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure agency attendance shift rules, morning grace limits, and half-day triggers.
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

        {/* Existing Shifts List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Shift Rosters ({shifts.length})
            </h3>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer [&>svg]:text-white [&>span]:text-white"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Add Shift</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] space-y-2 hover:border-[#1B7167]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900 dark:text-white">
                    {s.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 font-mono">
                  <span>
                    {s.startTime || s.start_time} — {s.endTime || s.end_time}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Grace: {s.gracePeriodMinutes ?? s.grace_minutes ?? 15}m
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-200/50 dark:border-white/5 pt-1.5">
                  <span>Half-Day: {s.halfDayMinutes ?? s.half_day_minutes ?? 240} min</span>
                  <span>Days: Mon–Sat</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Shift Subform */}
        {isCreating && (
          <form
            onSubmit={handleSaveShift}
            className="p-4 rounded-xl border border-[#1B7167]/30 bg-[#1B7167]/5 dark:bg-[#1B7167]/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#1B7167]/20 pb-2">
              <h4 className="text-xs font-bold text-[#1B7167] dark:text-teal-400 uppercase tracking-wider">
                Define New Shift Schedule
              </h4>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Shift Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramadan Morning Shift"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Start Time (HH:MM) *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  End Time (HH:MM) *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Half-Day Threshold (Minutes)
                </label>
                <input
                  type="number"
                  min={60}
                  max={480}
                  value={halfDayMinutes}
                  onChange={(e) => setHalfDayMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                />
              </div>

              <div className="space-y-1 md:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-[#1B7167] focus:ring-[#1B7167] cursor-pointer"
                />
                <label
                  htmlFor="shiftActive"
                  className="text-[11px] font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Activate shift for employee scheduling
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B7167]/20">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 [&>svg]:text-white [&>span]:text-white"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span>{isSubmitting ? "Saving..." : "Save Shift"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end border-t border-gray-100 dark:border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
