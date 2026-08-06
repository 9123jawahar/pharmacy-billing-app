import { Router } from "express";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { listAuditLogsQuerySchema } from "./audit.schema";
import { listAuditLogs } from "./audit.controller";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", validate({ query: listAuditLogsQuerySchema }), listAuditLogs);

export default router;
