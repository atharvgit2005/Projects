"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ZodSchema } from "zod";
import { apiFetch } from "@/lib/client";
import { Button, Panel, TextField } from "@/components/shared/ui";
import {
  bootstrapOwnerSchema,
  loginSchema,
  signupSchema,
} from "@/schemas/auth";

type AuthMode = "login" | "signup" | "bootstrap-owner";

const schemaMap: Record<AuthMode, ZodSchema<any>> = {
  login: loginSchema,
  signup: signupSchema,
  "bootstrap-owner": bootstrapOwnerSchema,
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = {
    login: {
      title: "Welcome back",
      description: "Log in to manage your wishlist, cart, and order requests.",
      endpoint: "/api/auth/login",
      submitLabel: "Login",
    },
    signup: {
      title: "Create your customer account",
      description: "New signups always start as customers. Owner/admin roles are never created automatically.",
      endpoint: "/api/auth/signup",
      submitLabel: "Create account",
    },
    "bootstrap-owner": {
      title: "Bootstrap the owner account",
      description: "Use the owner email and bootstrap code from your environment to create or upgrade the primary owner account.",
      endpoint: "/api/auth/bootstrap-owner",
      submitLabel: "Create owner",
    },
  }[mode];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries());
    const parsed = schemaMap[mode].safeParse(raw);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const nextErrors: Record<string, string> = {};

      Object.entries(fieldErrors).forEach(([key, value]) => {
        nextErrors[key] = value?.[0] || "Invalid value";
      });

      setErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await apiFetch(config.endpoint, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      toast.success(mode === "login" ? "Logged in successfully" : "Account saved successfully");
      router.push(mode === "bootstrap-owner" ? "/admin" : "/profile");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel className="mx-auto w-full max-w-xl">
      <div className="mb-6 space-y-2">
        <h1 className="font-display text-3xl font-semibold text-white">{config.title}</h1>
        <p className="text-sm text-slate-400">{config.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode !== "login" ? (
          <TextField label="Full name" name="name" placeholder="Your name" error={errors.name} />
        ) : null}
        <TextField label="Email" name="email" type="email" placeholder="you@example.com" error={errors.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          placeholder="Minimum 8 characters"
          error={errors.password}
        />
        {mode !== "login" ? (
          <TextField label="Phone" name="phone" placeholder="+91 98xxxxxx" error={errors.phone} />
        ) : null}
        {mode === "signup" ? (
          <TextField
            label="Avatar URL (optional)"
            name="avatarUrl"
            placeholder="https://..."
            error={errors.avatarUrl}
          />
        ) : null}
        {mode === "bootstrap-owner" ? (
          <TextField
            label="Bootstrap code"
            name="bootstrapCode"
            placeholder="OWNER_BOOTSTRAP_CODE"
            error={errors.bootstrapCode}
          />
        ) : null}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : config.submitLabel}
        </Button>
      </form>

      {mode === "login" ? (
        <p className="mt-5 text-sm text-slate-400">
          New here?{" "}
          <Link href="/signup" className="text-cyan-300 hover:text-cyan-200">
            Create an account
          </Link>
        </p>
      ) : mode === "signup" ? (
        <p className="mt-5 text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Log in
          </Link>
        </p>
      ) : null}
    </Panel>
  );
}
