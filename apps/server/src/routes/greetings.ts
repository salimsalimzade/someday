import { greetingParamsSchema } from "@bedrock/schemas";
import type { Greeting } from "@bedrock/types";
import { toTitleCase } from "@bedrock/utils";
import { Hono } from "hono";
import { validate } from "../lib/validate";

export const greetingsRoutes = new Hono().get(
  "/:name",
  validate("param", greetingParamsSchema),
  (c) => {
    const { name } = c.req.valid("param");

    const greeting: Greeting = {
      message: `Hello, ${toTitleCase(name)}!`,
      createdAt: new Date().toISOString(),
    };

    return c.json(greeting, 200);
  },
);
