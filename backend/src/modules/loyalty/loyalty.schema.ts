import { z } from "zod";

export const createCouponSchema = z.object({
  code: z.string().min(3).max(20).transform((v) => v.toUpperCase()),
  type: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.number().positive(),
  minOrderValue: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  usageLimit: z.number().int().positive().optional(),
});

export const redeemPointsSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().int().positive(),
  reason: z.string().min(1).default("Manual redemption"),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
