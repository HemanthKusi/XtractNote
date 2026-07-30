import { useEffect, useState } from "react";
import { detectActiveTabVideo, type ActiveVideo } from "../lib/youtube";
import { openCreate, type CreateAction } from "../lib/launch";

// The three quick actions shown on the card. Everything else ("Open in
// XtractNote") lets the user pick the type in the app.
const QUICK_ACTIONS: { action: CreateAction; label: string }[] = [
  { action: "blog", label: "Blog" },
  { action: "notes", label: "Notes" },
  { action: "summary", label: "Summarize" },
];

export default function App() {
  const [result, setResult] = useState<ActiveVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Safe unawaited: detectActiveTabVideo catches internally and never rejects.
    detectActiveTabVideo().then(setResult);
  }, []);

  async function launch(videoId: string, action?: CreateAction) {
    setError(null);
    setBusy(true);
    try {
      await openCreate({ videoId, action });
      window.close(); // the app tab is opening; the popup can dismiss itself
    } catch (err) {
      console.error("Failed to open XtractNote:", err);
      setError("Couldn't open XtractNote. Please try again.");
    } finally {
      // Always clear busy: if the popup didn't close, the buttons re-enable
      // instead of stranding. If it did close, this is a harmless no-op on a
      // dismounting popup.
      setBusy(false);
    }
  }

  return (
    <main className="p-4 text-zinc-900">
      <header className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--xn-accent)" }}
        />
        <h1 className="text-sm font-semibold tracking-tight">XtractNote</h1>
      </header>

      {result === null && (
        <p className="text-[13px] text-zinc-500">Checking this tab…</p>
      )}

      {result?.ok === false && <EmptyState reason={result.reason} />}

      {result?.ok === true && (
        <VideoCard
          videoId={result.videoId}
          title={result.title}
          busy={busy}
          error={error}
          onAction={(action) => launch(result.videoId, action)}
          onOpen={() => launch(result.videoId)}
        />
      )}
    </main>
  );
}

function VideoCard({
  videoId,
  title,
  busy,
  error,
  onAction,
  onOpen,
}: {
  videoId: string;
  title?: string;
  busy: boolean;
  error: string | null;
  onAction: (action: CreateAction) => void;
  onOpen: () => void;
}) {
  const [thumbOk, setThumbOk] = useState(true);
  // Tab titles read "Video Title - YouTube"; trim the suffix for display.
  const cleanTitle = (title ?? "").replace(/\s*-\s*YouTube$/, "").trim();

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {thumbOk && (
          <img
            src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
            alt=""
            className="aspect-video w-full object-cover"
            onError={() => setThumbOk(false)}
          />
        )}
        <p className="line-clamp-2 px-3 py-2 text-[13px] font-medium leading-snug">
          {cleanTitle || "YouTube video"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            disabled={busy}
            onClick={() => onAction(action)}
            className="rounded-md border border-zinc-200 py-1.5 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      <button
        disabled={busy}
        onClick={onOpen}
        className="mt-2 w-full rounded-md py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--xn-accent)" }}
      >
        Open in XtractNote
      </button>

      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

function EmptyState({ reason }: { reason: "no-active-tab" | "not-youtube" }) {
  const message =
    reason === "not-youtube"
      ? "Open a YouTube video, then click the XtractNote icon."
      : "Couldn't read this tab. Try reloading the page.";

  return (
    <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center">
      <p className="text-[13px] text-zinc-500">{message}</p>
    </div>
  );
}