import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard/login")) {
    return NextResponse.next();
  }
  const expected = process.env.DASHBOARD_PASSWORD;
  const cookie = req.cookies.get("dashboard_auth")?.value;
  if (!expected || cookie !== expected) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.redirect(new URL("/dashboard/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/chat"],
};
