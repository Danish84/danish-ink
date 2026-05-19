import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Default environment is node — existing tests rely on this.
    // Component tests opt into jsdom via the per-file
    // `// @vitest-environment jsdom` directive.
    environment: "node",
    globals: false,
  },
});
