import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const client = testClient(createApp());

describe("GET /api/greetings/:name", () => {
  it("greets the name in title case", async () => {
    const response = await client.api.greetings[":name"].$get({ param: { name: "ada lovelace" } });
    expect(response.status).toBe(200);

    expect(await response.json()).toMatchObject({
      message: "Hello, Ada Lovelace!",
      createdAt: expect.any(String),
    });
  });

  it("trims the name", async () => {
    const response = await client.api.greetings[":name"].$get({ param: { name: "  ada" } });
    expect(await response.json()).toMatchObject({ message: "Hello, Ada!" });
  });

  it("returns 400 for a name over 40 characters", async () => {
    const response = await client.api.greetings[":name"].$get({ param: { name: "a".repeat(41) } });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Name must be 1 to 40 characters." });
  });
});
