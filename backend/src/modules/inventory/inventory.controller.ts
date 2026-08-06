import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import { toSkipTake, buildMeta } from "@/utils/pagination";
import type { CreateDrugInput, UpdateDrugInput } from "./inventory.schema";

const drugInclude = {
  supplier: { select: { id: true, name: true } },
  substitutes: { select: { id: true, name: true, genericName: true, stockQuantity: true, sellingPrice: true } },
} satisfies Prisma.DrugInclude;

export const listDrugs = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search, category } = req.query as any;

  const where: Prisma.DrugWhereInput = {
    isActive: true,
    ...(category && { category }),
    ...(search && {
      OR: [
        { name: { contains: search as string, mode: "insensitive" } },
        { genericName: { contains: search as string, mode: "insensitive" } },
        { batchNumber: { contains: search as string, mode: "insensitive" } },
      ],
    }),
  };

  const [drugs, total] = await Promise.all([
    prisma.drug.findMany({ where, include: drugInclude, orderBy: { name: "asc" }, ...toSkipTake({ page, pageSize }) }),
    prisma.drug.count({ where }),
  ]);

  return ok(res, drugs, buildMeta(page, pageSize, total));
});

/**
 * Smart combination search: typing a brand name, generic/active ingredient,
 * or a symptom returns every matching branded drug plus its registered
 * substitutes — letting a clerk find "something for a headache" or every
 * formulation of "Paracetamol" in one query.
 */
export const smartSearch = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) return ok(res, []);

  const drugs = await prisma.drug.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
        { composition: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { symptoms: { has: q.toLowerCase() } },
        { symptoms: { hasSome: q.toLowerCase().split(/\s+/) } },
      ],
    },
    include: drugInclude,
    orderBy: { name: "asc" },
    take: 50,
  });

  return ok(res, drugs);
});

export const lowStockDrugs = asyncHandler(async (_req: Request, res: Response) => {
  // reorderLevel varies per drug, so the comparison is done at the DB level via $queryRaw
  // (Prisma's fluent API can't compare two columns of the same row directly).
  const drugs = await prisma.$queryRaw`
    SELECT d.*, s.name as "supplierName"
    FROM drugs d
    JOIN suppliers s ON s.id = d."supplierId"
    WHERE d."isActive" = true AND d."stockQuantity" <= d."reorderLevel"
    ORDER BY d."stockQuantity" ASC
  `;
  return ok(res, drugs);
});

export const expiredDrugs = asyncHandler(async (req: Request, res: Response) => {
  const withinDays = Number(req.query.withinDays ?? 0); // 0 = already expired; >0 = expiring soon too
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const drugs = await prisma.drug.findMany({
    where: { isActive: true, expiryDate: { lte: cutoff } },
    include: drugInclude,
    orderBy: { expiryDate: "asc" },
  });
  return ok(res, drugs);
});

export const getDrug = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const drug = await prisma.drug.findUnique({ where: { id: req.params.id }, include: drugInclude });
  if (!drug) throw ApiError.notFound("Drug not found");
  return ok(res, drug);
});

export const createDrug = asyncHandler(async (req: Request<any, any, CreateDrugInput>, res: Response) => {
  const { substituteIds, ...data } = req.body;
  const drug = await prisma.drug.create({
    data: { ...data, ...(substituteIds && { substitutes: { connect: substituteIds.map((id) => ({ id })) } }) },
    include: drugInclude,
  });
  await recordAudit({ req, action: "CREATE", entity: "Drug", entityId: drug.id, description: `Added drug ${drug.name} (batch ${drug.batchNumber})` });
  return created(res, drug);
});

export const updateDrug = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateDrugInput>, res: Response) => {
  const { id } = req.params;
  const { substituteIds, ...data } = req.body;

  const drug = await prisma.drug.update({
    where: { id },
    data: { ...data, ...(substituteIds && { substitutes: { set: substituteIds.map((sid) => ({ id: sid })) } }) },
    include: drugInclude,
  });

  await recordAudit({ req, action: "UPDATE", entity: "Drug", entityId: id, description: `Updated drug ${drug.name}`, metadata: req.body });
  return ok(res, drug);
});

export const adjustStock = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const { delta, reason } = req.body as { delta: number; reason: string };

  const drug = await prisma.$transaction(async (tx) => {
    const existing = await tx.drug.findUniqueOrThrow({ where: { id: req.params.id } });
    if (existing.stockQuantity + delta < 0) {
      throw ApiError.badRequest(`Adjustment would bring stock below zero (current: ${existing.stockQuantity})`);
    }
    const updated = await tx.drug.update({
      where: { id: req.params.id },
      data: { stockQuantity: { increment: delta } },
    });
    await tx.stockAdjustment.create({ data: { drugId: existing.id, delta, reason, userId: req.user!.sub } });
    return updated;
  });

  await recordAudit({
    req,
    action: "STOCK_ADJUST",
    entity: "Drug",
    entityId: drug.id,
    description: `Adjusted stock for ${drug.name} by ${delta > 0 ? "+" : ""}${delta} (${reason})`,
  });

  return ok(res, drug);
});

export const listSuppliers = asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return ok(res, suppliers);
});
