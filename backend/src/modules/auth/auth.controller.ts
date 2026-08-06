import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/jwt";
import { asyncHandler } from "@/utils/asyncHandler";
import { ok } from "@/utils/apiResponse";
import { ApiError } from "@/utils/ApiError";
import { recordAudit } from "@/utils/audit";
import type { LoginInput, ChangePasswordInput } from "./auth.schema";

export const login = asyncHandler(async (req: Request<any, any, LoginInput>, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signAuthToken({ sub: user.id, email: user.email, role: user.role, name: user.name });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({
    req: { ...req, user: { sub: user.id, email: user.email, role: user.role, name: user.name } } as Request,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    description: `${user.name} logged in`,
  });

  return ok(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, name: true, email: true, role: true, phone: true, lastLoginAt: true, createdAt: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  return ok(res, user);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await recordAudit({ req, action: "LOGOUT", entity: "User", entityId: req.user?.sub, description: "User logged out" });
  return ok(res, { message: "Logged out" });
});

export const changePassword = asyncHandler(async (req: Request<any, any, ChangePasswordInput>, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await recordAudit({ req, action: "UPDATE", entity: "User", entityId: user.id, description: "User changed their password" });
  return ok(res, { message: "Password updated successfully" });
});
