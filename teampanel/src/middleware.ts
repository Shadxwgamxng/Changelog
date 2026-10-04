import { NextResponse, type NextRequest } from "next/server";

/**
 * Grobe Vorprüfung: Ohne Session-Cookie geht es nur auf öffentliche Seiten.
 * Die eigentliche Authentifizierung und Rechteprüfung erfolgt serverseitig
 * (Layout, Seiten, Server Actions, API-Routen) gegen die Datenbank.
 */
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/register", "/api/health", "/_next", "/logo", "/icon", "/apple-icon", "/favicon", "/manifest.webmanifest", "/sw.js", "/offline.html", "/icons"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "."))) {
    return NextResponse.next();
  }
  if (!request.cookies.get("shak_session")?.value) {
    // Server Actions / API: 401 statt Redirect
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|webp|ico|svg|jpg)$).*)"] };
