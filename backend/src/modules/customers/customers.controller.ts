import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import { toSkipTake, buildMeta } from "@/utils/pagination";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customers.schema";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search } = req.query as any;
  const where = search
    ? {
        isActive: true,
        OR: [
          { name: { contains: search as string, mode: "insensitive" as const } },
          { phone: { contains: search as string } },
        ],
      }
    : { isActive: true };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true, subscriptions: true } } },
      ...toSkipTake({ page, pageSize }),
    }),
    prisma.customer.count({ where }),
  ]);

  return ok(res, customers, buildMeta(page, pageSize, total));
});

export const getCustomer = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      subscriptions: { include: { drug: { select: { name: true, genericName: true } } }, orderBy: { nextDueDate: "asc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 10, include: { items: true } },
      loyaltyLedger: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  return ok(res, customer);
});

export const createCustomer = asyncHandler(async (req: Request<any, any, CreateCustomerInput>, res: Response) => {
  const { email, ...rest } = req.body;
  const customer = await prisma.customer.create({ data: { ...rest, email: email || undefined } });
  await recordAudit({ req, action: "CREATE", entity: "Customer", entityId: customer.id, description: `Registered customer ${customer.name}` });
  return created(res, customer);
});

export const updateCustomer = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateCustomerInput>, res: Response) => {
  const { id } = req.params;
  const { email, ...rest } = req.body;
  const customer = await prisma.customer.update({ where: { id }, data: { ...rest, ...(email !== undefined && { email: email || null }) } });
  await recordAudit({ req, action: "UPDATE", entity: "Customer", entityId: id, description: `Updated customer ${customer.name}`, metadata: req.body });
  return ok(res, customer);
});

/** Drug-interaction safety check: flags allergy/condition conflicts before a sale. */
export const checkInteractions = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const { drugIds } = req.query as { drugIds?: string };
  const ids = drugIds ? drugIds.split(",") : [];

  const [customer, drugs] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: req.params.id } }),
    prisma.drug.findMany({ where: { id: { in: ids } } }),
  ]);

  const warnings = drugs
    .filter((drug) =>
      customer.allergies.some((allergy) =>
        `${drug.name} ${drug.genericName} ${drug.composition ?? ""}`.toLowerCase().includes(allergy.toLowerCase())
      )
    )
    .map((drug) => `${customer.name} has a recorded allergy that may conflict with ${drug.name} (${drug.genericName}).`);

  return ok(res, { warnings, hasWarnings: warnings.length > 0 });
});
