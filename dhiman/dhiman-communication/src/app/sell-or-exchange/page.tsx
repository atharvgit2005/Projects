import { SiteShell } from "@/components/layout/site-shell";
import { SellExchangeForm } from "@/components/forms/sell-exchange-form";
import { Container, SectionHeading } from "@/components/shared/ui";
import { getCurrentUser } from "@/lib/auth";
import { getProducts } from "@/services/catalog-service";

export default async function SellOrExchangePage() {
  const [user, products] = await Promise.all([
    getCurrentUser(),
    getProducts({ limit: 100, includeInactive: false }),
  ]);

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Exchange"
          title="Sell or exchange your current device"
          description="Submit your old mobile details and request a direct follow-up from the shop."
        />
        <SellExchangeForm user={user} products={products.products.map((product) => ({ _id: product._id, title: product.title }))} />
      </Container>
    </SiteShell>
  );
}
