import { NextResponse, type NextRequest } from "next/server";

// Grobe Vorprüfung (nur Cookie vorhanden?). Die echte Sitzungsprüfung passiert serverseitig in getCtx().
const PUBLIC = ["/login", "/api/", "/_next/", "/manifest.webmanifest", "/sw.js", "/icon", "/apple-icon", "/favicon", "/offline"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("hypax_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|webp)$).*)"] };
