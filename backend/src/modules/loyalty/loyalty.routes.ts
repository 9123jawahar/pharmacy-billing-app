import { Router } from "express";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createCouponSchema } from "./loyalty.schema";
import { listCoupons, createCoupon, validateCoupon, redeemLoyaltyPreview } from "./loyalty.controller";

const router = Router();
router.use(requireAuth);

router.get("/coupons", listCoupons);
router.post("/coupons", requireRole("ADMIN", "PHARMACIST"), validate({ body: createCouponSchema }), createCoupon);
router.get("/coupons/validate", validateCoupon);
router.get("/redeem-preview", redeemLoyaltyPreview);

export default router;
