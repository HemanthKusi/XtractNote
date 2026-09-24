"use client";

// src/app/dev/social-templates/newsletter.tsx
//
// The newsletter as it is read: subject and body, in an opened email.
//
// ── What two earlier versions of this got wrong ──
//
// Both were built around the inbox — first as bordered panels with character
// meters, then as faithful phone and laptop rows. Both were answering a
// question nobody asked. The artefact IS the subject and the body; where the
// subject sits in a list before anyone opens it is not what this format is
// for. Hemanth's call, and correct: the inbox is gone.
//
// A finding about subject truncation survives in `content.ts` and belongs in
// the backend specification, but it is a note about a prompt, not a reason to
// draw an inbox.
//
// ── The column is 720, not the 600 email is usually built at ──
//
// 600px is the conservative HTML-email number: it survives old desktop
// clients without horizontal scroll, and anything shipped as a real email
// should still respect it.
//
// This is a PREVIEW, and it sits beside two other templates that are 720 —
// the same 720 the bar above it takes. At 600 it read as a narrow strip in a
// wide column, which is a fact about this page rather than about newsletters.
// Matching the route lets the bar, the email and the other platforms share
// their edges, which is the property that made the description surface cohere.
//
// ── There is no masthead, deliberately ──
//
// One was built and removed. A newsletter's masthead is its identity — the
// publication's name, the issue number, the date — and this product knows
// none of those. Rendered as blanks it was a full empty band between the
// client header and the title: not a masthead, a gap.
//
// A field left empty is honest on a line that has other content. A ROW whose
// every field is empty is just a hole, and the reader reads it as a bug
// rather than as missing data.
//
// ── The video card is REAL DATA ──
//
// Title, channel, duration and thumbnail are all fetched today (§16.4), and a
// newsletter about a video is the one format where linking back to it is the
// point rather than a nicety — its own prompt asks the closing line to send
// the reader to the full video. So the card is content, not decoration, and
// nothing in it is invented.

import { VideoThumbnail } from "@/components/ui/video-thumbnail";

import { VIDEO, type NewsletterCopy } from "./content";

/** A field the destination shows and this product does not have. */
function Blank({ width }: { width: string }) {
  return (
    <span
      className={`inline-block h-[0.6em] rounded-[1px] bg-xn-ink-faint/40 align-middle ${width}`}
      aria-label="Not available"
    />
  );
}

export function Newsletter({ copy }: { copy: NewsletterCopy }) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="overflow-hidden rounded-xn-lg border border-xn-border bg-xn-surface">
        {/* ── The header a client draws, not the newsletter's own ── */}
        <div className="flex items-center gap-2.5 border-b border-xn-border px-6 py-3.5">
          <span
            className="h-7 w-7 shrink-0 rounded-full bg-xn-surface-alt"
            aria-label="Sender avatar — not available"
          />
          <p className="min-w-0 flex-1 text-xs">
            <Blank width="w-20" />
            <span className="ml-2 text-xn-ink-soft">
              <Blank width="w-28" />
            </span>
          </p>
          <span className="shrink-0 text-micro text-xn-ink-soft">to me</span>
        </div>

        <div className="px-8 py-8">
          {/* ── Sized for an inbox, not for a page ──
              Two wrong versions preceded this. The first invented pixel
              values and read as generic. The second corrected that by taking
              the blog surface's scale wholesale — `text-h2` at 46px for the
              title, `text-h4` at 28 for section headings — which is right for
              a post on a page and wrong here. A 46px display line does not
              happen in an email.

              Real newsletters run a title at 26-32, headings at 19-21 and
              body at 16-18, because they are read inside a client at a fixed
              column rather than on a page that can afford display type. The
              tokens that land there are h4 / h5 / body: 28, 21, 17.5.

              Same scale as the rest of the product, a different part of it.
              The mistake was not the pixel values or the tokens — it was
              choosing a size for the format next door rather than for this
              one. */}
          <h2 className="font-serif text-h4 text-xn-ink">{copy.subject}</h2>

          <p className="mt-3 text-body leading-snug text-xn-ink-muted">
            {copy.standfirst}
          </p>

          <div className="my-7 h-px bg-xn-border" />

          <p className="text-body leading-body text-xn-ink">{copy.intro}</p>

          {/* ── Numbered sections ──
              The number is structure, not invented data — it comes from the
              order the sections are in. It also gives a skimming reader an
              anchor and a sense of how much is left, which a bare heading
              does not, and it borrows the mono-micro-uppercase treatment the
              rest of the product uses for small labels. */}
          {copy.sections.map((section, i) => (
            <section key={section.heading} className="mt-8">
              <p className="font-mono text-micro uppercase tracking-widest text-xn-fmt-social">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1.5 font-serif text-h5 text-xn-ink">{section.heading}</h3>
              <div className="mt-2.5 space-y-4">
                {section.paragraphs.map((para) => (
                  <p key={para} className="text-body leading-body text-xn-ink">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* One step above body, not three. A pull quote at 36px would
              out-shout the title; at body size it is just an indented
              sentence. 21 interrupts without competing. */}
          <blockquote className="my-8 border-l-2 border-xn-fmt-social pl-5">
            <p className="font-serif text-h5 leading-snug text-xn-ink">{copy.pullQuote}</p>
          </blockquote>

          {/* ── The video ──
              Every field is data the app already fetches. Its own prompt asks
              the closing to send the reader to the full video, so the link is
              the point of the artefact rather than an addition to it. */}
          <a
            href={VIDEO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xn-md border border-xn-border transition-colors duration-xn ease-xn hover:border-xn-border-strong"
          >
            <div className="aspect-video">
              <VideoThumbnail
                videoId={VIDEO.videoId}
                duration={VIDEO.duration}
                label="video"
                className="!h-full !rounded-none !border-0"
              />
            </div>
            <div className="bg-xn-surface-alt px-4 py-3.5">
              <p className="text-ui font-medium leading-snug text-xn-ink">{VIDEO.title}</p>
              <p className="mt-1 font-mono text-micro text-xn-ink-soft">
                {VIDEO.channel} · {VIDEO.duration}
              </p>
            </div>
          </a>

          <p className="mt-7 text-body leading-body text-xn-ink">{copy.closing}</p>
        </div>

        {/* ── The footer every newsletter carries ──
            Unsubscribe is not decoration: a newsletter without one is not
            sendable, and leaving it out would make the preview quietly wrong
            about what the artefact has to contain. Inert, like all borrowed
            chrome on these templates. */}
        <div
          className="border-t border-xn-border px-6 py-4 text-center text-micro text-xn-ink-soft"
          aria-hidden="true"
        >
          You are receiving this because you subscribed · Unsubscribe
        </div>
      </div>
    </div>
  );
}
