export const PIN_PATTERN = /^[0-9]{4}$/;
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const TERMINAL_TOKEN_STORAGE_KEY = "tourflow_terminal_token";
export const TERMINAL_COOKIE_NAME = "tourflow_terminal_session";
export const TERMINAL_TENANT_STORAGE_KEY = "tourflow_terminal_tenant";
export const TENANT_AUTHENTICATED_EVENT = "tourflow:tenant-authenticated";

export function terminalCookieMaxAge(days: number): number {
  return days * 24 * 60 * 60;
}

export function profileHomeRoute(role: string, access?: Record<string, unknown>): string {
  const routeIfAllowed = (key: string, route: string) => access?.[key] !== "NONE" ? route : "";
  const preferred = role === "FRONT_DESK" ? routeIfAllowed("leads", "/leads")
    : role === "TOUR_MANAGER" ? routeIfAllowed("tours", "/tours")
      : ["VISA_OFFICER", "VISA_CONSULTANT"].includes(role) ? routeIfAllowed("visaPipeline", "/visa-pipeline")
        : role === "HR_MANAGER" ? routeIfAllowed("hrAndPayroll", "/hr-dashboard") : "";
  if (preferred) return preferred;
  const fallback = [
    ["leads", "/leads"], ["clients", "/clients"], ["bookings", "/draft-bookings"],
    ["tours", "/tours"], ["visaPipeline", "/visa-pipeline"], ["invoices", "/invoices"],
    ["hrAndPayroll", "/hr-dashboard"],
  ].find(([key]) => access?.[key] === "FULL" || access?.[key] === "READ");
  if (fallback) return fallback[1];
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/tenants";
    case "FRONT_DESK":
      return "/leads";
    case "TOUR_MANAGER":
      return "/tours";
    case "VISA_OFFICER":
    case "VISA_CONSULTANT":
      return "/visa-pipeline";
    case "HR_MANAGER":
      return "/hr-dashboard";
    case "EMPLOYEE":
      return "/payslips";
    default:
      return "/dashboard";
  }
}

export function clearProfileSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tourflow_token");
  localStorage.removeItem("tourflow_auth_user");
  localStorage.removeItem("tourflow_session");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
  document.cookie = "tourflow_session=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "tourflow_token=; path=/; max-age=0; SameSite=Lax";
}

export function storeProfileSession(token: string, user: unknown, expiresIn: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tourflow_token", token);
  localStorage.setItem("tourflow_session", token);
  localStorage.setItem("tourflow_auth_user", JSON.stringify(user));
  document.cookie = `tourflow_session=${token}; path=/; max-age=${expiresIn}; SameSite=Lax`;
}

export function storeAuthenticatedTenant(tenant: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TERMINAL_TENANT_STORAGE_KEY, JSON.stringify(tenant));
  window.dispatchEvent(new CustomEvent(TENANT_AUTHENTICATED_EVENT, { detail: tenant }));
}

export function clearTerminalSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TERMINAL_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TERMINAL_TENANT_STORAGE_KEY);
  document.cookie = `${TERMINAL_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
