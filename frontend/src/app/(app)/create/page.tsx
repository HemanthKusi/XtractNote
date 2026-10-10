"use client";

// ─────────────────────────────────────────────────────────────
// app/(app)/create/page.tsx  →  route: /create
//
// The full create flow lives here:
//   input -> extractVideoId
//         -> (looks like a URL)  -> fetchVideoMetadata -> SourcePanel
//         -> (not a URL, a topic)-> searchVideos -> SearchResults
//                                -> (Use this video) -> fetchVideoMetadata -> …
//         -> (pick a type) -> [if social: pick a platform]
//         -> fetchTranscript -> startGeneration -> poll the job (fetchJob)
//         -> load the draft it wrote -> OutputView -> Save promotes it
//
// It's a Client Component because it holds state and handles events.
// This is also the ONE place that turns machine-readable failure
// reasons (from extract, metadata, transcript, search, AND generation)
// into friendly, human messages.
//
// Social is a two-step choice: picking "Social" reveals a platform
// sub-picker, and Generate stays disabled until a platform is chosen. The
// platform travels with the generate call, and the backend records it in the
// draft row's metadata.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  extractVideoId,
  type ExtractFailReason,
} from "@/lib/youtube/extract-video-id";
import { fetchVideoMetadata, type MetaFailReason } from "@/lib/api/youtube";
import { fetchTranscript } from "@/lib/api/transcript";
import { fetchJob, startGeneration } from "@/lib/api/generate";
import { saveDraft, type SaveFailReason } from "@/lib/api/content";
import { searchVideos } from "@/lib/api/search";
import type { VideoMeta } from "@/lib/youtube/types";
import type { TranscriptFailReason } from "@/lib/youtube/transcript-types";
import type {
  SearchResultVideo,
  SearchFailReason,
} from "@/lib/youtube/search-types";
import {
  isGeneratable,
  type ContentBody,
  type ContentType,
  type GeneratableContentType,
  type GenerateFailReason,
  type SocialPlatform,
} from "@/lib/content/types";
import {
  INITIAL_POLL_STATE,
  POLL_EVERY_MS,
  nextPollDecision,
} from "@/lib/generation/poll";
import {
  layeredStore,
  memoryStore,
  requestSignature,
  settleStartKey,
  startKeyFor,
  type KeyStore,
} from "@/lib/generation/start-key";
import { ContentTypePicker } from "@/components/create/content-type-picker";
import { CreateHero } from "@/components/create/create-hero";
import {
  GeneratingPanel,
  type GenerationRunState,
} from "@/components/create/generating-panel";
import { SocialPlatformPicker } from "@/components/create/social-platform-picker";
import { SearchResults } from "@/components/create/search-results";
import { DraftsBand } from "@/components/create/drafts-band";
import { SourcePanel } from "@/components/create/source-panel";
import { VideoGridItem } from "@/components/create/video-grid-item";
import { OutputView } from "@/components/output/output-view";
import { fetchContentById, fetchDrafts, type HistoryItem } from "@/lib/api/history";
import { contentTypeColors } from "@/lib/constants/theme";
import { ROUTES } from "@/lib/constants/routes";
import { RECOMMENDED_VIDEOS } from "@/lib/constants/recommended-videos";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast-provider";

// ── Friendly copy for every failure reason ──────────────────
// One map covering extract, metadata, transcript, search, AND generate
// reasons. Change wording here without touching any logic.
// Note: "network"/"unknown" are shared across metadata and generate, and
// "request-failed" is shared between transcript and search — each appears
// once, not twice.
type FailReason =
  | ExtractFailReason
  | MetaFailReason
  | TranscriptFailReason
  | SearchFailReason
  | GenerateFailReason
  | SaveFailReason;

