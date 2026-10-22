"use client";
import { useState } from "react";
import { LOSS_REASONS, type LossReason } from "@/lib/lead-operations";
import { useData } from "@/context/DataContext";
import {
  LeadDialog,
  leadInput,
  leadButton,
} from "@/components/leads/LeadDialog";

export function LostReasonDialog({
  ids,
  onClose,
  onSaved,
}: {
  ids: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { bulkUpdateLeads } = useData();
  const [error, setError] = useState("");
  return (
    <LeadDialog
      title={`Mark ${ids.length} ${ids.length === 1 ? "lead" : "leads"} as lost`}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          try {
            bulkUpdateLeads(ids, {
              status: "LOST",
              lossReason: data.get("reason") as LossReason,
              lossNote: String(data.get("note") || ""),
            });
            onSaved();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label className="block space-y-1 text-sm">
          Reason for Loss
          <select required name="reason" defaultValue="" className={leadInput}>
            <option value="" disabled>
              Select a reason
            </option>
            {LOSS_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          Optional note
          <textarea name="note" maxLength={4000} className={leadInput} />
        </label>
        <p className="text-xs text-gray-500">
          The reason and note will be saved to every selected lead&apos;s
          timeline.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button className={leadButton}>Save Lost Reason</button>
      </form>
    </LeadDialog>
  );
}
