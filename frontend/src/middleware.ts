// frontend/src/middleware.ts
// Runs on every matching request BEFORE the page renders.
// Job 1: keep the Supabase auth session fresh (refresh cookies).
// Job 2: redirect logged-out users away from protected app pages.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// App paths that require a logged-in user. Matched against the real URL
// (route-group folders like "(app)" do NOT appear in the URL).
const PROTECTED_PREFIXES = ["/dashboard", "/create", "/history", "/folders", "/settings", "/output"];

// Auth pages a logged-in user shouldn't see; we send them to the app instead.
const AUTH_PREFIXES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write refreshed cookies onto BOTH the request (so downstream
          // code sees them) and the response (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verifies the token with Supabase (not just trusting the cookie).
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // Logged-out user trying to reach a protected page → send to /login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname); // remember where they wanted to go
    return NextResponse.redirect(url);
  }

  // Logged-in user landing on /login or /signup → send to the app.
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything EXCEPT Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};