import { ProductTable } from "@/components/admin/product-table";
import { ButtonLink, SectionHeading } from "@/components/shared/ui";
import { getProducts } from "@/services/catalog-service";

export default async function AdminProductsPage() {
  const catalog = await getProducts({ includeInactive: true, limit: 200, sort: "newest" });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalog"
        title="Manage products"
        description="Search quickly, update stock and pricing inline, and jump into full edits only when you need deeper changes."
        action={<ButtonLink href="/admin/products/new">Add product</ButtonLink>}
      />
      <ProductTable initialProducts={catalog.products} />
    </div>
  );
}
