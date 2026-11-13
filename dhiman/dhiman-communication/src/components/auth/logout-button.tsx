"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button } from "@/components/shared/ui";

export function LogoutButton({ variant = "secondary" }: { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await apiFetch("/api/auth/logout", { method: "POST" });
            toast.success("Logged out");
            router.push("/");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to logout");
          }
        })
      }
    >
      Logout
    </Button>
  );
}
