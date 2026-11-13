import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores (an object with ONLY `ignores`). Putting ignores inside a
  // rules object does NOT exclude files from other configs, which is why the
  // minified dist bundle was getting linted.
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: {
        Bun: "readonly",
        console: "readonly",
        document: "readonly",
        localStorage: "readonly",
        process: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
