"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_METADATA, useRole, UserRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import type { ScreenAccessRules } from "@/types/erp";
import { normalizeScreenAccess } from "@/lib/screen-access";
import { apiClient } from "@/lib/api-client";
import { AgencyLogo } from "@/components/settings/AgencyLogo";
import {
  LayoutDashboard,
  UserPlus,
  Compass,
  FileCheck2,
  Receipt,
  TrendingUp,
  Settings,
  Users,
  FileEdit,
  FolderLock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarCheck,
  Banknote,
  CalendarRange,
  Globe,
} from "lucide-react";

/**
 * Navigation Item definition with RBAC controls.
 */
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "sky" | "amber" | "emerald" | "purple" | "rose";
  description: string;
  /**
   * Allowed role codes for this navigation item.
   */
  allowedRoles: UserRole[];
}

/**
 * Master Navigation Registry for TourFlow Engine.
 * Dynamic filtering reads `role` from RoleContext in real time.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Agency KPI overview & revenue analytics",
    // Allowed ONLY for AGENCY_ADMIN (strictly hidden for FRONT_DESK)
    allowedRoles: ["AGENCY_ADMIN"],
  },
  {
    name: "Leads & Walk-ins",
    href: "/leads",
    icon: UserPlus,
    description: "WhatsApp inquiries, walk-ins & CRM intake",
    // Accessible by AGENCY_ADMIN, FRONT_DESK, TOUR_MANAGER
    allowedRoles: ["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER"],
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    description: "Customer database, passport records & profiles",
    // Accessible by AGENCY_ADMIN, FRONT_DESK, VISA_CONSULTANT
    allowedRoles: ["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"],
  },
  {
    name: "Draft Bookings",
    href: "/draft-bookings",
    icon: FileEdit,
    description: "Unconfirmed quotes, itineraries & calculations",
    // Core front desk workflow item
    allowedRoles: ["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER"],
  },
  {
    name: "Group Tours",
    href: "/tours",
    icon: Compass,
    description: "Fixed departures, group packages & seat allotments",
    allowedRoles: ["AGENCY_ADMIN", "TOUR_MANAGER"],
  },
  {
    name: "Visa Pipeline",
    href: "/visa-pipeline",
    icon: FileCheck2,
    badgeVariant: "purple",
    description: "Embassy appointment slots & document tracking",
    allowedRoles: ["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"],
  },
  {
    name: "Document Vault",
    href: "/documents",
    icon: FolderLock,
    description: "Encrypted passports, bank statements & affidavits",
    allowedRoles: ["AGENCY_ADMIN", "VISA_CONSULTANT"],
  },
  {
    name: "Suppliers & Vendors",
    href: "/suppliers",
    icon: Building2,
    description: "DMCs, Airlines, Hotel chains & Fleet partners",
    allowedRoles: ["AGENCY_ADMIN", "TOUR_MANAGER"],
  },
  {
    name: "Invoices & Billing",
    href: "/invoices",
    icon: Receipt,
    description: "Client billing, payment links & GST/VAT receipts",
    allowedRoles: ["AGENCY_ADMIN"],
  },
  {
    name: "Ledger & ROI",
    href: "/ledger",
    icon: TrendingUp,
    description: "P&L accounts, departure profitability & cashflow",
    // Strictly AGENCY_ADMIN (hidden for FRONT_DESK)
    allowedRoles: ["AGENCY_ADMIN"],
  },
  {
    name: "Office Expenses",
    href: "/expenses",
    icon: Banknote,
    description: "Rent, utilities, software and overhead ledger",
    allowedRoles: ["AGENCY_ADMIN", "HR_MANAGER"],
  },
  {
    name: "HR Dashboard",
    href: "/hr-dashboard",
    icon: LayoutDashboard,
    description: "Workforce telemetry, exceptions & audit exports",
    allowedRoles: ["AGENCY_ADMIN", "HR_MANAGER"],
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    description: "Daily attendance, shifts, QR scans & corrections",
    allowedRoles: ["AGENCY_ADMIN", "HR_MANAGER"],
  },
  {
    name: "Payroll",
    href: "/payroll",
    icon: Banknote,
    description: "Monthly salaries, deductions & payslips",
    allowedRoles: ["AGENCY_ADMIN", "HR_MANAGER"],
  },
  {
    name: "Leave Management",
    href: "/leave/admin",
    icon: CalendarRange,
    description: "Leave approvals, balances & attendance sync",
    allowedRoles: ["AGENCY_ADMIN", "HR_MANAGER"],
  },
  {
    name: "Staff Management",
    href: "/settings/staff",
    icon: Users,
    description: "Agency employee credentials & role access",
    // Strictly AGENCY_ADMIN (hidden for FRONT_DESK)
    allowedRoles: ["AGENCY_ADMIN"],
  },
  {
    name: "Agency Settings",
    href: "/settings",
    icon: Settings,
    description: "Branch tenancy, staff roles & markup policies",
    // Strictly AGENCY_ADMIN (hidden for FRONT_DESK)
    allowedRoles: ["AGENCY_ADMIN"],
  },
];

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const { role: fallbackRole, roleMeta: fallbackRoleMeta, isSidebarCollapsed: collapsed, toggleSidebar } = useRole();
  const isSidebarCollapsed = !mobile && collapsed;
  const { tenant } = useTenant();
  const { user } = useAuth();
  const pathname = usePathname();
  // The unlocked profile is the authority for navigation. RoleContext is retained
  // for legacy presentation state, but it must not elevate a staff profile to its
  // default Agency Admin role.
  const role = (user?.role as UserRole | undefined) || fallbackRole;
  const roleMeta = ROLE_METADATA?.[role] || fallbackRoleMeta;
  const effectiveAccess = normalizeScreenAccess(user?.screenAccess, role);
  const [counts, setCounts] = useState({ new_leads: 0, pending_bookings: 0, active_tours: 0, overdue_invoices: 0 });

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      try {
        const next = await apiClient.get<typeof counts>("/analytics/sidebar-counts");
        if (active) setCounts(next);
      } catch {
        if (active) setCounts({ new_leads: 0, pending_bookings: 0, active_tours: 0, overdue_invoices: 0 });
      }
    };
    void loadCounts();
    const timer = window.setInterval(() => { void loadCounts(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const liveBadges: Partial<Record<string, { label: string; variant: NavItem["badgeVariant"] }>> = {
    "/leads": counts.new_leads ? { label: `${counts.new_leads} New`, variant: "emerald" } : undefined,
    "/draft-bookings": counts.pending_bookings ? { label: `${counts.pending_bookings} Pending`, variant: "amber" } : undefined,
    "/tours": counts.active_tours ? { label: `${counts.active_tours} Active`, variant: "sky" } : undefined,
    "/invoices": counts.overdue_invoices ? { label: `${counts.overdue_invoices} Overdue`, variant: "rose" } : undefined,
  };

  /**
   * =========================================================================
   * DYNAMIC ROLE FILTERING LOGIC:
   * =========================================================================
   * We filter `ALL_NAV_ITEMS` based on whether `role` is present in `item.allowedRoles`.
   *
   * 1. If role === "AGENCY_ADMIN":
   *    -> Shows Dashboard, Leads & Walk-ins, Group Tours, Visa Pipeline, Invoices & Billing,
   *       Ledger & ROI, and Agency Settings (plus Clients, Draft Bookings, etc.).
   *
   * 2. If role === "FRONT_DESK":
   *    -> Shows ONLY Leads & Walk-ins, Clients, and Draft Bookings.
   *    -> Dashboard, Ledger & ROI, Invoices, and Agency Settings are COMPLETELY OMITTED.
   * =========================================================================
   */
  const permissionByPath: Partial<Record<string, keyof ScreenAccessRules>> = {
    "/leads": "leads",
    "/clients": "clients",
    "/draft-bookings": "bookings",
    "/tours": "tours",
    "/visa-pipeline": "visaPipeline",
    "/documents": "visaPipeline",
    "/suppliers": "tours",
    "/invoices": "invoices",
    "/ledger": "invoices",
    "/hr-dashboard": "hrAndPayroll",
    "/attendance": "hrAndPayroll",
    "/payroll": "hrAndPayroll",
    "/leave/admin": "hrAndPayroll",
    "/expenses": "hrAndPayroll",
    "/settings/staff": "hrAndPayroll",
  };
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (role === "AGENCY_ADMIN") return true;
    if (item.href === "/settings/staff" || item.href === "/settings") return false;
    const permission = permissionByPath[item.href];
    if (permission) return effectiveAccess[permission] !== "NONE";
    return item.allowedRoles.includes(role);
  });

  const getBadgeClass = (variant?: string) => {
    switch (variant) {
      case "emerald":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
      case "amber":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
      case "purple":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30";
      case "rose":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30";
      case "sky":
      default:
        return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30";
    }
  };

  return (
    <aside
      className={`relative flex flex-col shrink-0 bg-white dark:bg-[#030712] border-r border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 transition-all duration-200 ease-in-out select-none ${
        mobile ? "w-full min-h-full" : isSidebarCollapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Active Tenant Context Card in Sidebar Header */}
      <div className="p-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
            isSidebarCollapsed
              ? "justify-center"
              : "bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10"
          }`}
          title={`Tenant: ${tenant?.name || "World Class Holidays"} | Role: ${roleMeta.title}`}
        >
          <div
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white shadow-xs shrink-0 overflow-hidden"
          >
            <AgencyLogo initials={tenant?.logoInitials || "WCH"} className="w-full h-full object-contain" />
          </div>

          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                  Agency Workspace
                </span>
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {tenant?.name || "World Class Holidays"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {!isSidebarCollapsed && (
          <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span>Modules ({visibleNavItems.length})</span>
            <span className={`text-[10px] font-semibold text-purple-600 dark:text-purple-400`}>
              {roleMeta.code}
            </span>
          </div>
        )}

        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const badge = liveBadges[item.href];
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && (pathname === "/" || pathname === "/dashboard"));

          return (
            <Link
              key={item.name}
              href={item.href}
              title={
                isSidebarCollapsed
                  ? `${item.name}${badge ? ` (${badge.label})` : ""}`
                  : undefined
              }
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? "text-white" : "text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                }`}
              />

              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.name}</span>
                  {badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ml-1.5 shrink-0 ${
                        isActive ? "bg-white/20 text-white" : getBadgeClass(badge.variant)
                      }`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
              )}

              {/* Tooltip on collapsed hover */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-slate-100 text-xs font-medium rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap hidden group-hover:block z-50 pointer-events-none animate-in fade-in slide-in-from-left-1 duration-100">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${getBadgeClass(
                          badge.variant
                        )}`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          );
        })}

        {/* Dynamic RBAC restriction banner when role is FRONT_DESK */}
        {!isSidebarCollapsed && role === "FRONT_DESK" && (
          <div className="mt-6 p-3 rounded-xl bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>FRONT_DESK Policy</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Executive modules (Dashboard, Ledger &amp; ROI, Settings, Invoices) are completely hidden for Front Desk Rep accounts.
            </p>
          </div>
        )}
      </div>

      {/* Sidebar Footer with Active Role Pill & Collapse Toggle */}
      <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] space-y-2">
        {!isSidebarCollapsed && (
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-mono">Signed In:</span>
              <span className={`font-bold text-purple-600 dark:text-purple-400`}>
                {roleMeta.code}
              </span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white truncate">
              {user?.name || "Staff Member"}
            </div>
          </div>
        )}

        {!mobile && <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>}
      </div>
    </aside>
  );
}
