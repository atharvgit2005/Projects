"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Badge, Button, Panel } from "@/components/shared/ui";
import { formatCurrency } from "@/lib/utils";

const rows = [
  { label: "Brand", value: (product: any) => product.brand?.name || "-" },
  { label: "Condition", value: (product: any) => product.condition },
  { label: "Price", value: (product: any) => formatCurrency(product.price) },
  { label: "Discount", value: (product: any) => `${product.discountPercent || 0}%` },
  { label: "RAM", value: (product: any) => product.specs?.ram || "-" },
  { label: "Storage", value: (product: any) => product.specs?.storage || "-" },
  { label: "Processor", value: (product: any) => product.specs?.processor || "-" },
  { label: "Battery", value: (product: any) => product.specs?.battery || "-" },
  { label: "Display", value: (product: any) => product.specs?.display || "-" },
  { label: "Camera", value: (product: any) => product.specs?.camera || "-" },
];

export function CompareTable({ products }: { products: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const removeItem = (id: string) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/compare/${id}`, { method: "DELETE" });
        toast.success("Removed from compare");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  };

  return (
    <Panel className="overflow-hidden p-0">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/8 bg-white/4">
              <th className="px-4 py-4 text-sm font-medium text-slate-300">Spec</th>
              {products.map((product) => (
                <th key={String(product._id)} className="min-w-64 px-4 py-4 align-top">
                  <div className="space-y-3">
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      width={640}
                      height={400}
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <div className="space-y-1">
                      <p className="font-display text-lg font-semibold text-white">{product.title}</p>
                      <Badge variant={product.condition === "second-hand" ? "danger" : "success"}>
                        {product.condition}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeItem(product._id)} disabled={isPending}>
                      {isPending ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-white/6">
                <td className="px-4 py-4 text-sm font-medium text-slate-300">{row.label}</td>
                {products.map((product) => (
                  <td key={`${String(product._id)}-${row.label}`} className="px-4 py-4 text-sm text-slate-100">
                    {row.value(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
