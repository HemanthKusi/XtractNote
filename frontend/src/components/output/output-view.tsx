"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import { Card } from "@/components/ui/card";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";

// ─────────────────────────────────────────────────────────────
// OutputView
//
// Read-only viewer for AI-generated Markdown. Renders the content inside a
// Card with a small format-identity header. Each Markdown element maps to a
// styled component using --xn- tokens + editorial serif headings.
//
// react-markdown renders NO raw HTML by default, so model output can't inject
// scripts — safe without extra sanitization.
//
// Read-only by design (Phase 7). Copy / edit / regenerate / export are Phase 9.
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
  pre({ children }) {
    return (
      <pre className="my-4 overflow-x-auto rounded-xn-md border border-xn-border bg-xn-bg-deep p-4 font-mono text-[13px] leading-relaxed text-xn-ink">
        {children}
      </pre>
    );
  },
  code({ className, children }) {
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

interface OutputViewProps {
    /** Content to display — any content type + Markdown body. */
    content: { contentType: ContentType; content: string };
    className?: string;
}

export function OutputView({ content, className = "" }: OutputViewProps) {
  const meta = contentTypeColors[content.contentType];
  const body = content.content.trim();

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
      <div className="max-w-[680px]">
        {body ? (
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {body}
          </Markdown>
        ) : (
          <p className="text-[14px] text-xn-ink-muted">No content to display.</p>
        )}
      </div>
    </Card>
  );
}