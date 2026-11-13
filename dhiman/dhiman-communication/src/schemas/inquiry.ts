import { z } from "zod";
import { EXCHANGE_STATUSES, INQUIRY_STATUSES } from "@/lib/constants";

export const inquirySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().optional(),
        title: z.string().trim().min(2),
        slug: z.string().trim().optional(),
        thumbnail: z.string().trim().optional(),
        quantity: z.coerce.number().int().min(1),
        price: z.coerce.number().min(0),
      }),
    )
    .default([]),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(8),
  customerEmail: z.email().trim().optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES),
});

export const sellExchangeSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(8),
  customerEmail: z.email().trim().optional().or(z.literal("")),
  deviceType: z.string().trim().min(2),
  brand: z.string().trim().min(2),
  model: z.string().trim().min(2),
  conditionDescription: z.string().trim().min(10),
  expectedPrice: z.coerce.number().min(0).nullable().optional(),
  exchangeForProduct: z.string().trim().optional().or(z.literal("")),
  images: z.array(z.string().trim().url()).default([]),
});

export const sellExchangeStatusSchema = z.object({
  status: z.enum(EXCHANGE_STATUSES),
});
