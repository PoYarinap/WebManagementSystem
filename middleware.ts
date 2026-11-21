import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "rencana_gaji_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "fallback-secret-key-change-in-env-production-minimum-32-chars!";
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internals, favicon, and login API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Check auth session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const key = getSecretKey();
      await jwtVerify(token, key, { algorithms: ["HS256"] });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // If visiting /login:
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated and visiting protected route:
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
