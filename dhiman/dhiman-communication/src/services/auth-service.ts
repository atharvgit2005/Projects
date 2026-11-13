import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db";
import { comparePassword, hashPassword, toSafeUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { UserModel, type UserRecord } from "@/models";
import type { SafeUser } from "@/types";

export async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
  avatarUrl?: string;
}) {
  await connectToDatabase();

  const existingUser = await UserModel.findOne({ email: input.email }).lean();

  if (existingUser) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "customer",
    phone: input.phone,
    avatarUrl: input.avatarUrl ?? "",
    isActive: true,
  });

  return toSafeUser(user.toObject() as UserRecord);
}

export async function loginUser(input: { email: string; password: string }) {
  await connectToDatabase();

  const user = await UserModel.findOne({ email: input.email }).lean<UserRecord | null>();

  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new HttpError(403, "This account is inactive");
  }

  const isMatch = await comparePassword(input.password, user.passwordHash);

  if (!isMatch) {
    throw new HttpError(401, "Invalid email or password");
  }

  return toSafeUser(user);
}

export async function updateUserProfile(
  userId: string,
  input: { name: string; phone: string; avatarUrl?: string },
) {
  await connectToDatabase();

  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      name: input.name,
      phone: input.phone,
      avatarUrl: input.avatarUrl ?? "",
    },
    { returnDocument: "after" },
  ).lean<UserRecord | null>();

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return toSafeUser(user);
}

export async function listUsers() {
  await connectToDatabase();
  const users = await UserModel.find().sort({ createdAt: -1 }).lean<UserRecord[]>();
  return users.map(toSafeUser);
}

export async function assignUserRole(actorId: string, targetUserId: string, role: "admin" | "customer") {
  await connectToDatabase();

  const actor = await UserModel.findById(actorId).lean<UserRecord | null>();
  const target = await UserModel.findById(targetUserId).lean<UserRecord | null>();

  if (!actor || actor.role !== "owner") {
    throw new HttpError(403, "Only the owner can assign admin access");
  }

  if (!target) {
    throw new HttpError(404, "User not found");
  }

  if (target.role === "owner") {
    throw new HttpError(400, "Owner privileges cannot be modified");
  }

  const updated = await UserModel.findByIdAndUpdate(
    targetUserId,
    { role },
    { returnDocument: "after" },
  ).lean<UserRecord | null>();

  if (!updated) {
    throw new HttpError(404, "User not found");
  }

  return toSafeUser(updated);
}

export async function bootstrapOwner(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
  bootstrapCode: string;
}) {
  if (!env.ownerEmail || !env.ownerBootstrapCode) {
    throw new HttpError(
      500,
      "OWNER_EMAIL and OWNER_BOOTSTRAP_CODE must be configured before bootstrapping the owner",
    );
  }

  if (input.email !== env.ownerEmail) {
    throw new HttpError(403, "This email is not authorized for owner bootstrap");
  }

  if (input.bootstrapCode !== env.ownerBootstrapCode) {
    throw new HttpError(403, "Invalid owner bootstrap code");
  }

  await connectToDatabase();

  const existingOwner = await UserModel.findOne({ role: "owner" }).lean<UserRecord | null>();

  if (existingOwner && existingOwner.email !== input.email) {
    throw new HttpError(409, "An owner account already exists");
  }

  const existingUser = await UserModel.findOne({ email: input.email }).lean<UserRecord | null>();

  if (existingUser) {
    const updated = await UserModel.findByIdAndUpdate(
      existingUser._id,
      {
        name: input.name,
        passwordHash: await hashPassword(input.password),
        phone: input.phone,
        role: "owner",
        isActive: true,
      },
      { returnDocument: "after" },
    ).lean<UserRecord | null>();

    if (!updated) {
      throw new HttpError(500, "Unable to bootstrap owner");
    }

    return toSafeUser(updated);
  }

  const owner = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "owner",
    phone: input.phone,
    isActive: true,
  });

  return toSafeUser(owner.toObject() as UserRecord);
}

export async function getUserByEmail(email: string): Promise<SafeUser | null> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email }).lean<UserRecord | null>();
  return user ? toSafeUser(user) : null;
}
