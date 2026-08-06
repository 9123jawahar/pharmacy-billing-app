import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { recordAudit } from "@/utils/audit";
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from "./subscriptions.schema";

/** Chronic-patient refills due within the next N days (default 7) or already overdue. */
export const listDueSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const withinDays = Number(req.query.withinDays ?? 7);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const subscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE", nextDueDate: { lte: cutoff } },
    include: { customer: true, drug: { select: { id: true, name: true, genericName: true, stockQuantity: true } } },
    orderBy: { nextDueDate: "asc" },
  });

  return ok(res, subscriptions);
});

export const createSubscription = asyncHandler(async (req: Request<any, any, CreateSubscriptionInput>, res: Response) => {
  const subscription = await prisma.subscription.create({ data: req.body, include: { customer: true, drug: true } });
  await recordAudit({
    req,
    action: "CREATE",
    entity: "Subscription",
    entityId: subscription.id,
    description: `Created refill subscription for ${subscription.customer.name} — ${subscription.drug.name}`,
  });
  return created(res, subscription);
});

export const updateSubscription = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateSubscriptionInput>, res: Response) => {
  const subscription = await prisma.subscription.update({ where: { id: req.params.id }, data: req.body });
  await recordAudit({ req, action: "UPDATE", entity: "Subscription", entityId: subscription.id, description: "Updated subscription", metadata: req.body });
  return ok(res, subscription);
});

/** Marks a refill as fulfilled and rolls nextDueDate forward by frequencyDays. */
export const markRefilled = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const current = await prisma.subscription.findUniqueOrThrow({ where: { id: req.params.id } });
  const refillDate: Date = req.body.refillDate ?? new Date();
  const nextDueDate = new Date(refillDate);
  nextDueDate.setDate(nextDueDate.getDate() + current.frequencyDays);

  const subscription = await prisma.subscription.update({
    where: { id: current.id },
    data: { lastRefillDate: refillDate, nextDueDate },
  });

  await recordAudit({ req, action: "UPDATE", entity: "Subscription", entityId: subscription.id, description: "Marked subscription as refilled" });
  return ok(res, subscription);
});
