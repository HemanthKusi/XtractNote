import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

// CRXJS turns Vite into an extension bundler: it reads the manifest, finds each
// entry point (the popup, and later the content script / service worker), and
// wires up dev-mode hot reloading.
//
// Note: we use @vitejs/plugin-react (Babel-based), NOT plugin-react-swc —
// CRXJS's HMR does not work with the SWC variant.
export default defineConfig({
    plugins: [react(), tailwindcss(), crx({ manifest })],
});