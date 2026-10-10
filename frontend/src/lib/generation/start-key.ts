// ─────────────────────────────────────────────────────────────
// lib/generation/start-key.ts
//
// The request key a generation start carries, and when it is reused.
//
// The backend answers a repeated key with the job it already made. So the key
// for "this video, this format, this platform" is kept until the page has a
// definite answer for it, and reused by every start of the same request until
// then — a start whose reply was lost, or one the user stopped waiting for,
// is then answered with the job it already made, if it made one, rather than
// creating and paying for a second.
//
// Kept in the tab's session storage, not only in memory, so a reload or an
// in-app navigation away and back keeps it. Where storage is unavailable, a
// memory store stands in for the life of the page.
//
// Pure apart from the store it is handed, and its imports are none, so the
// rules can be checked without a browser (scripts/check-start-key.mjs).
// ─────────────────────────────────────────────────────────────

/** The part of the Storage interface this uses. */
export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const START_KEY_ITEM = "xtractnote:generation-start-key";

interface StoredKey {
  signature: string;
  key: string;
}

/** Which request a key is for. Two starts with the same signature are the same request. */
export function requestSignature(videoId: string, contentType: string, platform: string | undefined): string {
  return JSON.stringify([videoId, contentType, platform ?? null]);
}

function read(store: KeyStore): StoredKey | null {
  try {
    const raw = store.getItem(START_KEY_ITEM);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as StoredKey).signature === "string" &&
      typeof (parsed as StoredKey).key === "string"
    ) {
      return parsed as StoredKey;
    }
  } catch {
    // Unreadable or corrupt: treated as no key, so the next start makes one.
  }
  return null;
}

/**
 * The key to send for a start of `signature`: the kept one if it is for the
 * same request, otherwise a new one from `newKey`, which is then kept.
 */
export function startKeyFor(signature: string, store: KeyStore, newKey: () => string): string {
  const kept = read(store);
  if (kept && kept.signature === signature) return kept.key;
  const key = newKey();
  try {
    store.setItem(START_KEY_ITEM, JSON.stringify({ signature, key }));
  } catch {
    // A store that cannot be written: the key still works for this start.
  }
  return key;
}

/**
 * Forget `key` once its start has a definite answer. Only that key: if a
 * different request has replaced it in the meantime, that one is left alone.
 */
export function settleStartKey(key: string, store: KeyStore): void {
  try {
    if (read(store)?.key === key) store.removeItem(START_KEY_ITEM);
  } catch {
    // Nothing to clean up if the store cannot be reached.
  }
}

/** A store held in memory, for where session storage is unavailable. */
export function memoryStore(): KeyStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}
