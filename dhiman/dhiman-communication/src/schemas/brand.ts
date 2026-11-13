import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});
