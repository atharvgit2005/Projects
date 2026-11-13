import { ProductForm } from "@/components/admin/product-form";
import { SectionHeading } from "@/components/shared/ui";
import { getBrands, getCategories } from "@/services/catalog-service";

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategories(false), getBrands(false)]);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalog"
        title="Add new product"
        description="Fill out the essentials first, then add specs, media, and launch flags when needed."
      />
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
