/**
 * TourFlow ERP - Demo Authentication Engine & Presets
 * Enables seamless 1-click exploratory access across all 6 core ERP user roles:
 * Agency Owner/Admin, Front Desk, Tour Operations, Visa Officer, HR Manager, Super Admin.
 */

import { UserRole } from "@/context/RoleContext";
import { defaultScreenAccess } from "@/lib/screen-access";
import {
  PRIMARY_DEMO_TENANT_ID,
  seedAllDemoData,
} from "@/lib/demo-data";
import {
  AUTH_COOKIE_NAME,
  TERMINAL_AUTH_COOKIE_NAME,
} from "@/lib/auth";
import {
  TERMINAL_TOKEN_STORAGE_KEY,
  TERMINAL_TENANT_STORAGE_KEY,
  profileHomeRoute,
} from "@/lib/profile-session";
import { AgencyProfile } from "@/components/auth/ProfilePinModal";

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  quickPin: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  badge: string;
  badgeColor: string;
  avatarColor: string;
  avatarIcon: string;
  targetRoute: string;
  description: string;
  keyPermissions: string[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "emp-001",
    name: "Nadeem Akhtar",
    email: "admin@worldclassholidays.org",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "AGENCY_ADMIN",
    roleTitle: "Managing Director & Agency Owner",
    department: "Executive Management",
    badge: "Full ERP Governance",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
    avatarColor: "#1B7167",
    avatarIcon: "shield-check",
    targetRoute: "/dashboard",
    description: "Complete executive visibility across finances, live tour margins, staff records, payroll signoff, and agency settings.",
    keyPermissions: [
      "Executive Financial Dashboard",
      "Supplier Exposures & General Ledger",
      "Payroll Disbursal Sign-off",
      "Full Settings & Staff Management",
    ],
  },
  {
    id: "emp-002",
    name: "Fatima Noor",
    email: "fatima@worldclassholidays.org",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "FRONT_DESK",
    roleTitle: "Senior Inbound & Bookings Specialist",
    department: "Sales & Front Desk",
    badge: "CRM & Inbound Sales",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50",
    avatarColor: "#0D9488",
    avatarIcon: "user",
    targetRoute: "/leads",
    description: "Lead intake, 4-queue call center operations, instant quotation generation, WhatsApp dispatch, and booking conversions.",
    keyPermissions: [
      "Omnichannel Lead Queues",
      "Quick Quotation Generator",
      "Instant Booking Conversion",
      "Customer Payment Proof Intake",
    ],
  },
  {
    id: "emp-003",
    name: "Shahbaz Ahmed",
    email: "tours@worldclassholidays.org",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "TOUR_MANAGER",
    roleTitle: "Tour Operations & Departures Lead",
    department: "Tour Operations",
    badge: "Departures & Manifest",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
    avatarColor: "#D97706",
    avatarIcon: "user",
    targetRoute: "/tours",
    description: "Group departure management, room allocation grid, flight blocks & PNRs, daily itineraries, and passenger manifest compliance.",
    keyPermissions: [
      "Group Departures & Capacity",
      "Room Inventory Matrix",
      "Flight Block Utilization",
      "Supplier Expense Tracking",
    ],
  },
  {
    id: "emp-004",
    name: "Bilal Rasheed",
    email: "visa@worldclassholidays.org",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "VISA_CONSULTANT",
    roleTitle: "Senior Visa & Safe Custody Officer",
    department: "Visa Consultancy",
    badge: "Visa Pipeline & Safe Vault",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50",
    avatarColor: "#4F46E5",
    avatarIcon: "user",
    targetRoute: "/visa-pipeline",
    description: "Visa pipeline progression, document checklist verification, embassy submissions, and physical passport safe custody tracking.",
    keyPermissions: [
      "Kanban Visa Pipeline",
      "Embassy Submission Tracking",
      "Physical Passport Safe Custody",
      "Client Document Verification",
    ],
  },
  {
    id: "emp-005",
    name: "Hina Tariq",
    email: "hr@worldclassholidays.org",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "HR_MANAGER",
    roleTitle: "HR & Payroll Operations Manager",
    department: "Human Resources",
    badge: "Attendance & Payroll",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
    avatarColor: "#2563EB",
    avatarIcon: "user",
    targetRoute: "/hr-dashboard",
    description: "Work shift scheduling, biometric & kiosk attendance sweep finalizer, leave register decisions, and monthly payroll calculation.",
    keyPermissions: [
      "Staff Directory & Shifts",
      "Daily Attendance Finalizer",
      "Leave Register Approvals",
      "Automated Payroll Calculations",
    ],
  },
  {
    id: "super-admin-001",
    name: "Platform Administrator",
    email: "superadmin@tourflow.io",
    password: "Demo@2026!",
    quickPin: "1234",
    role: "SUPER_ADMIN",
    roleTitle: "SaaS Platform Governance",
    department: "Platform Administration",
    badge: "Global SaaS Governance",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
    avatarColor: "#E11D48",
    avatarIcon: "shield-check",
    targetRoute: "/super-admin/tenants",
    description: "Multi-tenant platform provisioning, license extension, feature flag governance, and system-wide SaaS telemetry metrics.",
    keyPermissions: [
      "Tenant Provisioning Console",
      "SaaS License Lifecycle",
      "Feature Flag Governance",
      "Multi-Tenant Telemetry",
    ],
  },
];

