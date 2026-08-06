import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok } from "@/utils/apiResponse";
import { toSkipTake, buildMeta } from "@/utils/pagination";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, entity, userId, action, from, to } = req.query as any;

  const where: Prisma.AuditLogWhereInput = {
    ...(entity && { entity }),
    ...(userId && { userId }),
    ...(action && { action }),
    ...(from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true, email: true } } },
      orderBy: { createdAt: "desc" },
      ...toSkipTake({ page, pageSize }),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok(res, logs, buildMeta(page, pageSize, total));
});
