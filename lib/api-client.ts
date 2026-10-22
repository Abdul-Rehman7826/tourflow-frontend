/**
 * Central API Client for TourFlow ERP
 * Handles base URL configuration, JWT auth headers, response parsing, and error extraction.
 */

import { isPublicRoute } from "@/lib/route-access";
import { TERMINAL_TOKEN_STORAGE_KEY } from "@/lib/profile-session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const TOKEN_STORAGE_KEY = "tourflow_session";
export const REFRESH_TOKEN_STORAGE_KEY = "tourflow_refresh_token";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const rawToken =
      localStorage.getItem("tourflow_token") ||
      localStorage.getItem("tourflow_session") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!rawToken) return null;
    // Sanitize token: remove outer quotes and surrounding spaces
    return rawToken.replace(/^["']|["']$/g, "").trim();
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = token.replace(/^["']|["']$/g, "").trim();
    localStorage.setItem("tourflow_token", sanitized);
    localStorage.setItem("tourflow_session", sanitized);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken.trim());
    }
  } catch {
    // Ignore storage write errors
  }
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("tourflow_token");
    localStorage.removeItem("tourflow_auth_user");
    localStorage.removeItem("tourflow_session");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    document.cookie = "tourflow_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "tourflow_token=; path=/; max-age=0; SameSite=Lax";
  } catch {
    // Ignore storage remove errors
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

const SCREEN_BY_ENDPOINT: Array<[string, string]> = [
  ["/leads", "leads"],
  ["/bookings", "bookings"],
  ["/clients", "clients"],
  ["/tours", "tours"],
  ["/visa", "visaPipeline"],
  ["/invoices", "invoices"],
  ["/suppliers", "tours"],
];

function assertLocalWriteAccess(endpoint: string, method: string): void {
  if (typeof window === "undefined" || ["GET", "HEAD", "OPTIONS"].includes(method)) return;
  const matched = SCREEN_BY_ENDPOINT.find(([prefix]) => endpoint.startsWith(prefix));
  if (!matched) return;
  try {
    const user = JSON.parse(localStorage.getItem("tourflow_auth_user") || "null");
    if (!user || user.role === "AGENCY_ADMIN") return;
    const access = user.screenAccess || user.screen_access || {};
    if (access[matched[1]] !== "FULL") {
      throw new ApiError("This profile has read-only access to this workspace.", 403);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, body, ...restOptions } = options;
  assertLocalWriteAccess(endpoint, String(restOptions.method || "GET").toUpperCase());

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getStoredAccessToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Network request failed. Please check backend status.";
    throw new ApiError(errMsg, 0);
  }

  if (!response.ok) {
    let errorData: Record<string, unknown> | null = null;
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

    try {
      errorData = (await response.json()) as Record<string, unknown>;
      if (errorData?.detail) {
        errorMessage = typeof errorData.detail === "string" 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      } else if (typeof errorData?.message === "string") {
        errorMessage = errorData.message;
      }
    } catch {
      // Non-JSON error body
    }

    if (response.status === 401) {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        if (!isPublicRoute(window.location.pathname)) {
          const hasTerminal = Boolean(localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY));
          window.location.replace(hasTerminal ? "/profiles?reason=expired" : "/login?reason=expired");
        }
      }
      throw new ApiError("Session expired. Please log in again.", 401, errorData);
    }

    if (response.status === 403 && errorData?.code === "TENANT_LICENSE_EXPIRED") {
      clearStoredTokens();
      if (typeof window !== "undefined" && window.location.pathname !== "/upgrade") {
        const tenantId = typeof errorData.tenant_id === "string" ? errorData.tenant_id : "";
        window.location.replace(`/upgrade?tenant=${encodeURIComponent(tenantId)}`);
      }
      throw new ApiError(errorMessage, 403, errorData);
    }

    const error = new ApiError(errorMessage, response.status, errorData);
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: typeof FormData !== "undefined" && body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: typeof FormData !== "undefined" && body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: typeof FormData !== "undefined" && body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};
