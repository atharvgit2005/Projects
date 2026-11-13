import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { Container } from "@/components/shared/ui";
import { getProductBySlug, getSimilarProducts } from "@/services/catalog-service";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const similarProducts = await getSimilarProducts({
    _id: String(product._id),
    category: product.category?._id ? String(product.category._id) : String(product.category || ""),
    brand: product.brand?._id ? String(product.brand._id) : String(product.brand || ""),
  });

  return (
    <SiteShell>
      <Container className="py-10">
        <ProductDetailView product={product} similarProducts={similarProducts} />
      </Container>
    </SiteShell>
  );
}
