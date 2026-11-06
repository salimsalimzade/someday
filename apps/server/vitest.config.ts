import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests read the same .env as `pnpm dev`.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Request logs only show up for tests that fail.
    silent: "passed-only",
  },
});
