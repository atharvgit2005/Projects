import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { verifyAuthToken } from "@/lib/jwt";
import { isAdminRole } from "@/lib/permissions";

const AUTH_ROUTES = ["/login", "/signup"];
const MEMBER_ROUTES = ["/profile", "/wishlist"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyAuthToken(token).catch(() => null) : null;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith("/admin");
  const isMemberRoute = MEMBER_ROUTES.some((route) => pathname.startsWith(route));

  if ((isAdminRoute || isMemberRoute) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session && !isAdminRole(session.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAuthRoute && session) {
    const redirectTarget = isAdminRole(session.role) ? "/admin" : "/profile";
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/wishlist/:path*", "/login", "/signup"],
};
