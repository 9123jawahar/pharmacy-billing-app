import { app } from "@/app";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";

const server = app.listen(env.PORT, () => {
  console.log(`🏥 Pharmacy API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
