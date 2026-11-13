import { SiteShell } from "@/components/layout/site-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { Container } from "@/components/shared/ui";

export default function SignupPage() {
  return (
    <SiteShell>
      <Container className="grid gap-6 py-12 xl:grid-cols-2">
        <AuthForm mode="signup" />
        <AuthForm mode="bootstrap-owner" />
      </Container>
    </SiteShell>
  );
}
