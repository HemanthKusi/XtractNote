import { defineManifest } from "@crxjs/vite-plugin";

// The Manifest V3 manifest, authored in TypeScript so CRXJS can type-check it
// and process the entry points (here, the popup's index.html) at build time.
export default defineManifest({
  manifest_version: 3,
  name: "XtractNote",
  description:
    "Send the YouTube video you're watching to XtractNote — notes, blogs, summaries and more.",
  version: "0.1.0",

  // The toolbar icon. Clicking it opens the popup (index.html).
  action: {
    default_title: "XtractNote",
    default_popup: "index.html",
  },

  // activeTab: temporary access to the CURRENT tab, granted only when the user
  // clicks the icon. No install-time host warning, no standing YouTube access.
  // This is enough for File 2 to read the active tab's URL on click.
  permissions: ["activeTab"],
});