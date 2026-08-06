import type { Request } from "express";
import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

interface AuditParams {
  req: Request;
  action: AuditAction;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit trail entry. Failures here are logged but never thrown —
 * a broken audit write must not roll back or block the underlying business
 * transaction (inventory edit, billing, login, etc).
 */
export async function recordAudit({ req, action, entity, entityId, description, metadata }: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.sub,
        action,
        entity,
        entityId,
        description,
        metadata,
        ipAddress: req.ip,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record audit log:", err);
  }
}
