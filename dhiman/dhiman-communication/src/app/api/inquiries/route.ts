import { getCurrentUser } from "@/lib/auth";
import { fail, handleApiError, ok } from "@/lib/http";
import { inquirySchema } from "@/schemas/inquiry";
import { createInquiry, getInquiries } from "@/services/commerce-service";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return fail("Authentication required", 401);
    }

    if (user.role === "owner" || user.role === "admin") {
      const inquiries = await getInquiries();
      return ok({ inquiries });
    }

    const inquiries = await getInquiries(user.id);
    return ok({ inquiries });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = inquirySchema.parse(await request.json());
    const inquiry = await createInquiry(user?.id, body);
    return ok({ inquiry }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
