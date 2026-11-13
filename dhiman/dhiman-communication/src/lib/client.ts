export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: T;
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload.data as T;
}
