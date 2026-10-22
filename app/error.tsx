"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, House, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { profileHomeRoute } from "@/lib/profile-session";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useAuth();

  useEffect(() => {
    console.error("TourFlow workspace error", error);
  }, [error]);

  const diagnostic = error.digest
    ? `Diagnostic ID: ${error.digest}`
    : error.message || "No diagnostic details were provided.";

  const homeRoute = user
    ? profileHomeRoute(user.role, user.screenAccess as Record<string, unknown> | undefined)
    : "/leads";

  const homeLabel = user?.role === "AGENCY_ADMIN" ? "Return to Dashboard" : "Return to Workspace";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-7 shadow-2xl dark:border-white/10 dark:bg-[#0B0F19] sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#1B7167] dark:text-emerald-400">
          Workspace recovery
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
          Something went wrong loading this workspace.
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Your saved records are unchanged. Try loading this section again, or return to your secure operational workspace.
        </p>
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-[#030712]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Diagnostic detail</p>
          <p className="mt-1 break-words font-mono text-xs text-gray-500 dark:text-gray-400">{diagnostic}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#155b53] [&>svg]:text-white cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href={homeRoute}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.08]"
          >
            <House className="h-4 w-4" aria-hidden="true" />
            {homeLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
