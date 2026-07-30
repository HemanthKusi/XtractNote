import { useEffect, useState } from "react";
import { detectActiveTabVideo, type ActiveVideo } from "../lib/youtube";
import { openCreate } from "../lib/launch";

// TEMPORARY — File 3 verification only. File 4 replaces this with the real
// popup UI (detected-video card + all quick actions + empty state).
export default function App() {
  const [result, setResult] = useState<ActiveVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Safe to leave unawaited: detectActiveTabVideo never rejects (it catches
    // internally and resolves to a discriminated result).
    detectActiveTabVideo().then(setResult);
  }, []);

  async function handleOpen(videoId: string) {
    setError(null);
    try {
      await openCreate({ videoId, action: "blog" });
    } catch (err) {
      // Handle the rejection instead of letting the promise float. File 4
      // replaces this with the app's toast system.
      console.error("Failed to open XtractNote:", err);
      setError("Couldn't open XtractNote. Please try again.");
    }
  }

  return (
    <main className="popup">
      <h1 className="popup__title">XtractNote</h1>

      {result === null && <p className="popup__subtitle">Checking this tab…</p>}

      {result?.ok === true && (
        <>
          <p className="popup__subtitle">
            Detected video: <code>{result.videoId}</code>
          </p>
          <button
            onClick={() => handleOpen(result.videoId)}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Open in XtractNote (blog)
          </button>
          {error && (
            <p
              className="popup__subtitle"
              style={{ marginTop: 8, color: "crimson" }}
            >
              {error}
            </p>
          )}
        </>
      )}

      {result?.ok === false && (
        <p className="popup__subtitle">Not a YouTube video ({result.reason}).</p>
      )}
    </main>
  );
}