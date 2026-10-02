"use client";

// ─────────────────────────────────────────────────────────────
// Typeface specimens — TEMPORARY
// ─────────────────────────────────────────────────────────────
// http://localhost:3000/dev/typefaces
//
// Every family in the registry, set twice: once at heading size and once at the
// 17.5px reading measure the output surface uses.
//
// ── Why both sizes, and why that is the whole point ──
//
// A display face looks magnificent at 44px and falls apart as body text, and
// nothing about its name tells you which it is. Setting each family at the size
// it would actually have to survive turns "which of these can carry a document"
// into something you decide by looking rather than by argument.
//
// The paragraph is the same in every row on purpose. Changing the words changes
// the judgement, and the question here is the face.

import { useTheme } from "@/components/shared/theme-provider";
import { facesByCategory, faceStack, FACES, type FaceCategory } from "@/lib/fonts";

/** Same words everywhere, so the only variable is the face. */
const SAMPLE =
  "Each token emits three projections of itself. The names are borrowed from " +
  "databases and are not especially helpful, so learn them by what they do.";

const HEADING_SAMPLE = "Scaled dot-product attention";

const CATEGORY_LABEL: Record<FaceCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
  display: "Display",
  script: "Script",
};

export default function TypefacesPage() {
  const { theme, setTheme } = useTheme();
  const groups = facesByCategory();

  return (
    <div className="min-h-screen bg-xn-bg py-10">
      <div className="mx-auto max-w-[1030px] px-6">
        <div className="mb-8 flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-[40px] leading-tight text-xn-ink">Typefaces</h1>
          <span className="font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
            {FACES.length} families · {FACES.filter((f) => f.preloaded).length} preloaded
          </span>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-auto rounded-xn-sm px-2 py-1 font-mono text-micro text-xn-ink-muted transition-colors duration-xn ease-xn hover:text-xn-ink"
          >
            {theme === "dark" ? "→ light" : "→ dark"}
          </button>
        </div>

        {/* The claim under test, stated so the page can be checked against it
            rather than admired. */}
        <p className="mb-10 max-w-[68ch] text-[15px] leading-relaxed text-xn-ink-muted">
          Every family below is self-hosted at build time. Only the three the base
          design paints with are preloaded — the rest define their variable and
          are fetched the moment something first sets text in them, which is what
          keeps a catalogue this size off the critical path.
        </p>

        {groups.map((group) => (
          <section key={group.category} className="mb-12">
            <h2 className="mb-5 font-mono text-micro uppercase tracking-widest text-xn-ink-soft">
              {CATEGORY_LABEL[group.category]} · {group.faces.length}
            </h2>

            <div className="space-y-8">
              {group.faces.map((face) => (
                <article
                  key={face.id}
                  data-face={face.id}
                  className="border-t border-xn-border pt-5"
                >
                  <div className="mb-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-xn-ink">{face.name}</span>
                    <code className="font-mono text-micro text-xn-ink-soft">{face.id}</code>
                    {face.preloaded && (
                      <span className="rounded-xn-pill bg-xn-surface-alt px-2 py-0.5 font-mono text-micro text-xn-ink-muted">
                        preloaded
                      </span>
                    )}
                  </div>

                  {/* Heading size: what the face was probably designed for. */}
                  <p
                    className="mb-2 leading-tight text-xn-ink"
                    style={{ fontFamily: faceStack(face), fontSize: 40 }}
                  >
                    {HEADING_SAMPLE}
                  </p>

                  {/* The reading measure the output surface actually uses. A row
                      that becomes unreadable here is a display face, whatever
                      the category says. */}
                  <p
                    className="max-w-[68ch] text-xn-ink"
                    style={{ fontFamily: faceStack(face), fontSize: 17.5, lineHeight: 1.72 }}
                  >
                    {SAMPLE}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
