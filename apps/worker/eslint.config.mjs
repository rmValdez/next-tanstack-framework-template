import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@workspace/*-db"],
              message:
                "Boundary violation: worker may not import any database package directly. It communicates via the message broker.",
            },
          ],
        },
      ],
    },
  }
);
