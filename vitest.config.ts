import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      include: ["src/lib/proofrun/**/*.ts", "src/worker/**/*.ts"],
    },
  },
});

