import type { NextRequest } from "next/server";
import { createGuestSessionId, GUEST_SESSION_COOKIE_NAME, setGuestSessionCookie } from "@/lib/cookies";
import { getCurrentUser } from "@/lib/auth";
import type { CartContext } from "@/types";

export async function resolveRequestContext(request: NextRequest) {
  const user = await getCurrentUser();
  const guestSessionId = request.cookies.get(GUEST_SESSION_COOKIE_NAME)?.value;

  return {
    user,
    context: {
      userId: user?.id,
      guestSessionId,
    } satisfies CartContext,
  };
}

export function attachGuestSessionCookie<T extends Response>(response: T, guestSessionId?: string) {
  if (response instanceof Response && !guestSessionId) {
    const id = createGuestSessionId();
    setGuestSessionCookie(response as never, id);
    return { response, guestSessionId: id };
  }

  return { response, guestSessionId };
}
