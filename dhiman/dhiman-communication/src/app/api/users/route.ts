import { requireAdminUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { listUsers } from "@/services/auth-service";

export async function GET() {
  try {
    await requireAdminUser();
    const users = await listUsers();
    return ok({ users });
  } catch (error) {
    return handleApiError(error);
  }
}
