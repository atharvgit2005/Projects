import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { Container, EmptyState, SectionHeading } from "@/components/shared/ui";
import { getCategoryBySlug, getProducts } from "@/services/catalog-service";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const catalog = await getProducts({ category: slug, limit: 24, sort: "newest" });

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Category"
          title={category.name}
          description={`Browse all active products under the ${category.name} category.`}
        />
        {catalog.products.length ? (
          <ProductGrid products={catalog.products} />
        ) : (
          <EmptyState
            title="No products here yet"
            description="This category is active, but it does not have visible products right now."
          />
        )}
      </Container>
    </SiteShell>
  );
}
