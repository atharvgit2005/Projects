import { signAuthToken } from "@/lib/jwt";
import { handleApiError, ok } from "@/lib/http";
import { setAuthCookie } from "@/lib/cookies";
import { signupSchema } from "@/schemas/auth";
import { registerCustomer } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json());
    const user = await registerCustomer(body);
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
