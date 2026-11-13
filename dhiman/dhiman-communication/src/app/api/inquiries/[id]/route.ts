import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { inquiryStatusSchema } from "@/schemas/inquiry";
import { updateInquiryStatus } from "@/services/commerce-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser();
    const body = inquiryStatusSchema.parse(await request.json());
    const { id } = await params;
    const inquiry = await updateInquiryStatus(id, body.status);
    return ok({ inquiry });
  } catch (error) {
    return handleApiError(error);
  }
}
