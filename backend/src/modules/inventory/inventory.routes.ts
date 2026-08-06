import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createDrugSchema, updateDrugSchema, listDrugsQuerySchema, stockAdjustmentSchema } from "./inventory.schema";
import {
  listDrugs,
  smartSearch,
  lowStockDrugs,
  expiredDrugs,
  getDrug,
  createDrug,
  updateDrug,
  adjustStock,
  listSuppliers,
} from "./inventory.controller";

const router = Router();
router.use(requireAuth);
const idParam = z.object({ id: z.string().uuid() });

router.get("/", validate({ query: listDrugsQuerySchema }), listDrugs);
router.get("/search", smartSearch);
router.get("/alerts/low-stock", lowStockDrugs);
router.get("/alerts/expired", expiredDrugs);
router.get("/suppliers", listSuppliers);
router.get("/:id", validate({ params: idParam }), getDrug);

router.post("/", requireRole("ADMIN", "PHARMACIST"), validate({ body: createDrugSchema }), createDrug);
router.patch("/:id", requireRole("ADMIN", "PHARMACIST"), validate({ params: idParam, body: updateDrugSchema }), updateDrug);
router.post(
  "/:id/stock-adjustment",
  requireRole("ADMIN", "PHARMACIST"),
  validate({ params: idParam, body: stockAdjustmentSchema }),
  adjustStock
);

export default router;
