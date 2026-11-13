import { SiteShell } from "@/components/layout/site-shell";
import { ContactInquiryForm } from "@/components/forms/contact-inquiry-form";
import { Badge, ButtonLink, Container, Panel, SectionHeading } from "@/components/shared/ui";
import { getCurrentUser } from "@/lib/auth";
import { getShopSettings } from "@/services/catalog-service";

export default async function ContactPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);

  return (
    <SiteShell>
      <Container className="grid gap-6 py-10 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Contact"
            title="Visit, call, or message the shop"
            description="Use whichever feels easiest: call for live stock confirmation, visit the shop for pickup, or send an inquiry if you want help choosing the right device."
          />
          <Panel className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{settings.phone}</Badge>
              <Badge variant="warning">{settings.email}</Badge>
            </div>
            <p className="text-sm text-slate-300">{settings.address}</p>
            <p className="text-sm text-slate-500">{settings.openingHours}</p>
            <a href={settings.mapLink} target="_blank" className="text-sm text-cyan-300 hover:text-cyan-200">
              Open location in Google Maps
            </a>
          </Panel>
          <Panel className="space-y-4">
            <h3 className="font-display text-2xl font-semibold text-white">Before you visit</h3>
            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <p>Call or send an inquiry if you are coming for a specific model, color, second-hand device, or launch item.</p>
              <p>The shop can confirm stock, invoice details, exchange options, and pickup timing before you travel.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={settings.mapLink}
                target="_blank"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-cyan-300 px-5 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
              >
                Open Google Maps
              </a>
              <ButtonLink href="/shop" variant="secondary">
                Browse products first
              </ButtonLink>
            </div>
          </Panel>
        </div>
        <ContactInquiryForm user={user} />
      </Container>
    </SiteShell>
  );
}
