import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { toggleWishlistItem } from "@/services/commerce-service";

type Params = {
  params: Promise<{ productId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { productId } = await params;
    const wishlist = await toggleWishlistItem(user.id, productId);
    return ok({ wishlist });
  } catch (error) {
    return handleApiError(error);
  }
}
