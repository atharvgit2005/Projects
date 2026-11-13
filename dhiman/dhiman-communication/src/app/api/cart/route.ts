import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createGuestSessionId, setGuestSessionCookie } from "@/lib/cookies";
import { handleApiError, ok } from "@/lib/http";
import { cartItemMutationSchema } from "@/schemas/cart";
import { addToCart, clearCart, getCart } from "@/services/commerce-service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;

    if (!user && !guestSessionId) {
      return ok({ cart: { items: [], total: 0 } });
    }

    const cart = await getCart({
      userId: user?.id,
      guestSessionId,
    });

    return ok({ cart });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = cartItemMutationSchema.parse(await request.json());
    const existingGuestSessionId = request.cookies.get("mmc_guest_session")?.value;
    const guestSessionId = user ? undefined : existingGuestSessionId ?? createGuestSessionId();
    const cart = await addToCart(
      {
        userId: user?.id,
        guestSessionId,
      },
      body.productId,
      body.quantity,
    );

    const response = ok({ cart });

    if (!user && !existingGuestSessionId && guestSessionId) {
      setGuestSessionCookie(response, guestSessionId);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;

    if (!user && !guestSessionId) {
      return ok({ cart: { items: [], total: 0 } });
    }

    const cart = await clearCart({
      userId: user?.id,
      guestSessionId,
    });

    return ok({ cart });
  } catch (error) {
    return handleApiError(error);
  }
}
