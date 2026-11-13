import { ButtonLink, Container, Panel } from "@/components/shared/ui";

export default function NotFound() {
  return (
    <Container className="py-12">
      <Panel className="text-center">
        <h1 className="font-display text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page you requested does not exist or is not currently available.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/" variant="secondary">
            Go home
          </ButtonLink>
          <ButtonLink href="/shop">Browse shop</ButtonLink>
        </div>
      </Panel>
    </Container>
  );
}
