import { requireUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { profileUpdateSchema } from "@/schemas/auth";
import { updateUserProfile } from "@/services/auth-service";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = profileUpdateSchema.parse(await request.json());
    const updated = await updateUserProfile(user.id, body);
    return ok({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
