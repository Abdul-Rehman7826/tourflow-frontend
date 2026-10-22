import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, TERMINAL_AUTH_COOKIE_NAME, extractSessionFromToken } from '@/lib/auth';
import { canAccessSuperAdmin, homeRouteForRole } from '@/lib/saas-governance';
import { isPublicRoute } from '@/lib/route-access';

export default function proxy(request: NextRequest) {
  return handleProxy(request);
}

export { handleProxy as proxy };

export function handleProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, next internals, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? extractSessionFromToken(token) : null;
  const terminalToken = request.cookies.get(TERMINAL_AUTH_COOKIE_NAME)?.value;
  const terminalSession = terminalToken ? extractSessionFromToken(terminalToken) : null;
  const hasProfileSession = session?.tokenKind === 'profile';
  const hasTerminalSession = terminalSession?.tokenKind === 'terminal';
  const isPublicPath = isPublicRoute(pathname);

  if (pathname === '/profiles') {
    return hasTerminalSession
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/super-admin')) {
    if (!hasProfileSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (!canAccessSuperAdmin(session.role)) {
      return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
    }
  }

  if (!hasProfileSession) {
    if (!isPublicPath) {
      const url = new URL(hasTerminalSession ? '/profiles' : '/login', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // User is authenticated
  if (pathname === '/login' || pathname === '/admin/login') {
    // Redirect authenticated users away from login based on role
    return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
