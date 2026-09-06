import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Returning an empty value from a catch block, in the data layer, is the single
 * most repeated bug in this codebase.
 *
 * It has been found and fixed in the vote count, the voter list, the resources
 * editor (where it let a save delete every link an owner had), the categories
 * index, the browse page, the profile lookup and the admin owner check --
 * seven places, same shape. `[]` and `{}` mean "there are none". A failed read
 * means "we don't know". Collapsing them turns an outage into a confident false
 * statement, and documenting the rule in MIND.md #2 did not stop it recurring.
 *
 * So it is a lint error now, in `src/data` and `src/lib` where the distinction
 * always matters. Throw, or return an explicit unknown state. Pages may still
 * degrade -- `generateStaticParams` legitimately returns [] -- which is why the
 * rule is scoped rather than global.
 */
const noEmptyOnError = {
  files: ["src/data/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "CatchClause ReturnStatement > ArrayExpression[elements.length=0]",
        message:
          "Don't return [] from a catch block here: it makes a failed read indistinguishable from an empty result. Throw, or return an explicit unknown state (null / a status union). See docs/MIND.md #2.",
      },
      {
        selector: "CatchClause ReturnStatement > ObjectExpression[properties.length=0]",
        message:
          "Don't return {} from a catch block here: it makes a failed read indistinguishable from an empty result. Throw, or return an explicit unknown state. See docs/MIND.md #2.",
      },
    ],
  },
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  noEmptyOnError,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
