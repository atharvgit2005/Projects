import { z } from "zod";
import { MAX_COMPARE_ITEMS, PRODUCT_CONDITIONS } from "@/lib/constants";

export const productSchema = z
  .object({
    title: z.string().trim().min(3),
    slug: z.string().trim().min(3),
    description: z.string().trim().min(20),
    shortDescription: z.string().trim().min(10),
    brand: z.string().trim().min(1),
    category: z.string().trim().min(1),
    condition: z.enum(PRODUCT_CONDITIONS),
    price: z.coerce.number().min(0),
    originalPrice: z.coerce.number().min(0).nullable().optional(),
    discountPercent: z.coerce.number().min(0).max(100),
    stock: z.coerce.number().int().min(0),
    sku: z.string().trim().min(3),
    images: z.array(z.string().trim().url()).min(1),
    thumbnail: z.string().trim().url(),
    featured: z.coerce.boolean().default(false),
    latestRelease: z.coerce.boolean().default(false),
    upcoming: z.coerce.boolean().default(false),
    upcomingReleaseDate: z.string().datetime().nullable().optional().or(z.literal("")),
    youtubeReviewLinks: z.array(z.string().trim().url()).default([]),
    specs: z.object({
      ram: z.string().trim().default(""),
      storage: z.string().trim().default(""),
      processor: z.string().trim().default(""),
      battery: z.string().trim().default(""),
      display: z.string().trim().default(""),
      camera: z.string().trim().default(""),
      operatingSystem: z.string().trim().default(""),
      connectivity: z.string().trim().default(""),
      colorOptions: z.array(z.string().trim()).default([]),
      series: z.string().trim().default(""),
    }),
    filterMeta: z.object({
      brand: z.string().trim().default(""),
      series: z.string().trim().default(""),
      ram: z.string().trim().default(""),
      storage: z.string().trim().default(""),
      processor: z.string().trim().default(""),
    }),
    tags: z.array(z.string().trim()).default([]),
    isActive: z.coerce.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.originalPrice && value.originalPrice < value.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Original price must be greater than or equal to price",
        path: ["originalPrice"],
      });
    }
  });

export const productQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    series: z.string().trim().optional(),
    ram: z.string().trim().optional(),
    storage: z.string().trim().optional(),
    processor: z.string().trim().optional(),
    condition: z.enum(PRODUCT_CONDITIONS).optional(),
    featured: z.coerce.boolean().optional(),
    upcoming: z.coerce.boolean().optional(),
    latestRelease: z.coerce.boolean().optional(),
    discounted: z.coerce.boolean().optional(),
    minDiscount: z.coerce.number().min(0).max(100).optional(),
    maxDiscount: z.coerce.number().min(0).max(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z
      .enum(["price-asc", "price-desc", "newest", "highest-discount", "featured"])
      .optional(),
    includeInactive: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.minPrice === "number" &&
      typeof value.maxPrice === "number" &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPrice"],
        message: "Minimum price cannot be greater than maximum price",
      });
    }

    if (
      typeof value.minDiscount === "number" &&
      typeof value.maxDiscount === "number" &&
      value.minDiscount > value.maxDiscount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minDiscount"],
        message: "Minimum discount cannot be greater than maximum discount",
      });
    }
  });

export const compareMutationSchema = z.object({
  productId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(MAX_COMPARE_ITEMS).default(MAX_COMPARE_ITEMS),
});
