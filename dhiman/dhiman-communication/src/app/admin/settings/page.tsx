import { SettingsForm } from "@/components/admin/settings-form";
import { SectionHeading } from "@/components/shared/ui";
import { getShopSettings } from "@/services/catalog-service";

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Settings"
        title="Shop settings"
        description="Keep the storefront trustworthy by updating branding, contact details, location, hero messaging, and announcement content in one place."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
