"use client";

import { useAgencySettings } from "@/context/ThemeContext";
import { AgencyLogo } from "@/components/settings/AgencyLogo";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GlobalBookingModal } from "@/components/bookings/GlobalBookingModal";
import {
  Search,
  Menu,
  Plus,
  Crown,
  UserRound,
} from "lucide-react";
import { HeaderProfileDropdown } from "@/components/layout/HeaderProfileDropdown";

export function TopNavbar({ onOpenNavigation, navigationOpen = false }: { onOpenNavigation: () => void; navigationOpen?: boolean }) {
  const { tenant } = useTenant();
  const { settings } = useAgencySettings();
  const { isSidebarCollapsed, toggleSidebar } = useRole();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or '/' to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") ||
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#030712] border-b border-gray-200 dark:border-white/10 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-3 sm:px-5 lg:px-6 gap-3 md:gap-6">
        
        {/* =========================================================================
            LEFT: Sidebar Toggle + Tenant Agency Branding (Logo and Name Only)
           ========================================================================= */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={onOpenNavigation} aria-label="Open navigation" aria-expanded={navigationOpen} className="shrink-0 rounded-lg p-2 lg:hidden hover:bg-gray-100 dark:hover:bg-white/5">
            <Menu className="w-5 h-5" />
          </button>
          {/* Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:block p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Tenant Agency Brand: Logo and Name Only (White-labeled) */}
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 shadow-xs overflow-hidden"
            >
              <AgencyLogo initials={tenant.logoInitials} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                  {settings.name}
                </span>
                <span className="hidden xl:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                  {tenant.subtitle}
                </span>
              </div>
              <p className="truncate text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-none mt-0.5">
                crm.worldclassholidays.org
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CENTER: Modern Minimalist Pill Search Bar with Ctrl+K
           ========================================================================= */}
        <div className="min-w-0 flex-1 max-w-md mx-2 hidden xl:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, clients, tours..."
              className="w-full pl-9 pr-14 py-2 bg-gray-100 dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <kbd className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-[#080C14] border border-gray-200 dark:border-white/10 rounded-full shadow-xs">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT: Sun/Moon Toggle + Purple Action CTA + User Pill
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Super Admin Quick Link */}
          {user?.role === "SUPER_ADMIN" && (
            <Link
              href="/super-admin/tenants"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all"
              title="Super Admin Portal"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </Link>
          )}

          {/* Sun / Moon Minimalist Theme Toggle */}
          <ThemeToggle />

          <Link
            href="/payslips"
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:border-purple-500 hover:text-purple-600 dark:border-white/10 dark:bg-[#0B0F19] dark:text-gray-200 dark:hover:text-purple-400"
            title="Open my employee portal"
          >
            <UserRound className="h-4 w-4" />
            <span>{user?.role === "AGENCY_ADMIN" || user?.role === "HR_MANAGER" ? "My Portal" : "Payslips"}</span>
          </Link>

          {/* Primary Action CTA: Solid Purple Button */}
          {user?.role !== "HR_MANAGER" && <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm shadow-purple-600/25 items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>}

          <HeaderProfileDropdown />

        </div>

      </div>
      <GlobalBookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </header>
  );
}
