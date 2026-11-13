import { signAuthToken } from "@/lib/jwt";
import { handleApiError, ok } from "@/lib/http";
import { setAuthCookie } from "@/lib/cookies";
import { loginSchema } from "@/schemas/auth";
import { loginUser } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await loginUser(body);
    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = ok({ user });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
