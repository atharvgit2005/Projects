import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { cartItemQuantitySchema } from "@/schemas/cart";
import { updateCartItem, removeFromCart } from "@/services/commerce-service";

type Params = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;
    const body = cartItemQuantitySchema.parse(await request.json());
    const { productId } = await params;

    const cart = await updateCartItem(
      {
        userId: user?.id,
        guestSessionId,
      },
      productId,
      body.quantity,
    );

    return ok({ cart });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;
    const { productId } = await params;

    if (!user && !guestSessionId) {
      return ok({ cart: { items: [], total: 0 } });
    }

    const cart = await removeFromCart(
      {
        userId: user?.id,
        guestSessionId,
      },
      productId,
    );

    return ok({ cart });
  } catch (error) {
    return handleApiError(error);
  }
}
