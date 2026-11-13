import { signAuthToken } from "@/lib/jwt";
import { handleApiError, ok } from "@/lib/http";
import { setAuthCookie } from "@/lib/cookies";
import { bootstrapOwnerSchema } from "@/schemas/auth";
import { bootstrapOwner } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = bootstrapOwnerSchema.parse(await request.json());
    const user = await bootstrapOwner(body);
    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = ok({ user }, 201);
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
