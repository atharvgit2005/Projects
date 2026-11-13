import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { getDashboardStats } from "@/services/dashboard-service";

export async function GET() {
  try {
    await requireAdminUser();
    const stats = await getDashboardStats();
    return ok({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}
