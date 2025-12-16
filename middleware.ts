import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host");
  const { pathname } = request.nextUrl;

  console.log("Middleware hit:", hostname, pathname);

  if (
    (hostname === "ev.engineer" || hostname === "www.ev.engineer") &&
    pathname === "/"
  ) {
    return NextResponse.redirect(
      new URL("/ev-engineer", request.url),
      308
    );
  }

  return NextResponse.next();
}

// 👇 THIS IS CRITICAL
export const config = {
  matcher: ["/"],
};
