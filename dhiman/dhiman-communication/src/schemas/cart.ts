import { z } from "zod";

export const cartItemMutationSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const cartItemQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(10),
});

export const productIdPayloadSchema = z.object({
  productId: z.string().trim().min(1),
});
