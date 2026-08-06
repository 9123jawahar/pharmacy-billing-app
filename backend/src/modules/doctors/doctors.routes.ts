import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createDoctorSchema, updateDoctorSchema, listDoctorsQuerySchema } from "./doctors.schema";
import { listDoctors, referralMetrics, createDoctor, updateDoctor, getDoctor } from "./doctors.controller";

const router = Router();
router.use(requireAuth);
const idParam = z.object({ id: z.string().uuid() });

router.get("/", validate({ query: listDoctorsQuerySchema }), listDoctors);
router.get("/referral-metrics", referralMetrics);
router.get("/:id", validate({ params: idParam }), getDoctor);
router.post("/", requireRole("ADMIN", "PHARMACIST"), validate({ body: createDoctorSchema }), createDoctor);
router.patch("/:id", requireRole("ADMIN", "PHARMACIST"), validate({ params: idParam, body: updateDoctorSchema }), updateDoctor);

export default router;
