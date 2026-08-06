import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import type { CreateCouponInput } from "./loyalty.schema";

export const listCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return ok(res, coupons);
});

export const createCoupon = asyncHandler(async (req: Request<any, any, CreateCouponInput>, res: Response) => {
  const coupon = await prisma.coupon.create({ data: req.body });
  await recordAudit({ req, action: "CREATE", entity: "Coupon", entityId: coupon.id, description: `Created coupon ${coupon.code}` });
  return created(res, coupon);
});

/** Validates a coupon code against an order subtotal — used live by the POS screen. */
export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const code = String(req.query.code ?? "").toUpperCase();
  const subtotal = Number(req.query.subtotal ?? 0);

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();

  if (!coupon || !coupon.isActive) throw ApiError.badRequest("Invalid or inactive coupon code");
  if (now < coupon.validFrom || now > coupon.validTo) throw ApiError.badRequest("This coupon is not currently valid");
  if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) throw ApiError.badRequest("This coupon has reached its usage limit");
  if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
    throw ApiError.badRequest(`This coupon requires a minimum order value of ₹${coupon.minOrderValue}`);
  }

  let discount = coupon.type === "PERCENTAGE" ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  discount = Math.min(discount, subtotal);

  return ok(res, { coupon, discount: Number(discount.toFixed(2)) });
});

export const redeemLoyaltyPreview = asyncHandler(async (req: Request, res: Response) => {
  const customerId = String(req.query.customerId ?? "");
  const points = Number(req.query.points ?? 0);

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (points > customer.loyaltyPoints) throw ApiError.badRequest("Customer does not have enough loyalty points");

  // 1 loyalty point = ₹1 discount, capped by available balance — kept simple & transparent for cashiers.
  return ok(res, { pointsAvailable: customer.loyaltyPoints, discount: points });
});
