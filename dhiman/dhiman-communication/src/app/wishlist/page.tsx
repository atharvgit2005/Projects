import { SiteShell } from "@/components/layout/site-shell";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink, Container, EmptyState, SectionHeading } from "@/components/shared/ui";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWishlist } from "@/services/commerce-service";

export default async function WishlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/wishlist");
  }

  const wishlist = await getWishlist(user.id);
  const products = wishlist.productIds || [];

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Wishlist"
          title="Saved products"
          description="Keep track of devices you want to revisit later."
        />
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            title="Nothing saved yet"
            description="Use the wishlist button on products to save options you want to revisit before visiting the shop or sending an inquiry."
            action={<ButtonLink href="/shop">Browse products</ButtonLink>}
          />
        )}
      </Container>
    </SiteShell>
  );
}
