export const SAAS_MODULES = ["crm", "tours", "visa", "attendance", "payroll"] as const;
export type SaasModule = (typeof SAAS_MODULES)[number];
export type PlanTier = "STARTER" | "GROWTH" | "ENTERPRISE";
export type GovernanceStatus = "active" | "grace_period" | "suspended";

export interface TenantGovernanceRecord {
  id: string;
  name: string;
  slug: string;
  subscription_status: Uppercase<GovernanceStatus>;
  subscription_plan: PlanTier;
  subscription_expires_at: string | null;
  suspension_reason: string | null;
  is_demo: boolean;
  demo_started_at: string | null;
  max_staff_limit: number;
  max_monthly_departures: number;
  enabled_modules: Record<SaasModule, boolean>;
  base_currency: string;
  accent_color: string;
  owner_name: string | null;
  owner_email: string | null;
  staff_count: number;
  departure_count: number;
}

export interface PlatformTelemetry {
  total_tenants: number;
  active_tenants: number;
  active_demos: number;
  suspended_tenants: number;
  platform_mrr_estimate: number;
}

export function homeRouteForRole(role: string) {
  if (role === "SUPER_ADMIN") return "/super-admin/tenants";
  if (role === "HR_MANAGER") return "/payroll";
  if (["FRONT_DESK", "TOUR_MANAGER", "VISA_CONSULTANT"].includes(role)) return "/payslips";
  return "/dashboard";
}

export function canAccessSuperAdmin(role: string | null | undefined) {
  return role === "SUPER_ADMIN";
}

export function normalizeSubdomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSubdomain(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 63;
}

export function licenseDaysRemaining(expiry: string | null, today = new Date()) {
  if (!expiry) return null;
  const end = Date.parse(`${expiry}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - start) / 86_400_000);
}

export function isModuleEnabled(
  enabledModules: Partial<Record<SaasModule, boolean>> | null | undefined,
  module: SaasModule,
) {
  // In dedicated single-agency enterprise mode, all modules are available by default
  if (!enabledModules || Object.keys(enabledModules).length === 0) {
    return true;
  }
  return enabledModules[module] !== false;
}

export function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
