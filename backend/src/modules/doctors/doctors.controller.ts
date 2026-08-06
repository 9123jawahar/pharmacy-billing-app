import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import { toSkipTake, buildMeta } from "@/utils/pagination";
import type { CreateDoctorInput, UpdateDoctorInput } from "./doctors.schema";

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search } = req.query as any;
  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search as string, mode: "insensitive" as const } },
        { speciality: { contains: search as string, mode: "insensitive" as const } },
      ],
    }),
  };

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({ where, orderBy: { name: "asc" }, include: { _count: { select: { orders: true } } }, ...toSkipTake({ page, pageSize }) }),
    prisma.doctor.count({ where }),
  ]);

  return ok(res, doctors, buildMeta(page, pageSize, total));
});

/** Referral metrics: orders + net revenue attributed to each doctor. */
export const referralMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    include: { orders: { where: { status: "FINALIZED" }, select: { netTotal: true } } },
    orderBy: { name: "asc" },
  });

  const metrics = doctors
    .map((d) => ({
      id: d.id,
      name: d.name,
      speciality: d.speciality,
      referralCount: d.orders.length,
      totalRevenue: d.orders.reduce((sum, o) => sum + Number(o.netTotal), 0),
    }))
    .sort((a, b) => b.referralCount - a.referralCount);

  return ok(res, metrics);
});

export const createDoctor = asyncHandler(async (req: Request<any, any, CreateDoctorInput>, res: Response) => {
  const { email, ...rest } = req.body;
  const doctor = await prisma.doctor.create({ data: { ...rest, email: email || undefined } });
  await recordAudit({ req, action: "CREATE", entity: "Doctor", entityId: doctor.id, description: `Added referring doctor Dr. ${doctor.name}` });
  return created(res, doctor);
});

export const updateDoctor = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateDoctorInput>, res: Response) => {
  const { email, ...rest } = req.body;
  const doctor = await prisma.doctor.update({
    where: { id: req.params.id },
    data: { ...rest, ...(email !== undefined && { email: email || null }) },
  });
  await recordAudit({ req, action: "UPDATE", entity: "Doctor", entityId: doctor.id, description: `Updated Dr. ${doctor.name}`, metadata: req.body });
  return ok(res, doctor);
});

export const getDoctor = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
  if (!doctor) throw ApiError.notFound("Doctor not found");
  return ok(res, doctor);
});
