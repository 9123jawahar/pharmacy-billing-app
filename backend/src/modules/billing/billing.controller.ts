import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import { toSkipTake, buildMeta } from "@/utils/pagination";
import { sendInvoiceNotification } from "./notification.service";
import type { CreateOrderInput } from "./billing.schema";

const orderInclude = {
  items: { include: { drug: { select: { id: true, name: true, genericName: true, batchNumber: true } } } },
  customer: true,
  referredByDoctor: true,
  createdByUser: { select: { id: true, name: true, role: true } },
  coupon: true,
  notifications: true,
} satisfies Prisma.OrderInclude;

async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  // Falls back to a count-based sequence if the optional DB sequence
  // (see prisma/manual-migrations/002_invoice_sequence.sql) hasn't been applied.
  try {
    const rows = await tx.$queryRaw<{ seq: bigint }[]>`SELECT nextval('invoice_number_seq') as seq`;
    return `INV-${rows[0].seq.toString().padStart(6, "0")}`;
  } catch {
    const count = await tx.order.count();
    return `INV-${(count + 1).toString().padStart(6, "0")}`;
  }
}

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, customerId, status, from, to } = req.query as any;

  const where: Prisma.OrderWhereInput = {
    ...(customerId && { customerId }),
    ...(status && { status }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, ...toSkipTake({ page, pageSize }) }),
    prisma.order.count({ where }),
  ]);

  return ok(res, orders, buildMeta(page, pageSize, total));
});

export const getOrder = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!order) throw ApiError.notFound("Order not found");
  return ok(res, order);
});

/**
 * Point-of-sale checkout: verifies live stock, computes subtotal/tax/loyalty
 * & coupon discounts, decrements inventory, awards loyalty points, and fires
 * the mock invoice notification — all inside a single DB transaction so a
 * failure at any step leaves stock and ledgers untouched.
 */
