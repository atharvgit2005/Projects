import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink, Container, EmptyState, Panel, SectionHeading } from "@/components/shared/ui";
import { getProducts } from "@/services/catalog-service";

export default async function UpcomingPage() {
  const catalog = await getProducts({ upcoming: true, limit: 24, sort: "newest" });

  return (
    <SiteShell>
      <Container className="space-y-6 py-10">
        <SectionHeading
          eyebrow="Upcoming"
          title="Upcoming launches"
          description="Preview mobiles and accessories marked as upcoming by the shop, then confirm final arrival timing before visiting."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Early launch preview</p>
            <p className="text-sm leading-6 text-slate-400">
              This page is for planning and discovery, especially if you are waiting for a specific model or brand release.
            </p>
          </Panel>
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Dates can move</p>
            <p className="text-sm leading-6 text-slate-400">
              Expected release dates are estimates. The shop can confirm the latest status before you make a trip.
            </p>
          </Panel>
          <Panel className="space-y-2">
            <p className="text-sm font-medium text-white">Ask for availability updates</p>
            <p className="text-sm leading-6 text-slate-400">
              If you already know what you want, send an inquiry and the shop can follow up when stock is closer.
            </p>
          </Panel>
        </div>
        {catalog.products.length ? (
          <ProductGrid products={catalog.products} />
        ) : (
          <EmptyState
            title="No upcoming products yet"
            description="There are no launch previews listed right now. You can still contact the shop if you are waiting for a specific upcoming model."
            action={<ButtonLink href="/contact">Ask about an upcoming product</ButtonLink>}
          />
        )}
      </Container>
    </SiteShell>
  );
}
