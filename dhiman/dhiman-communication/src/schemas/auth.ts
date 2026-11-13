import { z } from "zod";

const emailSchema = z.email().trim().toLowerCase();
const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(8, "Phone is required"),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(8, "Phone is required"),
  avatarUrl: z.string().trim().url().optional().or(z.literal("")),
});

export const bootstrapOwnerSchema = z.object({
  name: z.string().trim().min(2),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(8),
  bootstrapCode: z.string().trim().min(4),
});
