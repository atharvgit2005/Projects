import { SignJWT, jwtVerify } from "jose";
import { APP_ROLES } from "@/lib/constants";
import { assertEnv, env } from "@/lib/env";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: (typeof APP_ROLES)[number];
};

function getJwtSecret() {
  return new TextEncoder().encode(assertEnv(env.jwtSecret, "JWT_SECRET"));
}

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const role = payload.role;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  if (!APP_ROLES.includes(role as (typeof APP_ROLES)[number])) {
    throw new Error("Invalid user role");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: role as (typeof APP_ROLES)[number],
  };
}
