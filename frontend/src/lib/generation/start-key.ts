// ─────────────────────────────────────────────────────────────
// lib/generation/start-key.ts
//
// The request key a generation start carries, and when it is reused.
//
// The backend answers a repeated key with the job it already made. So each
// request — "this video, this format, this platform" — keeps its key until the
// page has a definite answer for it, and every start of that request reuses
// it until then. A start whose reply was lost, or one the user stopped waiting
// for, is then answered with the job it already made, if it made one, rather
// than creating and paying for a second.
//
// One key per request, not one in total: stopping a summary, starting a blog
// and coming back to the summary must find the summary's key again. At most
// `MAX_KEPT` are kept; past that the oldest is dropped.
//
// Kept in two places (see `layeredStore`): in memory, and in the tab's session
// storage, so a reload or an in-app navigation away and back keeps them.
// Storage can refuse a write — when it is full, or blocked — which is why
// memory holds a copy too.
//
// Pure apart from the store it is handed, and its imports are none, so the
// rules can be checked without a browser (scripts/check-start-key.mjs).
// ─────────────────────────────────────────────────────────────

/** The part of the Storage interface this uses. */
export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const START_KEY_ITEM = "xtractnote:generation-start-key";

/** How many unsettled requests keep their keys before the oldest is dropped. */
export const MAX_KEPT = 20;

// A list, oldest first, rather than an object keyed by signature: a signature
// is built from request input and never becomes a property name.
interface KeptKey {
  signature: string;
  key: string;
}

/** Which request a key is for. Two starts with the same signature are the same request. */
export function requestSignature(videoId: string, contentType: string, platform: string | undefined): string {
  return JSON.stringify([videoId, contentType, platform ?? null]);
}

function isKeptKey(entry: unknown): entry is KeptKey {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as KeptKey).signature === "string" &&
    typeof (entry as KeptKey).key === "string"
  );
}

function read(store: KeyStore): KeptKey[] {
  try {
    const raw = store.getItem(START_KEY_ITEM);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isKeptKey).slice(-MAX_KEPT);
  } catch {
    // Unreadable or corrupt: treated as no keys, so the next start makes one.
  }
  return [];
}

function write(store: KeyStore, kept: KeptKey[]): void {
  try {
    store.setItem(START_KEY_ITEM, JSON.stringify(kept));
  } catch {
    // A store that cannot be written: the key still works for this start.
  }
}

/**
 * The key to send for a start of `signature`: the kept one for that request
 * if there is one, otherwise a new one from `newKey`, which is then kept.
 */
export function startKeyFor(signature: string, store: KeyStore, newKey: () => string): string {
  const kept = read(store);
  const found = kept.find((entry) => entry.signature === signature);
  if (found) return found.key;
  const key = newKey();
  write(store, [...kept, { signature, key }].slice(-MAX_KEPT));
  return key;
}

/** Forget `key` once its start has a definite answer. Every other request's key is left alone. */
export function settleStartKey(key: string, store: KeyStore): void {
  const kept = read(store);
  const remaining = kept.filter((entry) => entry.key !== key);
  if (remaining.length !== kept.length) write(store, remaining);
}

/** A store held in memory. Its calls do not fail. */
export function memoryStore(): KeyStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

/**
 * Memory first, `persistent` (the tab's session storage) behind it.
 *
 * Writes go to both; a refusal from `persistent` is ignored, so the memory
 * copy is kept. Reads prefer memory, so once this page has written, a write
 * storage refused cannot bring back what it replaced — settling a key is a
 * write too. After a reload memory is empty and `persistent` answers.
 * `persistent` is null where storage cannot be reached at all.
 */
export function layeredStore(persistent: KeyStore | null, memory: KeyStore): KeyStore {
  return {
    getItem(key) {
      const held = memory.getItem(key);
      if (held !== null) return held;
      try {
        return persistent ? persistent.getItem(key) : null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      memory.setItem(key, value);
      if (!persistent) return;
      try {
        persistent.setItem(key, value);
      } catch {
        // Refused or unreachable: the memory copy stands.
      }
    },
  };
}
