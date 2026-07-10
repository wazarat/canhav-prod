import type { Config } from "jest";

/**
 * Jest config for the live-data server clients.
 *
 * - Unit/all:        `npm test`                 (green offline; integration suites self-skip)
 * - Integration:     `RUN_INTEGRATION=1 npm run test:integration`
 *
 * Integration tests hit real third-party APIs, so they are guarded by the
 * RUN_INTEGRATION env var inside each suite. Outbound HTTP is blocked in the
 * sandbox — run them with the sandbox disabled.
 */
const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/lib"],
  testMatch: ["<rootDir>/lib/server/**/*.test.ts", "<rootDir>/lib/agent/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // ts-jest needs CommonJS output for the Node test runner.
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // Mirror the `@/*` -> `./*` path alias from tsconfig.json.
    "^@/(.*)$": "<rootDir>/$1",
    // `import "server-only"` throws outside a real RSC context — stub it.
    "^server-only$": "<rootDir>/test/serverOnlyStub.ts",
  },
  // Live APIs can be slow; give integration calls room before failing.
  testTimeout: 30_000,
};

export default config;
