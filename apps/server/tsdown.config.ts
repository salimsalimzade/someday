import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  format: "esm",
  dts: false,
  // Bundle every dependency so the production image only needs dist/.
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
});
