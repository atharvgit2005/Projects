"use client";

import { AlertCircle } from "lucide-react";
import { ButtonLink, Container, Panel } from "@/components/shared/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="py-12">
      <Panel className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-rose-400/20 bg-rose-500/10 text-rose-300">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-white">We could not load this page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Please try again. If the problem continues, head back to the shop homepage and reopen the page from there.
        </p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-3 text-xs text-slate-500">{error.message}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-300 px-5 text-sm font-medium text-slate-950 transition hover:border-cyan-200 hover:bg-cyan-200"
          >
            Try again
          </button>
          <ButtonLink href="/" variant="secondary">
            Back home
          </ButtonLink>
        </div>
      </Panel>
    </Container>
  );
}
