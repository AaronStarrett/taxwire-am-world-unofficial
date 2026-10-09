import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "public-release-identity",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "release.json",
          source: JSON.stringify(
            {
              format: "taxwire-world-release",
              edition: "city-relationships-2026-10",
              commit: /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || "")
                ? process.env.GITHUB_SHA
                : "local-build",
            },
            null,
            2,
          ),
        });
      },
    },
  ],
  base: process.env.VITE_BASE_PATH || "./",
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/three/") ||
            id.includes("node_modules/@react-three/fiber/")
          )
            return "three-vendor";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          )
            return "react-vendor";
        },
      },
    },
  },
  server: { host: "127.0.0.1" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
