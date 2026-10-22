"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, getStoredAccessToken } from "@/lib/api-client";
import { Compass, Loader2 } from "lucide-react";

interface SetupStatusResponse {
  is_configured: boolean;
  agency_name?: string;
  logo_url?: string | null;
}

export default function RootClientPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function evaluateDestination() {
      try {
        const res = await apiClient.get<SetupStatusResponse>("/setup/status");
        if (!active) return;

        if (!res.is_configured) {
          router.replace("/setup");
          return;
        }

        const token = getStoredAccessToken();
        if (token) {
          router.replace("/profiles");
        } else {
          router.replace("/login");
        }
      } catch {
        if (!active) return;
        const token = getStoredAccessToken();
        if (token) {
          router.replace("/profiles");
        } else {
          router.replace("/login");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    evaluateDestination();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-emerald-50/20 dark:from-[#030B09] dark:via-[#06120E] dark:to-[#030B09] flex items-center justify-center p-6 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20">
      <div className="text-center space-y-4 animate-in fade-in duration-300">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1B7167] to-[#0D4B44] flex items-center justify-center text-white shadow-xl shadow-emerald-950/20 ring-1 ring-white/20">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase text-slate-900 dark:text-white">
            World Class Holidays
          </h1>
          <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            Travel Operations &bull; CRM Platform
          </p>
        </div>
        {checking && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#1B7167]" />
            <span>Connecting to Operations Gateway...</span>
          </div>
        )}
      </div>
    </main>
  );
}
