"use client";

import { FormEvent, useEffect, useState } from "react";
import { Laptop2, Plus, Power, X } from "lucide-react";
import {
  activateAttendanceTerminal,
  fetchAttendanceTerminals,
  KIOSK_TERMINAL_ID_STORAGE_KEY,
  KIOSK_TERMINAL_TOKEN_STORAGE_KEY,
  revokeAttendanceTerminal,
  type AttendanceTerminal,
} from "@/lib/attendance-api";

export function AttendanceTerminalManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [terminals, setTerminals] = useState<AttendanceTerminal[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setCurrentId(localStorage.getItem(KIOSK_TERMINAL_ID_STORAGE_KEY) || "");
      setError("");
    });
    fetchAttendanceTerminals()
      .then((response) => {
        if (active) setTerminals(response);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load terminals.");
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setSaving(true);
    setError("");
    try {
      const response = await activateAttendanceTerminal(name.trim());
      localStorage.setItem(KIOSK_TERMINAL_TOKEN_STORAGE_KEY, response.terminal_token);
      localStorage.setItem(KIOSK_TERMINAL_ID_STORAGE_KEY, response.terminal.id);
      setCurrentId(response.terminal.id);
      setTerminals((previous) => [response.terminal, ...previous]);
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to activate terminal.");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(terminal: AttendanceTerminal) {
    const reason = window.prompt(`Why are you revoking ${terminal.name}?`);
    if (!reason) return;
    if (reason.trim().length < 5) {
      setError("Revocation reason must contain at least five characters.");
      return;
    }
    setError("");
    try {
      await revokeAttendanceTerminal(terminal.id, reason.trim());
      setTerminals((previous) => previous.map((item) => item.id === terminal.id
        ? { ...item, status: "REVOKED", revocation_reason: reason.trim(), revoked_at: new Date().toISOString() }
        : item));
      if (terminal.id === currentId) {
        localStorage.removeItem(KIOSK_TERMINAL_TOKEN_STORAGE_KEY);
        localStorage.removeItem(KIOSK_TERMINAL_ID_STORAGE_KEY);
        setCurrentId("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to revoke terminal.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
        <header className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-white/10">
          <div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Agency Admin</p><h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white">Attendance terminals</h2><p className="mt-1 text-xs text-gray-500">Activate and revoke named kiosk browsers for this agency.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 p-6">
          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
          <form onSubmit={activate} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Reception Tablet" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-black/20 dark:text-white" />
            <button disabled={saving || name.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Activating…" : "Activate this browser"}</button>
          </form>
          <div className="space-y-3">
            {terminals.length === 0 && <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-white/10">No kiosk terminals have been activated.</p>}
            {terminals.map((terminal) => (
              <article key={terminal.id} className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600"><Laptop2 className="h-5 w-5" /></span><div><p className="font-bold text-gray-950 dark:text-white">{terminal.name}{terminal.id === currentId ? " · This browser" : ""}</p><p className="mt-1 text-xs text-gray-500">{terminal.office_name} · Last seen {terminal.last_seen_at ? new Date(terminal.last_seen_at).toLocaleString() : "not yet"}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${terminal.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{terminal.status}</span></div></div>
                {terminal.status === "ACTIVE" && <button type="button" onClick={() => revoke(terminal)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"><Power className="h-4 w-4" />Revoke</button>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
