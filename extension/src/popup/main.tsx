import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./popup.css";

// Mount the React app into the popup's <div id="root">.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);