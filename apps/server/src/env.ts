import * as v from "valibot";

/**
 * The server's environment variables. `pnpm dev` reads them from .env; Docker sets them in
 * docker-compose.yml. A new variable also goes in .env.example and in the `dev` task's
 * `passThroughEnv` in turbo.json.
 */
const envSchema = v.object({
  PORT: v.optional(
    v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1), v.maxValue(65_535)),
    "3000",
  ),
});

export type Env = v.InferOutput<typeof envSchema>;

/** Checks the environment once at startup and exits with a readable list of what's wrong. */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = v.safeParse(envSchema, source);

  if (!result.success) {
    console.error(
      `Invalid environment (see apps/server/.env.example):\n${v.summarize(result.issues)}`,
    );
    process.exit(1);
  }

  return result.output;
}
