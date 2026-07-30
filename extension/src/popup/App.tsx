import { useEffect, useState } from "react";
import { detectActiveTabVideo, type ActiveVideo } from "../lib/youtube";

// TEMPORARY — File 2 verification only. File 4 replaces this with the real
// popup UI (detected-video card + action buttons).
export default function App() {
  const [result, setResult] = useState<ActiveVideo | null>(null);

  useEffect(() => {
    detectActiveTabVideo().then(setResult);
  }, []);

  return (
    <main className="popup">
      <h1 className="popup__title">XtractNote</h1>

      {result === null && (
        <p className="popup__subtitle">Checking this tab…</p>
      )}

      {result?.ok === true && (
        <p className="popup__subtitle">
          Detected video: <code>{result.videoId}</code>
        </p>
      )}

      {result?.ok === false && (
        <p className="popup__subtitle">
          Not a YouTube video ({result.reason}).
        </p>
      )}
    </main>
  );
}