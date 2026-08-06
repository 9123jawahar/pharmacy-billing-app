import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/ApiError";
import { env } from "@/config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${(err.meta?.target as string[])?.join(", ") ?? "value"} already exists.`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "The requested record was not found." });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ success: false, message: "This action would violate a related record constraint." });
    }
  }

  console.error("[unhandled error]", err);
  return res.status(500).json({
    success: false,
    message: "Something went wrong on our end. Please try again.",
    ...(env.NODE_ENV !== "production" && { stack: (err as Error)?.stack }),
  });
}
