"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LockKeyhole, LogIn, UserRound, X } from "lucide-react";
import {
  PIN_PATTERN,
  TERMINAL_TOKEN_STORAGE_KEY,
  profileHomeRoute,
  storeProfileSession,
} from "@/lib/profile-session";
import { useAgencySettings } from "@/context/ThemeContext";

export interface AgencyProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department?: string | null;
  avatar_color: string;
  avatar_icon: string;
  has_pin: boolean;
}

interface UnlockResponse {
  access_token: string;
  expires_in: number;
  user: Record<string, unknown> & { role: string; tenant_id?: string; full_name?: string; name?: string };
}

export function ProfilePinModal({ profile, onClose }: { profile: AgencyProfile; onClose: () => void }) {
  const { settings } = useAgencySettings();
  const accentColor = /^#[0-9a-f]{6}$/i.test(settings.accent) ? settings.accent : "#1B7167";
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [showPasswordSignIn, setShowPasswordSignIn] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const submittedPin = useRef("");

  const clear = (message = "") => {
    setDigits(["", "", "", ""]);
    setError(message);
    submittedPin.current = "";
    window.setTimeout(() => inputs.current[0]?.focus(), 0);
  };

  const submit = async (pin: string) => {
    if (!PIN_PATTERN.test(pin) || busy || submittedPin.current === pin) return;
    submittedPin.current = pin;
    setBusy(true);
    setError("");
    try {
      const terminalToken = localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/auth/profile-unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Terminal-Token": terminalToken || "" },
        body: JSON.stringify({ user_id: profile.id, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to unlock this profile.");
      const result = data as UnlockResponse;
      const mappedUser = {
        ...result.user,
        name: result.user.name || result.user.full_name,
        tenantId: result.user.tenant_id,
        screenAccess: result.user.screen_access,
      };
      storeProfileSession(result.access_token, mappedUser, result.expires_in);
      window.location.replace(profileHomeRoute(result.user.role, result.user.screen_access as Record<string, unknown> | undefined));
    } catch (caught) {
      setShaking(true);
      setShowPasswordSignIn(true);
      window.setTimeout(() => setShaking(false), 450);
      clear(caught instanceof Error ? caught.message : "Unable to unlock this profile.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <div className={`w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-white ${shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
        <button type="button" onClick={onClose} className="ml-auto block rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Close PIN dialog"><X className="h-5 w-5" /></button>
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black shadow-lg" style={{ backgroundColor: profile.avatar_color }}>
            {profile.avatar_icon === "user" ? <UserRound className="h-9 w-9" /> : profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}
          </div>
          <h2 id="pin-title" className="mt-4 text-xl font-bold">Welcome, {profile.full_name.split(" ")[0]}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your 4-digit Quick PIN</p>
        </div>
        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void submit(digits.join("")); }}>
        <div className="flex justify-center gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputs.current[index] = node; }}
              value={digit}
              type="password"
              inputMode="numeric"
              maxLength={1}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "").slice(-1);
                const next = [...digits]; next[index] = value; setDigits(next);
                if (value) inputs.current[index + 1]?.focus();
                submittedPin.current = "";
              }}
              onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index]) inputs.current[index - 1]?.focus(); }}
              className="h-14 w-12 rounded-xl border border-slate-300 bg-slate-50 text-center font-mono text-2xl tracking-tight outline-none focus:border-[var(--agency-accent)] focus:ring-2 focus:ring-[var(--agency-accent)]/30 dark:border-white/15 dark:bg-black/30"
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-center text-xs font-medium text-rose-400">{error}</p>}
        <button type="submit" disabled={busy || !PIN_PATTERN.test(digits.join(""))} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold text-white shadow-lg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40" style={{ backgroundColor: accentColor }}><KeyRound className="h-4 w-4" />{busy ? "Checking PIN..." : "OK"}</button>
        </form>
        {showPasswordSignIn && <button type="button" onClick={() => window.location.replace("/login?reason=pin")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"><LogIn className="h-4 w-4" />Sign in with password</button>}
        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><LockKeyhole className="h-3.5 w-3.5" />PIN attempts are protected by a five-minute lockout.</p>
      </div>
    </div>
  );
}
