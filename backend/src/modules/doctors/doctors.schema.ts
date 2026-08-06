import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const createDoctorSchema = z.object({
  name: z.string().min(2),
  speciality: z.string().min(2),
  clinicAddress: z.string().optional(),
  contactNumber: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
});

export const updateDoctorSchema = createDoctorSchema.partial().extend({ isActive: z.boolean().optional() });

export const listDoctorsQuerySchema = paginationSchema.extend({ search: z.string().optional() });

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
