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

/**
 * `toLocaleDateString` / `toLocaleString` render differently on the server than
 * in the browser — different locale, different time zone — and this app renders
 * the same components in both. React treats the difference as a failed
 * hydration: it throws away the server markup for that subtree, re-renders on
 * the client and logs an error, so the version search engines read is the one
 * that got discarded.
 *
 * It is not a hypothetical. `DomainCard` is a client component rendered from
 * three server components, and it formatted a creation date this way.
 *
 * `src/lib/format.ts` owns these formats now and derives them from UTC parts,
 * so the same input gives the same string in every runtime.
 */
const noLocaleFormatting = {
  files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[property.name=/^toLocale(Date|Time)?String$/]",
        message:
          "Locale formatting differs between the server and the browser, which breaks hydration. Use formatUtcDate, formatUtcDateFromSeconds or formatCount from @/lib/format. See docs/MIND.md #17.",
      },
    ],
  },
};

/**
 * Domain URLs are built by `@/lib/domainName`, never by hand.
 *
 * They were built inline in eleven places, three different ways -- six encoded
 * the name, five did not, only one normalised it -- so the canonical tag, the
 * og:url, the sitemap entry and the links for one page could be four different
 * strings. `/domain/[name]` redirects anything not already canonical, which
 * turns that into self-inflicted redirects and a canonical tag that contradicts
 * itself.
 *
 * The rule exists because consolidating them by hand **missed one**: the survey
 * grep filtered out `/domain/update/`, and a twelfth call site in
 * `DomainInfoPanel` survived the pass that was specifically about this. A rule
 * finds the one a careful grep does not.
 */
const noInlineDomainUrls = {
  // No exemption for robots.txt, which also contains "/domain/update/": the
  // selector matches template literals only, and that file uses a plain string
  // for a disallow prefix rather than building a URL. An ignore entry there
  // would be config that never does anything.
  files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        // The backslashes are doubled because this selector lives in a JS
        // string: esquery needs to receive /^\/domain\//, so the source must
        // carry \\/. Written singly it becomes /^/domain//, which is not a
        // valid selector and takes the whole lint run down with it.
        selector: "TemplateLiteral[quasis.0.value.raw=/^\\/domain\\//]",
        message:
          "Build domain URLs with domainProfilePath / domainProfileUrl / domainUpdatePath from @/lib/domainName, so the canonical tag, the sitemap and the links cannot disagree. See docs/MIND.md #17.",
      },
    ],
  },
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  noEmptyOnError,
  noLocaleFormatting,
  noInlineDomainUrls,
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
