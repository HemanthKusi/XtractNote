/**
 * XtractNote Landing Page
 *
 * This is a temporary placeholder to verify the frontend is working.
 * We'll replace this with the full landing page in Phase 4.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-xn-bg px-4">
      {/* Logo placeholder */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-xn-ink">
        <span className="font-serif text-2xl text-xn-bg">X</span>
      </div>

      {/* Title */}
      <h1
        className="mb-3 text-center text-4xl tracking-tight text-xn-ink"
        style={{ fontFamily: "var(--font-instrument-serif, 'Instrument Serif', Georgia, serif)" }}
      >
        XtractNote
      </h1>

      {/* Subtitle */}
      <p className="mb-8 max-w-md text-center text-base text-xn-ink-muted">
        Transform YouTube videos into blog posts, study notes, summaries,
        and research — powered by multi-agent AI.
      </p>

      {/* Verification badges */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-pill bg-content-blog/10 px-3 py-1.5 font-mono text-xs text-content-blog">
          Next.js ✓
        </span>
        <span className="rounded-pill bg-content-notes/10 px-3 py-1.5 font-mono text-xs text-content-notes">
          Tailwind ✓
        </span>
        <span className="rounded-pill bg-content-summary/10 px-3 py-1.5 font-mono text-xs text-content-summary">
          Fonts ✓
        </span>
        <span className="rounded-pill bg-content-research/10 px-3 py-1.5 font-mono text-xs text-content-research">
          Theme ✓
        </span>
      </div>

      {/* Phase indicator */}
      <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-xn-ink-ghost">
        Phase 2 — Setup verified
      </p>
    </main>
  );
}
