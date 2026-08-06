import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const createDrugSchema = z.object({
  name: z.string().min(2),
  genericName: z.string().min(2),
  composition: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  batchNumber: z.string().min(1),
  supplierId: z.string().uuid(),
  stockQuantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  costPrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  gstPercent: z.number().min(0).max(100).default(12),
  expiryDate: z.coerce.date(),
  rackLocation: z.string().optional(),
  requiresRx: z.boolean().default(false),
  substituteIds: z.array(z.string().uuid()).optional(),
});

export const updateDrugSchema = createDrugSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listDrugsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "Adjustment cannot be zero"),
  reason: z.string().min(3),
});

export type CreateDrugInput = z.infer<typeof createDrugSchema>;
export type UpdateDrugInput = z.infer<typeof updateDrugSchema>;
