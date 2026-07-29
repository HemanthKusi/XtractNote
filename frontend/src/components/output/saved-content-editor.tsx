"use client";

// ─────────────────────────────────────────────────────────────
// SavedContentEditor
//
// The interactive surface behind /output/[id]. Loads ONE saved item by id,
// then owns its full lifecycle:
//
//   view   → rendered content (reuses OutputView, one renderer for the app)
//   edit   → editable title + raw-markdown textarea (PROSE TYPES ONLY)
//   copy   → copy the body to the clipboard
//   export → download the body as a file
//   delete → confirm via Modal, then route back to /history
//
// STRUCTURED TYPES ARE READ-ONLY (Phase 11). Flashcards and quiz have no
// markdown to edit, so Edit is hidden for them and they open straight to the
// rendered view. Copy/Export serialize the structured body to readable plain
// text (see bodyToPlainText) so those actions stay meaningful. The "structured"
// test is keyed on contentType — the SAME criterion updateContent's guard uses —
// so the UI and the persistence guard can never disagree about what's editable.
//
// Feedback split (Phase 9.1): successes surface as toasts (Saved / Deleted);
// errors stay inline (save-error banner, delete-error in modal) so they don't
// auto-dismiss while you still need to act on them. Copy stays an inline
// button-state flip — instant and local, no toast needed.
//
// Loading uses the shared Skeleton; not-found + error use the shared
// EmptyState, so these screens match the rest of the app.
//
// Back navigation is origin-aware via optional backHref/backLabel props
// (default: History). The route computes them from a ?from= param.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentTypeIcon } from "@/components/ui/content-type-icon";
import { OutputView } from "@/components/output/output-view";
import { useToast } from "@/components/shared/toast-provider";
import { contentTypeColors, type ContentType } from "@/lib/constants/theme";
import type { ContentBody } from "@/lib/content/types";
import {
  fetchContentById,
  type ContentDetail,
  type ContentDetailFailReason,
} from "@/lib/api/history";
import {
  updateContent,
  deleteContent,
  type UpdateFailReason,
  type DeleteFailReason,
} from "@/lib/api/content";

// Content types whose bodies are structured JSON rather than markdown, and so
// open read-only. Kept in lockstep with the same list in lib/api/content.ts —
// this is the second consumer, so both are candidates to promote into a shared
// export in lib/content/types.ts.
const STRUCTURED_TYPES: readonly ContentType[] = ["flashcards", "quiz"];

// ── Copy maps ───────────────────────────────────────────────
// One place for every failure-reason → human sentence. "not-found" during a
// load has its own dedicated screen, so it isn't in LOAD_ERROR.

const LOAD_ERROR: Record<
  Exclude<ContentDetailFailReason, "not-found">,
  string
> = {
  "not-authenticated": "Your session expired. Please sign in again.",
  "fetch-failed": "We couldn't load this content. Please try again.",
  network: "Network problem. Check your connection and try again.",
};

const SAVE_ERROR: Record<UpdateFailReason, string> = {
  "not-authenticated": "Your session expired. Please sign in again.",
  "not-found": "This content no longer exists — it may have been deleted.",
  // Should never surface: Edit is hidden for structured types, so this path
  // isn't reachable from the UI. Present because UpdateFailReason requires it.
  "wrong-body-type": "This content type can't be edited as text.",
  "update-failed": "Couldn't save your changes. Please try again.",
  network: "Network problem — your changes weren't saved.",
};

const DELETE_ERROR: Record<DeleteFailReason, string> = {
  "not-authenticated": "Your session expired. Please sign in again.",
  "not-found": "This content is already gone.",
  "delete-failed": "Couldn't delete this. Please try again.",
  network: "Network problem — nothing was deleted.",
};

// Decreasing widths for the loading skeleton "paragraph" lines (className-only,
// so we don't depend on Skeleton forwarding an inline style prop).
const LOADING_WIDTHS = ["90%", "82%", "74%", "66%", "58%", "48%"];

