import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { SectionHeading } from "@/components/shared/ui";
import { getBrands, getCategories, getProductById } from "@/services/catalog-service";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Params) {
  const { id } = await params;
  const [product, categories, brands] = await Promise.all([
    getProductById(id, true),
    getCategories(false),
    getBrands(false),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalog"
        title={`Edit ${product.title}`}
        description="Use quick inventory edits for small changes, and come here when you need to update details, specs, or media."
      />
      <ProductForm product={product} categories={categories} brands={brands} />
    </div>
  );
}
