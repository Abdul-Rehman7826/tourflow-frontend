"use client";

import { useEffect, useState } from "react";
import { FileClock, X } from "lucide-react";
import { fetchAttendanceAuditLog, type AttendanceAuditEvent } from "@/lib/attendance-api";

export function AttendanceAuditLog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [events, setEvents] = useState<AttendanceAuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError("");
    });
    fetchAttendanceAuditLog()
      .then((response) => {
        if (active) setEvents(response);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load audit log.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <section className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
        <header className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-white/10"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Agency Admin only</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black text-gray-950 dark:text-white"><FileClock className="h-5 w-5" />Attendance audit log</h2><p className="mt-1 text-xs text-gray-500">Immutable terminal, punch, correction, lockout, and finalization events.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><X className="h-5 w-5" /></button></header>
        <div className="overflow-auto p-6">
          {loading && <p className="py-10 text-center text-sm text-gray-500">Loading attendance audit events…</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
          {!loading && !error && events.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No attendance audit events yet.</p>}
          {!loading && events.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-gray-500"><tr><th className="w-[18%] p-3">Time</th><th className="w-[18%] p-3">Action</th><th className="w-[20%] p-3">Employee / terminal</th><th className="w-[16%] p-3">Actor</th><th className="p-3">Reason</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-t border-gray-100 align-top dark:border-white/5"><td className="p-3 font-mono text-gray-500">{new Date(event.created_at.replace(" ", "T")).toLocaleString()}</td><td className="p-3"><span className="rounded-full bg-violet-500/10 px-2 py-1 font-bold text-violet-600">{event.action.replaceAll("_", " ")}</span><p className="mt-2 font-mono text-[10px] text-gray-400">{event.source}</p></td><td className="p-3 font-semibold text-gray-900 dark:text-white">{event.employee_name || event.terminal_name || "Platform event"}<p className="mt-1 font-mono text-[10px] font-normal text-gray-400">{event.employee_code || event.terminal_name || "—"}</p></td><td className="p-3 text-gray-600 dark:text-gray-300">{event.actor_name || "Shared kiosk"}</td><td className="p-3 leading-5 text-gray-600 dark:text-gray-300">{event.reason}</td></tr>)}</tbody></table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
