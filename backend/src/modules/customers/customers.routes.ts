import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createCustomerSchema, updateCustomerSchema, listCustomersQuerySchema } from "./customers.schema";
import { listCustomers, getCustomer, createCustomer, updateCustomer, checkInteractions } from "./customers.controller";

const router = Router();
router.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

router.get("/", validate({ query: listCustomersQuerySchema }), listCustomers);
router.post("/", validate({ body: createCustomerSchema }), createCustomer);
router.get("/:id", validate({ params: idParam }), getCustomer);
router.get("/:id/interaction-check", validate({ params: idParam }), checkInteractions);
router.patch(
  "/:id",
  requireRole("ADMIN", "PHARMACIST", "BILLING_CLERK"),
  validate({ params: idParam, body: updateCustomerSchema }),
  updateCustomer
);

export default router;
