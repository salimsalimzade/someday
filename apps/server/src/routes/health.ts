import type { HealthStatus } from "@bedrock/types";
import { Hono } from "hono";

const startedAt = Date.now();

export const healthRoutes = new Hono().get("/", (c) => {
  const health: HealthStatus = {
    status: "ok",
    uptime: (Date.now() - startedAt) / 1000,
    timestamp: new Date().toISOString(),
  };

  return c.json(health);
});
