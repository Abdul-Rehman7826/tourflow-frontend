"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { TrialLicenseBanner } from "@/components/layout/TrialLicenseBanner";
import { useAuth } from "@/context/AuthContext";
import { useMounted } from "@/lib/use-mounted";
import type { ScreenAccessRules } from "@/types/erp";
import { Lock } from "lucide-react";
import type { SaasModule } from "@/lib/saas-governance";
import { isModuleEnabled } from "@/lib/saas-governance";
import { useInactivityLock } from "@/hooks/useInactivityLock";
import { normalizeScreenAccess } from "@/lib/screen-access";
import type { UserRole } from "@/context/RoleContext";
import Link from "next/link";
import { profileHomeRoute } from "@/lib/profile-session";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();
  const mounted = useMounted();
  const [navigationOpen, setNavigationOpen] = React.useState(false);
  const closeNavigation = React.useCallback(() => setNavigationOpen(false), []);
  useInactivityLock();

  React.useEffect(() => {
    if (!mounted || !isHydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "SUPER_ADMIN") {
      router.replace("/super-admin/tenants");
      return;
    }

    if ((pathname === "/dashboard" || pathname === "/") && user.role !== "AGENCY_ADMIN") {
      const destination = profileHomeRoute(user.role, user.screenAccess as Record<string, unknown> | undefined);
      if (destination && destination !== pathname) {
        router.replace(destination);
      }
    }
  }, [mounted, isHydrated, router, user, pathname]);

  if (!mounted || !isHydrated || !user || user.role === "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#030712] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-[#1B7167] animate-pulse" />
          Restoring secure workspace...
        </div>
      </div>
    );
  }

  const permissionRoutes: { prefix: string; permission: keyof ScreenAccessRules }[] = [
    { prefix: "/settings/staff", permission: "hrAndPayroll" },
    { prefix: "/hr-dashboard", permission: "hrAndPayroll" },
    { prefix: "/attendance", permission: "hrAndPayroll" },
    { prefix: "/payroll", permission: "hrAndPayroll" },
    { prefix: "/leave", permission: "hrAndPayroll" },
    { prefix: "/draft-bookings", permission: "bookings" },
    { prefix: "/visa-pipeline", permission: "visaPipeline" },
    { prefix: "/documents", permission: "visaPipeline" },
    { prefix: "/invoices", permission: "invoices" },
    { prefix: "/expenses", permission: "hrAndPayroll" },
    { prefix: "/ledger", permission: "invoices" },
    { prefix: "/suppliers", permission: "tours" },
    { prefix: "/cms", permission: "tours" },`r`n    { prefix: "/tours", permission: "tours" },
    { prefix: "/clients", permission: "clients" },
    { prefix: "/leads", permission: "leads" },
  ];
  const requiredPermission = pathname.startsWith("/attendance/scan")
    ? undefined
    : permissionRoutes.find((entry) => pathname.startsWith(entry.prefix))?.permission;
  const roleRestricted = user.role !== "AGENCY_ADMIN" && (
    pathname.startsWith("/settings/staff") || pathname === "/settings"
  );
  const effectiveAccess = normalizeScreenAccess(user.screenAccess, user.role as UserRole);
  const screenRestricted = roleRestricted || Boolean(
    user.role !== "AGENCY_ADMIN" && requiredPermission && effectiveAccess[requiredPermission] === "NONE"
  );
  const screenReadOnly = Boolean(
    user.role !== "AGENCY_ADMIN" && requiredPermission && effectiveAccess[requiredPermission] === "READ"
  );
  const moduleRoutes: { prefix: string; module: SaasModule }[] = [
    { prefix: "/leads", module: "crm" },
    { prefix: "/clients", module: "crm" },
    { prefix: "/cms", module: "tours" },`r`n    { prefix: "/tours", module: "tours" },
    { prefix: "/draft-bookings", module: "tours" },
    { prefix: "/suppliers", module: "tours" },
    { prefix: "/visa-pipeline", module: "visa" },
    { prefix: "/documents", module: "visa" },
    { prefix: "/attendance", module: "attendance" },
    { prefix: "/payroll", module: "payroll" },
    { prefix: "/leave", module: "payroll" },
    { prefix: "/hr-dashboard", module: "payroll" },
    { prefix: "/expenses", module: "payroll" },
  ];
  const requiredModule = moduleRoutes.find((entry) => pathname.startsWith(entry.prefix))?.module;
  const moduleRestricted = Boolean(
    requiredModule && user.tenant?.enabled_modules && !isModuleEnabled(user.tenant.enabled_modules, requiredModule),
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-[#030712] text-gray-900 dark:text-gray-100 selection:bg-[#1B7167]/30 selection:text-[#1B7167] dark:selection:text-[#2DD4BF] transition-colors duration-200">
      {/* 1. Persistent Top Header Bar with Tenant Switcher & TourFlow Badge */}
      <TopNavbar onOpenNavigation={() => setNavigationOpen(true)} navigationOpen={navigationOpen} />
      <TrialLicenseBanner />
      <MobileNavigation open={navigationOpen} onClose={closeNavigation}>
        <Sidebar mobile />
      </MobileNavigation>

      {/* 2. Workspace Body: Collapsible Left Sidebar + Scrollable Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex"><Sidebar /></div>

        {/* Main Content Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-[#030712] custom-scrollbar flex flex-col transition-colors duration-200">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {screenRestricted || moduleRestricted ? (
              <div className="mx-auto mt-16 max-w-md rounded-2xl border border-amber-500/20 bg-white p-8 text-center shadow-xl dark:bg-[#0B0F19]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><Lock className="h-7 w-7" /></div>
                <h1 className="mt-4 text-xl font-black">{moduleRestricted ? "Module Not Included" : "Screen Access Restricted"}</h1>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{moduleRestricted ? "This module is disabled for your agency plan. Ask your agency administrator to contact TourFlow about enabling it." : "Your employee profile does not include access to this workspace. Ask an agency administrator to update your screen permissions."}</p>
                <div className="mt-6">
                  <Link
                    href={profileHomeRoute(user.role, user.screenAccess as Record<string, unknown> | undefined)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#155b53]"
                  >
                    Return to Your Workspace
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {screenReadOnly && <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-200">Read-only access: you can review this workspace, but changes require FULL permission from an agency administrator.</div>}
                {children}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
