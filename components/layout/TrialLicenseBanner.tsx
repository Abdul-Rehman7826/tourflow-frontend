"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { licenseDaysRemaining } from "@/lib/saas-governance";

export function TrialLicenseBanner() {
  const { user } = useAuth();
  const tenant = user?.tenant;
  const days = licenseDaysRemaining(tenant?.subscription_expires_at || null);

  if (!tenant?.is_demo || days === null || days < 0 || days > 2) return null;

  return (
    <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Clock3 className="h-4 w-4 shrink-0" />
          <span>Your TourFlow trial {days === 0 ? "expires today" : `expires in ${days} day${days === 1 ? "" : "s"}`}.</span>
        </div>
        <Link href="/upgrade" className="shrink-0 rounded-lg bg-[#1B7167] px-3 py-1.5 font-medium text-white hover:bg-[#155b53] [&>span]:text-white">
          <span>Choose a plan</span>
        </Link>
      </div>
    </div>
  );
}
