import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { importX } from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/*.js", "**/*.mjs", "dist/", "universal/", "web/"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "@typescript-eslint/adjacent-overload-signatures": "error",
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/dot-notation": "error",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        {
          accessibility: "no-public",
        },
      ],
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-shadow": [
        "error",
        {
          hoist: "all",
        },
      ],
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/unified-signatures": "error",
    },
  }
);
