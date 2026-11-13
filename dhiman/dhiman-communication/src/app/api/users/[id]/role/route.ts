import { requireOwnerUser } from "@/lib/auth";
import { handleApiError, ok } from "@/lib/http";
import { roleAssignmentSchema } from "@/schemas/user";
import { assignUserRole } from "@/services/auth-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const owner = await requireOwnerUser();
    const body = roleAssignmentSchema.parse(await request.json());
    const { id } = await params;
    const user = await assignUserRole(owner.id, id, body.role);
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
