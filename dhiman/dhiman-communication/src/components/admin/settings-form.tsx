"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button, Panel, TextAreaField, TextField } from "@/components/shared/ui";

function parseJsonArray(value: string, fallback: unknown[]) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function SettingsForm({ settings }: { settings: any }) {
  const [form, setForm] = useState({
    shopName: settings.shopName || "",
    logoUrl: settings.logoUrl || "",
    address: settings.address || "",
    mapLink: settings.mapLink || "",
    phone: settings.phone || "",
    email: settings.email || "",
    openingHours: settings.openingHours || "",
    announcementBar: settings.announcementBar || "",
    heroBannersJson: JSON.stringify(settings.heroBanners || [], null, 2),
    socialLinksJson: JSON.stringify(settings.socialLinks || [], null, 2),
    accentColor: settings.themePreferences?.accentColor || "#5eead4",
    highlightColor: settings.themePreferences?.highlightColor || "#f59e0b",
  });
  const [isPending, startTransition] = useTransition();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          shopName: form.shopName,
          logoUrl: form.logoUrl,
          address: form.address,
          mapLink: form.mapLink,
          phone: form.phone,
          email: form.email,
          openingHours: form.openingHours,
          announcementBar: form.announcementBar,
          heroBanners: parseJsonArray(form.heroBannersJson, []),
          socialLinks: parseJsonArray(form.socialLinksJson, []),
          themePreferences: {
            accentColor: form.accentColor,
            highlightColor: form.highlightColor,
          },
        };

        await apiFetch("/api/settings", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Shop settings updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save settings");
      }
    });
  };

  return (
    <Panel>
      <h2 className="font-display text-2xl font-semibold text-white">Shop settings</h2>
      <p className="mt-2 text-sm text-slate-400">
        Keep the key contact details and homepage content updated here. Save once after finishing a batch of changes.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Shop name" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          <TextField label="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField
            label="Address"
            className="md:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <TextField
            label="Google Maps link"
            className="md:col-span-2"
            value={form.mapLink}
            onChange={(e) => setForm({ ...form, mapLink: e.target.value })}
          />
          <TextField
            label="Opening hours"
            className="md:col-span-2"
            value={form.openingHours}
            onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
          />
        </div>
        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <TextField
            label="Accent color"
            value={form.accentColor}
            onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
          />
          <TextField
            label="Highlight color"
            value={form.highlightColor}
            onChange={(e) => setForm({ ...form, highlightColor: e.target.value })}
          />
          <TextAreaField
            label="Announcement bar"
            className="md:col-span-2"
            value={form.announcementBar}
            onChange={(e) => setForm({ ...form, announcementBar: e.target.value })}
          />
        </div>
        <div className="grid gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <TextAreaField
            label="Hero banners JSON"
            className="md:col-span-2"
            value={form.heroBannersJson}
            onChange={(e) => setForm({ ...form, heroBannersJson: e.target.value })}
          />
          <TextAreaField
            label="Social links JSON"
            className="md:col-span-2"
            value={form.socialLinksJson}
            onChange={(e) => setForm({ ...form, socialLinksJson: e.target.value })}
          />
        </div>
        <div>
          <Button type="submit" disabled={isPending}>
            Save settings
          </Button>
        </div>
      </form>
    </Panel>
  );
}
