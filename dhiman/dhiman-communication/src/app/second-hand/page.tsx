import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink, Container, EmptyState, Panel, SectionHeading } from "@/components/shared/ui";
import { getProducts } from "@/services/catalog-service";

export default async function SecondHandPage() {
  const catalog = await getProducts({ condition: "second-hand", limit: 24, sort: "newest" });

  return (
    <SiteShell>
      <Container className="space-y-6 py-10">
        <SectionHeading
          eyebrow="Second-Hand"
          title="Pre-owned devices"
          description="Every item is labeled clearly so customers can compare condition and value before sending an inquiry."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Condition comes first</p>
            <p className="text-sm leading-6 text-slate-400">
              Pre-owned products are separated from new stock so pricing and condition expectations stay clear.
            </p>
          </Panel>
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Ask before pickup</p>
            <p className="text-sm leading-6 text-slate-400">
              Call or send an inquiry if you want confirmation on cosmetic condition, accessories included, or invoice details.
            </p>
          </Panel>
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Exchange friendly</p>
            <p className="text-sm leading-6 text-slate-400">
              Want to upgrade? You can also submit your current device for sell or exchange review.
            </p>
          </Panel>
        </div>
        {catalog.products.length ? (
          <ProductGrid products={catalog.products} />
        ) : (
          <EmptyState
            title="No second-hand devices yet"
            description="There are no pre-owned devices listed right now, but you can still ask the shop about trade-ins or upcoming used-stock arrivals."
            action={<ButtonLink href="/sell-or-exchange">Send sell/exchange request</ButtonLink>}
          />
        )}
      </Container>
    </SiteShell>
  );
}
