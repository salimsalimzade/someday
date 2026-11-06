import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const client = testClient(createApp());

describe("GET /api/health", () => {
  it("reports ok with the uptime", async () => {
    const response = await client.api.health.$get();
    expect(response.status).toBe(200);

    const health = await response.json();
    expect(health.status).toBe("ok");
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });
});
