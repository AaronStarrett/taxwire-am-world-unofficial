import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  testMatch: process.env.TRANSFER_INPUT
    ? [
        "game.spec.ts",
        "guided-day.spec.ts",
        "compatibility.spec.ts",
        "hosted-transfer.spec.ts",
      ]
    : ["game.spec.ts", "guided-day.spec.ts", "compatibility.spec.ts"],
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: ".local/evidence/browser-results.json" }],
  ],
  outputDir: ".local/test-results",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:4173/",
    headless: true,
  },
  webServer: process.env.TEST_BASE_URL?.startsWith("https:")
    ? undefined
    : {
        command: "node scripts/serve.mjs 4173",
        url: process.env.TEST_BASE_URL || "http://127.0.0.1:4173/",
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
});
