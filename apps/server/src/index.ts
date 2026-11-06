import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadEnv } from "./env";

// The one place that touches Node, the environment and service clients. When the app needs a
// database or another service, create its client here and pass it into createApp.
const env = loadEnv(process.env);
const app = createApp();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`server listening on http://localhost:${info.port}`);
});

// Docker sends SIGTERM on stop: finish open requests, then exit.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
