import * as v from "valibot";

export const MAX_GREETING_NAME_LENGTH = 40;

const NAME_LENGTH_MESSAGE = `Name must be 1 to ${MAX_GREETING_NAME_LENGTH} characters.`;

/** Params of GET /api/greetings/:name. The server validates with it and the greetings form checks input with it. */
export const greetingParamsSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(NAME_LENGTH_MESSAGE),
    v.maxLength(MAX_GREETING_NAME_LENGTH, NAME_LENGTH_MESSAGE),
  ),
});

export type GreetingParams = v.InferOutput<typeof greetingParamsSchema>;
