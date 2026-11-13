import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { sellExchangeStatusSchema } from "@/schemas/inquiry";
import { updateSellExchangeStatus } from "@/services/commerce-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = sellExchangeStatusSchema.parse(await request.json());
    const { id } = await params;
    const requestRecord = await updateSellExchangeStatus(id, body.status);
    return ok({ request: requestRecord });
  } catch (error) {
    return handleApiError(error);
  }
}
