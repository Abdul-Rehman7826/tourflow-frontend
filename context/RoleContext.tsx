"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * Standardized Role Identifiers for TourFlow Engine.
 * Each role dictates which ERP functional modules are rendered in the sidebar.
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "AGENCY_ADMIN"
  | "HR_MANAGER"
  | "FRONT_DESK"
  | "TOUR_MANAGER"
  | "VISA_CONSULTANT";

export interface RoleMeta {
  code: UserRole;
  title: string;
  subtitle: string;
  avatar: string;
  badgeClass: string;
  textColor: string;
  accessScope: string;
}

export const ROLE_METADATA: Record<UserRole, RoleMeta> = {
  SUPER_ADMIN: {
    code: "SUPER_ADMIN",
    title: "SaaS Platform Owner",
    subtitle: "Product & Tenant Administration",
    avatar: "⚡",
    badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    textColor: "text-sky-400",
    accessScope: "Master SaaS Control (Tenants, Subscriptions, Platform)",
  },
  AGENCY_ADMIN: {
    code: "AGENCY_ADMIN",
    title: "Agency Admin / Owner",
    subtitle: "Full ERP & Financial Access",
    avatar: "👑",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    textColor: "text-amber-400",
    accessScope: "Complete Agency Authority (All 11 Modules)",
  },
  HR_MANAGER: {
    code: "HR_MANAGER",
    title: "HR & Payroll Manager",
    subtitle: "People, Attendance & Compensation",
    avatar: "HR",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    textColor: "text-emerald-400",
    accessScope: "HR Operations (Attendance, Payroll & Employee Services)",
  },
  FRONT_DESK: {
    code: "FRONT_DESK",
    title: "Front Desk Rep",
    subtitle: "Inquiries, Leads & Walk-ins",
    avatar: "🎧",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    textColor: "text-emerald-400",
    accessScope: "Restricted View (Leads, Clients & Draft Bookings Only)",
  },
  TOUR_MANAGER: {
    code: "TOUR_MANAGER",
    title: "Tour Operations Manager",
    subtitle: "Itineraries, Suppliers & Departures",
    avatar: "🧭",
    badgeClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    textColor: "text-sky-400",
    accessScope: "Operations Suite (Tours, Vendors, Inquiries)",
  },
  VISA_CONSULTANT: {
    code: "VISA_CONSULTANT",
    title: "Visa Consultant",
    subtitle: "Embassy Pipelines & Document Vault",
    avatar: "🛂",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    textColor: "text-purple-400",
    accessScope: "Immigration & Document Handling Suite",
  },
};

export interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleMeta: RoleMeta;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("AGENCY_ADMIN");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const activeRoleMeta = ROLE_METADATA[role];

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        roleMeta: activeRoleMeta,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
