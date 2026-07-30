import { useEffect, useState } from "react";
import { detectActiveTabVideo, type ActiveVideo } from "../lib/youtube";
import { openCreate } from "../lib/launch";

// TEMPORARY — File 3 verification only. File 4 replaces this with the real
// popup UI (detected-video card + all quick actions + empty state).
export default function App() {
  const [result, setResult] = useState<ActiveVideo | null>(null);

  useEffect(() => {
    detectActiveTabVideo().then(setResult);
  }, []);

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
            onClick={() =>
              openCreate({ videoId: result.videoId, action: "blog" })
            }
            style={{
              marginTop: 12,
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Open in XtractNote (blog)
          </button>
        </>
      )}

      {result?.ok === false && (
        <p className="popup__subtitle">Not a YouTube video ({result.reason}).</p>
      )}
    </main>
  );
}