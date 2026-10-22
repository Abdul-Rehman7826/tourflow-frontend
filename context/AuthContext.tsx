'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ScreenAccessRules } from '@/types/erp';
import type { UserRole } from '@/context/RoleContext';
import { isPublicRoute } from '@/lib/route-access';
import {
  clearProfileSession,
  clearTerminalSession,
  TERMINAL_COOKIE_NAME,
  TERMINAL_TOKEN_STORAGE_KEY,
  storeAuthenticatedTenant,
} from '@/lib/profile-session';

export interface UserProfile {
  id: string;
  tenant_id?: string;
  email: string;
  full_name?: string;
  role: string;
  status: string;
  name: string;
  tenantId: string | null;
  screenAccess?: ScreenAccessRules;
  agencyName?: string;
  avatar?: string;
  avatar_color?: string;
  avatar_icon?: string;
  department?: string | null;
  must_change_password?: boolean;
  createdAt?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscription_plan: string;
    subscription_expires_at?: string | null;
    is_demo?: boolean;
    enabled_modules?: Record<string, boolean>;
    terminal_session_expiry_days?: number;
    accent_color?: string;
  };
}

export interface StaffUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  tenantId?: string | null;
  agencyName?: string;
  avatar?: string;
  screenAccess?: ScreenAccessRules;
  createdAt?: string;
}

