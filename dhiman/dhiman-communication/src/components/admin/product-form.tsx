"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import {
  Button,
  CheckboxField,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/ui";

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item: string) => item.trim())
    .filter(Boolean);
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product?: any | null;
  categories: Array<{ _id: any; name: string }>;
  brands: Array<{ _id: any; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [state, setState] = useState({
    title: product?.title || "",
    slug: product?.slug || "",
    description: product?.description || "",
    shortDescription: product?.shortDescription || "",
    brand: product?.brand?._id || product?.brand || "",
    category: product?.category?._id || product?.category || "",
    condition: product?.condition || "new",
    price: String(product?.price || ""),
    originalPrice: String(product?.originalPrice || ""),
    discountPercent: String(product?.discountPercent || 0),
    stock: String(product?.stock || 0),
    sku: product?.sku || "",
    imagesText: (product?.images || []).join("\n"),
    thumbnail: product?.thumbnail || "",
    featured: Boolean(product?.featured),
    latestRelease: Boolean(product?.latestRelease),
    upcoming: Boolean(product?.upcoming),
    upcomingReleaseDate: product?.upcomingReleaseDate
      ? new Date(product.upcomingReleaseDate).toISOString().slice(0, 10)
      : "",
    youtubeReviewLinksText: (product?.youtubeReviewLinks || []).join("\n"),
    ram: product?.specs?.ram || "",
    storage: product?.specs?.storage || "",
    processor: product?.specs?.processor || "",
    battery: product?.specs?.battery || "",
    display: product?.specs?.display || "",
    camera: product?.specs?.camera || "",
    operatingSystem: product?.specs?.operatingSystem || "",
    connectivity: product?.specs?.connectivity || "",
    colorOptionsText: (product?.specs?.colorOptions || []).join(", "),
    series: product?.specs?.series || "",
    tagsText: (product?.tags || []).join(", "),
    isActive: product?.isActive ?? true,
  });

  const setValue = (key: string, value: string | boolean) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      title: state.title,
      slug: state.slug,
      description: state.description,
      shortDescription: state.shortDescription,
      brand: state.brand,
      category: state.category,
      condition: state.condition,
      price: Number(state.price),
      originalPrice: state.originalPrice ? Number(state.originalPrice) : null,
      discountPercent: Number(state.discountPercent),
      stock: Number(state.stock),
      sku: state.sku,
      images: parseLines(state.imagesText),
      thumbnail: state.thumbnail,
      featured: state.featured,
      latestRelease: state.latestRelease,
      upcoming: state.upcoming,
      upcomingReleaseDate: state.upcomingReleaseDate
        ? new Date(state.upcomingReleaseDate).toISOString()
        : null,
      youtubeReviewLinks: parseLines(state.youtubeReviewLinksText),
      specs: {
        ram: state.ram,
        storage: state.storage,
        processor: state.processor,
        battery: state.battery,
        display: state.display,
        camera: state.camera,
        operatingSystem: state.operatingSystem,
        connectivity: state.connectivity,
        colorOptions: state.colorOptionsText
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean),
        series: state.series,
      },
      filterMeta: {
        brand: brands.find((brand) => brand._id === state.brand)?.name || "",
        series: state.series,
        ram: state.ram,
        storage: state.storage,
        processor: state.processor,
      },
      tags: state.tagsText
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean),
      isActive: state.isActive,
    };

    startTransition(async () => {
      try {
        await apiFetch(product ? `/api/products/${product._id}` : "/api/products", {
          method: product ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
        toast.success(product ? "Product updated" : "Product created");
        router.push("/admin/products");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save product");
      }
    });
  };

  return (
    <Panel>
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold text-white">
          {product ? "Edit product" : "Create product"}
        </h2>
        <p className="text-sm text-slate-400">
          Start with the quick essentials, then fill out media and specs only where needed.
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Title"
            value={state.title}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setState((current) => ({
                ...current,
                title: nextTitle,
                slug: slugTouched ? current.slug : makeSlug(nextTitle),
              }));
            }}
          />
          <TextField
            label="Slug"
            value={state.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setValue("slug", e.target.value);
            }}
          />
          <SelectField label="Brand" value={state.brand} onChange={(e) => setValue("brand", e.target.value)}>
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={String(brand._id)} value={String(brand._id)}>
                {brand.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Category" value={state.category} onChange={(e) => setValue("category", e.target.value)}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={String(category._id)} value={String(category._id)}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Condition" value={state.condition} onChange={(e) => setValue("condition", e.target.value)}>
            <option value="new">New</option>
            <option value="second-hand">Second-hand</option>
          </SelectField>
          <TextField label="SKU" value={state.sku} onChange={(e) => setValue("sku", e.target.value)} />
        </div>

        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2 lg:grid-cols-4">
          <TextField label="Price" type="number" value={state.price} onChange={(e) => setValue("price", e.target.value)} />
          <TextField
            label="Original price"
            type="number"
            value={state.originalPrice}
            onChange={(e) => setValue("originalPrice", e.target.value)}
          />
          <TextField
            label="Discount percent"
            type="number"
            value={state.discountPercent}
            onChange={(e) => setValue("discountPercent", e.target.value)}
          />
          <TextField label="Stock" type="number" value={state.stock} onChange={(e) => setValue("stock", e.target.value)} />
        </div>

        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <TextAreaField
            label="Short description"
            className="md:col-span-2"
            value={state.shortDescription}
            onChange={(e) => setValue("shortDescription", e.target.value)}
          />
          <TextAreaField
            label="Description"
            className="md:col-span-2"
            value={state.description}
            onChange={(e) => setValue("description", e.target.value)}
          />
        </div>

        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <TextField
            label="Thumbnail URL"
            className="md:col-span-2"
            value={state.thumbnail}
            onChange={(e) => setValue("thumbnail", e.target.value)}
          />
          <TextAreaField
            label="Image URLs"
            className="md:col-span-2"
            value={state.imagesText}
            onChange={(e) => setValue("imagesText", e.target.value)}
          />
          <TextAreaField
            label="YouTube review links"
            className="md:col-span-2"
            value={state.youtubeReviewLinksText}
            onChange={(e) => setValue("youtubeReviewLinksText", e.target.value)}
          />
        </div>

        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2 lg:grid-cols-3">
          <TextField label="Series" value={state.series} onChange={(e) => setValue("series", e.target.value)} />
          <TextField label="RAM" value={state.ram} onChange={(e) => setValue("ram", e.target.value)} />
          <TextField label="Storage" value={state.storage} onChange={(e) => setValue("storage", e.target.value)} />
          <TextField label="Processor" value={state.processor} onChange={(e) => setValue("processor", e.target.value)} />
          <TextField label="Battery" value={state.battery} onChange={(e) => setValue("battery", e.target.value)} />
          <TextField label="Display" value={state.display} onChange={(e) => setValue("display", e.target.value)} />
          <TextField label="Camera" value={state.camera} onChange={(e) => setValue("camera", e.target.value)} />
          <TextField
            label="Operating system"
            value={state.operatingSystem}
            onChange={(e) => setValue("operatingSystem", e.target.value)}
          />
          <TextField
            label="Connectivity"
            value={state.connectivity}
            onChange={(e) => setValue("connectivity", e.target.value)}
          />
          <TextField
            label="Color options"
            className="lg:col-span-2"
            value={state.colorOptionsText}
            onChange={(e) => setValue("colorOptionsText", e.target.value)}
          />
          <TextField
            label="Tags"
            value={state.tagsText}
            onChange={(e) => setValue("tagsText", e.target.value)}
          />
        </div>

        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <TextField
            label="Upcoming release date"
            type="date"
            value={state.upcomingReleaseDate}
            onChange={(e) => setValue("upcomingReleaseDate", e.target.value)}
          />
          <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 md:grid-cols-2">
            <CheckboxField label="Featured" checked={state.featured} onChange={(e) => setValue("featured", e.target.checked)} />
            <CheckboxField label="Latest release" checked={state.latestRelease} onChange={(e) => setValue("latestRelease", e.target.checked)} />
            <CheckboxField label="Upcoming" checked={state.upcoming} onChange={(e) => setValue("upcoming", e.target.checked)} />
            <CheckboxField label="Active" checked={state.isActive} onChange={(e) => setValue("isActive", e.target.checked)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
          <Button type="submit" disabled={isPending}>
            {product ? "Save changes" : "Create product"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/admin/products")}>
            Back to products
          </Button>
        </div>
      </form>
    </Panel>
  );
}
