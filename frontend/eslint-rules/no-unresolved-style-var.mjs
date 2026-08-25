/**
 * no-unresolved-style-var
 *
 * Flags a `var()` in an SVG paint attribute — `fill`, `stroke`, and the
 * gradient/filter colour attributes that behave the same way — that is not
 * guaranteed to resolve.
 *
 * ── Why this rule exists ──
 * A custom property that is never set makes its declaration *invalid at
 * computed-value time*. The property does not fall back to something sensible:
 * `fill` is inherited, so it takes whatever the parent svg has — usually
 * `none`. The shape then renders as nothing at all.
 *
 * That is the failure this rule catches, and it has happened here. The YouTube
 * mark's knocked-out play triangle used `var(--xn-yt-knock)` with no fallback.
 * Its caller sets that property only on hover, focus and selection, so at rest
 * the triangle vanished and the mark shipped as a plain red rectangle.
 *
 * It is a nasty class of bug for three reasons: it fails to *nothing* rather
 * than to a wrong colour, so it reads as a missing asset; it is invisible in
 * review, because the code looks correct; and it can be correct-by-accident for
 * as long as every caller happens to set the property, only breaking when a new
 * caller does not.
 *
 * ── What "guaranteed to resolve" means ──
 * `var(--a)` is safe only when `--a` is always set. `var(--a, F)` is safe when
 * `F` is always safe, whatever `--a` does. So the question recurses down the
 * fallback chain, and the chain has to bottom out in something that cannot
 * fail: either a literal value, or a token defined on `:root`.
 *
 * The `:root` token names are read from the stylesheet rather than hardcoded,
 * so this cannot drift from the design system. Tokens set on a theme selector
 * are redefinitions of names `:root` already establishes, which is why the
 * baseline is the honest place to read.
 *
 * ── Why the simpler versions are wrong ──
 * "Require a fallback" misses `var(--a, var(--b))` where `--b` is also
 * conditional: both unset is still invalid.
 *
 * "Require the chain to end in a literal" is worse — it rejects
 * `var(--xn-yt-knock, var(--xn-surface))`, which is correct precisely because
 * `--xn-surface` is a root token that is always set. That pattern is the fix
 * this rule exists to protect, so a rule that failed it would be worked around
 * or switched off within a week.
 *
 * And a `no-restricted-syntax` selector cannot express any of this: deciding
 * where one `var()` ends needs real parenthesis matching, which a regex does
 * not do.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Attributes whose value is painted, where an unresolved var renders nothing. */
const PAINT_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "stopColor",
  "floodColor",
  "lightingColor",
]);

const STYLESHEET = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "app",
  "globals.css"
);

/**
 * Custom properties defined in a `:root` block — the ones guaranteed to be set
 * on every element, so a `var()` naming one cannot fail to resolve.
 *
 * If the stylesheet cannot be read the set is empty, which makes the rule
 * stricter rather than laxer: every bare `var()` is then reported. Failing
 * loudly beats silently passing everything, which is the whole subject here.
 */
function readRootTokens() {
  let css;
  try {
    css = readFileSync(STYLESHEET, "utf8");
  } catch {
    return new Set();
  }

  const tokens = new Set();
  // Each `:root { … }` block, then every custom property declared inside it.
  for (const block of css.matchAll(/:root[^{]*\{([^}]*)\}/g)) {
    for (const decl of block[1].matchAll(/(--[\w-]+)\s*:/g)) tokens.add(decl[1]);
  }
  return tokens;
}

let rootTokenCache = null;
const rootTokens = () => (rootTokenCache ??= readRootTokens());

/**
 * Split a `var()` body into its property name and its fallback text.
 * Returns null when `value` does not start a well-formed var() at `start`.
 */
function readVarCall(value, start) {
  let depth = 0;
  let splitAt = -1;

  for (let i = start + 3; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        const body = value.slice(start + 4, i);
        const cut = splitAt === -1 ? -1 : splitAt - (start + 4);
        return {
          text: value.slice(start, i + 1),
          name: (cut === -1 ? body : body.slice(0, cut)).trim(),
          fallback: cut === -1 ? null : body.slice(cut + 1).trim(),
          end: i,
        };
      }
    } else if (ch === "," && depth === 1 && splitAt === -1) {
      // Only the FIRST top-level comma separates name from fallback; later
      // ones belong to the fallback itself, e.g. `var(--a, rgb(0, 0, 0))`.
      splitAt = i;
    }
  }

  return null;
}

/**
 * Return the first `var()` in `value` that is not guaranteed to resolve, or
 * null when every one of them is safe.
 */
export function findUnresolvableVar(value, guaranteed = rootTokens()) {
  for (let i = 0; i < value.length; i += 1) {
    if (!value.startsWith("var(", i)) continue;

    const call = readVarCall(value, i);
    // An unterminated var() is malformed CSS; leave that to the CSS tooling.
    if (!call) return null;

    if (call.fallback === null) {
      // Safe only if the property itself is always set.
      if (!guaranteed.has(call.name)) return call.text;
    } else {
      // Safe if the fallback is safe — a literal always is, a nested var()
      // has to answer the same question.
      const inner = findUnresolvableVar(call.fallback, guaranteed);
      if (inner) return call.text;
    }

    i = call.end;
  }

  return null;
}

/** Read a literal string out of an attribute value, or null if it is dynamic. */
function staticValueOf(node) {
  if (!node) return null;

  // fill="var(--x)"
  if (node.type === "Literal" && typeof node.value === "string") return node.value;

  if (node.type === "JSXExpressionContainer") {
    const inner = node.expression;

    // fill={"var(--x)"}
    if (inner.type === "Literal" && typeof inner.value === "string") return inner.value;

    // fill={`var(--x)`} — only when nothing is interpolated, since an
    // interpolated value cannot be checked statically.
    if (inner.type === "TemplateLiteral" && inner.expressions.length === 0) {
      return inner.quasis[0]?.value.cooked ?? null;
    }
  }

  return null;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require var() in SVG paint attributes to be guaranteed to resolve, since an unset custom property renders nothing.",
    },
    schema: [],
    messages: {
      unresolvable:
        "{{call}} is not guaranteed to resolve. If nothing sets it the declaration is invalid at computed-value time, `{{attr}}` inherits (usually `none`) and the shape renders as nothing. End the fallback chain in a literal or a :root token, e.g. var(--{{name}}, var(--xn-surface)).",
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (!PAINT_ATTRIBUTES.has(node.name.name)) return;

        const value = staticValueOf(node.value);
        if (!value) return;

        const offending = findUnresolvableVar(value);
        if (!offending) return;

        const call = readVarCall(offending, 0);

        context.report({
          node: node.value ?? node,
          messageId: "unresolvable",
          data: {
            call: offending,
            name: (call?.name ?? "").replace(/^--/, ""),
            attr: node.name.name,
          },
        });
      },
    };
  },
};

export default rule;
