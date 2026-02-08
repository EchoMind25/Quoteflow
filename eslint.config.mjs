import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

// Extract the @typescript-eslint plugin from the next/typescript config
const tsConfig = nextCoreWebVitals.find((c) => c.name === "next/typescript");

const eslintConfig = [
  { ignores: ["public/**", ".next/**"] },
  ...nextCoreWebVitals,
  prettier,
  {
    plugins: {
      "@typescript-eslint": tsConfig.plugins["@typescript-eslint"],
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
