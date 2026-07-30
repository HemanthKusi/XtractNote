// Build and open the web app's /create deep link.
//
// This is the launch "seam": the popup uses it now, and the deferred
// content-script "Send to XtractNote" button will reuse it verbatim — which is
// why it's its own module and not inlined into the popup.

/** Content types the launcher can preselect (the popup's quick actions). */
export type CreateAction = "blog" | "notes" | "summary";

/** Dev fallback if VITE_APP_BASE_URL isn't set. */
const DEFAULT_APP_BASE_URL = "http://localhost:3000";

/** The web app's origin, from the build-time env var (dev vs prod). */
export function getAppBaseUrl(): string {
  return import.meta.env.VITE_APP_BASE_URL ?? DEFAULT_APP_BASE_URL;
}

/**
 * Build the /create deep link for a video. Pure — no chrome.*, no env read —
 * so it's easy to test and safe for the future content-script button to reuse.
 *
 * @param baseUrl  web app origin, e.g. http://localhost:3000
 * @param videoId  11-char YouTube id
 * @param action   optional content type to preselect
 */
export function buildCreateUrl(params: {
  baseUrl: string;
  videoId: string;
  action?: CreateAction;
}): string {
  const { baseUrl, videoId, action } = params;

  const target = new URL("/create", baseUrl);

  // Canonical watch URL — strips playlist/timestamp/tracking params, so the app
  // receives a clean link exactly as if the user had pasted it. searchParams
  // handles the percent-encoding.
  target.searchParams.set("v", `https://www.youtube.com/watch?v=${videoId}`);
  if (action) {
    target.searchParams.set("action", action);
  }

  return target.toString();
}

/**
 * Open the /create deep link in a new tab.
 * chrome.tabs.create requires no permission (unlike reading tab URLs), so this
 * adds nothing to the manifest.
 */
export async function openCreate(params: {
  videoId: string;
  action?: CreateAction;
}): Promise<void> {
  const url = buildCreateUrl({ baseUrl: getAppBaseUrl(), ...params });
  await chrome.tabs.create({ url });
}