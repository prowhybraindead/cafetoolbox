/**
 * CafeToolbox - Next.js ESLint Config
 */
const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:only-warn/recommended",
    "plugin:turbo/recommended",
  ],
  plugins: ["@typescript-eslint", "only-warn", "turbo"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [".next/", "node_modules/", "dist/", ".turbo/"],
  rules: {
    // TypeScript
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",

    // Next.js
    "@next/next/no-html-link-for-pages": "off",
  },
};
