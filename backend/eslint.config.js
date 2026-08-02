const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
