import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Decode base64url payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Exclude /admin/login from protection
    if (pathname === '/admin/login') {
      const token = request.cookies.get('token')?.value;
      if (token) {
        const payload = decodeJwt(token);
        if (payload && payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
      return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const payload = decodeJwt(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
