"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button, Panel, TextField } from "@/components/shared/ui";
import { profileUpdateSchema } from "@/schemas/auth";

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    phone?: string;
    avatarUrl?: string;
  };
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
    },
  });

  const onSubmit = async (values: unknown) => {
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile");
    }
  };

  return (
    <Panel>
      <h2 className="font-display text-2xl font-semibold text-white">Profile details</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextField label="Full name" error={errors.name?.message} {...register("name")} />
        <TextField label="Phone" error={errors.phone?.message} {...register("phone")} />
        <TextField
          label="Avatar URL"
          error={errors.avatarUrl?.message}
          className="md:col-span-2"
          {...register("avatarUrl")}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
