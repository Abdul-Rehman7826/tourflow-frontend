/**
 * Auth API Client for TourFlow ERP
 * Handles backend login calls, token extraction, and user profile loading.
 */

import { apiClient, setStoredAccessToken, ApiError } from "./api-client";
import type { AuthUser } from "@/context/AuthContext";
import type { UserRole } from "@/context/RoleContext";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  user?: Partial<AuthUser>;
}

export interface ApiUserResponse {
  id: string | number;
  email: string;
  full_name?: string;
  name?: string;
  role?: string;
  tenant_id?: string;
  tenantId?: string;
  agency_name?: string;
  agencyName?: string;
  status?: string;
  avatar?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Normalizes backend user payload into AuthUser
 */
export function normalizeAuthUser(raw: ApiUserResponse): AuthUser {
  const roleStr = (raw.role || "").toUpperCase();
  let role: UserRole = "FRONT_DESK";
  if (roleStr === "SUPER_ADMIN" || roleStr === "PLATFORM_ADMIN") role = "SUPER_ADMIN";
  else if (roleStr === "AGENCY_ADMIN" || roleStr === "ADMIN") role = "AGENCY_ADMIN";
  else if (roleStr === "HR_MANAGER" || roleStr === "HR") role = "HR_MANAGER";
  else if (roleStr === "TOUR_MANAGER" || roleStr === "OPERATIONS") role = "TOUR_MANAGER";
  else if (roleStr === "VISA_CONSULTANT" || roleStr === "VISA") role = "VISA_CONSULTANT";

  return {
    id: String(raw.id || `usr-${Date.now()}`),
    name: raw.full_name || raw.name || raw.email.split("@")[0],
    email: raw.email,
    role,
    tenantId: role === "SUPER_ADMIN" ? null : (raw.tenant_id || raw.tenantId || "tenant-world-class"),
    agencyName: raw.agency_name || raw.agencyName || "World Class Holidays",
    avatar: raw.avatar || "👤",
    status: (raw.status === "Disabled" ? "Disabled" : "Active") as "Active" | "Disabled",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString().split("T")[0],
  };
}

/**
 * Executes login against FastAPI backend /auth/login
 */
export async function loginWithApi(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string }> {
  try {
    let tokenData: TokenResponse;

    // Try standard JSON body first
    try {
      tokenData = await apiClient.post<TokenResponse>("/auth/login", {
        email,
        password,
        username: email,
      });
    } catch (err: unknown) {
      // If 422 or 400, backend might expect OAuth2 password form data (username/password)
      if (err instanceof ApiError && (err.status === 422 || err.status === 400 || err.status === 405)) {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        tokenData = await apiClient.post<TokenResponse>("/auth/login", formData);
      } else {
        throw err;
      }
    }

    if (!tokenData?.access_token) {
      return { success: false, error: "Authentication response missing access token." };
    }

    setStoredAccessToken(tokenData.access_token, tokenData.refresh_token);

    // If user object returned directly in login response
    if (tokenData.user?.email) {
      const user = normalizeAuthUser(tokenData.user as ApiUserResponse);
      return { success: true, token: tokenData.access_token, user };
    }

    // Otherwise fetch profile from /auth/me or /users/me
    try {
      const profile = await fetchCurrentUserApi();
      return { success: true, token: tokenData.access_token, user: profile };
    } catch {
      // Return basic user info derived from email if profile endpoint is not available
      const fallbackUser: AuthUser = {
        id: `usr-api-${Date.now()}`,
        name: email.split("@")[0],
        email,
        role: "AGENCY_ADMIN",
        tenantId: "tenant-world-class",
        agencyName: "World Class Holidays",
        status: "Active",
        createdAt: new Date().toISOString().split("T")[0],
      };
      return { success: true, token: tokenData.access_token, user: fallbackUser };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Login failed. Please verify credentials.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Fetches authenticated user profile from /auth/me or /users/me
 */
export async function fetchCurrentUserApi(): Promise<AuthUser> {
  let raw: ApiUserResponse;
  try {
    raw = await apiClient.get<ApiUserResponse>("/auth/me");
  } catch (err: unknown) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      raw = await apiClient.get<ApiUserResponse>("/users/me");
    } else {
      throw err;
    }
  }

  return normalizeAuthUser(raw);
}
