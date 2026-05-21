import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth(function middleware(req) {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/check-in") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/timeline") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
