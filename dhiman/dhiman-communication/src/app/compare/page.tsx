import { cookies } from "next/headers";
import { SiteShell } from "@/components/layout/site-shell";
import { CompareTable } from "@/components/compare/compare-table";
import { ButtonLink, Container, EmptyState, SectionHeading } from "@/components/shared/ui";
import { getCurrentUser } from "@/lib/auth";
import { GUEST_SESSION_COOKIE_NAME } from "@/lib/cookies";
import { getCompareList } from "@/services/commerce-service";

export default async function ComparePage() {
  const cookieStore = await cookies();
  const [user, guestSessionId] = await Promise.all([
    getCurrentUser(),
    cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value,
  ]);

  const compareList =
    user || guestSessionId
      ? await getCompareList({
          userId: user?.id,
          guestSessionId,
        })
      : { productIds: [] };

  const products = compareList.productIds || [];

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Compare"
          title="Side-by-side comparison"
          description="Compare key specs, condition, and price before sending an inquiry."
        />
        {products.length ? (
          <CompareTable products={products} />
        ) : (
          <EmptyState
            title="Your compare list is empty"
            description="Add a few products from the catalog to compare specs and pricing side by side, then contact the shop when you are ready to shortlist one."
            action={<ButtonLink href="/shop">Start browsing</ButtonLink>}
          />
        )}
      </Container>
    </SiteShell>
  );
}