const ERROR_MESSAGES: Record<FailReason, string> = {
  // From extractVideoId
  empty: "Paste a YouTube link or search a topic to get started.",
  "not-youtube":
    "That doesn't look like a YouTube link. Try a youtube.com or youtu.be URL.",
  "no-id": "We couldn't find a video in that link. Double-check it and try again.",
  "invalid-id":
    "That link looks off — we couldn't read a valid video ID from it.",
  // From fetchVideoMetadata
  "not-found":
    "We couldn't load that video. It may be private, deleted, or unavailable in your region.",
  "server-config": "Something's misconfigured on our end. Please try again shortly.",
  upstream: "YouTube isn't responding right now. Please try again in a moment.",
  network:
    "We couldn't reach the server. Check your connection and that the app is running.",
  unknown: "Something went wrong. Please try again.",
  // From fetchTranscript
  "no-captions":
    "This video doesn't have captions we can read. Try another video with captions or subtitles turned on.",
  "video-not-found":
    "We couldn't load this video's transcript — it may be private, deleted, or unavailable.",
  "transcript-blocked":
    "YouTube is temporarily blocking transcript requests. Please try again in a moment.",
  "transcript-failed":
    "We couldn't get the transcript for this video. Please try again.",
  "request-failed":
    "We couldn't reach the server. Check your connection and that the app is running.",
  // From searchVideos
  "quota-exceeded":
    "We've hit today's YouTube search limit. Please try again later, or paste a video link instead.",
  "search-failed":
    "We couldn't run that search just now. Please try again in a moment.",
  // From generation — refused when the job is started
  "empty-transcript":
    "There's no transcript text to work from. Try fetching the video again.",
  "transcript-too-long":
    "This video's transcript is too long to process in one pass. Try a shorter video for now.",
  "unknown-content-type":
    "That content type isn't available yet. Pick another format.",
  "auth-unavailable":
    "We couldn't check your sign-in just now. Please try again in a moment.",
  "generation-busy":
    "We're generating a lot right now. Please try again in a moment.",
  "job-not-created": "We couldn't start the generation. Please try again.",
  // From generation — recorded on a job that failed
  "provider-misconfigured":
    "The AI service isn't configured correctly on our end. Please try again shortly.",
  "generation-failed":
    "We couldn't generate the content this time. Please try again.",
  // The model returned unusable structured data. A fresh attempt often
  // succeeds, so the copy says exactly that.
  "invalid-structured-output":
    "The AI returned an unexpected format this time. Please try generating again.",
  "draft-not-saved":
    "The content was generated but couldn't be saved. Please try again.",
  unexpected: "Something went wrong while generating. Please try again.",
  interrupted:
    "The generation was interrupted before it finished. Please try again.",
  // From generation — while checking on a job
  "job-not-found": "We couldn't find this generation. Please try again.",
  // Shared by generation and saving: either can be refused for a lapsed session.
  "not-authenticated": "Please sign in again — your session may have expired.",
  // From saveDraft
  "not-a-draft": "This is already saved, or no longer exists.",
  "save-failed": "We couldn't save this just now. Please try again.",
  // Note: "network" is already defined above (shared with metadata) — not repeated.
};

// ── Outcomes that are not failures ──────────────────────────
// Shown as an info toast, back at the picker, with no "Try again": the run may
// still be going, and retrying would start — and pay for — a second one.
const NOTICES = {
  // The page stopped waiting before the job reported finishing.
  stoppedWaiting: "It's still running — it will appear in your drafts if it finishes.",
  // The job finished, but its draft could not be loaded onto this page.
  draftNotLoaded:
    "Your content is ready, but couldn't be opened here. You'll find it in your drafts.",
} as const;

/** Wait `ms` before the next check on a job. */
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── A small, explicit state machine ─────────────────────────
// Metadata stage (idle/loading/error) + topic-search stage
// (searching/search-results/search-error) + transcript stage
// (transcribing/transcript-error) + generation stage
// (picking/generating/output). Every stage past metadata carries `meta`,
// and every stage past transcript also carries `transcript`, so nothing
// loaded is ever thrown away by a later error.
//
// The chosen content type and social platform are NOT phases — they're
// transient picker state (selectedType / selectedPlatform below), the same
// way selectedType always has been.
// ── There is no "ready" phase, deliberately ──
//
// There used to be: metadata loaded, and the page asked "continue with this
// video?" before fetching the transcript. That confirmation confirmed nothing.
// Clicking a search result IS the choice, and pasting a link is more specific
// still — the user named one video. Worse, the screen it interrupted already
// carries a "Change video" control, so the flow asked a question whose answer
// was available one step later anyway.
//
// Metadata now runs straight into the transcript fetch, so `loading` leads to
// `transcribing` with nothing in between. `transcript-error` keeps its own
// retry, which is the only place that fetch is triggered by a person.
type Status =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  // Topic search
  | { phase: "searching"; query: string }
  | { phase: "search-results"; query: string; results: SearchResultVideo[] }
  | { phase: "search-error"; query: string; message: string }
  // ── The transcript is fetched inside GENERATION, not before it ──
  //
  // It used to have its own phase between metadata and the picker, so the
  // user watched a spinner before they were allowed to choose anything. The
  // wait bought them nothing: the transcript does not change which formats
  // are available, and every format needs the same one.
  //
  // Moving it into generation puts the whole wait in the one place a wait is
  // expected. The picker now appears the moment metadata lands, and "Reading
  // the transcript" becomes a genuine step in the pipeline the generation
  // screen shows rather than something that already happened offscreen.
  //
  // A transcript failure therefore surfaces as a generation failure. That is
  // correct: from the user's side the thing that failed IS the generation,
  // and ERROR_MESSAGES already carries every transcript reason.
  | { phase: "picking"; meta: VideoMeta }
  | {
      phase: "generating";
      meta: VideoMeta;
      contentType: GeneratableContentType;
      // How far the start has got. Stopping means something different at
      // each step, and the panel says which.
      run: GenerationRunState;
    }
  | {
      phase: "generate-error";
      meta: VideoMeta;
      message: string;
    }
  | {
      phase: "output";
      meta: VideoMeta;
      // The draft row the backend wrote. Saving promotes this row.
      draftId: string;
      result: { contentType: ContentType; content: ContentBody };
    };