export const createOrder = asyncHandler(async (req: Request<any, any, CreateOrderInput>, res: Response) => {
  const { customerId, doctorId, items, couponCode, loyaltyPointsToRedeem, paymentMethod, notifyCustomer } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const drugIds = items.map((i) => i.drugId);
    const drugs = await tx.drug.findMany({ where: { id: { in: drugIds } } });

    if (drugs.length !== drugIds.length) throw ApiError.badRequest("One or more selected drugs could not be found");

    const drugById = new Map(drugs.map((d) => [d.id, d]));
    let subtotal = new Prisma.Decimal(0);
    let taxAmount = new Prisma.Decimal(0);

    const lineData = items.map(({ drugId, quantity }) => {
      const drug = drugById.get(drugId)!;
      if (!drug.isActive) throw ApiError.badRequest(`${drug.name} is no longer available for sale`);
      if (drug.stockQuantity < quantity) {
        throw ApiError.badRequest(`Insufficient stock for ${drug.name} — only ${drug.stockQuantity} unit(s) available`);
      }
      if (drug.expiryDate < new Date()) {
        throw ApiError.badRequest(`${drug.name} (batch ${drug.batchNumber}) has expired and cannot be sold`);
      }

      const lineTotal = drug.sellingPrice.mul(quantity);
      const lineTax = lineTotal.mul(drug.gstPercent).div(100);
      subtotal = subtotal.add(lineTotal);
      taxAmount = taxAmount.add(lineTax);

      return { drugId, quantity, unitPrice: drug.sellingPrice, gstPercent: drug.gstPercent, lineTotal };
    });

    // --- Coupon discount ---------------------------------------------------
    let discountAmount = new Prisma.Decimal(0);
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      const now = new Date();
      if (!coupon || !coupon.isActive) throw ApiError.badRequest("Invalid or inactive coupon code");
      if (now < coupon.validFrom || now > coupon.validTo) throw ApiError.badRequest("Coupon is not currently valid");
      if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) throw ApiError.badRequest("Coupon usage limit reached");
      if (coupon.minOrderValue && subtotal.lt(coupon.minOrderValue)) {
        throw ApiError.badRequest(`Coupon requires a minimum order value of ₹${coupon.minOrderValue}`);
      }

      discountAmount = coupon.type === "PERCENTAGE" ? subtotal.mul(coupon.value).div(100) : new Prisma.Decimal(coupon.value);
      if (coupon.maxDiscount) discountAmount = Prisma.Decimal.min(discountAmount, coupon.maxDiscount);
      discountAmount = Prisma.Decimal.min(discountAmount, subtotal);
      couponId = coupon.id;

      await tx.coupon.update({ where: { id: coupon.id }, data: { timesUsed: { increment: 1 } } });
    }

    // --- Loyalty point redemption (1 point = ₹1) ----------------------------
    let loyaltyDiscount = new Prisma.Decimal(0);
    if (loyaltyPointsToRedeem > 0) {
      if (!customerId) throw ApiError.badRequest("A customer must be selected to redeem loyalty points");
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      if (loyaltyPointsToRedeem > customer.loyaltyPoints) {
        throw ApiError.badRequest("Customer does not have enough loyalty points");
      }
      loyaltyDiscount = Prisma.Decimal.min(new Prisma.Decimal(loyaltyPointsToRedeem), subtotal.add(taxAmount).sub(discountAmount));
    }

    const netTotal = Prisma.Decimal.max(new Prisma.Decimal(0), subtotal.add(taxAmount).sub(discountAmount).sub(loyaltyDiscount));
    const invoiceNumber = await nextInvoiceNumber(tx);

    const order = await tx.order.create({
      data: {
        invoiceNumber,
        customerId,
        doctorId,
        userId: req.user!.sub,
        subtotal,
        taxAmount,
        discountAmount,
        loyaltyPointsUsed: loyaltyPointsToRedeem,
        loyaltyDiscount,
        couponId,
        netTotal,
        paymentMethod,
        status: "FINALIZED",
        items: { create: lineData },
      },
      include: orderInclude,
    });

    // --- Decrement stock -----------------------------------------------------
    for (const item of lineData) {
      await tx.drug.update({ where: { id: item.drugId }, data: { stockQuantity: { decrement: item.quantity } } });
    }

    // --- Loyalty ledger: redeem then earn (1 point per ₹100 spent, net of discounts) --
    if (loyaltyPointsToRedeem > 0 && customerId) {
      await tx.loyaltyTransaction.create({
        data: { customerId, orderId: order.id, points: -loyaltyPointsToRedeem, reason: `Redeemed on invoice ${invoiceNumber}` },
      });
      await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: loyaltyPointsToRedeem } } });
    }

    if (customerId) {
      const pointsEarned = Math.floor(Number(netTotal) / 100);
      if (pointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: { customerId, orderId: order.id, points: pointsEarned, reason: `Earned on invoice ${invoiceNumber}` },
        });
        await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: pointsEarned } } });
      }
    }

    return order;
  });

  // --- Mock SMS/WhatsApp invoice notification (outside the DB transaction) ---
  if (notifyCustomer && result.customer?.phone) {
    await sendInvoiceNotification({
      orderId: result.id,
      customerId: result.customerId,
      phone: result.customer.phone,
      invoiceNumber: result.invoiceNumber,
      netTotal: Number(result.netTotal),
    });
  }

  await recordAudit({
    req,
    action: "ORDER_FINALIZE",
    entity: "Order",
    entityId: result.id,
    description: `Finalized invoice ${result.invoiceNumber} — ₹${result.netTotal}`,
  });

  const finalOrder = await prisma.order.findUnique({ where: { id: result.id }, include: orderInclude });
  return created(res, finalOrder);
});

/** Voids a finalized order and restocks the sold quantities (admin/pharmacist only). */
export const voidOrder = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUniqueOrThrow({ where: { id: req.params.id }, include: { items: true } });
    if (existing.status !== "FINALIZED") throw ApiError.badRequest("Only finalized orders can be voided");

    for (const item of existing.items) {
      await tx.drug.update({ where: { id: item.drugId }, data: { stockQuantity: { increment: item.quantity } } });
    }

    if (existing.customerId) {
      const netEarned = Math.floor(Number(existing.netTotal) / 100);
      if (netEarned > 0) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { loyaltyPoints: { decrement: netEarned } } });
      }
      if (existing.loyaltyPointsUsed > 0) {
        await tx.customer.update({ where: { id: existing.customerId }, data: { loyaltyPoints: { increment: existing.loyaltyPointsUsed } } });
      }
    }

    return tx.order.update({ where: { id: existing.id }, data: { status: "VOIDED" }, include: orderInclude });
  });

  await recordAudit({ req, action: "ORDER_VOID", entity: "Order", entityId: order.id, description: `Voided invoice ${order.invoiceNumber}` });
  return ok(res, order);
});
