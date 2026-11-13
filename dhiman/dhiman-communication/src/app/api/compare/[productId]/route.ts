import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { removeFromCompare } from "@/services/commerce-service";

type Params = {
  params: Promise<{ productId: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const guestSessionId = request.cookies.get("mmc_guest_session")?.value;
    const { productId } = await params;

    if (!user && !guestSessionId) {
      return ok({ compareList: { productIds: [] } });
    }

    const compareList = await removeFromCompare(
      {
        userId: user?.id,
        guestSessionId,
      },
      productId,
    );

    return ok({ compareList });
  } catch (error) {
    return handleApiError(error);
  }
}
