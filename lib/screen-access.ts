import type { ScreenAccessRules } from "@/types/erp";
import type { UserRole } from "@/context/RoleContext";

export const NO_SCREEN_ACCESS: ScreenAccessRules = {
  leads: "NONE",
  bookings: "NONE",
  clients: "NONE",
  tours: "NONE",
  visaPipeline: "NONE",
  invoices: "NONE",
  hrAndPayroll: "NONE",
};

export function defaultScreenAccess(role: UserRole): ScreenAccessRules {
  if (role === "AGENCY_ADMIN") {
    return Object.fromEntries(Object.keys(NO_SCREEN_ACCESS).map((key) => [key, "FULL"])) as unknown as ScreenAccessRules;
  }
  if (role === "HR_MANAGER") return { ...NO_SCREEN_ACCESS, hrAndPayroll: "FULL" };
  if (role === "TOUR_MANAGER") return { ...NO_SCREEN_ACCESS, leads: "READ", bookings: "FULL", clients: "READ", tours: "FULL" };
  if (role === "VISA_CONSULTANT") return { ...NO_SCREEN_ACCESS, clients: "READ", visaPipeline: "FULL" };
  return { ...NO_SCREEN_ACCESS, leads: "FULL", bookings: "FULL", clients: "READ", visaPipeline: "READ" };
}

export function normalizeScreenAccess(access: Partial<ScreenAccessRules> | undefined, role: UserRole) {
  return { ...defaultScreenAccess(role), ...access };
}
