import { z } from "zod";

export const shopSettingsSchema = z.object({
  shopName: z.string().trim().min(2),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  heroBanners: z.array(
    z.object({
      title: z.string().trim().min(2),
      subtitle: z.string().trim().default(""),
      imageUrl: z.string().trim().url().optional().or(z.literal("")),
      ctaLabel: z.string().trim().default(""),
      ctaHref: z.string().trim().default(""),
    }),
  ),
  address: z.string().trim().min(5),
  mapLink: z.string().trim().url(),
  phone: z.string().trim().min(8),
  email: z.email().trim(),
  openingHours: z.string().trim().default(""),
  socialLinks: z.array(
    z.object({
      label: z.string().trim().min(2),
      url: z.string().trim().url(),
    }),
  ),
  announcementBar: z.string().trim().default(""),
  themePreferences: z.object({
    accentColor: z.string().trim().default("#5eead4"),
    highlightColor: z.string().trim().default("#f59e0b"),
  }),
});
