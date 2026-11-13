import { SiteShell } from "@/components/layout/site-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "@/components/forms/profile-form";
import { Badge, Container, Panel, SectionHeading } from "@/components/shared/ui";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInquiries, getSellExchangeRequests } from "@/services/commerce-service";
import { formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const [inquiries, exchangeRequests] = await Promise.all([
    getInquiries(user.id),
    getSellExchangeRequests(user.id),
  ]);

  return (
    <SiteShell>
      <Container className="py-10">
        <SectionHeading
          eyebrow="Profile"
          title={`Welcome back, ${user.name}`}
          description="Manage your account details and track your inquiries and exchange requests."
          action={<LogoutButton />}
        />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <ProfileForm user={user} />
          <div className="space-y-6">
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-white">Your inquiries</h2>
                <Badge>{inquiries.length}</Badge>
              </div>
              <div className="space-y-3">
                {inquiries.length ? (
                  inquiries.map((item) => (
                    <div key={String(item._id)} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{item.items?.length ? "Order request" : "General inquiry"}</p>
                        <Badge>{item.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{item.message || "No message provided"}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No inquiries submitted yet.</p>
                )}
              </div>
            </Panel>
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-white">Exchange requests</h2>
                <Badge variant="warning">{exchangeRequests.length}</Badge>
              </div>
              <div className="space-y-3">
                {exchangeRequests.length ? (
                  exchangeRequests.map((item) => (
                    <div key={String(item._id)} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{item.brand} {item.model}</p>
                        <Badge>{item.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{item.conditionDescription}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No exchange requests yet.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </Container>
    </SiteShell>
  );
}
