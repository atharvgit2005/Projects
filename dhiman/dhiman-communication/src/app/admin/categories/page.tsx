import { CategoryManager } from "@/components/admin/category-manager";
import { SectionHeading } from "@/components/shared/ui";
import { getCategories } from "@/services/catalog-service";

export default async function AdminCategoriesPage() {
  const categories = await getCategories(false);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalog"
        title="Manage categories"
        description="Organize mobiles, headphones, cables, earbuds, accessories, and second-hand sections."
      />
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
