import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // 1. Global Ignores: Exclude test runners, Next build artifacts, and output caches
  globalIgnores([
    ".next/**",
    "tests/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 2. Next.js Core Web Vitals & TypeScript rules
  ...nextVitals,
  ...nextTs,
  // 3. Project rule adjustments for clean prototyping
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;