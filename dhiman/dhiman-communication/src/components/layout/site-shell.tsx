import { getCurrentUser } from "@/lib/auth";
import { getShopSettings } from "@/services/catalog-service";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);

  return (
    <div className="min-h-screen">
      <SiteHeader
        user={user}
        shopName={settings.shopName}
        phone={settings.phone}
        address={settings.address}
        mapLink={settings.mapLink}
      />
      <main>{children}</main>
      <SiteFooter
        shopName={settings.shopName}
        address={settings.address}
        phone={settings.phone}
        email={settings.email}
        openingHours={settings.openingHours}
        mapLink={settings.mapLink}
      />
      <MobileNav />
    </div>
  );
}
