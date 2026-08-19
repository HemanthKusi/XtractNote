// lib/supabase/server.ts
// Creates a Supabase client for use on the SERVER (server components,
// route handlers, middleware). Reads/writes the auth session via cookies.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "./env";

/**
 * Returns a Supabase client configured for the server.
 *
 * It reads the request's cookies to know which user is signed in, and can
 * write refreshed session cookies back — except from Server Components,
 * which are read-only for cookies. In that case the write is safely ignored
 * (see the try/catch), and the middleware (File 3) refreshes cookies instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        // Hand Supabase every cookie on the incoming request.
        getAll() {
          return cookieStore.getAll();
        },
        // Let Supabase write refreshed session cookies back.
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (cookies are read-only there).
            // Safe to ignore — the middleware handles session refresh.
          }
        },
      },
    },
  );
}