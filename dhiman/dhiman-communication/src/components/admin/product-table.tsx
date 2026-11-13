"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Badge, Button, ButtonLink, Panel, TextField } from "@/components/shared/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

type ProductRecord = any;
type QuickDraft = Record<string, { price: string; discountPercent: string; stock: string }>;

const inventoryViews = [
  { key: "all", label: "All products" },
  { key: "low-stock", label: "Low stock" },
  { key: "second-hand", label: "Second-hand" },
  { key: "upcoming", label: "Upcoming" },
  { key: "inactive", label: "Inactive" },
] as const;

function productId(product: ProductRecord) {
  return String(product._id);
}

function basePayload(product: ProductRecord) {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand?._id || product.brand,
    category: product.category?._id || product.category,
    condition: product.condition,
    price: Number(product.price),
    originalPrice: product.originalPrice == null ? null : Number(product.originalPrice),
    discountPercent: Number(product.discountPercent || 0),
    stock: Number(product.stock || 0),
    sku: product.sku,
    images: product.images || [],
    thumbnail: product.thumbnail,
    featured: Boolean(product.featured),
    latestRelease: Boolean(product.latestRelease),
    upcoming: Boolean(product.upcoming),
    upcomingReleaseDate: product.upcomingReleaseDate
      ? new Date(product.upcomingReleaseDate).toISOString()
      : null,
    youtubeReviewLinks: product.youtubeReviewLinks || [],
    specs: {
      ram: product.specs?.ram || "",
      storage: product.specs?.storage || "",
      processor: product.specs?.processor || "",
      battery: product.specs?.battery || "",
      display: product.specs?.display || "",
      camera: product.specs?.camera || "",
      operatingSystem: product.specs?.operatingSystem || "",
      connectivity: product.specs?.connectivity || "",
      colorOptions: product.specs?.colorOptions || [],
      series: product.specs?.series || "",
    },
    filterMeta: {
      brand: product.filterMeta?.brand || product.brand?.name || "",
      series: product.filterMeta?.series || product.specs?.series || "",
      ram: product.filterMeta?.ram || product.specs?.ram || "",
      storage: product.filterMeta?.storage || product.specs?.storage || "",
      processor: product.filterMeta?.processor || product.specs?.processor || "",
    },
    tags: product.tags || [],
    isActive: Boolean(product.isActive),
  };
}

