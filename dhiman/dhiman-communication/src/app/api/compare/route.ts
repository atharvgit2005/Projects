import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createGuestSessionId, setGuestSessionCookie } from "@/lib/cookies";
import { handleApiError, ok } from "@/lib/http";
import { compareMutationSchema } from "@/schemas/product";
import { addToCompare, getCompareList } from "@/services/commerce-service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;

    if (!user && !guestSessionId) {
      return ok({ compareList: { productIds: [] } });
    }

    const compareList = await getCompareList({
      userId: user?.id,
      guestSessionId,
    });

    return ok({ compareList });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = compareMutationSchema.parse(await request.json());
    const existingGuestSessionId = request.cookies.get("mmc_guest_session")?.value;
    const guestSessionId = user ? undefined : existingGuestSessionId ?? createGuestSessionId();
    const compareList = await addToCompare(
      {
        userId: user?.id,
        guestSessionId,
      },
      body.productId,
    );

    const response = ok({ compareList });

    if (!user && !existingGuestSessionId && guestSessionId) {
      setGuestSessionCookie(response, guestSessionId);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