export type AuthUser = UserProfile;

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
  code?: string;
  tenantId?: string;
  requiresPasswordReset?: boolean;
  resetEmail?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password?: string) => Promise<LoginResult>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  completeForcedReset: (input: {
    email: string;
    tempOtp: string;
    newPassword: string;
    confirmPassword: string;
    quickPin: string;
  }) => Promise<LoginResult>;
  logout: (reason?: string) => void;
  lockProfile: (reason?: string) => void;
  logoutTerminal: () => void;
  staffUsers: StaffUserRecord[];
  addStaffMember: (_data: unknown) => { success: boolean; error?: string; user?: StaffUserRecord };
  toggleStaffStatus: (_userId: string) => void;
  upsertStaffAccount: (_data: unknown) => { success: boolean; error?: string; user?: StaffUserRecord };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Keep the server render and the browser's first render identical. Browser
  // storage is restored after hydration, then verified with the API.
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lockProfile = useCallback((reason?: string) => {
    clearProfileSession();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    window.location.replace(`/profiles${suffix}`);
  }, []);

  const logoutTerminal = useCallback(() => {
    clearProfileSession();
    clearTerminalSession();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    window.location.replace('/login');
  }, []);

  // 2. Logout Method
  const logout = useCallback((reason?: string) => {
    localStorage.removeItem('tourflow_token');
    localStorage.removeItem('tourflow_auth_user');
    localStorage.removeItem('tourflow_session');
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    document.cookie = 'tourflow_session=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'tourflow_token=; path=/; max-age=0; SameSite=Lax';
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      if (reason) {
        if (!isPublicRoute(window.location.pathname)) {
          window.location.replace(`/login?reason=${encodeURIComponent(reason)}`);
        }
      } else if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
    }
  }, []);

  // 3. Background Validation (Never traps UI in an infinite loading state)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    const validateSession = async () => {
      const storedToken = localStorage.getItem('tourflow_token');
      if (!storedToken) {
        if (active) setIsLoading(false);
        return;
      }

      if (!active) return;
      setToken(storedToken);
      const cached = localStorage.getItem('tourflow_auth_user');
      if (cached) {
        try {
          const cachedUser = JSON.parse(cached) as UserProfile;
          if (active) {
            setUser(cachedUser);
            setIsAuthenticated(true);
          }
        } catch {
          localStorage.removeItem('tourflow_auth_user');
        }
      }
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
          signal: controller.signal,
        });

        if (res.ok) {
          const freshSession = await res.json();
          const freshUser = freshSession.user;
          const mappedUser = {
            ...freshUser,
            name: freshUser.name || freshUser.full_name,
            tenantId: freshUser.tenantId || freshUser.tenant_id,
            screenAccess: freshUser.screenAccess || freshUser.screen_access,
            tenant: freshSession.tenant,
          };
          if (!active) return;
          setUser(mappedUser);
          localStorage.setItem('tourflow_auth_user', JSON.stringify(mappedUser));
          storeAuthenticatedTenant(freshSession.tenant);
          setIsAuthenticated(true);
        } else if (res.status === 401) {
          // Token expired or revoked
          logout('expired');
        } else if (res.status === 403) {
          const denied = await res.json().catch(() => ({}));
          if (denied.code === 'TENANT_LICENSE_EXPIRED') {
            localStorage.removeItem('tourflow_token');
            localStorage.removeItem('tourflow_auth_user');
            window.location.replace(`/upgrade?tenant=${encodeURIComponent(denied.tenant_id || '')}`);
          } else {
            logout();
          }
        }
      } catch (error) {
        // Network or offline error: Gracefully retain existing cached user without locking UI
        console.warn('Backend validation unreachable; maintaining cached session:', error);
      } finally {
        // MANDATORY: Always clear the loading barrier
        window.clearTimeout(timeout);
        if (active) setIsLoading(false);
      }
    };

    validateSession();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [logout]);

  // 4. Login Method
  const login = useCallback(async (email: string, password?: string): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password || '' }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Authentication failed. Please verify your credentials.',
          code: data.code,
          tenantId: data.tenant_id,
        };
      }

      const mappedUser = {
        ...data.user,
        name: data.user.name || data.user.full_name,
        tenantId: data.user.tenantId || data.user.tenant_id,
        screenAccess: data.user.screenAccess || data.user.screen_access,
        tenant: data.tenant,
      };

      if (data.requires_password_reset) {
        clearProfileSession();
        clearTerminalSession();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return {
          success: true,
          user: mappedUser,
          requiresPasswordReset: true,
          resetEmail: data.user.email,
        };
      }

      // Password login establishes the shared terminal. Only a profile PIN
      // unlock creates the workspace session for agency users.
      localStorage.setItem(TERMINAL_TOKEN_STORAGE_KEY, data.terminal_token);
      storeAuthenticatedTenant(data.tenant);
      document.cookie = `${TERMINAL_COOKIE_NAME}=${data.terminal_token}; path=/; max-age=${data.terminal_expires_in}; SameSite=Lax`;

      if (mappedUser.role === 'SUPER_ADMIN') {
        localStorage.setItem('tourflow_token', data.access_token);
        localStorage.setItem('tourflow_auth_user', JSON.stringify(mappedUser));
        document.cookie = `tourflow_session=${data.access_token}; path=/; max-age=${data.expires_in}; SameSite=Lax`;
        setToken(data.access_token);
        setUser(mappedUser);
        setIsAuthenticated(true);
      } else {
        clearProfileSession();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }

      return {
        success: true,
        user: mappedUser,
      };
    } catch (_err) {
      return {
        success: false,
        error: 'Unable to reach backend API. Ensure FastAPI is running on port 8000.',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to dispatch verification code. Please check the email address.',
        };
      }

      return {
        success: true,
        message: data.message || 'If an active account exists, a 6-digit verification code has been dispatched.',
      };
    } catch (_error) {
      return {
        success: false,
        error: 'Unable to reach the authentication service. Please verify network connectivity.',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeForcedReset = useCallback(async (input: {
    email: string;
    tempOtp: string;
    newPassword: string;
    confirmPassword: string;
    quickPin: string;
  }): Promise<LoginResult> => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${apiUrl}/auth/force-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.email.trim(),
          temp_otp: input.tempOtp,
          new_password: input.newPassword,
          confirm_password: input.confirmPassword,
          quick_pin: input.quickPin,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.detail || 'The temporary OTP could not be verified.' };
      }
      const mappedUser = {
        ...data.user,
        name: data.user.name || data.user.full_name,
        tenantId: data.user.tenantId || data.user.tenant_id,
        screenAccess: data.user.screenAccess || data.user.screen_access,
        tenant: data.tenant,
      };
      localStorage.setItem(TERMINAL_TOKEN_STORAGE_KEY, data.terminal_token);
      storeAuthenticatedTenant(data.tenant);
      document.cookie = `${TERMINAL_COOKIE_NAME}=${data.terminal_token}; path=/; max-age=${data.terminal_expires_in}; SameSite=Lax`;
      clearProfileSession();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      return { success: true, user: mappedUser };
    } catch (_error) {
      return { success: false, error: 'Unable to reach backend API. Ensure FastAPI is running on port 8000.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Legacy compatibility
  const isHydrated = !isLoading;
  const staffUsers = useMemo<StaffUserRecord[]>(() => [], []);
  const addStaffMember = useCallback((_data: unknown) => ({ success: false, error: 'Not implemented in live mode', user: undefined }), []);
  const toggleStaffStatus = useCallback((_userId: string) => {}, []);
  const upsertStaffAccount = useCallback((_data: unknown) => ({ success: false, error: 'Not implemented in live mode', user: undefined }), []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      isHydrated,
      login,
      requestPasswordReset,
      completeForcedReset,
      logout,
      lockProfile,
      logoutTerminal,
      staffUsers,
      addStaffMember,
      toggleStaffStatus,
      upsertStaffAccount
    }),
    [
      user,
      token,
      isAuthenticated,
      isLoading,
      isHydrated,
      login,
      requestPasswordReset,
      completeForcedReset,
      logout,
      lockProfile,
      logoutTerminal,
      staffUsers,
      addStaffMember,
      toggleStaffStatus,
      upsertStaffAccount,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

