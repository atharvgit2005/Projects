import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { productIdPayloadSchema } from "@/schemas/cart";
import { toggleWishlistItem, getWishlist } from "@/services/commerce-service";

export async function GET() {
  try {
    const user = await requireUser();
    const wishlist = await getWishlist(user.id);
    return ok({ wishlist });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = productIdPayloadSchema.parse(await request.json());

    const wishlist = await toggleWishlistItem(user.id, body.productId);
    return ok({ wishlist });
  } catch (error) {
    return handleApiError(error);
  }
}
