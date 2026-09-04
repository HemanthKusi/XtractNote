/**
 * ESLint flat configuration.
 *
 * The framework's bundled `lint` subcommand was removed in the current major
 * version, which left `npm run lint` failing before it linted anything and no
 * configuration file in the project at all. This file restores linting and the
 * script now invokes ESLint directly.
 *
 * The shipped configs are consumed as flat arrays and spread in order; anything
 * below them is a deliberate project decision, and every rule carries a reason.
 */

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

import noUnresolvedStyleVar from "./eslint-rules/no-unresolved-style-var.mjs";

const config = [
  // Generated output and dependencies. Kept in its own object so it applies
  // globally rather than to a single config block.
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "*.tsbuildinfo",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    /**
     * The shipped config sets the React version to 'detect'. That detection
     * path calls a context method ESLint removed in its current major, so the
     * whole run crashes before linting a single file. Pinning the version
     * explicitly skips detection entirely — and an explicit version is the
     * better setting regardless.
     *
     * Keep this in step with the react dependency in package.json.
     */
    settings: {
      react: { version: "18.3" },
    },
  },

  {
    /**
     * Project-local rules, defined in `eslint-rules/` and registered inline.
     * Flat config takes a plugin as a plain object, so a rule the project needs
     * for itself does not have to become a published package first.
     */
    plugins: {
      xn: { rules: { "no-unresolved-style-var": noUnresolvedStyleVar } },
    },
    rules: {
      /**
       * A style reference that resolves to nothing generates nothing, fails
       * silently, and is indistinguishable from working code. It has cost this
       * project four bugs — two design decisions argued over effects that never
       * rendered, one focus indicator that left a WCAG failure, and a brand mark
       * that shipped without its logo.
       *
       * This catches the fourth shape: `var()` with no fallback in a paint
       * attribute. See the rule file for why it is a rule rather than a
       * selector.
       */
      "xn/no-unresolved-style-var": "error",
    },
  },

  {
    rules: {
      /**
       * The project's own standards, enforced rather than remembered.
       * These mirror the code-quality rules the repo already works to:
       * no `any`, no assertions that silence the compiler, no suppression
       * comments, and no unused code left lying around.
       */

      // `any` erases the type safety the discriminated-result pattern depends on.
      "@typescript-eslint/no-explicit-any": "error",

      // A non-null assertion silences the compiler rather than proving the case.
      "@typescript-eslint/no-non-null-assertion": "error",

      // Suppression comments hide real errors. `expect-error` is allowed only
      // with a written justification, so the reason survives in the diff.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true },
      ],

      // Unused code is dead weight. Leading underscore is the escape hatch for
      // intentionally-ignored bindings, which destructuring makes common.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      /**
       * NOT enabled: no-floating-promises, which would catch the unhandled
       * promise on a click handler that bit the extension's launch button.
       * It needs type-aware linting, which means wiring the TypeScript project
       * into the parser and accepting a slower run. Worth doing deliberately
       * rather than as a rider on restoring the command.
       */

      // Console noise ships to production. Warnings and errors are legitimate.
      "no-console": ["error", { allow: ["warn", "error"] }],

      /**
       * Deliberately OFF, not merely unconfigured.
       *
       * This rule flags any setState inside an effect body. Every occurrence
       * in this codebase is the same shape: set a loading flag, then start an
       * async fetch. That is the correct way to express "this surface is now
       * loading", and it is what every async page here does.
       *
       * The rule exists to catch cascading renders — an effect that sets state
       * which triggers another effect which sets more state. None of the
       * flagged sites do that; each sets a flag once and then awaits.
       *
       * Turned off rather than downgraded to a warning, because a permanent
       * seven-item warning list trains people to ignore the whole report.
       * Revisit if a genuine render cascade ever appears.
       */
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    /**
     * Build tooling, not shipped code. `no-console` exists to keep logging out
     * of the product; a command-line check whose entire output IS its report is
     * the one place printing to stdout is the point. Scoped to these two
     * directories rather than weakening the rule everywhere.
     *
     * This block must stay LAST. Flat config resolves in order and the later
     * object wins, so placing it above the block that sets `no-console` would
     * see the exception silently overridden — which is exactly what happened on
     * the first attempt.
     */
    files: ["scripts/**/*.mjs", "eslint-rules/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
