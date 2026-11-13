"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.98)",
            color: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
