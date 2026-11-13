"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button, Panel, TextAreaField, TextField } from "@/components/shared/ui";
import { inquirySchema } from "@/schemas/inquiry";

export function ContactInquiryForm({
  user,
}: {
  user?: { name?: string; phone?: string; email?: string } | null;
}) {
  const router = useRouter();
  const initialValues = {
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
    customerEmail: user?.email || "",
    message: "",
    items: [],
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inquirySchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: any) => {
    try {
      await apiFetch("/api/inquiries", {
        method: "POST",
        body: JSON.stringify({ ...values, items: [] }),
      });
      toast.success("Inquiry sent");
      reset(initialValues);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send inquiry");
    }
  };

  return (
    <Panel>
      <h2 className="font-display text-2xl font-semibold text-white">Contact the shop</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextField label="Name" error={errors.customerName?.message} {...register("customerName")} />
        <TextField label="Phone" error={errors.customerPhone?.message} {...register("customerPhone")} />
        <TextField
          label="Email"
          type="email"
          error={errors.customerEmail?.message}
          className="md:col-span-2"
          {...register("customerEmail")}
        />
        <TextAreaField
          label="Message"
          className="md:col-span-2"
          error={errors.message?.message}
          placeholder="Ask about availability, pricing, or visiting hours."
          {...register("message")}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending inquiry..." : "Submit inquiry"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
