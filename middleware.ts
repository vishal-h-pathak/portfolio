import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The login surfaces (page + its POST handler) must stay reachable
  // without auth, otherwise there's no way in.
  if (pathname === "/console/login" || pathname === "/api/console/login") {
    return NextResponse.next();
  }
  const expected = process.env.DASHBOARD_PASSWORD;
  // If no password is configured, allow access without auth
  if (!expected) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get("dashboard_auth")?.value;
  if (cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.redirect(new URL("/console/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Gate the whole console surface and its API. Moving meridian under
  // /console means it inherits the gate (it used to be ungated). The
  // public /api/bench/activity feed is deliberately NOT matched.
  matcher: ["/console/:path*", "/api/console/:path*"],
};
