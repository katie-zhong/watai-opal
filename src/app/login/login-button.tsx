"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }
  return (
    <button onClick={signIn} className="btn-primary w-full justify-center">
      Continue with Google
    </button>
  );
}