/**
 * Creates a standard-compliant JWT token for client-side demo evaluation
 * Fully decodable by jose decodeJwt() and extractSessionFromToken().
 */
export function createDemoJwtToken(payload: {
  sub: string;
  role: string;
  tenant_id: string;
  token_kind: "profile" | "terminal";
  email?: string;
  name?: string;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iss: "tourflow-demo",
    aud: "tourflow-web",
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days
    is_demo: true,
  };

  const toBase64Url = (obj: unknown) => {
    const json = JSON.stringify(obj);
    if (typeof btoa !== "undefined") {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
    return Buffer.from(json).toString("base64url");
  };

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(claims);
  const dummySignature = toBase64Url({ sig: "demo_verified_signature" });

  return `${headerB64}.${payloadB64}.${dummySignature}`;
}

/**
 * Executes a one-click demo login, establishing both terminal and profile tokens,
 * seeding demo data, and preparing the workspace for immediate evaluation.
 */
export function executeDemoLogin(account: DemoAccount): {
  success: boolean;
  targetRoute: string;
  user: Record<string, unknown>;
} {
  if (typeof window === "undefined") {
    return { success: false, targetRoute: account.targetRoute, user: {} };
  }

  const tenantId = PRIMARY_DEMO_TENANT_ID;

  // 1. Generate Terminal & Profile Tokens
  const terminalToken = createDemoJwtToken({
    sub: account.id,
    role: account.role,
    tenant_id: tenantId,
    token_kind: "terminal",
    email: account.email,
    name: account.name,
  });

  const profileToken = createDemoJwtToken({
    sub: account.id,
    role: account.role,
    tenant_id: tenantId,
    token_kind: "profile",
    email: account.email,
    name: account.name,
  });

  const maxAge = 30 * 24 * 60 * 60;

  // 2. Build Authoritative User Object
  const mappedUser = {
    id: account.id,
    name: account.name,
    full_name: account.name,
    email: account.email,
    role: account.role,
    status: "active",
    tenantId,
    tenant_id: tenantId,
    screenAccess: defaultScreenAccess(account.role),
    avatar_color: account.avatarColor,
    avatar_icon: account.avatarIcon,
    department: account.department,
    is_demo: true,
    must_change_password: false,
    tenant: {
      id: tenantId,
      name: "World Class Holidays",
      slug: "world-class",
      status: "ACTIVE",
      subscription_plan: "Enterprise",
      subscription_status: "Active",
      is_demo: true,
      enabled_modules: {
        crm: true,
        tours: true,
        visa: true,
        attendance: true,
        payroll: true,
        vault: true,
      },
      terminal_session_expiry_days: 30,
      accent_color: "#1B7167",
    },
  };

  // 3. Persist Tokens & Sessions in localStorage
  localStorage.setItem("tourflow_token", profileToken);
  localStorage.setItem("tourflow_session", profileToken);
  localStorage.setItem("tourflow_auth_user", JSON.stringify(mappedUser));
  localStorage.setItem(TERMINAL_TOKEN_STORAGE_KEY, terminalToken);
  localStorage.setItem(TERMINAL_TENANT_STORAGE_KEY, JSON.stringify(mappedUser.tenant));
  localStorage.setItem("tourflow_active_tenant_id", tenantId);
  localStorage.setItem("tourflow_is_demo_mode", "true");

  // 4. Set Browser Cookies for SSR & Middleware Validation
  document.cookie = `${AUTH_COOKIE_NAME}=${profileToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `tourflow_token=${profileToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${TERMINAL_AUTH_COOKIE_NAME}=${terminalToken}; path=/; max-age=${maxAge}; SameSite=Lax`;

  // 5. Seed Comprehensive Demo Data
  seedAllDemoData(tenantId, false);

  // 6. Compute Target Route
  const route = profileHomeRoute(account.role, mappedUser.screenAccess as unknown as Record<string, unknown> | undefined) || account.targetRoute;

  return {
    success: true,
    targetRoute: route,
    user: mappedUser,
  };
}

/**
 * Returns agency profiles list formatted for /profiles workstation selection screen.
 */
export function getDemoAgencyProfiles(): AgencyProfile[] {
  return DEMO_ACCOUNTS.filter((acc) => acc.role !== "SUPER_ADMIN").map((acc) => ({
    id: acc.id,
    full_name: acc.name,
    email: acc.email,
    role: acc.role,
    department: acc.department,
    avatar_color: acc.avatarColor,
    avatar_icon: acc.avatarIcon,
    has_pin: true,
  }));
}

/**
 * Validates whether the active session is a demo evaluation session.
 */
export function isDemoSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isFlagged = localStorage.getItem("tourflow_is_demo_mode") === "true";
    const cachedUser = JSON.parse(localStorage.getItem("tourflow_auth_user") || "{}");
    const token = localStorage.getItem("tourflow_token") || "";
    return isFlagged || Boolean(cachedUser?.is_demo) || token.includes("tourflow-demo");
  } catch {
    return false;
  }
}
