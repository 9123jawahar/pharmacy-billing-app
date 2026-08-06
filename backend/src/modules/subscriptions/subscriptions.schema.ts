import { z } from "zod";

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  drugId: z.string().uuid(),
  quantity: z.number().int().min(1),
  frequencyDays: z.number().int().min(1).default(30),
  nextDueDate: z.coerce.date(),
  notes: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  frequencyDays: z.number().int().min(1).optional(),
  nextDueDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export const refillSubscriptionSchema = z.object({
  refillDate: z.coerce.date().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
