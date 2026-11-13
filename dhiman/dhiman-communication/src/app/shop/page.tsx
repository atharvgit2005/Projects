import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { ShopFilters } from "@/components/product/shop-filters";
import { ButtonLink, Container, EmptyState, SectionHeading } from "@/components/shared/ui";
import {
  getBrands,
  getCatalogFilterOptions,
  getCategories,
  getProducts,
} from "@/services/catalog-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const [catalog, categories, brands, options] = await Promise.all([
    getProducts({
      search: filters.search,
      category: filters.category,
      brand: filters.brand,
      series: filters.series,
      ram: filters.ram,
      storage: filters.storage,
      processor: filters.processor,
      condition: filters.condition as "new" | "second-hand" | undefined,
      featured: filters.featured === "true",
      upcoming: filters.upcoming === "true",
      discounted: filters.discounted === "true",
      minDiscount: filters.minDiscount ? Number(filters.minDiscount) : undefined,
      maxDiscount: filters.maxDiscount ? Number(filters.maxDiscount) : undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      sort: (filters.sort as any) || "newest",
      page: filters.page ? Number(filters.page) : 1,
      limit: 12,
    }),
    getCategories(true),
    getBrands(true),
    getCatalogFilterOptions(),
  ]);

  return (
    <SiteShell>
      <Container className="py-12">
        <SectionHeading
          eyebrow="Shop"
          title="Browse the full catalog"
          description="Search by title, brand, model, processor, series, RAM, storage, price, condition, and discount, then contact the shop for final stock confirmation before pickup."
        />
        <ShopFilters filters={filters} categories={categories} brands={brands} options={options} />
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{catalog.total} product(s) found</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/compare" variant="secondary">
              Open compare list
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              Need help choosing?
            </ButtonLink>
          </div>
        </div>
        <div className="mt-6">
          {catalog.products.length ? (
            <ProductGrid products={catalog.products} />
          ) : (
            <EmptyState
              title="No products match these filters"
              description="Try removing a few filters, widening your budget, or contacting the shop if you want help finding the nearest match in stock."
              action={<ButtonLink href="/shop">Reset filters</ButtonLink>}
            />
          )}
        </div>
      </Container>
    </SiteShell>
  );
}
