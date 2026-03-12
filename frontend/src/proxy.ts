import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ONLY_PATHS = [
  '/dashboard/empresas',
  '/dashboard/usuarios',
  '/dashboard/grupos-corporativos',
];

function getRolFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.rol ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token');
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isDashboardPage = pathname.startsWith('/dashboard');

  if (!token && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (token && isDashboardPage) {
    const isAdminOnly = ADMIN_ONLY_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

    if (isAdminOnly) {
      const rol = getRolFromToken(token.value);
      if (rol !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
