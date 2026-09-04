// src/app/(app)/output/[id]/page.tsx
// Route shell for /output/[id]. Unwraps the dynamic id AND the ?from= search
// param (both are Promises in Next 16 → React's use() hook), computes a safe
// origin-aware back target, and hands everything to SavedContentEditor, which
// owns all loading, state, and the view/edit/copy/export/delete lifecycle.
//
// The sidebar and topbar come from the group's layout. No nav row is
// highlighted here on purpose: a saved item is reachable from both History
// and Folders, and the Back link below already says which.

"use client";

import { use } from "react";
import { SavedContentEditor } from "@/components/output/saved-content-editor";

interface OutputPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string | string[] }>;
  }

// Accept `from` only if it's an internal absolute path ("/history",
// "/folders/abc"). Rejects off-site and protocol-relative ("//evil.com") URLs
// so the Back link can't be turned into an open redirect. Falls back to History.
function safeBackHref(from: string | string[] | undefined): string {
    // Duplicate query params (?from=a&from=b) arrive as an array — take the first.
    const value = Array.isArray(from) ? from[0] : from;
    if (value && value.startsWith("/") && !value.startsWith("//")) return value;
    return "/history";
}

function backLabelFor(href: string): string {
  return href.startsWith("/folders/") ? "Back to folder" : "Back to History";
}

export default function OutputPage({ params, searchParams }: OutputPageProps) {
  const { id } = use(params);
  const { from } = use(searchParams);

  const backHref = safeBackHref(from);
  const backLabel = backLabelFor(backHref);

  return <SavedContentEditor id={id} backHref={backHref} backLabel={backLabel} />;
}