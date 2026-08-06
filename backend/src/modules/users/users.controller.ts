import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok, created } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import { toSkipTake, buildMeta } from "@/utils/pagination";
import type { CreateUserInput, UpdateUserInput } from "./users.schema";

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search } = req.query as any;
  const where = search
    ? { OR: [{ name: { contains: search as string, mode: "insensitive" as const } }, { email: { contains: search as string, mode: "insensitive" as const } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: safeSelect, orderBy: { createdAt: "desc" }, ...toSkipTake({ page, pageSize }) }),
    prisma.user.count({ where }),
  ]);

  return ok(res, users, buildMeta(page, pageSize, total));
});

export const createUser = asyncHandler(async (req: Request<any, any, CreateUserInput>, res: Response) => {
  const { name, email, password, role, phone } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({ data: { name, email, passwordHash, role, phone }, select: safeSelect });
  await recordAudit({ req, action: "CREATE", entity: "User", entityId: user.id, description: `Created user ${user.email} (${user.role})` });

  return created(res, user);
});

export const updateUser = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateUserInput>, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.sub && req.body.isActive === false) {
    throw ApiError.badRequest("You cannot deactivate your own account");
  }

  const user = await prisma.user.update({ where: { id }, data: req.body, select: safeSelect });
  await recordAudit({ req, action: "UPDATE", entity: "User", entityId: id, description: `Updated user ${user.email}`, metadata: req.body });

  return ok(res, user);
});

export const getUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: safeSelect });
  if (!user) throw ApiError.notFound("User not found");
  return ok(res, user);
});
