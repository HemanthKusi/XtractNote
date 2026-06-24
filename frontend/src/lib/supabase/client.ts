// lib/supabase/client.ts
// Creates a Supabase client for use in the BROWSER (client components).
// Import this in any file that starts with "use client".

import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase client configured for the browser.
 *
 * Reads the project URL and the public "anon" key from environment
 * variables. Both are safe to expose to the browser: the anon key only
 * grants the limited "anon" role, and your real data stays protected by
 * the Row Level Security policies we add in Phase 8.2.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}