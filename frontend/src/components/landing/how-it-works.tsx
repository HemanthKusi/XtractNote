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
  
          {/* ── Eyebrow label ── */}
          <div className="eyebrow">How it works</div>
  
          {/* ── Heading ── */}
          <h2 className="mt-2 max-w-[520px] font-serif text-3xl leading-[1.15] tracking-tight sm:text-4xl">
            Five small agents, one good answer.
          </h2>
  
          {/* ── Description ── */}
          <p className="mt-2.5 max-w-[480px] text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Each agent does one job and hands off to the next. You only see
            five friendly steps; the work happens in the background.
          </p>
  
          {/* ── Pipeline steps ── */}
          <div className="relative mt-9 grid grid-cols-5">
  
            {/* Horizontal connecting line — sits behind the circles.
                Positioned from 10% to 90% so the line starts and
                ends at the center of the first and last circles.
                top: 20px = half of the 40px circle height. */}
            <div
              className="absolute left-[10%] right-[10%] h-px bg-[var(--border)]"
              style={{ top: 20 }}
            />
  
            {/* Individual steps */}
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.number}
                className="relative z-[1] flex flex-col items-center text-center"
              >
                {/* Numbered circle */}
                <div
                  className="
                    flex h-[40px] w-[40px] items-center justify-center
                    rounded-full
                    border border-[var(--border)]
                    bg-[var(--bg)]
                    font-mono text-xs text-[var(--ink-muted)]
                  "
                >
                  {step.number}
                </div>
  
                {/* Step label */}
                <div className="mt-3 max-w-[140px] text-sm font-medium">
                  {step.label}
                </div>
              </div>
            ))}
          </div>
  
        </div>
      </section>
    );
  }