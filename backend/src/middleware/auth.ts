import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAuthToken, type AuthTokenPayload } from "@/lib/jwt";
import { ApiError } from "@/utils/ApiError";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/** Verifies the JWT bearer token and attaches the decoded payload to req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired session token"));
  }
}

/** Role-based access control — pass the roles allowed to call this route. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of these roles: ${roles.join(", ")}`));
    }
    next();
  };
}
