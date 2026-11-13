"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { formatCurrency } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  Panel,
  TextAreaField,
  TextField,
} from "@/components/shared/ui";

export function CartView({
  cart,
  user,
}: {
  cart: any;
  user: { name?: string; phone?: string; email?: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = cart?.items ?? [];
  const defaults = useMemo(
    () => ({
      customerName: user?.name || "",
      customerPhone: user?.phone || "",
      customerEmail: user?.email || "",
      message: "",
    }),
    [user],
  );

  const updateQuantity = (productId: string, quantity: number) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/cart/${productId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update cart");
      }
    });
  };

  const removeItem = (productId: string) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/cart/${productId}`, { method: "DELETE" });
        toast.success("Removed from cart");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update cart");
      }
    });
  };

  const submitInquiry = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const payload = {
          customerName: String(formData.get("customerName") || defaults.customerName),
          customerPhone: String(formData.get("customerPhone") || defaults.customerPhone),
          customerEmail: String(formData.get("customerEmail") || defaults.customerEmail),
          message: String(formData.get("message") || ""),
          items: items.map((item: any) => ({
            productId: item.product?._id,
            title: item.product?.title || "Product",
            slug: item.product?.slug,
            thumbnail: item.product?.thumbnail,
            quantity: item.quantity,
            price: item.priceSnapshot,
          })),
        };

        await apiFetch("/api/inquiries", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        await apiFetch("/api/cart", { method: "DELETE" });
        toast.success("Inquiry submitted. The shop will contact you soon.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to submit inquiry");
      }
    });
  };

  if (!items.length) {
    return (
      <Panel className="text-center">
        <h2 className="font-display text-2xl font-semibold text-white">Your cart is empty</h2>
        <p className="mt-2 text-sm text-slate-400">
          Add phones or accessories here, then submit an order inquiry so the shop can confirm stock, price, and pickup details.
        </p>
        <ButtonLink href="/shop" className="mt-6">
          Browse shop
        </ButtonLink>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-4">
        {items.map((item: any) => (
          <Panel key={String(item.product?._id || item._id)} className="flex flex-col gap-4 md:flex-row">
            <Image
              src={item.product?.thumbnail || "https://placehold.co/600x400"}
              alt={item.product?.title || "Product"}
              width={600}
              height={400}
              sizes="(max-width: 768px) 100vw, 192px"
              className="h-40 w-full rounded-2xl object-cover md:w-48"
            />
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold text-white">{item.product?.title}</p>
                  <p className="text-sm text-slate-400">{item.product?.brand?.name}</p>
                </div>
                <Badge variant="success">{formatCurrency(item.priceSnapshot)}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">Qty</label>
                <select
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.product?._id, Number(event.target.value))}
                  className="rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5].map((qty) => (
                    <option key={qty} value={qty}>
                      {qty}
                    </option>
                  ))}
                </select>
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.product?._id)} disabled={isPending}>
                  Remove
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <h2 className="font-display text-2xl font-semibold text-white">Place inquiry / request order</h2>
        <p className="mt-2 text-sm text-slate-400">
          Since online payment is not enabled yet, the shop team will confirm price, stock, and pickup or delivery details after your request.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          If you need a specific color, invoice confirmation, or second-hand condition details, mention it here so the shop can prepare before calling you back.
        </p>

        <form action={submitInquiry} className="mt-6 space-y-4">
          <TextField label="Name" name="customerName" defaultValue={defaults.customerName} required />
          <TextField label="Phone" name="customerPhone" defaultValue={defaults.customerPhone} required />
          <TextField label="Email" type="email" name="customerEmail" defaultValue={defaults.customerEmail} />
          <TextAreaField label="Message" name="message" placeholder="Any color preference, questions, or timing requirements?" />
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Total items</span>
              <span>{items.length}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-semibold text-white">
              <span>Estimated total</span>
              <span>{formatCurrency(cart.total || 0)}</span>
            </div>
          </div>
          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? "Submitting inquiry..." : "Submit inquiry"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
