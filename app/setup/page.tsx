"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Building2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Loader2,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { apiClient } from "@/lib/api-client";

interface SetupStatusResponse {
  is_configured: boolean;
  agency_name?: string;
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#030B09] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SetupWizard />
    </Suspense>
  );
}

function SetupWizard() {
  const router = useRouter();

  // Wizard Steps: 1 = Initial Form, 2 = Email OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [agencyName, setAgencyName] = useState("World Class Holidays");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [quickPin, setQuickPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // OTP State
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true);

  // Guard: If setup already finished, redirect to /login
  useEffect(() => {
    let active = true;
    apiClient
      .get<SetupStatusResponse>("/setup/status")
      .then((res) => {
        if (!active) return;
        if (res.is_configured) {
          router.replace("/login");
        } else {
          setInitialChecking(false);
        }
      })
      .catch(() => {
        if (active) setInitialChecking(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Handle Logo selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError("Logo file size must be less than 3 MB.");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Submit Details & Request OTP
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }

    if (!/^\d{4}$/.test(quickPin)) {
      setError("Quick PIN must be exactly 4 numeric digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalLogoUrl = uploadedLogoUrl;

      // Upload logo if selected and not yet uploaded
      if (logoFile && !finalLogoUrl) {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("logo", logoFile);

        const uploadRes = await apiClient.post<{ success: boolean; logo_url: string }>(
          "/setup/upload-logo",
          formData
        );
        finalLogoUrl = uploadRes.logo_url;
        setUploadedLogoUrl(finalLogoUrl);
        setUploadingLogo(false);
      }

      // Initialize setup on backend
      const res = await apiClient.post<{ success: boolean; message: string; email: string }>(
        "/setup/initialize",
        {
          agency_name: agencyName,
          owner_name: ownerName,
          owner_email: ownerEmail,
          owner_phone: ownerPhone,
          currency,
          password,
          quick_pin: quickPin,
          logo_url: finalLogoUrl,
        }
      );

      setSuccess(
        `A 6-digit activation code has been dispatched to ${res.email} from no-reply@worldclassholidays.org.`
      );
      setCooldown(60);
      setStep(2);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      if (
        raw.includes("SQLSTATE") ||
        raw.includes("Unknown column") ||
        raw.includes("Database error") ||
        raw.includes("Table")
      ) {
        setError("Unable to initialize agency setup due to a system configuration error. Please try again.");
      } else {
        setError(raw || "Failed to initiate agency setup. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
      setUploadingLogo(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post<{ success: boolean; message: string }>("/setup/initialize", {
        agency_name: agencyName,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_phone: ownerPhone,
        currency,
        password,
        quick_pin: quickPin,
        logo_url: uploadedLogoUrl,
      });
      setSuccess("A fresh verification code has been dispatched to your email.");
      setCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and lock setup
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post<{ success: boolean; message: string }>("/setup/verify-otp", {
        email: ownerEmail,
        otp,
      });

      // Verification successful! Redirect to login
      router.replace("/login?setup=success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid or expired verification code.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialChecking) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#030B09] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-emerald-50/20 dark:from-[#030B09] dark:via-[#06120E] dark:to-[#030B09] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500/20 relative overflow-hidden transition-colors duration-200">
      {/* Ambient background light halos */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#1B7167]/10 dark:bg-[#1B7167]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
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
                First-Run Setup
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Travel ERP &bull; Agency Initialization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[11px]">Setup Wizard Active</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Wizard Form Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-6 sm:my-8">
        <div className="w-full max-w-xl space-y-5">
          <div className="bg-white/90 dark:bg-[#081512]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-emerald-950/5 dark:shadow-black/50 space-y-6">
            
            {/* Header with Step Tracker */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#1B7167]/10 dark:bg-[#1B7167]/20 border border-[#1B7167]/20 flex items-center justify-center text-[#1B7167] dark:text-emerald-400">
                {step === 1 ? <Building2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {step === 1 ? "Initialize Your Agency" : "Verify Email & Activate"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {step === 1
                  ? "Configure World Class Holidays, upload your logo, and create the master owner account."
                  : "Enter the 6-digit confirmation code dispatched to your verified email."}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-xs flex items-start gap-3 shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold text-rose-900 dark:text-rose-100">Setup Notification</p>
                  <p className="leading-relaxed text-rose-700 dark:text-rose-300/90">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs flex items-start gap-3 shadow-sm transition-all animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">Verification Sent</p>
                  <p className="leading-relaxed text-emerald-700 dark:text-emerald-300/90">{success}</p>
                </div>
              </div>
            )}

            {/* STEP 1: INITIAL DETAILS */}
            {step === 1 && (
              <form onSubmit={handleSubmitDetails} className="space-y-4">
                {/* Agency Name & Currency */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Agency Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        required
                        type="text"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="World Class Holidays"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono"
                    >
                      <option value="PKR">PKR (Rs.)</option>
                      <option value="USD">USD ($)</option>
                      <option value="AED">AED (AED)</option>
                      <option value="SAR">SAR (SAR)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                {/* Logo Upload Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Agency Brand Logo</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, SVG, WebP (Max 3MB)</span>
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/50 dark:bg-black/20">
                    {logoPreview ? (
                      <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white dark:bg-black flex items-center justify-center shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B7167] dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{logoPreview ? "Change Logo Image" : "Choose Logo File"}</span>
                      </label>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Used across invoices, passenger receipts, and staff dashboards.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Owner Name & Phone */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Owner / Director Name
                    </label>
                    <input
                      required
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Nadeem Ahmed"
                      className="w-full px-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phone / WhatsApp Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        required
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Official Work Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Official Agency Email</span>
                    <span className="text-[10px] text-slate-400 font-mono">Will receive verification code</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="admin@worldclassholidays.org"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Master Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        required
                        minLength={8}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((curr) => !curr)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#1B7167]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        required
                        minLength={8}
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 4-digit Profile PIN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>4-Digit Profile Quick PIN</span>
                    <span className="text-[10px] text-slate-400 font-mono">For terminal profile unlock</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={quickPin}
                      onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono tracking-[0.25em]"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingLogo}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] via-[#0E5C53] to-[#1B7167] hover:from-[#165B53] hover:to-[#0C4740] text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting || uploadingLogo ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Email Verification Code...</span>
                    </span>
                  ) : (
                    <>
                      <span>Save Agency &amp; Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3">
                  <Mail className="w-5 h-5 shrink-0 mt-0.5 text-[#1B7167] dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Verification Code Dispatched</p>
                    <p className="leading-relaxed">
                      We have sent a 6-digit code to <strong>{ownerEmail}</strong> from{" "}
                      <code>no-reply@worldclassholidays.org</code>. Enter the code below to finalize setup.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      6-Digit Security OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || isSubmitting}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B7167] dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cooldown > 0 ? (
                        <span>Resend in {cooldown}s</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Resend Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      required
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B7167] focus:ring-2 focus:ring-[#1B7167]/20 transition-all shadow-sm font-mono tracking-[0.4em]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Check your spam or junk folder if the message does not appear in your inbox within 30 seconds.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    Edit Details
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || otp.length !== 6}
                    className="w-2/3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] via-[#0E5C53] to-[#1B7167] hover:from-[#165B53] hover:to-[#0C4740] text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Activate Agency</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Security Guarantee */}
            <div className="pt-2 text-center border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 dark:text-slate-500">
              World Class Holidays &bull; Dedicated Enterprise Platform &bull; Protected by 256-Bit SSL
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#030B09]/70 backdrop-blur-md">
        World Class Holidays &bull; Single-Agency Operations ERP &bull; crm.worldclassholidays.org
      </footer>
    </div>
  );
}
