import { BrandManager } from "@/components/admin/brand-manager";
import { SectionHeading } from "@/components/shared/ui";
import { getBrands } from "@/services/catalog-service";

export default async function AdminBrandsPage() {
  const brands = await getBrands(false);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalog"
        title="Manage brands"
        description="Maintain brand entries used throughout the storefront filters and product catalog."
      />
      <BrandManager initialBrands={brands} />
    </div>
  );
}
