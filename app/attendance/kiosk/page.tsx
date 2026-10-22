"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Clock3, KeyRound, ShieldAlert } from "lucide-react";
import {
  getKioskStatus,
  KIOSK_TERMINAL_TOKEN_STORAGE_KEY,
  submitKioskPunch,
  type AttendanceTerminal,
} from "@/lib/attendance-api";

type Result = {
  tone: "success" | "error";
  title: string;
  detail: string;
} | null;

export default function AttendanceKioskPage() {
  const [terminal, setTerminal] = useState<AttendanceTerminal | null>(null);
  const [checking, setChecking] = useState(true);
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    const token = localStorage.getItem(KIOSK_TERMINAL_TOKEN_STORAGE_KEY) || "";
    if (!token) {
      queueMicrotask(() => {
        if (active) setChecking(false);
      });
      return () => {
        active = false;
        window.clearInterval(timer);
      };
    }
    getKioskStatus(token)
      .then((response) => {
        if (active) setTerminal(response.terminal);
      })
      .catch(() => {
        localStorage.removeItem(KIOSK_TERMINAL_TOKEN_STORAGE_KEY);
        if (active) setTerminal(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem(KIOSK_TERMINAL_TOKEN_STORAGE_KEY) || "";
    if (!terminal || !token || !employeeCode.trim() || !/^\d{4}$/.test(pin)) return;
    setSaving(true);
    setResult(null);
    try {
      const response = await submitKioskPunch(token, {
        employee_code: employeeCode.trim(),
        pin,
      });
      const checkout = response.action === "CHECK_OUT_RECORDED";
      setResult({
        tone: "success",
        title: checkout ? "Check-out recorded" : "Check-in recorded",
        detail: checkout
          ? `${response.time} · ${Math.floor(response.net_work_minutes / 60)}h ${response.net_work_minutes % 60}m worked`
          : `${response.time}${response.status === "LATE" ? ` · ${response.late_minutes} minutes late` : " · On time"}`,
      });
      setEmployeeCode("");
      setPin("");
    } catch (cause) {
      setResult({
        tone: "error",
        title: "Attendance not recorded",
        detail: cause instanceof Error ? cause.message : "Check your Employee ID and PIN, then try again.",
      });
      setPin("");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#030712] text-sm text-slate-400">Checking attendance terminal…</main>;
  }

  if (!terminal) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#030712] p-5 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B0F19] p-7 shadow-2xl">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
          <h1 className="mt-5 text-2xl font-black">Attendance terminal needs activation</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            An Agency Admin must sign in on this device, open Attendance, choose Terminals, and activate this browser once.
          </p>
          <Link href="/profiles" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500">
            Return to agency profiles
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.25),transparent_42%),#030712] p-4 text-white">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19] shadow-2xl">
        <header className="border-b border-white/10 bg-violet-600 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-100">Shared attendance kiosk</p>
              <h1 className="mt-2 text-2xl font-black">{terminal.name}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-violet-100"><Building2 className="h-4 w-4" />{terminal.office_name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-black">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="mt-1 text-xs text-violet-100">{clock.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })}</p>
            </div>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
          <div>
            <label htmlFor="employee-code" className="text-sm font-bold text-slate-200">Employee ID</label>
            <input
              id="employee-code"
              autoComplete="off"
              autoCapitalize="characters"
              value={employeeCode}
              onChange={(event) => setEmployeeCode(event.target.value.toUpperCase())}
              placeholder="TF-EMP-001"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-mono text-lg font-bold text-white outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label htmlFor="attendance-pin" className="text-sm font-bold text-slate-200">4-digit Quick PIN</label>
            <div className="relative mt-2">
              <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                id="attendance-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete="off"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-white outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {result && (
            <div role="status" className={`rounded-2xl border p-4 ${result.tone === "success" ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-rose-400/25 bg-rose-500/10 text-rose-200"}`}>
              <div className="flex items-center gap-2 font-bold">
                {result.tone === "success" ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                {result.title}
              </div>
              <p className="mt-1 text-sm opacity-90">{result.detail}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !employeeCode.trim() || !/^\d{4}$/.test(pin)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Clock3 className="h-5 w-5" />
            {saving ? "Recording…" : "Record attendance"}
          </button>
          <p className="text-center text-xs leading-5 text-slate-500">The system selects check-in or check-out automatically using server time.</p>
        </form>
      </section>
    </main>
  );
}
