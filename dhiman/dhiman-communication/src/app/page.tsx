import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, PhoneCall, ShieldCheck, Sparkles, Store } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { Badge, ButtonLink, Container, EmptyState, Panel, SectionHeading } from "@/components/shared/ui";
import { getHomepageData } from "@/services/catalog-service";

export default async function HomePage() {
  const data = await getHomepageData();
  const hero = data.settings.heroBanners?.[0];

  return (
    <SiteShell>
      <section className="grid-pattern relative overflow-hidden border-b border-white/6">
        <Container className="grid gap-8 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-18">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/8 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Trusted local mobile shop
            </div>
            <div className="space-y-5">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Phones, accessories, and honest in-store help at <span className="text-gradient">{data.settings.shopName}</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                Browse mobiles, audio gear, chargers, accessories, second-hand deals, and upcoming launches. Add products to cart, send an inquiry, or call the shop before you visit for stock confirmation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">
                Browse products
                <ArrowRight className="ml-2 h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary" size="lg">
                Contact the shop
              </ButtonLink>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Panel className="space-y-2">
                <p className="text-sm text-slate-400">Call before you visit</p>
                <p className="font-display text-3xl font-semibold text-white">Live stock</p>
              </Panel>
              <Panel className="space-y-2">
                <p className="text-sm text-slate-400">Store support</p>
                <p className="font-display text-3xl font-semibold text-white">Pickup help</p>
              </Panel>
              <Panel className="space-y-2">
                <p className="text-sm text-slate-400">Catalog coverage</p>
                <p className="font-display text-3xl font-semibold text-white">{data.brands.length}+ brands</p>
              </Panel>
            </div>
          </div>

          <Panel className="overflow-hidden p-3">
            <Image
              src={hero?.imageUrl || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80"}
              alt={hero?.title || data.settings.shopName}
              width={1200}
              height={800}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="h-72 w-full rounded-2xl object-cover md:h-80"
            />
            <div className="grid gap-4 p-4">
              <div>
                <p className="font-display text-2xl font-semibold text-white">{hero?.title || "Visit the shop with confidence"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {hero?.subtitle || "Use the catalog to shortlist products, then confirm availability, exchange options, and pickup timing directly with the shop."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <PhoneCall className="h-4 w-4 text-cyan-300" />
                    Quick contact
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{data.settings.phone}</p>
                  <p className="text-xs text-slate-500">Best for stock checks and reservation support.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <Store className="h-4 w-4 text-cyan-300" />
                    Visit the store
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{data.settings.openingHours}</p>
                  <p className="text-xs text-slate-500">Call first if you are coming for a specific model.</p>
                </div>
              </div>
            </div>
          </Panel>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Store className="h-4 w-4 text-cyan-300" />
                Visit and pickup
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Use the catalog to shortlist products, then visit the shop for pickup, live stock confirmation, and exchange discussion.
              </p>
            </Panel>
            <Panel className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                Clear product notes
              </p>
              <p className="text-sm leading-6 text-slate-400">
                New, second-hand, discounted, and upcoming products are labeled clearly so you know what to expect before contacting the shop.
              </p>
            </Panel>
            <Panel className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                Fast follow-up
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Add to cart or send an inquiry and the shop can follow up with availability, final pricing, and next steps.
              </p>
            </Panel>
          </div>
        </Container>
      </section>

      <section className="py-4">
        <Container>
          <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Shop details</p>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-200">
                <MapPin className="mt-0.5 h-4 w-4 text-cyan-300" />
                {data.settings.address}
              </p>
              <p className="mt-2 text-sm text-slate-500">{data.settings.openingHours}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge>{data.settings.phone}</Badge>
              <Badge variant="warning">{data.settings.email}</Badge>
              <ButtonLink href={data.settings.mapLink} variant="secondary">
                Open map
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                Send inquiry
              </ButtonLink>
            </div>
          </Panel>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <SectionHeading
            eyebrow="Featured"
            title="Popular picks customers ask for most"
            description="A quick starting point if you landed here from a shared link and want to see strong options right away."
            action={<ButtonLink href="/shop?featured=true" variant="secondary">View all featured</ButtonLink>}
          />
          {data.featured.length ? <ProductGrid products={data.featured} /> : (
            <EmptyState
              title="Featured picks will appear here"
              description="The shop refreshes this section as stock and recommendations change."
              action={<ButtonLink href="/shop">Browse the full shop</ButtonLink>}
            />
          )}
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <SectionHeading
            eyebrow="Latest"
            title="Fresh arrivals in store"
            description="Recently added products and newer launches that customers often ask about first."
          />
          {data.latest.length ? <ProductGrid products={data.latest} /> : (
            <EmptyState
              title="New arrivals are on the way"
              description="Check back soon or contact the shop if you want help finding a recent launch."
              action={<ButtonLink href="/contact">Ask about current arrivals</ButtonLink>}
            />
          )}
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <SectionHeading
            eyebrow="Discounts"
            title="Current offers worth checking"
            description="Real catalog discounts that are currently live in the shop inventory, with final availability confirmed directly by the store."
          />
          {data.discounted.length ? <ProductGrid products={data.discounted} /> : (
            <EmptyState
              title="No active discounts right now"
              description="Browse the full catalog or contact the shop to ask about current offers and bundle pricing."
              action={<ButtonLink href="/shop">Browse all products</ButtonLink>}
            />
          )}
        </Container>
      </section>

      <section className="py-12">
        <Container className="grid gap-6 xl:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Upcoming"
              title="Upcoming launches to keep an eye on"
              description="Planned launches and expected arrivals. Release dates can move, so use this section as an early heads-up rather than a final promise."
            />
            {data.upcoming.length ? <ProductGrid products={data.upcoming} /> : (
              <EmptyState
                title="No upcoming launches listed"
                description="The shop will add launch previews here when confirmed products are ready to track."
                action={<ButtonLink href="/contact">Ask about upcoming models</ButtonLink>}
              />
            )}
          </div>
          <div>
            <SectionHeading
              eyebrow="Second-Hand"
              title="Pre-owned devices with clearer condition notes"
              description="Used devices are shown separately so you can compare value, condition, and exchange options more easily."
            />
            {data.secondHand.length ? <ProductGrid products={data.secondHand} /> : (
              <EmptyState
                title="No second-hand stock at the moment"
                description="You can still submit a sell or exchange request and the shop will review it."
                action={<ButtonLink href="/sell-or-exchange">Send sell/exchange request</ButtonLink>}
              />
            )}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <SectionHeading
            eyebrow="Brands"
            title="Browse by trusted brand"
            description="Jump straight to the brands customers ask for most often in the shop."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.brands.map((brand) => (
              <Link
                key={String(brand._id)}
                href={`/shop?brand=${brand.slug}`}
                className="glass rounded-3xl border border-white/10 p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/8"
              >
                <p className="font-display text-xl font-semibold text-white">{brand.name}</p>
                <p className="mt-2 text-sm text-slate-400">Browse products from {brand.name}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-12 pt-4">
        <Container>
          <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-white">Need help choosing before you visit?</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Share your budget, brand preference, or use case and the shop can guide you toward the right phone, charger, or second-hand option.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact">Contact the shop</ButtonLink>
              <ButtonLink href="/sell-or-exchange" variant="secondary">
                Sell or exchange a device
              </ButtonLink>
            </div>
          </Panel>
        </Container>
      </section>
    </SiteShell>
  );
}
