import { apiClient } from "@/lib/api-client";
import type { AgencySettings } from "@/lib/agency-settings";

export interface TenantLicenseStatus {
  tenantId: string;
  tenantName: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  subscriptionExpiresAt: string | null;
  daysRemaining: number | null;
  inGracePeriod: boolean;
  isActive: boolean;
  isDemo: boolean;
  enabledModules: string[];
  terminalSessionExpiryDays: number;
}

export interface TerminalSessionExpiryResponse {
  success: boolean;
  message: string;
  terminalSessionExpiryDays: number;
}

/**
 * Fetch agency settings for current tenant from the backend.
 */
export async function fetchAgencySettingsApi(): Promise<AgencySettings> {
  return await apiClient.get<AgencySettings>("/agency/settings");
}

/**
 * Persist updated agency settings to the backend.
 */
export async function saveAgencySettingsApi(
  settings: Partial<AgencySettings> & { name: string; email: string },
): Promise<AgencySettings> {
  return await apiClient.put<AgencySettings>("/agency/settings", settings);
}

/**
 * Update terminal session expiry duration in days (1 to 90 days).
 */
export async function updateTerminalSessionExpiryApi(
  days: number,
): Promise<TerminalSessionExpiryResponse> {
  return await apiClient.post<TerminalSessionExpiryResponse>(
    "/agency/terminal-session-expiry",
    { days },
  );
}

/**
 * Fetch real-time license and subscription grace period status.
 */
export async function fetchLicenseStatusApi(): Promise<TenantLicenseStatus> {
  return await apiClient.get<TenantLicenseStatus>("/agency/license-status");
}

export interface ChangeEmailPayload {
  currentPassword: string;
  newEmail: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AccountSecurityResponse {
  success: boolean;
  message: string;
  email?: string;
}

/**
 * Change administrative account login email.
 */
export async function changeEmailApi(
  payload: ChangeEmailPayload,
): Promise<AccountSecurityResponse> {
  return await apiClient.post<AccountSecurityResponse>(
    "/agency/change-email",
    payload,
  );
}

/**
 * Change administrative account login password.
 */
export async function changePasswordApi(
  payload: ChangePasswordPayload,
): Promise<AccountSecurityResponse> {
  return await apiClient.post<AccountSecurityResponse>(
    "/agency/change-password",
    payload,
  );
}
