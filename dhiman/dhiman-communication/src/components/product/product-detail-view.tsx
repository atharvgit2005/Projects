import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeInfo,
  CalendarDays,
  CirclePlay,
  CircleAlert,
  MapPin,
  PackageCheck,
  PhoneCall,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { env } from "@/lib/env";
import { ProductActions } from "@/components/product/product-actions";
import { Badge, ButtonLink, Panel } from "@/components/shared/ui";
import { formatCurrency, formatDate, getYouTubeEmbedUrl } from "@/lib/utils";

export function ProductDetailView({
  product,
  similarProducts,
}: {
  product: any;
  similarProducts: any[];
}) {
  const specs = [
    ["RAM", product.specs?.ram],
    ["Storage", product.specs?.storage],
    ["Processor", product.specs?.processor],
    ["Battery", product.specs?.battery],
    ["Display", product.specs?.display],
    ["Camera", product.specs?.camera],
    ["Operating system", product.specs?.operatingSystem],
    ["Connectivity", product.specs?.connectivity],
    ["Series", product.specs?.series],
    ["Colors", product.specs?.colorOptions?.join(", ")],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <Panel className="space-y-4">
          <Image
            src={product.thumbnail}
            alt={product.title}
            width={1200}
            height={960}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-96 w-full rounded-2xl object-cover"
          />
          {product.images?.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {product.images.map((image: string) => (
                <Image
                  key={image}
                  src={image}
                  alt={product.title}
                  width={480}
                  height={320}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="h-28 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{product.brand?.name || "Brand"}</Badge>
            <Badge variant={product.condition === "second-hand" ? "danger" : "success"}>
              {product.condition}
            </Badge>
            {product.discountPercent ? <Badge variant="warning">Up to {product.discountPercent}% off</Badge> : null}
          </div>
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {product.category?.name || "Catalog item"}
            </p>
            <h1 className="font-display text-4xl font-semibold text-white">{product.title}</h1>
            <p className="text-base leading-7 text-slate-300">{product.shortDescription}</p>
          </div>
          <div className="space-y-1">
            <p className="font-display text-4xl font-semibold text-white">{formatCurrency(product.price)}</p>
            {product.originalPrice ? (
              <p className="text-sm text-slate-500 line-through">{formatCurrency(product.originalPrice)}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <PackageCheck className="h-4 w-4 text-cyan-300" />
                Stock status
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {product.stock > 0 ? `${product.stock} unit(s) available` : "Currently unavailable"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <CalendarDays className="h-4 w-4 text-cyan-300" />
                Release info
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {product.upcoming && product.upcomingReleaseDate
                  ? `Expected around ${formatDate(product.upcomingReleaseDate)}. Launch timelines can shift, so confirm with the shop before visiting.`
                  : product.latestRelease
                    ? "Latest release highlight"
                    : "Available now"}
              </p>
            </div>
          </div>
          <ProductActions productId={product._id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href="/cart" variant="secondary">
              Review cart
              <ArrowRight className="ml-2 h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              <PhoneCall className="mr-2 h-4 w-4" />
              Contact the shop
            </ButtonLink>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4 text-sm text-slate-200">
              <p className="flex items-center gap-2 font-medium text-white">
                <MapPin className="h-4 w-4 text-cyan-300" />
                Store visit and pickup support
              </p>
              <p className="mt-2 text-slate-300">
                Add the item to cart or send an inquiry, then confirm stock and pickup timing directly with the shop before you travel.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
                <p className="flex items-center gap-2 font-medium text-white">
                  <ReceiptText className="h-4 w-4 text-cyan-300" />
                  Invoice and warranty note
                </p>
                <p className="mt-2 text-slate-400">
                  Invoice, brand warranty, and accessory box contents can vary by product. The shop will confirm the exact package before purchase.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-slate-300">
                <p className="flex items-center gap-2 font-medium text-white">
                  {product.condition === "second-hand" ? (
                    <CircleAlert className="h-4 w-4 text-amber-300" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  )}
                  {product.condition === "second-hand" ? "Condition disclosure" : "Buying confidence"}
                </p>
                <p className="mt-2 text-slate-400">
                  {product.condition === "second-hand"
                    ? "Pre-owned devices may show cosmetic wear. Ask for condition details, accessories included, and any remaining warranty or bill information before pickup."
                    : "The shop can confirm stock, color availability, and pickup timing before you visit, which helps avoid wasted trips."}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <Panel>
          <h2 className="font-display text-2xl font-semibold text-white">Overview</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">{product.description}</p>
        </Panel>

        <Panel>
          <h2 className="font-display text-2xl font-semibold text-white">Key specs</h2>
          <div className="mt-4 space-y-3">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-right text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {env.youtubeEmbedAllowed && product.youtubeReviewLinks?.length ? (
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <CirclePlay className="h-5 w-5 text-rose-400" />
            <h2 className="font-display text-2xl font-semibold text-white">YouTube reviews</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {product.youtubeReviewLinks.map((url: string) => {
              const embedUrl = getYouTubeEmbedUrl(url);
              return embedUrl ? (
                <iframe
                  key={url}
                  src={embedUrl}
                  title={product.title}
                  className="aspect-video w-full rounded-2xl border border-white/10"
                  allowFullScreen
                />
              ) : (
                <Link key={url} href={url} target="_blank" className="rounded-xl border border-white/8 bg-white/4 p-4 text-sm text-cyan-300">
                  Open video review
                </Link>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {similarProducts.length ? (
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <BadgeInfo className="h-5 w-5 text-cyan-300" />
            <h2 className="font-display text-2xl font-semibold text-white">Similar picks</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((item) => (
              <Link key={String(item._id)} href={`/shop/${item.slug}`} className="rounded-xl border border-white/8 bg-white/4 p-3 transition hover:bg-white/8">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  width={480}
                  height={320}
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="h-40 w-full rounded-xl object-cover"
                />
                <p className="mt-3 font-medium text-white">{item.title}</p>
                <p className="text-sm text-slate-400">{formatCurrency(item.price)}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
