// frontend/src/app/auth/callback/route.ts
// Finishes a login. Google sign-in and email-confirmation links send the user
// back here with a one-time `code`; we exchange it for a real session, then
// forward the user on. This is an API route handler (route.ts), not a page.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // The one-time code Supabase appended after Google / email confirmation.
  const code = searchParams.get("code");

  // Where to send the user afterwards. Only allow relative in-app paths
  // (must start with a single "/") to prevent open-redirect attacks.
  const requested = searchParams.get("redirectTo");
  const redirectTo =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    // Success: the session cookie is now set — send them into the app.
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // No code, or the exchange failed → back to login with a flag to show a message.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}