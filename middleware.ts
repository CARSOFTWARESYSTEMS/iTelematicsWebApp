import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;

  if ((host === "ev.engineer" || host === "www.ev.engineer") && url.pathname === "/") {
    url.pathname = "/ev-engineer";
    return NextResponse.rewrite(url); // keeps URL clean
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
