"use client";

import MusteriLoginForm from "@/components/musteri/musteri-login-form";
import MusteriRegisterForm from "@/components/musteri/musteri-register-form";
import { useEffect } from "react";

type Mode = "login" | "register";

export default function CustomerAuthModal({
  mode,
  onClose,
  onSwitch,
}: {
  mode: Mode | null;
  onClose: () => void;
  onSwitch: (mode: Mode) => void;
}) {
  useEffect(() => {
    if (!mode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mode, onClose]);

  if (!mode) return null;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#1a1a1c]/55 backdrop-blur-sm" aria-label="Kapat" onClick={onClose} />
      <div className="relative z-[1] max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[1.75rem] bg-background p-5 shadow-2xl sm:p-8">
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-surface-container-low"
          onClick={onClose}
          aria-label="Kapat"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        {mode === "login" ? (
          <MusteriLoginForm supabaseConfigured={configured} nextPath="/" />
        ) : (
          <MusteriRegisterForm supabaseConfigured={configured} />
        )}
        <p className="mt-4 text-center text-sm text-secondary">
          {mode === "login" ? (
            <>
              Hesabın yok mu?{" "}
              <button type="button" className="font-bold text-primary" onClick={() => onSwitch("register")}>
                Kayıt ol
              </button>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{" "}
              <button type="button" className="font-bold text-primary" onClick={() => onSwitch("login")}>
                Giriş yap
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
