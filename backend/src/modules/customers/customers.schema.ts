import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email().optional().or(z.literal("")),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  chronicConditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listCustomersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
