import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createSubscriptionSchema, updateSubscriptionSchema, refillSubscriptionSchema } from "./subscriptions.schema";
import { listDueSubscriptions, createSubscription, updateSubscription, markRefilled } from "./subscriptions.controller";

const router = Router();
router.use(requireAuth);
const idParam = z.object({ id: z.string().uuid() });

router.get("/due", listDueSubscriptions);
router.post("/", validate({ body: createSubscriptionSchema }), createSubscription);
router.patch("/:id", validate({ params: idParam, body: updateSubscriptionSchema }), updateSubscription);
router.post("/:id/refill", validate({ params: idParam, body: refillSubscriptionSchema }), markRefilled);

export default router;
