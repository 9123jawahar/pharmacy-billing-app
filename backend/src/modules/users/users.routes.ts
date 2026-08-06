import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from "./users.schema";
import { listUsers, createUser, updateUser, getUser } from "./users.controller";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", validate({ query: listUsersQuerySchema }), listUsers);
router.post("/", validate({ body: createUserSchema }), createUser);
router.get("/:id", validate({ params: z.object({ id: z.string().uuid() }) }), getUser);
router.patch("/:id", validate({ params: z.object({ id: z.string().uuid() }), body: updateUserSchema }), updateUser);

export default router;