// ── Small helpers ───────────────────────────────────────────

// Title → safe filename for the export. Falls back to "untitled".
function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return slug || "untitled";
}

/**
 * Serialize any content body to readable plain text, for Copy and Export.
 *
 * Prose returns its markdown unchanged. Structured bodies are rendered to a
 * scannable text form — the read-only counterpart to how the static renderers
 * present the data — so Copy/Export stay meaningful for all seven types rather
 * than yielding an empty string for flashcards and quiz.
 */
function bodyToPlainText(body: ContentBody): string {
  if (body.kind === "flashcards") {
    return body.cards
      .map((card, i) => `${i + 1}. Q: ${card.front}\n   A: ${card.back}`)
      .join("\n\n");
  }
  if (body.kind === "quiz") {
    return body.questions
      .map((q, i) => {
        const options = q.options
          .map((opt, oi) => {
            const letter = String.fromCharCode(65 + oi);
            const mark = oi === q.answerIndex ? "  (correct)" : "";
            return `   ${letter}. ${opt}${mark}`;
          })
          .join("\n");
        const why = q.explanation ? `\n   Why: ${q.explanation}` : "";
        return `${i + 1}. ${q.question}\n${options}${why}`;
      })
      .join("\n\n");
  }
  // Prose.
  return body.markdown;
}

// Compact relative time for "Edited …". Defensive against bad timestamps.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type LoadStatus = "loading" | "ready" | "not-found" | "error";
type Mode = "view" | "edit";

interface SavedContentEditorProps {
  /** The generated_content row id, from the /output/[id] route param. */
  id: string;
  /** Where the "Back" link points. Defaults to History. */
  backHref?: string;
  /** Label for the "Back" link. Defaults to "Back to History". */
  backLabel?: string;
}

