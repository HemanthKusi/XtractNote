// ─────────────────────────────────────────────────────────────
// HowItWorks
// ─────────────────────────────────────────────────────────────
// Landing page section explaining the 5-step AI pipeline in
// friendly, non-technical language.
//
// Layout:
//   - Alternate background band (surface-alt) with borders
//   - Left-aligned text block: eyebrow, heading, description
//   - 5 numbered circles connected by a horizontal line
//
// The five steps map to the LangGraph pipeline:
//   01 Fetching the video    → Scout agent
//   02 Reading the transcript → Reader agent
//   03 Understanding the topic → Topic agent
//   04 Drafting your content  → Router + Drafter agents
//   05 Polishing & saving     → Polish + Save agents
//
// Design reference: hifi-pages-a.jsx lines 98–128
// ─────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
    { number: "01", label: "Fetching the video" },
    { number: "02", label: "Reading the transcript" },
    { number: "03", label: "Understanding the topic" },
    { number: "04", label: "Drafting your content" },
    { number: "05", label: "Polishing & saving" },
  ];
  
  export function HowItWorks() {
    return (
      <section
        id="how-it-works"
        className="
          border-t border-b border-[var(--border)]
          bg-[var(--surface-alt)]
          px-6 py-16
          md:px-12 md:py-[64px]
        "
      >
        <div className="mx-auto max-w-[1100px]">
  
          {/* ── Eyebrow label ──
              Larger than the default .eyebrow utility (11px)
              for better landing page visibility. Same styling
              otherwise: mono, uppercase, accent color. */}
          <div
            className="
              font-mono text-[13px] font-medium uppercase
              tracking-[0.08em] text-[var(--xn-accent)]
            "
          >
            How it works
          </div>
  
          {/* ── Heading ── */}
          <h2
            className="
              mt-3 max-w-[580px]
              font-serif text-4xl leading-[1.15] tracking-tight
              md:text-[42px]
            "
          >
            Five small agents, one good answer.
          </h2>
  
          {/* ── Description ── */}
          <p className="mt-3 max-w-[500px] text-base leading-relaxed text-[var(--ink-muted)] md:text-lg">
            Each agent does one job and hands off to the next. You only see
            five friendly steps; the work happens in the background.
          </p>
  
          {/* ── Pipeline steps ──
              The grid creates 5 equal columns. A horizontal line
              connects all circles. Each circle sits on top of the
              line with z-index and a matching bg that "covers" the
              line behind it, creating the pipeline appearance. */}
          <div className="relative mt-12 grid grid-cols-5">
  
            {/* Horizontal connecting line — uses border-t-2 with
                the same border-strong color as the circles so they
                match visually. Inset 10% on each side so the line
                starts/ends at the center of first/last circles.
                top: 19px = just below center of 40px circle. */}
            <div
              className="absolute left-[10%] right-[10%] border-t-2 border-[var(--border-strong)]"
              style={{ top: 19 }}
            />
  
            {/* Individual steps */}
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.number}
                className="relative z-[1] flex flex-col items-center text-center"
              >
                {/* Numbered circle — bg uses --xn-surface-alt
                    (the actual CSS variable) so it fills with the
                    section background and covers the line behind it */}
                <div
                  className="
                    flex h-[40px] w-[40px] items-center justify-center
                    rounded-full
                    border border-[var(--border-strong)]
                    bg-[var(--xn-surface-alt)]
                    font-mono text-xs font-medium text-[var(--ink-muted)]
                  "
                >
                  {step.number}
                </div>
  
                {/* Step label */}
                <div className="mt-3 max-w-[140px] text-[14px] font-medium leading-snug">
                  {step.label}
                </div>
              </div>
            ))}
          </div>
  
        </div>
      </section>
    );
  }