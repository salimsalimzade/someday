import type { ApiError } from "@bedrock/types";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { greetingsRoutes } from "./routes/greetings";
import { healthRoutes } from "./routes/health";

// Routes must stay chained so AppType carries them to the typed client in apps/web.
// When a route needs a database or another service, createApp takes it as an argument:
// see "Adding a service" in README.md.
export function createApp() {
  return new Hono()
    .basePath("/api")
    .use(logger())
    .route("/health", healthRoutes)
    .route("/greetings", greetingsRoutes)
    .notFound((c) => {
      const error: ApiError = { error: "Not found" };
      return c.json(error, 404);
    })
    .onError((cause, c) => {
      console.error(cause);
      const error: ApiError = { error: "Internal server error" };
      return c.json(error, 500);
    });
}

export type AppType = ReturnType<typeof createApp>;
