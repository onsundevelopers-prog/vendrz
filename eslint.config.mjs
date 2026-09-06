import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",

      // Third-party generated JS bundled into node_modules.
      "node_modules/**/*.js",

      // Separate demo-video tutorial repo - not the n4ma product.
      "saas-product-demo-video/**/*.tsx",
      "saas-product-demo-video/**/*.ts",

      // Community skill source - not the n4ma product.
      "skills/**/*.ts",
      "skills/**/*.tsx",

      // Build/dev scripts - not the n4ma product.
      "scripts/**/*.mjs",
      "scripts/**/*.js",
    ],
  },
]);

export default eslintConfig;
