import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/admin")) {
      const isEditorArea = ["/admin/beitraege", "/admin/medien"].some((p) => pathname.startsWith(p)) || pathname === "/admin";
      const allowed = role === "ADMIN" || (role === "EDITOR" && isEditorArea);
      if (!allowed) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/profil/:path*"],
};
