"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, LogOut, WalletCards } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useAgencySettings } from "@/context/ThemeContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, logout } = useAuth();
  const { settings } = useAgencySettings();

  useEffect(() => {
    if (isHydrated && !user) router.replace("/login");
    if (isHydrated && user?.role === "SUPER_ADMIN") router.replace("/super-admin/tenants");
  }, [isHydrated, router, user]);

  if (!isHydrated || !user || user.role === "SUPER_ADMIN") {
    return <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] text-xs font-bold text-gray-500 dark:bg-[#030712]">Restoring your employee portal...</div>;
  }

  const workspaceHref = user.role === "AGENCY_ADMIN" ? "/dashboard" : user.role === "HR_MANAGER" ? "/payroll" : user.role === "TOUR_MANAGER" ? "/tours" : user.role === "VISA_CONSULTANT" ? "/visa-pipeline" : "/leads";
  const portalLinkClass = (active: boolean) => [
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
    active
      ? "bg-[var(--agency-action)] text-[var(--agency-on-accent)] shadow-sm"
      : "text-gray-600 hover:bg-white hover:text-[var(--agency-action)] dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-[var(--agency-accent)]",
  ].join(" ");

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-950 dark:bg-[#030712] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#030712]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/payslips" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--agency-action)] text-[var(--agency-on-accent)] shadow-lg"><WalletCards className="h-4.5 w-4.5" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-black">{settings.name}</span><span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--agency-action)] dark:text-[var(--agency-accent)]">Employee self-service</span></span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/[0.03] sm:flex" aria-label="Employee portal">
            <Link href="/payslips" aria-current={pathname === "/payslips" ? "page" : undefined} className={portalLinkClass(pathname === "/payslips")}><WalletCards className="h-3.5 w-3.5" /> Payslips</Link>
            <Link href="/leave" aria-current={pathname === "/leave" ? "page" : undefined} className={portalLinkClass(pathname === "/leave")}><CalendarDays className="h-3.5 w-3.5" /> Leave History</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={workspaceHref} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold hover:border-[var(--agency-accent)] hover:text-[var(--agency-action)] dark:border-white/10 dark:hover:text-[var(--agency-accent)]"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Operations Workspace</span></Link>
            <button type="button" onClick={() => logout()} aria-label="Sign out" className="rounded-xl border border-gray-200 p-2.5 text-gray-500 hover:text-rose-600 dark:border-white/10 dark:text-gray-400"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
