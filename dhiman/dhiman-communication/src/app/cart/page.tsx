import { cookies } from "next/headers";
import { CartView } from "@/components/cart/cart-view";
import { SiteShell } from "@/components/layout/site-shell";
import { Container, SectionHeading } from "@/components/shared/ui";
import { getCurrentUser } from "@/lib/auth";
import { GUEST_SESSION_COOKIE_NAME } from "@/lib/cookies";
import { getCart } from "@/services/commerce-service";

export default async function CartPage() {
  const cookieStore = await cookies();
  const [user, guestSessionId] = await Promise.all([
    getCurrentUser(),
    cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value,
  ]);
  const cart =
    user || guestSessionId
      ? await getCart({
          userId: user?.id,
          guestSessionId,
        })
      : { items: [], total: 0 };

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Cart"
          title="Request order follow-up"
          description="Add products to your cart, then submit an inquiry instead of online payment."
        />
        <CartView cart={cart} user={user} />
      </Container>
    </SiteShell>
  );
}
