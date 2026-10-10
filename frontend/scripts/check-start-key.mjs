/**
 * check-start-key
 *
 * Fails when the rules for reusing a generation start's request key stop doing
 * what they say.
 *
 * ── Why this exists ──
 * Each wrong answer here costs money and renders cleanly: a key not reused
 * means a retry pays for a second run; a key reused for a different request
 * means the backend refuses it; a key that survives its definite answer means
 * the next real start is answered with an old job.
 *
 * ── Why it imports rather than re-states ──
 * As with check-fold: it imports the real `start-key.ts`, which imports
 * nothing, so plain node can load it.
 */

import {
  START_KEY_ITEM,
  layeredStore,
  memoryStore,
  requestSignature,
  settleStartKey,
  startKeyFor,
} from "../src/lib/generation/start-key.ts";

let failed = 0;
let run = 0;

function check(name, ok) {
  run++;
  if (!ok) {
    failed++;
    console.error(`  FAIL  ${name}`);
  }
}

let counter = 0;
const newKey = () => `key-${++counter}`;
const A = requestSignature("dQw4w9WgXcQ", "summary", undefined);
const B = requestSignature("dQw4w9WgXcQ", "blog", undefined);

// ── Reuse ──
{
  const store = memoryStore();
  const first = startKeyFor(A, store, newKey);
  check("the same request reuses its key", startKeyFor(A, store, newKey) === first);
  check("a different request gets a new key", startKeyFor(B, store, newKey) !== first);
}

// ── Kept across a reload: the store is what persists ──
{
  const store = memoryStore();
  const first = startKeyFor(A, store, newKey);
  // A second page reading the same store, as after a reload in the same tab.
  check("a key survives a reload of the page", startKeyFor(A, store, newKey) === first);
}

// ── Settled ──
{
  const store = memoryStore();
  const first = startKeyFor(A, store, newKey);
  settleStartKey(first, store);
  check("after a definite answer the same request gets a new key", startKeyFor(A, store, newKey) !== first);
}
{
  const store = memoryStore();
  const old = startKeyFor(A, store, newKey);
  const current = startKeyFor(B, store, newKey);
  settleStartKey(old, store);
  check("settling an old key leaves a newer request's key alone", startKeyFor(B, store, newKey) === current);
}

// ── Signatures ──
check("platform is part of the request",
  requestSignature("v", "social", "linkedin") !== requestSignature("v", "social", "x-thread"));
check("a separator in an id cannot make two requests collide",
  requestSignature("a|b", "c", undefined) !== requestSignature("a", "b|c", undefined));

// ── A store that misbehaves ──
{
  const corrupt = memoryStore();
  corrupt.setItem(START_KEY_ITEM, "{not json");
  check("a corrupt stored key is replaced, not trusted", startKeyFor(A, corrupt, newKey).startsWith("key-"));
}
{
  const wrongShape = memoryStore();
  wrongShape.setItem(START_KEY_ITEM, JSON.stringify({ signature: A, key: 42 }));
  check("a stored key of the wrong shape is replaced", typeof startKeyFor(A, wrongShape, newKey) === "string");
}
{
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  let threw = false;
  let key = "";
  try {
    key = startKeyFor(A, broken, newKey);
    settleStartKey(key, broken);
  } catch {
    threw = true;
  }
  check("a store that refuses every call still yields a key and never throws", !threw && key.startsWith("key-"));
}

// ── The layered store: memory first, storage behind it ──
const fullStorage = (initial = {}) => {
  // Reads work, every write is refused — as when session storage is full.
  const items = new Map(Object.entries(initial));
  return {
    getItem: (k) => items.get(k) ?? null,
    setItem() { throw new Error("QuotaExceededError"); },
    removeItem() { throw new Error("QuotaExceededError"); },
  };
};
{
  const store = layeredStore(fullStorage(), memoryStore());
  const first = startKeyFor(A, store, newKey);
  check("storage refusing the write still keeps the key for a retry", startKeyFor(A, store, newKey) === first);
}
{
  // Storage holds an older key for this request that a refused write never replaced.
  const stale = fullStorage({ [START_KEY_ITEM]: JSON.stringify({ signature: A, key: "stale" }) });
  const store = layeredStore(stale, memoryStore());
  const fresh = startKeyFor(B, store, newKey);
  check("a newer key in memory wins over an older one in storage", startKeyFor(B, store, newKey) === fresh);
}
{
  const storage = memoryStore();
  const first = startKeyFor(A, layeredStore(storage, memoryStore()), newKey);
  // A reload: memory is new and empty, the tab's storage is the same.
  check("the layered store keeps a key across a reload", startKeyFor(A, layeredStore(storage, memoryStore()), newKey) === first);
}
{
  const storage = memoryStore();
  const store = layeredStore(storage, memoryStore());
  const first = startKeyFor(A, store, newKey);
  settleStartKey(first, store);
  check("settling clears both copies", startKeyFor(A, layeredStore(storage, memoryStore()), newKey) !== first);
}
{
  const store = layeredStore(null, memoryStore());
  const first = startKeyFor(A, store, newKey);
  check("with no storage at all the key is still reused within the page", startKeyFor(A, store, newKey) === first);
}

if (failed > 0) {
  console.error(`\ncheck-start-key: ${failed} of ${run} checks FAILED.`);
  process.exit(1);
}

console.log(`check-start-key: ${run} checks passed.`);
