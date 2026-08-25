/**
 * check-design-tokens
 *
 * Fails when a source file uses a Tailwind class that names a design token the
 * config does not define.
 *
 * ── Why this exists ──
 * Tailwind does not error on an unknown utility. It simply generates nothing,
 * and a class that generates nothing is indistinguishable from one that works
 * until somebody looks closely at the rendered result.
 *
 * This project has shipped that bug twice. `ease-xn-spring` was used in three
 * files and defined in none — the "spring overshoot" it was supposed to produce
 * was argued over for days and never rendered once. `shadow-xn-ring` was used
 * as the focus indicator on two components and defined in none, which paired
 * with `outline-none` left focused buttons with no visible indicator at all: a
 * WCAG 2.4.7 failure that reached review twice before anyone checked whether
 * the class resolved.
 *
 * ── How it decides ──
 * By asking Tailwind, rather than by reasoning about the config. Every
 * candidate is fed through a real build and the output is searched for the
 * corresponding rule. A class that produces no rule does not exist. This is
 * deliberately the same question the browser asks, so the check cannot drift
 * from the config's actual behaviour the way a hand-maintained token list
 * would.
 *
 * ── Scope, and what it deliberately does not catch ──
 * Only classes containing `-xn-` are checked: the project's own token
 * namespace. That is a precision-over-recall choice. Scanning every
 * class-shaped string would flag arbitrary text and train people to ignore the
 * output, and both historical bugs were in this namespace. A typo in a stock
 * Tailwind utility is not caught here.
 *
 * Comment text is stripped before scanning, because this file and the design
 * notes discuss the very class names that must not exist.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import postcss from "postcss";
import tailwind from "tailwindcss";

const SOURCE_ROOT = "src";
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

/** Utilities in the project's own token namespace, e.g. `shadow-xn-ring`. */
const TOKEN_CLASS = /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*-xn-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;

/**
 * Remove comments so prose about a broken class does not become a finding.
 * This is a lint-input heuristic, not a parser: worst case it removes slightly
 * too much and a real usage goes unchecked, which is the safe direction.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

async function collectCandidates() {
  /** @type {Map<string, Set<string>>} class -> files using it */
  const found = new Map();

  for await (const file of walk(SOURCE_ROOT)) {
    const source = stripComments(await readFile(file, "utf8"));
    for (const match of source.matchAll(TOKEN_CLASS)) {
      const cls = match[0];
      if (!found.has(cls)) found.set(cls, new Set());
      found.get(cls).add(file);
    }
  }

  return found;
}

/**
 * Ask Tailwind which of these classes actually produce a rule.
 *
 * Tailwind is run over the project's real content, so the emitted CSS contains
 * each class exactly as it is used — including its variants.
 *
 * ── Matching a class inside a variant selector ──
 * A class used only with a variant never appears as a bare selector. Written
 * `focus-visible:outline-xn-ink`, it emits
 * `.focus-visible\:outline-xn-ink:focus-visible`, so looking for `.outline-…`
 * finds nothing and the class looks undefined when it is perfectly fine.
 *
 * This is not hypothetical — the first version of this script did exactly that
 * and reported six shipped components as using an undefined focus colour. So
 * the match accepts the class after either a selector dot or the escaped colon
 * that separates a variant from its utility.
 */
async function generatedClasses(classes) {
  const { css } = await postcss([
    tailwind({ config: "./tailwind.config.ts" }),
  ]).process("@tailwind utilities;", { from: undefined });

  const generated = new Set();
  for (const cls of classes) {
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // `.cls` for a bare use, `\:cls` for one behind any variant. The trailing
    // guard stops `shadow-xn` counting as generating `shadow-xn-ring`.
    if (new RegExp(`(?:\\.|\\\\:)${escaped}(?![\\w-])`).test(css)) generated.add(cls);
  }
  return generated;
}

const candidates = await collectCandidates();

if (candidates.size === 0) {
  console.log("check-design-tokens: no token classes found to check.");
  process.exit(0);
}

const generated = await generatedClasses([...candidates.keys()]);
const missing = [...candidates.keys()].filter((c) => !generated.has(c)).sort();

if (missing.length === 0) {
  console.log(
    `check-design-tokens: ${candidates.size} token classes checked, all resolve.`
  );
  process.exit(0);
}

/**
 * Severity splits on whether the code ships.
 *
 * The dev routes under `src/app/dev/` are specimen harnesses that never ship,
 * so a dead class there cannot reach a user and must not fail the build. It is
 * still reported, and loudly, because a specimen that silently drops an effect
 * is how a design decision gets made against something that was never on
 * screen — which has happened here more than once.
 */
const shipsInProduct = (file) => !file.startsWith(path.join("src", "app", "dev"));

const report = missing.map((cls) => {
  const files = [...candidates.get(cls)].sort();
  return { cls, files, blocking: files.some(shipsInProduct) };
});

const blocking = report.filter((r) => r.blocking);
const harnessOnly = report.filter((r) => !r.blocking);

const print = (rows, stream) => {
  for (const { cls, files } of rows) {
    stream(`  ${cls}`);
    for (const file of files) stream(`      ${file}`);
  }
};

if (harnessOnly.length > 0) {
  console.warn(
    `\ncheck-design-tokens: ${harnessOnly.length} class(es) generate no CSS, in specimen harnesses only.`
  );
  console.warn("Not shipped, so not blocking — but these effects are not rendering,");
  console.warn("and a specimen missing an effect misrepresents what it is demonstrating.\n");
  print(harnessOnly, (l) => console.warn(l));
}

if (blocking.length > 0) {
  console.error(
    `\ncheck-design-tokens: ${blocking.length} class(es) name a token the config does not define.`
  );
  console.error("These generate NO CSS and fail silently, in shipped code.\n");
  print(blocking, (l) => console.error(l));
  console.error(
    "\nEither define the token in tailwind.config.ts or correct the class name.\n"
  );
  process.exit(1);
}

console.log(
  `\ncheck-design-tokens: ${candidates.size} token classes checked, none missing in shipped code.`
);
process.exit(0);
