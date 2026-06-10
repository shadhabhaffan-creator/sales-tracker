import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that never require authentication
const PUBLIC_PATHS = ['/login', '/reset-password'];

// This function MUST be named `proxy` in Next.js 16+ (middleware was renamed to proxy)
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Pass everything else through — auth is enforced client-side via UserContext
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};