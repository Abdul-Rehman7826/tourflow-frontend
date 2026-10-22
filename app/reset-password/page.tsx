"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestPasswordReset, completeForcedReset } = useAuth();

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [tempOtp, setTempOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [quickPin, setQuickPin] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSendOtp() {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid work email address first.");
      return;
    }
    setError("");
    setSuccessNotice("");
    setSendingOtp(true);
    const res = await requestPasswordReset(email);
    setSendingOtp(false);

    if (!res.success) {
      setError(res.error || "Failed to dispatch verification code.");
      return;
    }

    setSuccessNotice(
      "A 6-digit verification code has been dispatched to your email from no-reply@worldclassholidays.org. Check your inbox (or spam folder)."
    );
    setCooldown(60);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(tempOtp)) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!/^\d{4}$/.test(quickPin)) {
      setError("Choose a 4-digit Profile PIN for fast terminal access.");
      return;
    }

    setSubmitting(true);
    const result = await completeForcedReset({
      email,
      tempOtp,
      newPassword,
      confirmPassword,
      quickPin,
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "The verification code could not be verified.");
      return;
    }

    router.replace("/profiles");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 shadow-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-emerald-50/20 dark:from-[#030B09] dark:via-[#06120E] dark:to-[#030B09] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 relative overflow-hidden transition-colors duration-200">
      {/* Background ambient lighting and subtle grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1B7167_1px,transparent_1px)] opacity-[0.06] dark:opacity-[0.12] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1B7167]/15 dark:bg-[#1B7167]/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/15 dark:bg-emerald-600/20 rounded-full blur-[130px] pointer-events-none" />

      {/* Top minimal header */}
      <header className="p-4 sm:px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#030B09]/70 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B7167] to-[#0D4B44] flex items-center justify-center text-white shadow-lg shadow-emerald-950/20 ring-1 ring-white/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                World Class Holidays
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#1B7167] dark:text-emerald-400 border border-emerald-500/20">
                Security Recovery
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Self-Service Password &amp; PIN Reset
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#1B7167] dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-6 sm:my-8">
        <div className="w-full max-w-lg space-y-5">
          <section className="bg-white/90 dark:bg-[#081512]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-emerald-950/5 dark:shadow-black/50 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B7167] to-[#0D4B44] text-white shadow-lg shadow-emerald-950/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#1B7167] dark:hover:text-emerald-400 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>

            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#1B7167] dark:text-emerald-400">
                Account Security &bull; Mailer Verification
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Reset your password
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Request a secure 6-digit verification code to your verified work email, then choose your new permanent password and Profile PIN.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs sm:text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2.5 shadow-sm"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {successNotice && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <p className="leading-relaxed">{successNotice}</p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* Email input with Request Code action */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Work Email Address
                  </label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || cooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B7167] dark:text-emerald-400 hover:text-[#165B53] dark:hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span className="font-mono">Resend in {cooldown}s</span>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span className="underline-offset-4 hover:underline">Get verification code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@worldclassholidays.org"
                    className={`${inputClass} pl-10`}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* 6-digit OTP code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={tempOtp}
                    onChange={(event) =>
                      setTempOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className={`${inputClass} pl-10 font-mono text-base tracking-[0.35em]`}
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                  Enter the OTP code received from <strong className="text-[#1B7167] dark:text-emerald-400">no-reply@worldclassholidays.org</strong>
                </span>
              </div>

              {/* Passwords */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <input
                    required
                    minLength={8}
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    required
                    minLength={8}
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* 4-digit PIN */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  4-Digit Profile Quick PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={quickPin}
                    onChange={(event) =>
                      setQuickPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className={`${inputClass} pl-10 font-mono text-base tracking-[0.35em]`}
                    placeholder="0000"
                    autoComplete="off"
                  />
                </div>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                  Choose a 4-digit PIN for rapid agency terminal unlocks.
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => !current)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#1B7167] dark:hover:text-emerald-400 transition cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>{showPasswords ? "Hide passwords" : "Show passwords"}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] via-[#0E5C53] to-[#1B7167] hover:from-[#165B53] hover:to-[#0C4740] text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Code &amp; Updating Security...</span>
                  </span>
                ) : (
                  <>
                    <LockKeyhole className="h-4 w-4" />
                    <span>Set New Password &amp; Unlock</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#030B09]/70 backdrop-blur-md">
        World Class Holidays &bull; Travel &amp; Tours Operations ERP &bull; crm.worldclassholidays.org
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#030B09] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