export function SavedContentEditor({
  id,
  backHref = "/history",
  backLabel = "Back to History",
}: SavedContentEditorProps) {
  const router = useRouter();
  const toast = useToast();

  // ── Load state ──
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string>("");
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to retry a failed load

  // ── Editor state ──
  const [mode, setMode] = useState<Mode>("view");
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Transient action state ──
  const [copied, setCopied] = useState(false);

  // ── Delete-modal state ──
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Copy "Copied ✓" reset timer — cleared on unmount.
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load the item ──
  // Keyed on id + reloadKey. The ignore flag drops a stale result if the id
  // changes (or we retry) before the previous fetch resolves.
  useEffect(() => {
    let ignore = false;
    setStatus("loading");
    setSaveError("");

    (async () => {
      const res = await fetchContentById(id);
      if (ignore) return;

      if (res.ok) {
        setDetail(res.data);
        setMode("view");
        setStatus("ready");
        return;
      }
      if (res.reason === "not-found") {
        setStatus("not-found");
        return;
      }
      setLoadError(LOAD_ERROR[res.reason]);
      setStatus("error");
    })();

    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  // Clear the copy timer when the component goes away.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // ── Derived ──
  // Structured items are read-only. Keyed on contentType to match
  // updateContent's guard exactly, so the UI and the guard agree.
  const isStructured = detail
    ? STRUCTURED_TYPES.includes(detail.contentType)
    : false;

  // Copy/Export operate on this. In view mode it's the serialized body (prose
  // markdown, or structured rendered to text); in edit mode it's the raw draft
  // being edited (prose only — structured never enters edit mode).
  const effectiveBody =
    mode === "edit" ? bodyDraft : detail ? bodyToPlainText(detail.body) : "";
  const effectiveTitle =
    mode === "edit" ? titleDraft : detail?.contentTitle ?? "";
  const isDirty =
    mode === "edit" &&
    detail !== null &&
    (titleDraft !== detail.contentTitle || bodyDraft !== detail.markdown);

  // ── Actions ──
  function enterEdit() {
    // Guard as well as hide: structured bodies have no markdown to edit, and
    // saving one would overwrite the cards/questions. The Edit button is
    // hidden for them; this stops any other path reaching edit mode.
    if (!detail || isStructured) return;
    setTitleDraft(detail.contentTitle);
    setBodyDraft(detail.markdown);
    setSaveError("");
    setMode("edit");
  }

  function cancelEdit() {
    setSaveError("");
    setMode("view");
  }

  async function handleSave() {
    if (!detail) return;
    setSaving(true);
    setSaveError("");

    // Pass the row's contentType so updateContent can enforce its prose-only
    // guard. This path is only reachable for prose (Edit is hidden otherwise),
    // but the guard is the backstop.
    const res = await updateContent(detail.id, detail.contentType, {
      contentTitle: titleDraft,
      markdown: bodyDraft,
    });

    setSaving(false);

    if (!res.ok) {
      setSaveError(SAVE_ERROR[res.reason]);
      return;
    }

    // Reflect the saved values locally — no refetch. Title/body are trimmed to
    // match what updateContent persisted; count + updated_at come back fresh.
    // The body stays a prose { markdown } since only prose reaches here.
    setDetail({
      ...detail,
      contentTitle: titleDraft.trim(),
      markdown: bodyDraft.trim(),
      body: { markdown: bodyDraft.trim() },
      wordCount: res.data.wordCount,
      updatedAt: res.data.updatedAt,
    });
    setMode("view");
    toast.success("Changes saved");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(effectiveBody);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare, e.g. insecure context). Silent no-op — the
      // export button is always available as a fallback.
    }
  }

  function handleExport() {
    // Structured bodies serialize to plain text, not markdown, so they get a
    // .txt extension; prose keeps .md.
    const ext = isStructured ? "txt" : "md";
    const mime = isStructured ? "text/plain" : "text/markdown";
    const blob = new Blob([effectiveBody], {
      type: `${mime};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(effectiveTitle)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openDelete() {
    setDeleteError("");
    setConfirmOpen(true);
  }

  function closeDelete() {
    if (deleting) return; // don't allow dismiss mid-delete
    setConfirmOpen(false);
  }

  async function handleDelete() {
    if (!detail) return;
    setDeleting(true);
    setDeleteError("");

    const res = await deleteContent(detail.id);

    if (!res.ok) {
      setDeleting(false);
      setDeleteError(DELETE_ERROR[res.reason]);
      return;
    }

    // Success → toast, then leave. ToastProvider sits above the router outlet,
    // so the toast survives the navigation and shows on /history. Keep
    // `deleting` true so the modal holds its busy state through the push.
    toast.success("Content deleted");
    router.push("/history");
  }

  // ── Render: loading ──
  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Skeleton height={16} width={112} className="mb-6 rounded" />
        <Skeleton height={32} width="66%" className="mb-3 rounded" />
        <Skeleton height={16} width="50%" className="mb-8 rounded" />
        <div className="space-y-3 rounded-xn-xl border border-xn-border bg-xn-surface p-6">
          {LOADING_WIDTHS.map((w, i) => (
            <Skeleton key={i} height={16} width={w} className="rounded" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: not found ──
  if (status === "not-found") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState
          icon={<AlertCircle />}
          title="Content not found"
          description="This item may have been deleted, or the link is incorrect."
          action={
            <Link href={backHref}>
              <Button variant="primary">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // ── Render: load error ──
  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <EmptyState
          icon={<AlertCircle />}
          title="Something went wrong"
          description={loadError}
          action={
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Try again
              </Button>
              <Link href={backHref}>
                <Button variant="ghost">{backLabel}</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  // status === "ready" — detail is guaranteed non-null here.
  if (!detail) return null;

  const typeMeta = contentTypeColors[detail.contentType];
  // Pass the full body union to OutputView, which dispatches on its kind.
  const viewContent = {
    contentType: detail.contentType,
    content: detail.body,
  };

  const formatChip = (
    <div className="flex items-center gap-2.5">
      <ContentTypeIcon type={detail.contentType} size="md" withBackground />
      <span className="text-[14px] font-semibold text-xn-ink">
        {typeMeta.label}
      </span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* ── Back link ── */}
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-xn-ink-soft transition-colors hover:text-xn-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* ── Document header: title + source + actions ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {mode === "edit" ? (
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Untitled"
                aria-label="Content title"
                className="w-full bg-transparent font-serif text-[28px] leading-tight text-xn-ink outline-none placeholder:text-xn-ink-soft"
              />
            ) : (
              <h1 className="font-serif text-[28px] leading-tight text-xn-ink">
                {detail.contentTitle || (
                  <span className="text-xn-ink-soft">Untitled</span>
                )}
              </h1>
            )}

            {/* Source line */}
            {(detail.videoTitle || detail.channel) && (
              <p className="mt-1.5 truncate text-sm text-xn-ink-muted">
                Source:{" "}
                {detail.videoUrl ? (
                  <a
                    href={detail.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xn-ink-soft underline underline-offset-2 hover:text-xn-ink"
                  >
                    {detail.videoTitle || "video"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>{detail.videoTitle}</span>
                )}
                {detail.channel && <span> · {detail.channel}</span>}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={handleCopy}>
              <span className="inline-flex items-center gap-1.5">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </span>
            </Button>

            <Button variant="ghost" onClick={handleExport}>
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                Export
              </span>
            </Button>

            {mode === "view" ? (
              <>
                {/* Edit is prose-only. Structured types (flashcards, quiz) have
                    no markdown to edit, so the button is hidden for them. */}
                {!isStructured && (
                  <Button variant="primary" onClick={enterEdit}>
                    <span className="inline-flex items-center gap-1.5">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </span>
                  </Button>
                )}
                <Button variant="ghost" onClick={openDelete}>
                  <span className="inline-flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : "Save"}
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Meta line: word count · edited */}
        <div className="mt-3 flex items-center gap-2 text-xs text-xn-ink-soft">
          <span>{detail.wordCount.toLocaleString()} words</span>
          {detail.updatedAt && (
            <>
              <span aria-hidden>·</span>
              <span>Edited {timeAgo(detail.updatedAt)}</span>
            </>
          )}
        </div>

        {/* Save error banner (inline + persistent by design) */}
        {saveError && (
          <div className="mt-3 flex items-center gap-2 rounded-xn-md border border-xn-border bg-xn-surface-alt px-3 py-2 text-sm text-xn-ink">
            <AlertCircle className="h-4 w-4 shrink-0 text-xn-ink-soft" />
            {saveError}
          </div>
        )}
      </div>

      {/* ── Body: view reuses OutputView; edit is a raw-markdown textarea
             (prose only — structured types never enter edit mode) ── */}
      {mode === "view" ? (
        <OutputView content={viewContent} />
      ) : (
        <Card variant="default" padding="lg" header={formatChip}>
          <textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            spellCheck
            aria-label="Content body (Markdown)"
            className="min-h-[440px] w-full resize-y bg-transparent font-mono text-[14px] leading-relaxed text-xn-ink outline-none placeholder:text-xn-ink-soft"
            placeholder="Write in Markdown…"
          />
        </Card>
      )}

      {/* ── Delete confirmation ── */}
      <Modal
        open={confirmOpen}
        onClose={closeDelete}
        title="Delete this content?"
        description="This permanently removes it from your history and any folder. This can't be undone."
        size="sm"
        persistent={deleting}
        footer={
          <>
            <Button variant="ghost" onClick={closeDelete} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDelete} disabled={deleting}>
              <span className="inline-flex items-center gap-1.5">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? "Deleting…" : "Delete"}
              </span>
            </Button>
          </>
        }
      >
        {deleteError && (
          <div className="flex items-center gap-2 rounded-xn-md border border-xn-border bg-xn-surface-alt px-3 py-2 text-sm text-xn-ink">
            <AlertCircle className="h-4 w-4 shrink-0 text-xn-ink-soft" />
            {deleteError}
          </div>
        )}
      </Modal>
    </div>
  );
}