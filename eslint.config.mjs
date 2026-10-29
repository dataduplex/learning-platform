import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["coverage/**"]),
  {
    // No pages directory here for the rule to scan.
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    files: ['components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Use a seeded generator from the course library. Visuals must be reproducible.',
        },
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/]",
          message: 'No hex literals. Use a CSS custom property or a palette scale.',
        },
        {
          // The selector above is anchored, so it fires only on a string that IS a
          // hex. A Tailwind arbitrary value hides one inside a long className and
          // slips through; this second selector catches it.
          selector: "Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/]",
          message: 'No hex inside a Tailwind arbitrary value. Use a token class or a custom property.',
        },
      ],
    },
  },
  {
    // The edge runtime calls routeCourse by name; nothing imports it.
    files: ['scripts/infra/course-routing.js'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
]);

export default eslintConfig;