export function ProductTable({ initialProducts }: { initialProducts: ProductRecord[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultView = searchParams.get("view") || "all";
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [view, setView] = useState(defaultView);
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<QuickDraft>(() =>
    Object.fromEntries(
      initialProducts.map((product) => [
        productId(product),
        {
          price: String(product.price ?? ""),
          discountPercent: String(product.discountPercent ?? 0),
          stock: String(product.stock ?? 0),
        },
      ]),
    ),
  );

  const visibleProducts = products.filter((product) => {
    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery =
      !normalizedQuery ||
      product.title?.toLowerCase().includes(normalizedQuery) ||
      product.sku?.toLowerCase().includes(normalizedQuery) ||
      product.brand?.name?.toLowerCase().includes(normalizedQuery) ||
      product.category?.name?.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) {
      return false;
    }

    switch (view) {
      case "low-stock":
        return Number(product.stock) <= 5;
      case "second-hand":
        return product.condition === "second-hand";
      case "upcoming":
        return Boolean(product.upcoming);
      case "inactive":
        return !product.isActive;
      default:
        return true;
    }
  });

  const viewCounts = {
    all: products.length,
    "low-stock": products.filter((product) => Number(product.stock) <= 5).length,
    "second-hand": products.filter((product) => product.condition === "second-hand").length,
    upcoming: products.filter((product) => Boolean(product.upcoming)).length,
    inactive: products.filter((product) => !product.isActive).length,
  };

  const setDraftValue = (id: string, key: "price" | "discountPercent" | "stock", value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || { price: "", discountPercent: "", stock: "" }),
        [key]: value,
      },
    }));
  };

  const syncProduct = (nextProduct: ProductRecord) => {
    setProducts((current) =>
      current.map((product) => (productId(product) === productId(nextProduct) ? nextProduct : product)),
    );
    setDrafts((current) => ({
      ...current,
      [productId(nextProduct)]: {
        price: String(nextProduct.price ?? ""),
        discountPercent: String(nextProduct.discountPercent ?? 0),
        stock: String(nextProduct.stock ?? 0),
      },
    }));
  };

  const saveQuickChanges = (product: ProductRecord) => {
    const id = productId(product);
    const draft = drafts[id];

    startTransition(async () => {
      try {
        const payload = {
          ...basePayload(product),
          price: Number(draft?.price ?? product.price),
          discountPercent: Number(draft?.discountPercent ?? product.discountPercent),
          stock: Number(draft?.stock ?? product.stock),
        };

        const response = await apiFetch<{ product: ProductRecord }>(`/api/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        syncProduct(response.product);
        toast.success("Product updated");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update product");
      }
    });
  };

  const toggleFlag = (product: ProductRecord, key: "featured" | "latestRelease" | "upcoming" | "isActive") => {
    startTransition(async () => {
      try {
        const payload = {
          ...basePayload(product),
          [key]: !product[key],
        };

        const response = await apiFetch<{ product: ProductRecord }>(`/api/products/${productId(product)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        syncProduct(response.product);
        toast.success("Product updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update product");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/products/${id}`, { method: "DELETE" });
        setProducts((current) => current.filter((product) => productId(product) !== id));
        toast.success("Product deleted");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete product");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Panel className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-white">Product operations</h2>
            <p className="text-sm text-slate-400">
              Search by product, brand, or SKU. Update stock, price, discount, and flags without opening every edit page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/products/new">Add product</ButtonLink>
            <ButtonLink href="/admin/products?view=second-hand" variant="secondary">Second-hand</ButtonLink>
            <ButtonLink href="/admin/products?view=upcoming" variant="secondary">Upcoming</ButtonLink>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            label="Search products"
            placeholder="Title, brand, SKU..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-end gap-2">
            {inventoryViews.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setView(option.key)}
                className={
                  view === option.key
                    ? "rounded-xl border border-cyan-300 bg-cyan-300 px-3 py-2 text-sm font-medium text-slate-950"
                    : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                }
              >
                {option.label} ({viewCounts[option.key]})
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/4 text-slate-400">
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Quick update</th>
                <th className="px-5 py-4">Flags</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => {
                const id = productId(product);
                const draft = drafts[id] || {
                  price: String(product.price ?? ""),
                  discountPercent: String(product.discountPercent ?? 0),
                  stock: String(product.stock ?? 0),
                };
                const changed =
                  draft.price !== String(product.price ?? "") ||
                  draft.discountPercent !== String(product.discountPercent ?? 0) ||
                  draft.stock !== String(product.stock ?? 0);

                return (
                  <tr key={id} className="border-b border-white/6 align-top text-slate-200">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <img src={product.thumbnail} alt={product.title} className="h-14 w-14 rounded-xl object-cover" />
                        <div className="space-y-1">
                          <p className="font-medium text-white">{product.title}</p>
                          <p className="text-xs text-slate-500">
                            {product.brand?.name} • {product.category?.name} • {product.sku}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={product.condition === "second-hand" ? "warning" : "default"}>
                              {product.condition}
                            </Badge>
                            <Badge variant={Number(product.stock) <= 5 ? "warning" : "success"}>
                              {Number(product.stock) <= 5 ? `${product.stock} left` : `${product.stock} in stock`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-1">
                          <span className="text-xs text-slate-500">Price</span>
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(event) => setDraftValue(id, "price", event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-slate-500">Discount %</span>
                          <input
                            type="number"
                            value={draft.discountPercent}
                            onChange={(event) => setDraftValue(id, "discountPercent", event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-slate-500">Stock</span>
                          <input
                            type="number"
                            value={draft.stock}
                            onChange={(event) => setDraftValue(id, "stock", event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs text-slate-500">{formatCurrency(product.price)}</span>
                        {changed ? (
                          <Badge variant="warning">Unsaved</Badge>
                        ) : (
                          <Badge variant="default">Saved</Badge>
                        )}
                        <Button size="sm" onClick={() => saveQuickChanges(product)} disabled={isPending || !changed}>
                          Save quick changes
                        </Button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFlag(product, "featured")}
                          className={product.featured ? "rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-200" : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"}
                        >
                          Featured
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFlag(product, "latestRelease")}
                          className={product.latestRelease ? "rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300" : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"}
                        >
                          Latest
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFlag(product, "upcoming")}
                          className={product.upcoming ? "rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"}
                        >
                          Upcoming
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFlag(product, "isActive")}
                          className={product.isActive ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300" : "rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{formatDate(product.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ButtonLink size="sm" variant="secondary" href={`/admin/products/${id}/edit`}>
                          Full edit
                        </ButtonLink>
                        <Button size="sm" variant="danger" onClick={() => remove(id)} disabled={isPending}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visibleProducts.length ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No products match this admin view.
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
