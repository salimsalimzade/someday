import type { ApiError } from "@bedrock/types";
import { vValidator } from "@hono/valibot-validator";
import type { ValidationTargets } from "hono";
import type { GenericSchema } from "valibot";

/** Valibot validator middleware that answers a failed check with a 400 in the shared ApiError shape. */
export function validate<Target extends keyof ValidationTargets, Schema extends GenericSchema>(
  target: Target,
  schema: Schema,
) {
  return vValidator(target, schema, (result, c) => {
    if (!result.success) {
      // Annotate the body, not c.json<ApiError>: an explicit type argument stops the 400 from being inferred.
      const error: ApiError = { error: result.issues[0].message };
      return c.json(error, 400);
    }
  });
}
