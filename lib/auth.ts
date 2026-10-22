import { decodeJwt } from 'jose';

export const AUTH_COOKIE_NAME = 'tourflow_session';
export const TERMINAL_AUTH_COOKIE_NAME = 'tourflow_terminal_session';

export interface SessionPayload {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
  exp?: number;
  tokenKind: string;
}

export function extractSessionFromToken(token: string): SessionPayload | null {
  try {
    const payload = decodeJwt(token);
    if (!payload) return null;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Support both FastAPI backend claims and legacy claims
    return {
      userId: (payload.sub as string) || (payload.userId as string) || '',
      tenantId: (payload.tenant_id as string) || (payload.tenantId as string) || '',
      role: (payload.role as string) || 'FRONT_DESK',
      email: (payload.email as string) || '',
      exp: payload.exp,
      tokenKind: (payload.token_kind as string) || 'profile',
    };
  } catch {
    return null;
  }
}
