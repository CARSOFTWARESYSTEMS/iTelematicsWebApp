// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host");
  const { pathname } = request.nextUrl;

  // Only apply to ev.engineer domain
  if (
    hostname === "ev.engineer" ||
    hostname === "www.ev.engineer"
  ) {
    // If root path, redirect to /ev-engineer
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL("/ev-engineer", request.url),
        308
      );
    }
  }

  // Default: do nothing
  return NextResponse.next();
}
