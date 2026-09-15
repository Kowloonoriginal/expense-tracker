import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Scoped to the frontend only — the backend has no JSX/hooks to check.
    files: ["apps/frontend/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Cherry-picked rather than the plugin's "recommended" preset: v7
      // ships a much larger React-Compiler-oriented ruleset (set-state-in-effect,
      // purity, immutability, ...) that flags patterns this codebase relies on
      // deliberately (e.g. SessionProvider's setUser-in-effect). These two are
      // the classic pair that actually catches the bug class we're after —
      // stale closures over changed values, and hooks called conditionally.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // jsx-a11y has no flat-config export yet; reusing its legacy rule
      // severities directly still works since flat config only needs
      // `plugins` (rule implementations) + `rules` (severities) — the parts
      // its `configs.recommended` object actually provides.
      ...jsxA11y.configs.recommended.rules,
    },
  }
);
