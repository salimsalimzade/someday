import type { AppType } from "@bedrock/server";
import type { ApiError } from "@bedrock/types";
import { DetailedError, hc, parseResponse } from "hono/client";

/** Typed client for apps/server. Paths and response types come from its AppType. */
export const client = hc<AppType>("/");

// hc puts `param` values into the path as they are, so encode any value a user typed:
// otherwise "a/b" or "what?" would change the URL itself.

export function fetchHealth() {
  return parseResponse(client.api.health.$get());
}

export function fetchGreeting(name: string) {
  return parseResponse(
    client.api.greetings[":name"].$get({ param: { name: encodeURIComponent(name) } }),
  );
}

/** The server's ApiError message when there is one, otherwise the error's own message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof DetailedError) {
    const data = error.detail?.data as Partial<ApiError> | undefined;
    if (typeof data?.error === "string") return data.error;
  }

  return error instanceof Error ? error.message : String(error);
}
