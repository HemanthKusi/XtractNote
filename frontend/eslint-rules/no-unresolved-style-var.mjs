/**
 * no-unresolved-style-var
 *
 * Flags a `var()` with no fallback in an SVG paint attribute — `fill`,
 * `stroke`, and the gradient/filter colour attributes that behave the same way.
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
 * review because the code looks correct; and it can be correct-by-accident for
 * as long as every caller happens to set the property, only breaking when a new
 * caller does not.
 *
 * ── Why not a `no-restricted-syntax` selector ──
 * The obvious regex is wrong. A correct value like
 * `var(--a, var(--b))` contains the substring `var(--b)`, which any naive
 * "var() without a comma" pattern flags as a violation. Deciding this needs
 * real parenthesis matching, which a selector cannot do — so the rule below
 * finds each top-level `var()` and checks that one for a fallback.
 */

/** Attributes whose value is painted, where an unresolved var renders nothing. */
const PAINT_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "stopColor",
  "floodColor",
  "lightingColor",
]);

/**
 * True when every top-level `var()` in `value` supplies a fallback.
 *
 * Only the OUTERMOST var() needs one: in `var(--a, var(--b))` the inner call is
 * itself the fallback, so it is allowed to be bare. Depth tracking is what
 * separates the two cases, and is why this is not a regex.
 */
export function findBareVar(value) {
  for (let i = 0; i < value.length; i += 1) {
    if (!value.startsWith("var(", i)) continue;

    // Walk to this var()'s matching close paren, tracking nesting so a comma
    // belonging to an inner function is not mistaken for this one's fallback.
    let depth = 0;
    let hasFallback = false;
    let end = -1;

    for (let j = i + 3; j < value.length; j += 1) {
      const ch = value[j];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      } else if (ch === "," && depth === 1) {
        hasFallback = true;
      }
    }

    // An unterminated var() is malformed CSS; leave it to the CSS tooling
    // rather than reporting it as a missing fallback.
    if (end === -1) return null;
    if (!hasFallback) return value.slice(i, end + 1);

    // This one is fine. Skip past it — anything inside was its fallback, and a
    // bare var() there is legitimate.
    i = end;
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
        "Require a fallback on var() in SVG paint attributes, where an unset custom property renders nothing.",
    },
    schema: [],
    messages: {
      bareVar:
        "{{call}} has no fallback. If --{{name}} is ever unset the declaration is invalid at computed-value time, `{{attr}}` inherits (usually `none`) and the shape renders as nothing. Give it a fallback: var(--{{name}}, var(--xn-surface)).",
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (!PAINT_ATTRIBUTES.has(node.name.name)) return;

        const value = staticValueOf(node.value);
        if (!value) return;

        const bare = findBareVar(value);
        if (!bare) return;

        context.report({
          node: node.value ?? node,
          messageId: "bareVar",
          data: {
            call: bare,
            name: bare.slice(6, -1).trim(),
            attr: node.name.name,
          },
        });
      },
    };
  },
};

export default rule;
