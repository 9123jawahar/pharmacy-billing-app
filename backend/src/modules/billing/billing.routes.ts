import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createOrderSchema, listOrdersQuerySchema } from "./billing.schema";
import { listOrders, getOrder, createOrder, voidOrder } from "./billing.controller";

const router = Router();
router.use(requireAuth);
const idParam = z.object({ id: z.string().uuid() });

router.get("/orders", validate({ query: listOrdersQuerySchema }), listOrders);
router.get("/orders/:id", validate({ params: idParam }), getOrder);
router.post("/orders", requireRole("ADMIN", "PHARMACIST", "BILLING_CLERK"), validate({ body: createOrderSchema }), createOrder);
router.post("/orders/:id/void", requireRole("ADMIN", "PHARMACIST"), validate({ params: idParam }), voidOrder);

export default router;
