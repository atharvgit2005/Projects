import { getCurrentUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/http";
import { sellExchangeSchema } from "@/schemas/inquiry";
import { createSellExchangeRequest, getSellExchangeRequests } from "@/services/commerce-service";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return fail("Authentication required", 401);
    }

    if (user.role === "owner" || user.role === "admin") {
      const requests = await getSellExchangeRequests();
      return ok({ requests });
    }

    const requests = await getSellExchangeRequests(user.id);
    return ok({ requests });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = sellExchangeSchema.parse(await request.json());
    const requestRecord = await createSellExchangeRequest(user?.id, body);
    return ok({ request: requestRecord }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
