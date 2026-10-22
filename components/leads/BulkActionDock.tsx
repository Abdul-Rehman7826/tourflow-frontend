"use client";

import React from "react";
import { LeadInterestType, LeadStatus } from "@/types/erp";
import { INTERESTS, OPEN_STATUSES, BulkChange } from "@/lib/lead-operations";
import {
  UserCheck,
  Tag,
  XCircle,
  X,
} from "lucide-react";

interface BulkActionDockProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApplyChange: (change: BulkChange) => void;
  onPromptMarkLost: () => void;
  activeReps: string[];
}

export function BulkActionDock({
  selectedCount,
  onClearSelection,
  onApplyChange,
  onPromptMarkLost,
  activeReps,
}: BulkActionDockProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[90%] sm:w-auto animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 dark:bg-[#030712]/95 backdrop-blur-md border border-white/10 shadow-2xl text-white text-xs">
        {/* Count & Clear */}
        <div className="flex items-center gap-2 border-r border-white/10 pr-3">
          <div className="w-5 h-5 rounded-full bg-[#1B7167] text-white flex items-center justify-center font-mono font-bold text-[11px]">
            {selectedCount}
          </div>
          <span className="font-semibold text-gray-200">Selected</span>
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Deselect all rows"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action: Bulk Assign Rep */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyChange({ assignedTo: e.target.value });
              }
            }}
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer"
          >
            <option value="" className="text-gray-900 bg-white">Assign Rep...</option>
            {activeReps.map((rep) => (
              <option key={rep} value={rep} className="text-gray-900 bg-white">
                {rep}
              </option>
            ))}
          </select>
        </div>

        {/* Action: Bulk Status Change */}
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyChange({ status: e.target.value as LeadStatus });
              }
            }}
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer"
          >
            <option value="" className="text-gray-900 bg-white">Set Stage...</option>
            {OPEN_STATUSES.map((status) => (
              <option key={status} value={status} className="text-gray-900 bg-white">
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Action: Bulk Interest Change */}
        <div className="flex items-center gap-1.5">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onApplyChange({ interestType: e.target.value as LeadInterestType });
              }
            }}
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer"
          >
            <option value="" className="text-gray-900 bg-white">Set Interest...</option>
            {INTERESTS.map((interest) => (
              <option key={interest} value={interest} className="text-gray-900 bg-white">
                {interest.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Action: Bulk Mark as Lost */}
        <button
          type="button"
          onClick={onPromptMarkLost}
          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Mark as Lost</span>
        </button>
      </div>
    </div>
  );
}
