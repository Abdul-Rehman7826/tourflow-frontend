"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  Compass,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#030B09] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const setupSuccess = searchParams.get("setup") === "success";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginWithCredentials(email, password);
  };

  const handleLoginWithCredentials = (loginEmail: string, loginPass: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const processResult = (result: {
      success: boolean;
      error?: string;
      code?: string;
      requiresPasswordReset?: boolean;
      resetEmail?: string;
    }) => {
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to log in.");
        return;
      }

      if (result.requiresPasswordReset) {
        router.replace(`/reset-password?email=${encodeURIComponent(result.resetEmail || loginEmail)}`);
        return;
      }

      // Enter agency staff terminal unlock screen
      router.replace("/profiles");
    };

    login(loginEmail, loginPass)
      .then((resolvedRes) => processResult(resolvedRes))
      .catch((err: unknown) => {
        setIsSubmitting(false);
        const msg = err instanceof Error ? err.message : "Failed to log in.";
        setErrorMessage(msg);
      });
  };

  const forgotPasswordHref = `/reset-password${
    email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""
  }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-emerald-50/20 dark:from-[#030B09] dark:via-[#06120E] dark:to-[#030B09] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 relative overflow-hidden transition-colors duration-200">
      {/* Background ambient lighting */}
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
                Operations CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Travel ERP &bull; Dedicated Agency Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[11px]">System Active &bull; SSL Secured</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card Viewport */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-6 sm:my-8">
        <div className="w-full max-w-md space-y-5">
          {/* Main Card */}
          <div className="bg-white/90 dark:bg-[#081512]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/5 dark:shadow-black/50 space-y-6">
            
            {/* Card Header with Icon */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1B7167]/10 via-emerald-500/10 to-[#1B7167]/20 border border-[#1B7167]/20 flex items-center justify-center text-[#1B7167] dark:text-emerald-400 shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Sign in to World Class Holidays operations workspace
                </p>
              </div>
            </div>

            {/* Setup Success Notice */}
            {setupSuccess && (
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in duration-200 shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="font-bold block">Agency Setup Verified</span>
                  <p className="leading-relaxed">
                    World Class Holidays has been activated. Please sign in with your owner credentials below.
                  </p>
                </div>
              </div>
            )}

            {/* Session Expired Notice */}
            {reason === "expired" && (
              <div
                role="status"
                className="p-4 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-700/50 text-[#B45309] dark:text-amber-300 text-xs flex items-start gap-3 animate-in fade-in duration-200 shadow-sm"
              >
                <AlertTriangle className="w-5 h-5 text-[#B45309] dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="font-bold block text-[#B45309] dark:text-amber-200">
                    Session Expired
                  </span>
                  <p className="leading-relaxed">
                    Your session has expired due to inactivity. Please sign in again.
                  </p>
                </div>
              </div>
            )}

            {reason === "pin" && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-xs text-sky-700 dark:text-sky-200 shadow-sm"
              >
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                <div className="space-y-0.5 flex-1">
                  <span className="block font-bold">Use your account password</span>
                  <p className="leading-relaxed">
                    The Quick PIN did not unlock this profile. Sign in with your work email and password.
                  </p>
                </div>
              </div>
            )}

            {/* Error banner if any */}
            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200 shadow-sm"
              >
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="font-bold block text-rose-600 dark:text-rose-200">
                    Authentication Error
                  </span>
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Work Email Address</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    admin@worldclassholidays.org
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    suppressHydrationWarning
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@worldclassholidays.org"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {/* Dedicated, prominent Forgot password link */}
                  <Link
                    href={forgotPasswordHref}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1B7167] hover:text-[#165B53] dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors group"
                  >
                    <KeyRound className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    <span className="underline-offset-4 hover:underline">Forgot password?</span>
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((curr) => !curr)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-[#1B7167] dark:text-slate-500 dark:hover:text-emerald-400 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] via-[#0E5C53] to-[#1B7167] hover:from-[#165B53] hover:to-[#0C4740] text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating &bull; World Class Holidays...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Operations</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Password Reset Helper Banner */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#1B7167] dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-semibold">Trouble signing in?</span>
                </div>
                <Link
                  href={forgotPasswordHref}
                  className="text-[11px] font-bold text-[#1B7167] dark:text-emerald-400 hover:text-[#165B53] dark:hover:text-emerald-300 transition inline-flex items-center gap-1 hover:underline"
                >
                  <span>Reset via Email OTP</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Security Trust Badges */}
            <div className="pt-2 grid grid-cols-3 gap-2 text-center border-t border-slate-100 dark:border-white/5">
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">Security</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500">Dedicated ERP</span>
              </div>
              <div className="space-y-0.5 border-x border-slate-100 dark:border-white/5">
                <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">256-Bit SSL</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500">End-to-End</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">Role RBAC</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500">Office Staff</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#030B09]/70 backdrop-blur-md">
        World Class Holidays &bull; Travel &amp; Tours Operations ERP &bull; crm.worldclassholidays.org
      </footer>
    </div>
  );
}
