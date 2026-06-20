"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl, DEFAULT_POST_LOGIN_PATH } from "@/lib/supabase/auth-urls";
import { getBrowserSiteUrl } from "@/lib/site-url";

type Props = {
  nextPath: string;
  label?: string;
};

export default function GoogleAuthButton({ nextPath, label = "Google ile devam et" }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    try {
      const siteBase = getBrowserSiteUrl();
      if (!siteBase) {
        setError("Site adresi belirlenemedi.");
        setPending(false);
        return;
      }

      const next = nextPath.startsWith("/") ? nextPath : DEFAULT_POST_LOGIN_PATH;
      const redirectTo = buildAuthCallbackUrl(siteBase, next);

      const supabase = createBrowserSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setPending(false);
      }
    } catch {
      setError("Google ile giriş başlatılamadı.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-surface-container-highest bg-white py-3.5 text-sm font-semibold text-on-background shadow-sm transition-all hover:bg-surface-container-low disabled:opacity-60"
      >
        <GoogleIcon />
        {pending ? "Yönlendiriliyor…" : label}
      </button>
      {error ? (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.477-10-10s4.478-10 10-10c2.482 0 4.744.915 6.482 2.421l5.657-5.657C33.64 6.053 29.082 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c2.482 0 4.744.915 6.482 2.421l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C42.022 35.026 44 30.138 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}
