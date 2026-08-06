import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const orderItemInputSchema = z.object({
  drugId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  items: z.array(orderItemInputSchema).min(1, "Add at least one item to the bill"),
  couponCode: z.string().optional(),
  loyaltyPointsToRedeem: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "WALLET", "INSURANCE"]).default("CASH"),
  notifyCustomer: z.boolean().default(true),
});

export const listOrdersQuerySchema = paginationSchema.extend({
  customerId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "FINALIZED", "VOIDED", "REFUNDED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
