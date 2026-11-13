import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CircleAlert, MapPin, ShieldCheck } from "lucide-react";
import { Badge, Panel } from "@/components/shared/ui";
import { ProductActions } from "@/components/product/product-actions";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({ product }: { product: any }) {
  return (
    <Panel className="group flex h-full flex-col overflow-hidden p-0">
      <div className="relative overflow-hidden">
        <Image
          src={product.thumbnail}
          alt={product.title}
          width={720}
          height={560}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.discountPercent ? <Badge variant="warning">-{product.discountPercent}%</Badge> : null}
          {product.condition === "second-hand" ? <Badge variant="danger">Second-Hand</Badge> : null}
          {product.featured ? <Badge>Featured</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {product.brand?.name || "Modern Mobile Center"}
              </p>
              <p className="truncate text-xs text-slate-500">{product.category?.name || "In-store product"}</p>
            </div>
            <Link href={`/shop/${product.slug}`} className="text-slate-300 transition hover:text-cyan-300">
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href={`/shop/${product.slug}`} className="block font-display text-xl font-semibold leading-7 text-white">
            {product.title}
          </Link>
          <p className="line-clamp-2 text-sm leading-6 text-slate-400">{product.shortDescription}</p>
        </div>
        <div className="space-y-1 text-sm text-slate-300">
          <p>{[product.specs?.ram, product.specs?.storage].filter(Boolean).join(" / ") || "Specs available on detail page"}</p>
          <p className="truncate text-slate-500">{product.specs?.processor || "Processor details available on product page"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-xs leading-5 text-slate-300">
          {product.condition === "second-hand" ? (
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 font-medium text-white">
                <CircleAlert className="h-3.5 w-3.5 text-amber-300" />
                Pre-owned device disclosure
              </p>
              <p className="text-slate-400">Condition and cosmetic wear are listed on the detail page. Ask the shop to confirm invoice or warranty status before pickup.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 font-medium text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
                Local shop support
              </p>
              <p className="text-slate-400">Reserve online, then confirm availability, invoice details, and pickup directly with the shop.</p>
            </div>
          )}
        </div>
        <div className="mt-auto space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-semibold text-white">{formatCurrency(product.price)}</p>
              {product.originalPrice ? (
                <p className="text-sm text-slate-500 line-through">{formatCurrency(product.originalPrice)}</p>
              ) : null}
            </div>
            <Badge variant={product.stock > 0 ? "success" : "danger"}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Badge>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-cyan-300" />
            Ask the shop for same-day stock confirmation before visiting.
          </p>
          <ProductActions productId={product._id} compact />
        </div>
      </div>
    </Panel>
  );
}
