import { SiteShell } from "@/components/layout/site-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { Container } from "@/components/shared/ui";

export default function LoginPage() {
  return (
    <SiteShell>
      <Container className="py-12">
        <AuthForm mode="login" />
      </Container>
    </SiteShell>
  );
}
