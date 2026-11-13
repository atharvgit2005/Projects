import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { UserModel, type UserRecord } from "@/models";
import { connectToDatabase } from "@/lib/db";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { verifyAuthToken } from "@/lib/jwt";
import { HttpError } from "@/lib/http";
import { isAdminRole, isOwnerRole } from "@/lib/permissions";
import type { SafeUser } from "@/types";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function toSafeUser(user: UserRecord | Record<string, unknown>) {
  const record = user as UserRecord;

  return {
    id: record._id.toString(),
    name: record.name,
    email: record.email,
    role: record.role,
    phone: record.phone || "",
    avatarUrl: record.avatarUrl || "",
    isActive: Boolean(record.isActive),
    createdAt: record.createdAt?.toISOString?.() ?? undefined,
    updatedAt: record.updatedAt?.toISOString?.() ?? undefined,
  } satisfies SafeUser;
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifyAuthToken(token).catch(() => null);

  if (!session) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.sub).lean<UserRecord | null>();

  if (!user || !user.isActive) {
    return null;
  }

  return toSafeUser(user);
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new HttpError(401, "Authentication required");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdminRole(user.role)) {
    throw new HttpError(403, "Admin access required");
  }

  return user;
}

export async function requireOwnerUser() {
  const user = await requireUser();

  if (!isOwnerRole(user.role)) {
    throw new HttpError(403, "Owner access required");
  }

  return user;
}
