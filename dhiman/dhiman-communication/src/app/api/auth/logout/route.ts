import { clearAuthCookie } from "@/lib/cookies";
import { handleApiError, ok } from "@/lib/http";

export async function POST() {
  try {
    const response = ok({ message: "Logged out successfully" });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
