import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "mmc_token";
export const GUEST_SESSION_COOKIE_NAME = "mmc_guest_session";

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SEVEN_DAYS,
};

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: THIRTY_DAYS,
};

export function createGuestSessionId() {
  return crypto.randomUUID();
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
}

export function setGuestSessionCookie(response: NextResponse, guestSessionId: string) {
  response.cookies.set(GUEST_SESSION_COOKIE_NAME, guestSessionId, guestCookieOptions);
}
