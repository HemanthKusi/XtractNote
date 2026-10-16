"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Components } from "react-markdown";

import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { ContentBody, MarkdownBody } from "@/lib/content/types";
import { FlashcardsView } from "@/components/output/flashcards-view";
import { QuizView } from "@/components/output/quiz-view";

// ─────────────────────────────────────────────────────────────
// OutputView
//
// Read-only viewer for AI-generated content. Owns the Card, the small
// format-identity header, and the max-width container; then DISPATCHES on the
// body's `kind` to the right inner renderer:
//
//   - prose (no kind) -> MarkdownView (below)
//   - flashcards      -> FlashcardsView
//   - quiz            -> QuizView
//
// The inner renderers deliberately produce BARE content — no Card of their
// own — because the Card lives here. That is the container contract they were
// built against.
//
// react-markdown renders NO raw HTML by default, so model output can't inject
// scripts — safe without extra sanitization. Maths is the one place HTML is
// inserted: KaTeX builds it from the formula, escaping its text, with `trust`
// off so commands such as \href are refused.
//
// ── Maths is written `$$…$$`, never `$…$` ──
// On its own lines it is a displayed equation; inside a sentence, inline.
// Single dollars stay text, because prose is full of prices: with them on,
// "$5 and $6" renders as a formula and both prices vanish — in every saved
// draft, not only new ones.
//
// Read-only by design. Copy / edit / regenerate / export live elsewhere.
// ─────────────────────────────────────────────────────────────

// Every component uses an explicit `return` for an unambiguous body.
const markdownComponents: Components = {
  h1({ children }) {
    return (
      <h1 className="mt-6 mb-3 font-serif text-[28px] leading-tight text-xn-ink first:mt-0">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="mt-6 mb-2 font-serif text-[22px] leading-snug text-xn-ink">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="mt-5 mb-2 text-[16px] font-semibold text-xn-ink">
        {children}
      </h3>
    );
  },
  p({ children }) {
    return (
      <p className="mb-4 text-[15px] leading-[1.7] text-xn-ink">{children}</p>
    );
  },
  ul({ children }) {
    return (
      <ul className="mb-4 ml-5 list-disc space-y-1.5 text-[15px] leading-[1.7] text-xn-ink">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-[15px] leading-[1.7] text-xn-ink">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="pl-1">{children}</li>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-xn-ink">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xn-accent underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-4 border-l-2 border-xn-border pl-4 italic text-xn-ink-muted">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-6 border-xn-border" />;
  },
  pre({ node, children }) {
    // A displayed equation arrives as <pre><code class="math-display">. The
    // code renders it; the pre's code-block styling must not wrap it.
    const first = node?.children[0];
    if (first?.type === "element" && classesOf(first.properties?.className).includes("math-display")) {
      return <>{children}</>;
    }
    return (
      <pre className="my-4 overflow-x-auto rounded-xn-md border border-xn-border bg-xn-bg-deep p-4 font-mono text-[13px] leading-relaxed text-xn-ink">
        {children}
      </pre>
    );
  },
  code({ className, children }) {
    const classes = classesOf(className);
    if (classes.includes("math-display")) return <Maths source={String(children)} display />;
    if (classes.includes("math-inline")) return <Maths source={String(children)} display={false} />;
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={`font-mono ${className ?? ""}`}>{children}</code>;
    }
    return (
      <code className="rounded bg-xn-bg-deep px-1.5 py-0.5 font-mono text-[13px] text-xn-ink">
        {children}
      </code>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-xn-border bg-xn-bg-deep px-3 py-2 text-left font-semibold text-xn-ink">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-xn-border px-3 py-2 text-xn-ink">
        {children}
      </td>
    );
  },
};

/** An element's class names, from a hast property or a JSX className. */
function classesOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? value.split(/\s+/) : [];
}

/**
 * A formula, rendered by KaTeX. A formula KaTeX cannot read is shown with its
 * error rather than failing the whole document.
 */
function Maths({ source, display }: { source: string; display: boolean }) {
  const html = katex.renderToString(source.trim(), {
    displayMode: display,
    throwOnError: false,
    trust: false,
  });
  return display ? (
    <div className="my-4 overflow-x-auto py-1 text-xn-ink" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className="text-xn-ink" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * The prose renderer. This is the markdown path OutputView used to BE, now
 * extracted so it can sit as a peer of the structured renderers rather than
 * being hardcoded into the dispatcher. Renders bare, like its peers.
 */
function MarkdownView({ body }: { body: MarkdownBody }) {
  const markdown = body.markdown.trim();

  if (!markdown) {
    return <p className="text-[14px] text-xn-ink-muted">No content to display.</p>;
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
      components={markdownComponents}
    >
      {markdown}
    </Markdown>
  );
}

/**
 * Pick the inner renderer for a body. Exhaustive by construction: the default
 * branch assigns the narrowed value to a MarkdownBody, so adding a new `kind`
 * to ContentBody without a branch here fails to compile rather than silently
 * falling through to the markdown renderer.
 */
function renderBody(body: ContentBody) {
  switch (body.kind) {
    case "flashcards":
      return <FlashcardsView body={body} />;
    case "quiz":
      return <QuizView body={body} />;
    default: {
      // If this assignment ever errors, a body shape was added without a
      // renderer above — handle it, don't let it reach here.
      const prose: MarkdownBody = body;
      return <MarkdownView body={prose} />;
    }
  }
}

interface OutputViewProps {
  /** Content to display — any content type + its body union. */
  content: { contentType: ContentType; content: ContentBody };
  className?: string;
}

export function OutputView({ content, className = "" }: OutputViewProps) {
  const meta = contentTypeColors[content.contentType];

  return (
    <Card
      variant="default"
      padding="lg"
      className={className}
      header={
        <div className="flex items-center gap-2.5">
          <ContentTypeIcon type={content.contentType} size="md" withBackground />
          <span className="text-[14px] font-semibold text-xn-ink">
            {meta.label}
          </span>
        </div>
      }
    >
      {/* The content column, and the width every renderer is measured
          against. It was 680px — the 64ch reading measure — which left the
          card visibly narrower than history, folders and create, and gave
          the flashcard grid too little room for its third column.

          960 is a deliberate trade: prose runs nearer 88 characters a line
          than the 64 the type scale specifies. Taken knowingly for a
          consistent surface. If the long measure ever reads badly, the fix
          is to cap the prose renderer alone rather than narrow the card —
          the structured renderers genuinely want the width.

          Pages that render output cap themselves at `max-w-output`, which
          is sized so this lands on exactly 960. The cap stays here anyway,
          so a consumer with a wider container cannot stretch the column
          past the width the renderers were measured at. */}
      <div className="max-w-wide">{renderBody(content.content)}</div>
    </Card>
  );
}