"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import {
  Button,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/ui";
import { sellExchangeSchema } from "@/schemas/inquiry";

export function SellExchangeForm({
  user,
  products,
}: {
  user?: { name?: string; phone?: string; email?: string } | null;
  products: Array<{ _id: string; title: string }>;
}) {
  const router = useRouter();
  const initialValues = {
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
    customerEmail: user?.email || "",
    deviceType: "Mobile",
    brand: "",
    model: "",
    conditionDescription: "",
    expectedPrice: undefined,
    exchangeForProduct: "",
    images: [],
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sellExchangeSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: any) => {
    try {
      const images = typeof values.images === "string"
        ? values.images
            .split("\n")
            .map((value: string) => value.trim())
            .filter(Boolean)
        : [];

      await apiFetch("/api/sell-exchange", {
        method: "POST",
        body: JSON.stringify({ ...values, images }),
      });
      toast.success("Sell / exchange request submitted");
      reset(initialValues);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit request");
    }
  };

  return (
    <Panel>
      <h2 className="font-display text-2xl font-semibold text-white">Sell or exchange your device</h2>
      <p className="mt-2 text-sm text-slate-400">
        Share your device details and the team will follow up with valuation or exchange options.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextField label="Name" error={errors.customerName?.message} {...register("customerName")} />
        <TextField label="Phone" error={errors.customerPhone?.message} {...register("customerPhone")} />
        <TextField label="Email" type="email" error={errors.customerEmail?.message} {...register("customerEmail")} />
        <TextField label="Device type" error={errors.deviceType?.message} {...register("deviceType")} />
        <TextField label="Brand" error={errors.brand?.message} {...register("brand")} />
        <TextField label="Model" error={errors.model?.message} {...register("model")} />
        <TextField
          label="Expected price"
          type="number"
          error={errors.expectedPrice?.message as string | undefined}
          {...register("expectedPrice")}
        />
        <SelectField label="Interested exchange product" error={errors.exchangeForProduct?.message} {...register("exchangeForProduct")}>
          <option value="">No exchange product selected</option>
          {products.map((product) => (
            <option key={String(product._id)} value={String(product._id)}>
              {product.title}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Condition description"
          className="md:col-span-2"
          error={errors.conditionDescription?.message}
          placeholder="Mention scratches, battery health, repairs, accessories included, and overall condition."
          {...register("conditionDescription")}
        />
        <TextAreaField
          label="Image URLs"
          className="md:col-span-2"
          placeholder={"One image URL per line"}
          {...register("images" as never)}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting request..." : "Submit request"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
