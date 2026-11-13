import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/shared/ui";

export function ProductGrid({ products }: { products: Array<Record<string, any>> }) {
  if (!products.length) {
    return (
      <EmptyState
        title="Nothing to show right now"
        description="This section will fill back in as the shop updates stock, launches, and highlighted picks."
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={String(product._id)} product={product} />
      ))}
    </div>
  );
}
