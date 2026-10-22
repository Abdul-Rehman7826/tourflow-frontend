"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  UserCheck2,
} from "lucide-react";
import { AgencyProfile, ProfilePinModal } from "@/components/auth/ProfilePinModal";
import { AgencyLogo } from "@/components/settings/AgencyLogo";
import { useAgencySettings } from "@/context/ThemeContext";
import { useMounted } from "@/lib/use-mounted";
import {
  clearProfileSession,
  clearTerminalSession,
  TERMINAL_TENANT_STORAGE_KEY,
  TERMINAL_TOKEN_STORAGE_KEY,
} from "@/lib/profile-session";

const ROLE_LABELS: Record<string, string> = {
  AGENCY_ADMIN: "Agency Owner",
  HR_MANAGER: "HR Manager",
  TOUR_MANAGER: "Tour Operations",
  VISA_OFFICER: "Visa Officer",
  VISA_CONSULTANT: "Visa Consultant",
  FRONT_DESK: "Front Desk & Intake",
  EMPLOYEE: "Staff Member",
};

const ROLE_BADGES: Record<string, string> = {
  AGENCY_ADMIN: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
  FRONT_DESK: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50",
  TOUR_MANAGER: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  HR_MANAGER: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
  VISA_CONSULTANT: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50",
  VISA_OFFICER: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50",
};

function ProfilesContent() {
  const mounted = useMounted();
  const { settings } = useAgencySettings();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<AgencyProfile[]>([]);
  const [selected, setSelected] = useState<AgencyProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  const [agency] = useState(() => {
    const fallback = { name: "World Class Holidays", slug: "worldclass", accent_color: "#1B7167" };
    if (typeof window === "undefined") return fallback;
    try {
      return { ...fallback, ...(JSON.parse(localStorage.getItem(TERMINAL_TENANT_STORAGE_KEY) || "null") || {}) };
    } catch {
      return fallback;
    }
  });

  const agencyName = settings.name || agency.name || "World Class Holidays";
  const agencyInitials = agencyName
    .split(/\s+/)
    .map((part: string) => part[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();

  // Clock ticker for live enterprise terminal workstation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    clearProfileSession();
    const terminalToken = localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.worldclassholidays.org/api/v1";
    fetch(`${apiUrl}/auth/agency-profiles`, {
      headers: { "X-Terminal-Token": terminalToken || "" },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Terminal session expired.");
        setProfiles(Array.isArray(data) ? data : []);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Unable to load staff profiles."),
      )
      .finally(() => setLoading(false));
  }, []);

  const signOutTerminal = () => {
    clearProfileSession();
    clearTerminalSession();
    window.location.replace("/login");
  };

  if (!mounted) {
    return <main className="min-h-screen bg-slate-50 dark:bg-slate-950" aria-label="Loading workstation" />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-[#070B14] dark:text-slate-100">
      {/* Top Refined Corporate Header */}
      <header className="border-b border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            {/* Real Uploaded Agency Logo */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-slate-800">
              <AgencyLogo
                initials={agencyInitials}
                className="h-full w-full object-contain"
                fallbackClassName="text-sm font-black text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {agencyName}
                </span>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex">
                  Dedicated Enterprise ERP
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff Workstation &middot; Authorized Terminal
              </p>
            </div>
          </div>

          {/* Workstation Live Indicator & Clock */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentTime || "Workstation Active"}</span>
            </div>
            <button
              type="button"
              onClick={signOutTerminal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              title="Lock terminal station"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out Station</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Section */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        {searchParams.get("reason") === "inactive" && (
          <div
            role="status"
            className="mb-8 flex w-full max-w-3xl items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-xs dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            Session locked after inactivity. Select your profile below and enter your Quick PIN to resume.
          </div>
        )}

        {/* Clean Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Authorized Workstation Terminal
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Select Your Staff Profile
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-400">
            Enter your 4-digit Quick PIN to open your secure operational workspace.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-12 flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Loading team profiles...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="mt-8 w-full max-w-md rounded-xl border border-rose-300 bg-rose-50 p-4 text-center text-sm font-medium text-rose-800 shadow-xs dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {error}
          </div>
        )}

        {/* Professional Enterprise Cards Grid */}
        <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Attendance Kiosk Card */}
          <Link
            href="/attendance/kiosk"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-emerald-600 dark:group-hover:text-white transition-colors">
                  <Clock3 className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  Shared Terminal
                </span>
              </div>

              <div className="mt-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Attendance Kiosk
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Daily staff check-in and punch clock using Employee ID or QR Code.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Open Punch Kiosk
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-emerald-600 transition">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Staff Profile Cards */}
          {profiles.map((profile) => {
            const initials = profile.full_name
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const roleBadgeStyle =
              ROLE_BADGES[profile.role] ||
              "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelected(profile)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xs transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div>
                  <div className="flex items-center justify-between">
                    {/* Professional Clean Avatar */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white shadow-xs"
                      style={{ backgroundColor: profile.avatar_color || "#1B7167" }}
                    >
                      {initials || <UserCheck2 className="h-5 w-5" />}
                    </div>

                    {/* PIN Security Indicator */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                        profile.has_pin
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                      title={profile.has_pin ? "Quick PIN active" : "PIN setup required"}
                    >
                      <LockKeyhole className="h-3 w-3" />
                      {profile.has_pin ? "PIN Secured" : "Set PIN"}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                      {profile.full_name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${roleBadgeStyle}`}>
                        {ROLE_LABELS[profile.role] || profile.role.replaceAll("_", " ")}
                      </span>
                      {profile.department && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                          {profile.department}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <KeyRound className="h-3.5 w-3.5" />
                    Enter Quick PIN
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-emerald-600 transition">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Refined Corporate Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dedicated Single-Agency Terminal &middot; Auto-locks on inactivity</span>
          </div>
          <div>
            <span>TourFlow Enterprise &middot; World Class Holidays</span>
          </div>
        </div>
      </footer>

      {/* PIN Unlock Modal */}
      {selected && <ProfilePinModal profile={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <ProfilesContent />
    </Suspense>
  );
}
