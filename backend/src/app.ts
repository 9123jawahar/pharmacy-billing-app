import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";

import authRoutes from "@/modules/auth/auth.routes";
import userRoutes from "@/modules/users/users.routes";
import customerRoutes from "@/modules/customers/customers.routes";
import subscriptionRoutes from "@/modules/subscriptions/subscriptions.routes";
import loyaltyRoutes from "@/modules/loyalty/loyalty.routes";
import inventoryRoutes from "@/modules/inventory/inventory.routes";
import doctorRoutes from "@/modules/doctors/doctors.routes";
import billingRoutes from "@/modules/billing/billing.routes";
import auditRoutes from "@/modules/audit/audit.routes";
import dashboardRoutes from "@/modules/dashboard/dashboard.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// Generic rate limit — tighter limits are applied on /auth/login separately.
app.use(
  "/api",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false })
);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
