import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clinic pages anyone can open: sign-in and invite acceptance.
const CLINIC_PUBLIC = ["/clinic/login", "/clinic/accept-invite"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except the login screen itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Dentist panel — its own cookie; the superadmin session doesn't grant access.
  if (pathname.startsWith("/clinic") && !CLINIC_PUBLIC.includes(pathname)) {
    if (!request.cookies.get("clinic_session")?.value) {
      return NextResponse.redirect(new URL("/clinic/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/clinic/:path*"],
};
