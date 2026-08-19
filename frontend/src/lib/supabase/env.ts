/**
 * Validated Supabase environment variables.
 *
 * Both the browser client, the server client, and the proxy need the same two
 * public values. Each of them previously reached for `process.env.X!`, which
 * silences the compiler rather than proving the value exists — so a missing
 * variable produced a confusing failure inside the Supabase client instead of
 * a clear one at startup.
 *
 * Reading them here once, with a real check, means a misconfigured environment
 * says exactly which variable is missing.
 *
 * Note both names must be written out in full rather than looked up from a
 * variable: the framework replaces `process.env.NEXT_PUBLIC_*` literally at
 * build time, so a dynamic key would not be substituted and would read as
 * undefined in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to frontend/.env.local (and to the hosting provider's ` +
        `environment settings for deployed builds).`,
    );
  }
  return value;
}

/** The Supabase project URL. Public by design — safe in the browser bundle. */
export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/**
 * The anon key. Also public by design: it grants only the limited "anon" role,
 * and the row-level security policies are what actually protect the data.
 * The service key is a different value and never belongs in this file.
 */
export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
