import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok } from "@/utils/apiResponse";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + 30);

  const [
    todaysSales,
    monthlySales,
    todaysOrderCount,
    totalCustomers,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    dueSubscriptions,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: "FINALIZED", createdAt: { gte: startOfToday } }, _sum: { netTotal: true } }),
    prisma.order.aggregate({ where: { status: "FINALIZED", createdAt: { gte: startOfMonth } }, _sum: { netTotal: true } }),
    prisma.order.count({ where: { status: "FINALIZED", createdAt: { gte: startOfToday } } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM drugs WHERE "isActive" = true AND "stockQuantity" <= "reorderLevel"`,
    prisma.drug.count({ where: { isActive: true, expiryDate: { lt: new Date() } } }),
    prisma.drug.count({ where: { isActive: true, expiryDate: { gte: new Date(), lt: soonCutoff } } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", nextDueDate: { lte: soonCutoff } },
      include: { customer: { select: { name: true } }, drug: { select: { name: true } } },
      orderBy: { nextDueDate: "asc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: { status: "FINALIZED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } }, items: true },
    }),
  ]);

  return ok(res, {
    todaysSales: Number(todaysSales._sum.netTotal ?? 0),
    monthlySales: Number(monthlySales._sum.netTotal ?? 0),
    todaysOrderCount,
    totalCustomers,
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    expiredCount,
    expiringSoonCount,
    dueSubscriptions,
    recentOrders,
  });
});
