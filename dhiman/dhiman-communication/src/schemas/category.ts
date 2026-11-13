import { z } from "zod";
import { CATEGORY_TYPES } from "@/lib/constants";

export const categorySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  type: z.enum(CATEGORY_TYPES),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});
