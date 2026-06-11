// ─────────────────────────────────────────────────────────────
// HowItWorks
// ─────────────────────────────────────────────────────────────
// Landing page section explaining the 5-step AI pipeline.
//
// Mobile: zigzag pipeline — circles alternate up/down with
//         diagonal lines connecting right-edge to left-edge.
// Desktop: horizontal pipeline with straight connecting line.
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
  
          {/* ── Pipeline — MOBILE: zigzag ──
              Stretched with -mx-2 to use more horizontal space.
              30px circles with 35px vertical offset between up/down.
              Lines use 4% offset from circle centers (≈15px radius
              on ~370px container) to connect at circle edges. */}
          <div className="relative -mx-5 mt-8 md:hidden" style={{ height: 105 }}>
            {/* SVG lines: right-edge → left-edge of next circle */}
            <svg className="absolute inset-0" width="100%" height="100%" fill="none">
              <line x1="14%" y1="15" x2="26%" y2="50" stroke="currentColor" strokeWidth="1" />
              <line x1="34%" y1="50" x2="46%" y2="15" stroke="currentColor" strokeWidth="1" />
              <line x1="54%" y1="15" x2="66%" y2="50" stroke="currentColor" strokeWidth="1" />
              <line x1="74%" y1="50" x2="86%" y2="15" stroke="currentColor" strokeWidth="1" />
            </svg>
  
            {/* Circles + labels */}
            <div className="absolute inset-0 grid grid-cols-5" style={{ zIndex: 2 }}>
              {PIPELINE_STEPS.map((step, i) => {
                const isDown = i % 2 === 1;
                return (
                  <div
                    key={step.number}
                    className="flex flex-col items-center"
                    style={{ paddingTop: isDown ? 35 : 0 }}
                  >
                    <div
                      className="
                        flex h-[34px] w-[34px] items-center justify-center
                        rounded-full border border-[var(--border-strong)]
                        bg-[var(--xn-surface-alt)]
                        font-mono text-[10px] font-medium text-[var(--ink-muted)]
                      "
                    >
                      {step.number}
                    </div>
                    <div className="mt-1 max-w-[65px] text-center text-[10px] font-medium leading-tight">
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
  
          {/* ── Pipeline — DESKTOP: horizontal with straight line ── */}
          <div className="relative mt-12 hidden md:grid md:grid-cols-5">
            <div
              className="absolute left-[10%] right-[10%] border-t-2 border-[var(--border-strong)]"
              style={{ top: 19 }}
            />
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.number}
                className="relative z-[1] flex flex-col items-center text-center"
              >
                <div
                  className="
                    flex h-[40px] w-[40px] items-center justify-center
                    rounded-full border border-[var(--border-strong)]
                    bg-[var(--xn-surface-alt)]
                    font-mono text-xs font-medium text-[var(--ink-muted)]
                  "
                >
                  {step.number}
                </div>
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