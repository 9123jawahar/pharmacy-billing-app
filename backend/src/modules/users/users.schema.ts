import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "PHARMACIST", "BILLING_CLERK"]),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "PHARMACIST", "BILLING_CLERK"]).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
