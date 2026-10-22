"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  assertSuperAdmin,
  extendLicenseDate,
  type TenantGovernanceStatus,
} from "@/lib/analytics-governance";
import {
  TENANT_AUTHENTICATED_EVENT,
  TERMINAL_TENANT_STORAGE_KEY,
} from "@/lib/profile-session";

export type SubscriptionPlan = "Starter" | "Pro" | "Enterprise";
export type SubscriptionStatus = "Active" | "Grace Period" | "Suspended";

/**
 * Tenant definition in TourFlow Engine multi-tenant architecture.
 * TourFlow Engine is the SaaS platform owner, and each Tenant is an agency subscriber.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  contactPerson: string;
  contactEmail: string;
  plan: SubscriptionPlan;
  renewalDate: string; // YYYY-MM-DD
  subscriptionStatus: SubscriptionStatus;
  mrr: number;
  subtitle: string;
  logoInitials: string;
  badge: string;
  accentColor: string;
  activeDepartures: number;
}

export const MOCK_TENANTS: Tenant[] = [
  {
    id: "tenant-world-class",
    name: "World Class Holidays",
    slug: "world-class",
    subdomain: "worldclass.tourflow.io",
    contactPerson: "Nadeem Akhtar (Managing Director)",
    contactEmail: "admin@worldclass.com",
    plan: "Enterprise",
    renewalDate: "2026-11-30",
    subscriptionStatus: "Active",
    mrr: 125000,
    subtitle: "Luxury & Group Tours",
    logoInitials: "WCH",
    badge: "Enterprise Subscriber",
    accentColor: "from-sky-500 to-indigo-600",
    activeDepartures: 34,
  },
  {
    id: "tenant-apex-travel",
    name: "Apex Travel Global",
    slug: "apex-travel",
    subdomain: "apex.tourflow.io",
    contactPerson: "Sarah Jenkins (Head of Ops)",
    contactEmail: "admin@apextravel.com",
    plan: "Pro",
    renewalDate: "2026-09-28",
    subscriptionStatus: "Grace Period",
    mrr: 85000,
    subtitle: "Corporate & Visa Solutions",
    logoInitials: "ATG",
    badge: "Global Agency Tier",
    accentColor: "from-emerald-500 to-teal-600",
    activeDepartures: 19,
  },
  {
    id: "tenant-expired-agency",
    name: "Falcon Express Tours",
    slug: "falcon-express",
    subdomain: "falcon.tourflow.io",
    contactPerson: "Kamran Qureshi (Agency Principal)",
    contactEmail: "admin@expiredagency.com",
    plan: "Starter",
    renewalDate: "2026-08-01",
    subscriptionStatus: "Suspended",
    mrr: 35000,
    subtitle: "Regional Domestic & Hajj",
    logoInitials: "FET",
    badge: "Suspended Subscriber",
    accentColor: "from-rose-500 to-red-600",
    activeDepartures: 4,
  },
  {
    id: "tenant-nomad-expeditions",
    name: "Nomad Silk Route Expeditions",
    slug: "nomad-silk-route",
    subdomain: "nomad.tourflow.io",
    contactPerson: "Zubair Hashmi",
    contactEmail: "zubair@nomadexp.com",
    plan: "Pro",
    renewalDate: "2026-12-15",
    subscriptionStatus: "Active",
    mrr: 75000,
    subtitle: "Adventure & Trekking Specialists",
    logoInitials: "NSR",
    badge: "Verified Tour Operator",
    accentColor: "from-amber-500 to-orange-600",
    activeDepartures: 11,
  },
];

export interface TenantContextType {
  isHydrated: boolean;
  tenant: Tenant;
  setTenantById: (id: string) => void;
  setTenantBySlug: (slug: string) => void;
  allTenants: Tenant[];
  toggleTenantSuspension: (tenantId: string) => void;
  extendSubscription: (tenantId: string, days: number, actorRole: string) => void;
  createTenant: (
    input: Omit<Tenant, "id" | "slug" | "logoInitials" | "activeDepartures">,
    actorRole: string,
  ) => Tenant;
  setTenantStatus: (
    tenantId: string,
    status: TenantGovernanceStatus,
    actorRole: string,
  ) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = "tourflow_active_tenant_id";
const TENANTS_LIST_STORAGE_KEY = "tourflow_tenants_list_v2";

type AuthenticatedTenant = {
  id: string;
  name: string;
  slug: string;
  status?: string;
  subscription_status?: string;
  subscription_plan?: string;
  subscription_expires_at?: string | null;
};

function fromAuthenticatedTenant(source: AuthenticatedTenant, existing?: Tenant): Tenant {
  const plan = source.subscription_plan?.toUpperCase() === "ENTERPRISE"
    ? "Enterprise"
    : source.subscription_plan?.toUpperCase() === "STARTER"
      ? "Starter"
      : "Pro";
  const rawStatus = (source.subscription_status || source.status || "ACTIVE").toUpperCase();
  const subscriptionStatus: SubscriptionStatus = rawStatus === "SUSPENDED"
    ? "Suspended"
    : rawStatus === "GRACE_PERIOD"
      ? "Grace Period"
      : "Active";
  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    subdomain: `${source.slug}.tourflow.io`,
    contactPerson: existing?.contactPerson || "Agency Administrator",
    contactEmail: existing?.contactEmail || "",
    plan,
    renewalDate: source.subscription_expires_at || existing?.renewalDate || "",
    subscriptionStatus,
    mrr: existing?.mrr || 0,
    subtitle: existing?.subtitle || "Travel Operations Workspace",
    logoInitials: source.name.split(/\s+/).slice(0, 3).map((part) => part[0]).join("").toUpperCase(),
    badge: `${plan} Subscriber`,
    accentColor: existing?.accentColor || "from-[#1B7167] to-teal-600",
    activeDepartures: existing?.activeDepartures || 0,
  };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [activeTenantId, setActiveTenantId] = useState<string>(MOCK_TENANTS[0].id);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read persisted tenant choice on client mount
  useEffect(() => {
    try {
      const savedList = localStorage.getItem(TENANTS_LIST_STORAGE_KEY);
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // One-time client hydration must publish the persisted external state.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTenants(parsed);
        }
      }
      const savedId = localStorage.getItem(TENANT_STORAGE_KEY);
      if (savedId) {
        setActiveTenantId(savedId);
      }
      const authenticated = JSON.parse(localStorage.getItem(TERMINAL_TENANT_STORAGE_KEY) || "null") as AuthenticatedTenant | null;
      if (authenticated?.id && authenticated.name && authenticated.slug) {
        setTenants((current) => {
          const existing = current.find((tenant) => tenant.id === authenticated.id || tenant.slug === authenticated.slug);
          const synced = fromAuthenticatedTenant(authenticated, existing);
          return [synced, ...current.filter((tenant) => tenant.id !== synced.id && tenant.slug !== synced.slug)];
        });
        setActiveTenantId(authenticated.id);
        localStorage.setItem(TENANT_STORAGE_KEY, authenticated.id);
      }
    } catch {
      // Ignore local storage errors
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAuthenticatedTenant = (event: Event) => {
      const authenticated = (event as CustomEvent<AuthenticatedTenant>).detail;
      if (!authenticated?.id || !authenticated.name || !authenticated.slug) return;
      setTenants((current) => {
        const existing = current.find((tenant) => tenant.id === authenticated.id || tenant.slug === authenticated.slug);
        const synced = fromAuthenticatedTenant(authenticated, existing);
        return [synced, ...current.filter((tenant) => tenant.id !== synced.id && tenant.slug !== synced.slug)];
      });
      setActiveTenantId(authenticated.id);
      localStorage.setItem(TENANT_STORAGE_KEY, authenticated.id);
    };
    window.addEventListener(TENANT_AUTHENTICATED_EVENT, syncAuthenticatedTenant);
    return () => window.removeEventListener(TENANT_AUTHENTICATED_EVENT, syncAuthenticatedTenant);
  }, []);

  const saveTenants = (updated: Tenant[]) => {
    setTenants(updated);
    try {
      localStorage.setItem(TENANTS_LIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const setTenantById = (id: string) => {
    setActiveTenantId(id);
    try {
      localStorage.setItem(TENANT_STORAGE_KEY, id);
    } catch {
      // Ignore
    }
  };

  const setTenantBySlug = (slug: string) => {
    const found = tenants.find((t) => t.slug === slug);
    if (found) {
      setActiveTenantId(found.id);
      try {
        localStorage.setItem(TENANT_STORAGE_KEY, found.id);
      } catch {
        // Ignore
      }
    }
  };

  const toggleTenantSuspension = (tenantId: string) => {
    const updated = tenants.map((t) => {
      if (t.id !== tenantId) return t;
      const nextStatus: SubscriptionStatus =
        t.subscriptionStatus === "Suspended" ? "Active" : "Suspended";
      return { ...t, subscriptionStatus: nextStatus };
    });
    saveTenants(updated);
  };

  const extendSubscription = (tenantId: string, days: number, actorRole: string) => {
    assertSuperAdmin(actorRole);
    if (![30, 90, 180, 365].includes(days)) {
      throw new Error("Choose a supported license extension period.");
    }
    const updated = tenants.map((t) => {
      if (t.id !== tenantId) return t;
      return {
        ...t,
        renewalDate: extendLicenseDate(
          t.renewalDate,
          days as 30 | 90 | 180 | 365,
          new Date().toISOString().slice(0, 10),
        ),
        subscriptionStatus: "Active" as SubscriptionStatus,
      };
    });
    saveTenants(updated);
  };

  const createTenant: TenantContextType["createTenant"] = (input, actorRole) => {
    assertSuperAdmin(actorRole);
    const subdomain = input.subdomain.trim().toLowerCase();
    const contactEmail = input.contactEmail.trim().toLowerCase();
    if (!input.name.trim() || !subdomain || !contactEmail) {
      throw new Error("Agency name, subdomain, and contact email are required.");
    }
    if (tenants.some((entry) => entry.subdomain.toLowerCase() === subdomain)) {
      throw new Error("This tenant subdomain is already provisioned.");
    }
    if (tenants.some((entry) => entry.contactEmail.toLowerCase() === contactEmail)) {
      throw new Error("This agency contact already has a tenant.");
    }
    const name = input.name.trim();
    const created: Tenant = {
      ...input,
      id: `tenant-${crypto.randomUUID()}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      subdomain,
      contactEmail,
      logoInitials: name.split(/\s+/).slice(0, 3).map((part) => part[0]).join("").toUpperCase(),
      activeDepartures: 0,
    };
    saveTenants([created, ...tenants]);
    return created;
  };

  const setTenantStatus: TenantContextType["setTenantStatus"] = (
    tenantId,
    status,
    actorRole,
  ) => {
    assertSuperAdmin(actorRole);
    if (!tenants.some((entry) => entry.id === tenantId)) {
      throw new Error("Tenant not found.");
    }
    const mapped: Record<TenantGovernanceStatus, SubscriptionStatus> = {
      ACTIVE: "Active",
      GRACE_PERIOD: "Grace Period",
      SUSPENDED: "Suspended",
    };
    saveTenants(
      tenants.map((entry) =>
        entry.id === tenantId
          ? { ...entry, subscriptionStatus: mapped[status] }
          : entry,
      ),
    );
  };

  const activeTenant =
    tenants.find((t) => t.id === activeTenantId) || tenants[0] || MOCK_TENANTS[0];

  return (
    <TenantContext.Provider
      value={{
        isHydrated,
        tenant: isHydrated ? activeTenant : MOCK_TENANTS[0],
        setTenantById,
        setTenantBySlug,
        allTenants: tenants,
        toggleTenantSuspension,
        extendSubscription,
        createTenant,
        setTenantStatus,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
