export const env = {
  mongodbUri: process.env.MONGODB_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Modern Mobile Center",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  shopPhone: process.env.NEXT_PUBLIC_SHOP_PHONE ?? "+91 00000 00000",
  shopEmail: process.env.NEXT_PUBLIC_SHOP_EMAIL ?? "hello@modernmobilecenter.test",
  shopAddress:
    process.env.NEXT_PUBLIC_SHOP_ADDRESS ?? "Main Road, City Center, Your City",
  googleMapsLink:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_LINK ?? "https://maps.google.com",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  ownerBootstrapCode: process.env.OWNER_BOOTSTRAP_CODE ?? "",
  ownerPassword: process.env.OWNER_PASSWORD ?? "",
  youtubeEmbedAllowed: (process.env.YOUTUBE_EMBED_ALLOWED ?? "true") === "true",
};

export function assertEnv(value: string, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
