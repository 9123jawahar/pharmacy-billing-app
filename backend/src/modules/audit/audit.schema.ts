import { z } from "zod";
import { paginationSchema } from "@/utils/pagination";

export const listAuditLogsQuerySchema = paginationSchema.extend({
  entity: z.string().optional(),
  userId: z.string().uuid().optional(),
  action: z
    .enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "STOCK_ADJUST", "ORDER_FINALIZE", "ORDER_VOID"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