export default function CreatePage() {
  const toast = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  // Transient UI choices in the picker — not flow phases, so they live apart.
  const [selectedType, setSelectedType] =
    useState<GeneratableContentType | null>(null);
  // The chosen social platform. Only meaningful when selectedType === "social";
  // cleared whenever a non-social type is chosen (see handleSelectType).
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform | null>(null);

  // Unfinished work for the "pick up where you left off" band: finished
  // generations the user has not saved. The band renders nothing on an empty
  // list, so a failed fetch degrades to the same thing as no drafts, which is
  // why the error is swallowed rather than surfaced: a suggestion band cannot
  // be worth an error message on the page the user came here to use.
  const [drafts, setDrafts] = useState<HistoryItem[]>([]);

  // Refresh rotates the curated list. It is deterministic (no Math.random at
  // render) so the server and client agree on first paint.
  const [shuffle, setShuffle] = useState(0);

  // The last search, kept so "Change video" can return to its results rather
  // than to an empty field. Cleared by a pasted link, which names one video
  // and therefore has no list to go back to.
  const [lastSearch, setLastSearch] = useState<{
    query: string;
    results: SearchResultVideo[];
  } | null>(null);

  /**
   * Which run the page is currently interested in.
   *
   * ── The bug this exists to stop ──
   *
   * Every async step here ends in setStatus, and every one of those used to
   * fire unconditionally. So: start a generation, cancel it, and when the
   * request eventually resolved it called setStatus({ phase: "output" }) and
   * threw the user into a result they had abandoned. The same held for a
   * search that landed after a link was pasted, and for an error from a run
   * nobody was waiting on any more.
   *
   * Bumping this invalidates everything in flight. Each async handler takes a
   * token before its first await and checks it after every one; a token that
   * no longer matches means the user has moved on and the result is dropped.
   *
   * A ref rather than state on purpose — it must be readable inside a closure
   * that started several awaits ago, and reading state there gives the value
   * from the render that began the run, which is exactly the stale value the
   * guard is trying to detect.
   */
  const runRef = useRef(0);

  // Where the request key for a start is kept: memory for this page, and the
  // tab's session storage behind it so a reload keeps it (see layeredStore).
  // Built on first use, since storage does not exist while the page renders
  // on the server.
  const keyStoreRef = useRef<KeyStore | null>(null);
  const keyStore = (): KeyStore => {
    if (!keyStoreRef.current) {
      let persistent: KeyStore | null = null;
      try {
        // Reading the property itself can throw where storage is blocked.
        persistent = window.sessionStorage;
      } catch {
        persistent = null;
      }
      keyStoreRef.current = layeredStore(persistent, memoryStore());
    }
    return keyStoreRef.current;
  };
  const beginRun = () => ++runRef.current;
  const isStale = (token: number) => runRef.current !== token;

  // Save state for the output stage. Transient UI, so it lives apart from the
  // flow machine (like selectedType). Reset whenever a new result appears.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");

  // Core submit logic, taking the raw text as an argument so callers that just
  // set `input` (e.g. the prefill effect) can pass the value directly without
  // waiting for the async state update to land.
  async function startFromInput(rawInput: string) {
    // Every submit supersedes whatever was already running: a slow search must
    // not land on top of a link pasted after it, and vice versa.
    const run = beginRun();

    // Step 1 — extract the ID on the client (instant, no network).
    const extracted = extractVideoId(rawInput);

    // Step 1a — a real YouTube video URL.
    if (extracted.ok) {
      // A link names exactly one video, so any remembered search is no longer
      // what the user is working from. Dropping it here is what makes "Change
      // video" return to the field rather than to stale results.
      setLastSearch(null);
      setStatus({ phase: "loading" });
      const result = await fetchVideoMetadata(extracted.videoId);
      if (isStale(run)) return;
      if (!result.ok) {
        setStatus({ phase: "error", message: ERROR_MESSAGES[result.reason] });
        return;
      }
      setStatus({ phase: "picking", meta: result.data });
      return;
    }

    // Step 1b — not a video URL. Only "not-youtube" means "this is a topic to
    // search for". The other reasons are genuine bad input (empty, or a
    // YouTube URL we couldn't read a video ID from) — surface them as errors,
    // exactly as before.
    if (extracted.reason !== "not-youtube") {
      setStatus({ phase: "error", message: ERROR_MESSAGES[extracted.reason] });
      return;
    }

    // Step 2 — topic search.
    const query = rawInput.trim();
    setStatus({ phase: "searching", query });
    const result = await searchVideos(query);
    if (isStale(run)) return;
    if (!result.ok) {
      setStatus({
        phase: "search-error",
        query,
        message: ERROR_MESSAGES[result.reason],
      });
      return;
    }
    // Success — may be an empty array; SearchResults shows its empty state.
    // Remembered so "Change video" can return to these rather than to a blank
    // field: a search produced a LIST, and discarding it would make the user
    // run the same query again to see the other nine results.
    setLastSearch({ query, results: result.data });
    setStatus({ phase: "search-results", query, results: result.data });
  }


  // Load unfinished work each time the page lands on a screen that shows the
  // band — on first load, and on every return to it — so a run that finished
  // after the user stopped waiting appears without a reload. Not awaited by
  // anything; a list that arrives late simply appears.
  const showsDrafts = status.phase === "idle" || status.phase === "error";
  useEffect(() => {
    if (!showsDrafts) return;
    let live = true;
    void (async () => {
      const result = await fetchDrafts();
      if (live && result.ok) setDrafts(result.data);
    })();
    return () => {
      live = false;
    };
  }, [showsDrafts]);

  // Leaving the page invalidates whatever is in flight, so a generation's
  // polling stops at its next check instead of running on behind a page
  // nobody is looking at. The run itself is not stopped; if it finishes, its
  // result is in drafts.
  useEffect(() => {
    const runs = runRef;
    return () => {
      runs.current += 1;
    };
  }, []);

  // The curated list, rotated by Refresh. Rotation rather than a random
  // shuffle so the order is a pure function of a counter — a Math.random here
  // would differ between the server render and the client's first, which is
  // a hydration mismatch.
  const recommendations = RECOMMENDED_VIDEOS.map(
    (_, index, all) => all[(index + shuffle) % all.length]
  );

  // ── Prefill from URL params (extension deep-link) ─────────────
  // The extension opens /create?v=<canonical watch url>&action=<type>.
  // On mount: auto-load the video (v), and preselect the format (action) if
  // it's a valid generatable type. We stop at the loaded preview — never
  // auto-generate, since that would spend an AI call on page load, possibly on
  // a video with no captions.
  //
  // No run-once guard. In development React runs this twice, with a cleanup
  // between that invalidates the first load (the unmount effect above bumps
  // the run token); a guard would then skip the second load and leave the page
  // stuck on "loading". Unguarded, the second run starts a fresh load. In
  // production it runs once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("v");
    // Treat the raw param as a possible ContentType, then let isGeneratable do
    // the real runtime check. Casting here — not on setSelectedType — is what
    // lets the guard narrow `action` to GeneratableContentType for the setter.
    const action = params.get("action") as ContentType | null;

    // Preselect the format if it's a real generatable type; unknown/missing is
    // ignored, not an error.
    if (action && isGeneratable(action)) {
      setSelectedType(action);
    }

    // Auto-load the video through the same submit path a manual paste uses.
    //
    // This used to seed a page-level `input` state as well, "for consistency".
    // That stopped meaning anything when the field became the hero input,
    // which owns its own value — the page cannot write into it, so the seed
    // set a variable nothing read and nothing displayed.
    if (v) {
      void startFromInput(v);
    }
    // Mount-only: reads window.location once, and re-running it would re-fetch
    // a video the user may have already moved on from. startFromInput is
    // recreated every render, so listing it would defeat exactly that — the
    // empty deps array is the behaviour, not an oversight.
    //
    // Silenced rather than left as a warning: three warnings in this project
    // are deliberate and a fourth blending in is how a real one gets missed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A search result was picked — feed its videoId into the SAME metadata step
  // the URL path uses, so it lands in the identical preview → transcript →
  // generate flow.
  /**
   * Metadata is in — go straight for the transcript.
   *
   * The single path from "we know which video" to "the user can choose a
   * format", shared by the pasted-link route, the search-result route and the
   * recommendation tiles, so no entry into the flow can drift from another.
   */
  async function handleUseSearchResult(videoId: string) {
    const run = beginRun();
    setStatus({ phase: "loading" });
    const result = await fetchVideoMetadata(videoId);
    // Clicking a second result, or typing something new, invalidates this one.
    if (isStale(run)) return;
    if (!result.ok) {
      setStatus({ phase: "error", message: ERROR_MESSAGES[result.reason] });
      return;
    }
    // Straight to the picker. No confirmation, and no transcript wait.
    setStatus({ phase: "picking", meta: result.data });
  }

  /**
   * "Change video" — back to wherever the current video was chosen FROM.
   *
   * A search produced a list of candidates, so returning to a blank field
   * would make the user re-run the identical query to reach the other results
   * they were just looking at. A pasted link produced exactly one video, so
   * there is nothing to return to and the field is the right destination.
   *
   * Also serves as "Edit search" from the results and empty states, where
   * lastSearch is the search being edited — returning to it is harmless.
   */
  function handleChange() {
    // Anything in flight belongs to the video being replaced.
    beginRun();
    setSelectedType(null);
    setSelectedPlatform(null);

    if (lastSearch) {
      setStatus({
        phase: "search-results",
        query: lastSearch.query,
        results: lastSearch.results,
      });
      return;
    }

    setStatus({ phase: "idle" });
  }

  // Choosing a format. Clears the platform when the type isn't social, so a
  // stale platform can never linger behind another type (and so never gets
  // sent to the generator).
  function handleSelectType(type: GeneratableContentType) {
    setSelectedType(type);
    if (type !== "social") setSelectedPlatform(null);
  }

  // The transcript retry lived here. It is gone with the phase it served:
  // the fetch now happens inside handleGenerate, so retrying it is retrying
  // the generation, and `generate-error` already has that button.

  /**
   * Stop waiting for a run — back to the picker, video intact.
   *
   * ── This does not stop the work ──
   *
   * The run is on the server and carries on; the tokens are spent either way.
   * If it finishes, its result is in drafts. What beginRun() below stops is
   * this page's polling, so the result is not shown here once the user has
   * moved on. Stopping the run itself is separate work.
   */
  function handleCancelGeneration() {
    const current = status;
    if (current.phase !== "generating") return;
    // Invalidate the run in flight so its completion cannot come back.
    beginRun();
    setStatus({ phase: "picking", meta: current.meta });
  }

  async function handleGenerate() {
    // Valid from "picking" or "generate-error" (retry), and needs a selection.
    const current = status;
    const base =
      current.phase === "picking" || current.phase === "generate-error"
        ? current
        : null;
    if (!base || !selectedType) return;
    // Social requires a platform. The Generate button is disabled without one,
    // but guard here too so no other path can generate social without it.
    if (selectedType === "social" && !selectedPlatform) return;

    const { meta } = base;
    // Taken BEFORE the first await. Cancelling, or starting anything else,
    // bumps the counter and every check below then drops this run's results.
    const run = beginRun();
    setStatus({ phase: "generating", meta, contentType: selectedType, run: "not-sent" });

    // ── The transcript is fetched HERE now ──
    //
    // It used to be a phase of its own before the picker, which made the user
    // wait before they were allowed to choose anything. Both waits are now one
    // wait, in the place a wait is expected — and the generation screen shows
    // "Reading the transcript" as a real step rather than a decorative one.
    const transcriptResult = await fetchTranscript(meta.videoId);
    if (isStale(run)) return;
    if (!transcriptResult.ok) {
      setStatus({
        phase: "generate-error",
        meta,
        message: ERROR_MESSAGES[transcriptResult.reason],
      });
      return;
    }
    const transcript = transcriptResult.data;

    // Only send a platform for social — computed explicitly so a leftover
    // value can't ride along with another type.
    const platform =
      selectedType === "social" ? selectedPlatform ?? undefined : undefined;

    const fail = (reason: GenerateFailReason) =>
      setStatus({ phase: "generate-error", meta, message: ERROR_MESSAGES[reason] });

    // Not a failure: back to the picker with a notice and no "Try again".
    const notice = (message: string) => {
      setStatus({ phase: "picking", meta });
      toast.info(message);
    };

    // ── The request key ── (lib/generation/start-key.ts)
    //
    // Reused by every start of the same video, format and platform until the
    // page has a definite answer, so a start whose reply was lost is answered
    // with the job it already made, if it made one, rather than a second.
    const requestId = startKeyFor(
      requestSignature(meta.videoId, selectedType, platform),
      keyStore(),
      () => crypto.randomUUID(),
    );
    const settle = () => settleStartKey(requestId, keyStore());

    // From here the backend may accept the job even if this page never hears.
    setStatus({ phase: "generating", meta, contentType: selectedType, run: "sent" });
    const started = await startGeneration(
      transcript.fullText,
      selectedType,
      platform,
      meta,
      requestId,
    );
    if (isStale(run)) return;
    if (!started.ok) {
      // No reply at all leaves the outcome unknown, so the key is kept for a
      // retry. Any answer from the server is definite, and frees it.
      if (started.reason !== "network") settle();
      fail(started.reason);
      return;
    }
    setStatus({ phase: "generating", meta, contentType: selectedType, run: "accepted" });

    // ── Watch the job until it finishes, fails, or the page stops waiting ──
    //
    // The rules for what each report means live in lib/generation/poll.ts.
    // The run token is checked after every await, so cancelling, starting
    // over or leaving the page ends this loop at its next step.
    const startedAt = Date.now();
    let pollState = INITIAL_POLL_STATE;
    for (;;) {
      await pause(POLL_EVERY_MS);
      if (isStale(run)) return;
      const report = await fetchJob(started.jobId);
      if (isStale(run)) return;

      const decision = nextPollDecision(report, pollState, Date.now() - startedAt);
      if (decision.kind === "keep-polling") {
        pollState = decision.state;
        continue;
      }
      if (decision.kind === "failed") {
        settle();
        fail(decision.reason);
        return;
      }
      if (decision.kind === "stopped-waiting") {
        // The run's outcome is still unknown: the key stays, so starting the
        // same thing again picks this run back up.
        notice(NOTICES.stoppedWaiting);
        return;
      }

      // Completed: show the draft it wrote.
      settle();
      const draft = await fetchContentById(decision.resultId);
      if (isStale(run)) return;
      if (!draft.ok) {
        notice(NOTICES.draftNotLoaded);
        return;
      }

      setSaveState("idle");
      setSaveError("");
      setStatus({
        phase: "output",
        meta,
        draftId: draft.data.id,
        result: { contentType: draft.data.contentType, content: draft.data.body },
      });
      return;
    }
  }

  async function handleSave() {
    const current = status;
    if (current.phase !== "output") return;
    // Guard: don't double-save the same result.
    if (saveState === "saving" || saveState === "saved") return;

    const run = beginRun();
    setSaveState("saving");
    setSaveError("");

    const result = await saveDraft(current.draftId);
    // Leaving the output — "Generate another", or changing the video — while a
    // save is in flight would otherwise land "Saved ✓" and a toast on whatever
    // is on screen by then. The save still happens either way; what is dropped
    // is only the confirmation, which now has nowhere to belong.
    if (isStale(run)) return;
    if (!result.ok) {
      setSaveState("idle");
      setSaveError(ERROR_MESSAGES[result.reason]);
      toast.error(ERROR_MESSAGES[result.reason]);
      return;
    }

    setSaveState("saved");
    toast.success("Saved to your library");
  }

  function handleGenerateAnother() {
    const current = status;
    if (current.phase !== "output") return;
    // A save may still be in flight for the result being left behind.
    beginRun();
    setSelectedType(null);
    setSelectedPlatform(null);
    // Back to the picker. The transcript is refetched on the next generate
    // rather than carried — one extra call, in exchange for the picker no
    // longer being a phase that has to hold a payload it does not use.
    setStatus({ phase: "picking", meta: current.meta });
  }

  const isLoading = status.phase === "loading";
  const isSearching = status.phase === "searching";
  const isBusy = isLoading || isSearching;

  // The input bar stays visible through the metadata-loading and topic-search
  // phases (so the query stays editable), and hides once a video is loaded.
  const showInput =
    status.phase === "idle" ||
    status.phase === "loading" ||
    status.phase === "error" ||
    status.phase === "searching" ||
    status.phase === "search-results" ||
    status.phase === "search-error";

  // The video preview is shown for every stage past metadata.
  const meta =
    status.phase === "picking" ||
    status.phase === "generating" ||
    status.phase === "generate-error" ||
    status.phase === "output"
      ? status.meta
      : null;

  // Stages where the format picker / generation UI should appear.
  const inGenerationStage =
    status.phase === "picking" ||
    status.phase === "generating" ||
    status.phase === "generate-error" ||
    status.phase === "output";

  const isGenerating = status.phase === "generating";

  // Social is picked but no platform chosen yet — Generate stays disabled.
  const needsPlatform = selectedType === "social" && !selectedPlatform;

  return (
    // `output` rather than the `wide` column history and folders use: this
    // route ends in a rendered result, and the output Card's own padding
    // eats 98px before its contents start. Sizing the page at `wide` left
    // the content column at 862px, which is under what the flashcard grid
    // needs for three columns. `output` is `wide` plus that padding, so the
    // column inside the card lands on 960 exactly.
    //
    // The 98px the form gains along the way is harmless — the pickers size
    // their columns off the viewport, not this container, so their layout
    // is unchanged and only the tiles get marginally wider.
    <div className="mx-auto max-w-output px-6 py-10">
      {/* ── The head of the page, while there is no video yet ──
          Once metadata loads the field is hidden, and the source itself
          becomes the thing the page is about — so the "Create" title goes
          with the field rather than sitting above a video it does not
          describe. */}
      {showInput && (
        <CreateHero
          onSubmit={(value) => void startFromInput(value)}
          error={status.phase === "error"}
          disabled={isBusy}
        >
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-xn-ink-muted">
              <Spinner />
              <span>Looking up that video…</span>
            </div>
          )}

          {status.phase === "error" && (
            <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
              <AlertIcon />
              <span>{status.message}</span>
            </p>
          )}

          {/* ── The body of the idle page ──
              Inside CreateHero's children, so it sits under the field and
              disappears with it the moment a video resolves.

              Only on `idle` and `error` — not while a search runs or its
              results are up. Those replace this: the user has already said
              what they want, and a wall of unrelated suggestions beneath
              their own results is noise. */}
          {(status.phase === "idle" || status.phase === "error") && (
            <>
              {/* Unfinished work first, then suggestions — your own things
                  before ours. Renders nothing at all when there are no
                  drafts, rather than an empty state. */}
              <DraftsBand
                drafts={drafts}
                onOpen={(id) => router.push(ROUTES.output(id))}
              />

              {/* A curated list, not a recommender. The heading says "worth
                  converting" rather than "picked for you" because nothing
                  here is personalised and the copy must not imply it is. */}
              <section className="mt-10">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-h5 text-xn-ink">Worth converting</h2>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShuffle((n) => n + 1)}
                    icon={<RefreshGlyph />}
                  >
                    Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-7">
                  {recommendations.map((video) => (
                    <VideoGridItem
                      key={video.videoId}
                      videoId={video.videoId}
                      title={video.title}
                      channel={video.channel}
                      durationSeconds={video.durationSeconds}
                      // The same handler a search result uses, so every entry
                      // into the flow converges on one path.
                      onSelect={() => void handleUseSearchResult(video.videoId)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </CreateHero>
      )}

      {/* ── Topic search: skeletons while searching, cards/empty when done ── */}
      {(status.phase === "searching" || status.phase === "search-results") && (
        <div className="mt-6">
          <SearchResults
            key={status.query}
            query={status.query}
            loading={status.phase === "searching"}
            results={status.phase === "search-results" ? status.results : []}
            onUse={handleUseSearchResult}
            onEditSearch={handleChange}
          />
        </div>
      )}

      {/* Topic search error (the field stays above so they can edit + retry) */}
      {status.phase === "search-error" && (
        <div className="mt-4">
          <p className="flex items-start gap-2 text-sm text-xn-danger">
            <AlertIcon />
            <span>{status.message}</span>
          </p>
          <div className="mt-3">
            {/* Retry from the PHASE, not from the field.
                The field empties itself on submit — that is what the hero
                input does — so by the time this button exists the page's
                `input` is "". Reading it sent an empty string through
                extractVideoId, which reports "empty" and rendered "Paste a
                YouTube link or search a topic to get started" in place of
                actually rerunning the search.
                `search-error` already carries the query that failed, which
                is the only value here that cannot have been cleared. */}
            <Button
              variant="primary"
              onClick={() => void startFromInput(status.query)}
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* ── While generating, the panel IS the page ──
          It carries its own source card, its own progress and its own way
          out, so rendering the standard source header above it would show
          the same video twice. */}
      {status.phase === "generating" && (
        <GeneratingPanel
          meta={status.meta}
          type={status.contentType}
          run={status.run}
          onCancel={handleCancelGeneration}
        />
      )}

      {/* Preview + picker (shown once metadata loads, except while generating) */}
      {meta && status.phase !== "generating" && (
        <>
          <h2 className="mb-4 text-h5 text-xn-ink">Using this video</h2>

          {/* No primary action. "Continue" used to sit here asking to confirm
              a video the user had just chosen, and the transcript wait it
              triggered now happens inside generation — so the card is the
              subject and its own two controls, nothing more. */}
          <SourcePanel meta={meta} onChange={handleChange} busy={isGenerating} />

          {/* ── Generation stage ── */}
          {inGenerationStage && (
            <div className="mt-8">
              {/* Picker is hidden once output is shown, to keep focus on result */}
              {status.phase !== "output" && (
                <>
                  {/* The transcript stats that used to sit here are gone with
                      the phase that fetched them. At this point the transcript
                      has not been read yet, so "Transcript ready — 412 lines"
                      would be describing something that does not exist. It was
                      also answering a question nobody asked: the line count is
                      not how anyone chooses between a summary and flashcards. */}
                  <h2 className="mb-4 text-h5 text-xn-ink">
                    What should it become?
                  </h2>

                  <ContentTypePicker
                    selected={selectedType}
                    onSelect={handleSelectType}
                    selectedPlatform={selectedPlatform}
                    disabled={isGenerating}
                  />

                  {/* Social's second step. Renders nothing unless social is the
                      chosen type (the component returns null when not visible). */}
                  <SocialPlatformPicker
                    visible={selectedType === "social"}
                    selected={selectedPlatform}
                    onSelect={setSelectedPlatform}
                    disabled={isGenerating}
                    className="mt-5"
                  />

                  {/* The generating screen is no longer rendered from inside
                      the picker — it replaces the whole page, above. This
                      branch only ever shows the button now. */}
                  {(
                    <div className="mt-5 flex items-center gap-3">
                      {/* "Make study notes", not "Generate" — the specimen's
                          copy, and it names the thing rather than the act.
                          Falls back to "Pick a format" while nothing is
                          chosen, so the disabled button says WHY it is
                          disabled instead of just being grey. */}
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleGenerate}
                        disabled={!selectedType || needsPlatform}
                      >
                        {status.phase === "generate-error"
                          ? "Try again"
                          : selectedType
                            ? `Make ${contentTypeColors[selectedType].label.toLowerCase()}`
                            : "Pick a format"}
                      </Button>
                    </div>
                  )}

                  {status.phase === "generate-error" && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-xn-danger">
                      <AlertIcon />
                      <span>{status.message}</span>
                    </p>
                  )}
                </>
              )}

              {/* ── Output ── */}
              {status.phase === "output" && (
                <>
                  <OutputView content={status.result} />
                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saveState === "saving" || saveState === "saved"}
                    >
                      {saveState === "saving"
                        ? "Saving…"
                        : saveState === "saved"
                          ? "Saved ✓"
                          : "Save"}
                    </Button>
                    <Button variant="ghost" onClick={handleGenerateAnother}>
                      Generate another
                    </Button>
                    <Button variant="ghost" onClick={handleChange}>
                      Start over
                    </Button>
                  </div>

                  {saveError && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-xn-accent">
                      <AlertIcon />
                      <span>{saveError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Tiny inline icons (token-colored via currentColor) ──────
function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 0 0-13.7-5.7L3 8.5" />
      <path d="M3 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.7L21 15.5" />
      <path d="M21 20v-4.5h-4.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="mt-0.5 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
    </svg>
  );
}