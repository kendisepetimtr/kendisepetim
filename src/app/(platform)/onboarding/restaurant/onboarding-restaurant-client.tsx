"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { signOutAndReturnToLogin } from "../../login/actions";
import {
  completeRestaurantOnboarding,
  previewRestaurantSlug,
  type SlugPreviewResult,
} from "./actions";

type Props = {
  initialError?: string;
  rootDomain: string;
};

export function OnboardingRestaurantClient({ initialError, rootDomain }: Props) {
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [preview, setPreview] = useState<SlugPreviewResult | null>(null);
  const [localError, setLocalError] = useState(initialError ?? "");
  const slugManualRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPreviewPending, startTransition] = useTransition();

  const runPreview = useCallback((name: string) => {
    startTransition(() => {
      void (async () => {
        const result = await previewRestaurantSlug(name);
        setPreview(result);
        setLocalError(result.error ?? "");
        if (result.error) return;
        if (!slugManualRef.current && result.recommendedSlug) {
          setSlug(result.recommendedSlug);
        }
      })();
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const name = restaurantName.trim();
    if (!name) {
      setPreview(null);
      if (!slugManualRef.current) setSlug("");
      return;
    }
    debounceRef.current = setTimeout(() => runPreview(name), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [restaurantName, runPreview]);

  useEffect(() => {
    if (initialError) setLocalError(initialError);
  }, [initialError]);

  const displaySlug = slug.trim() || preview?.recommendedSlug || "";
  const publicUrl = displaySlug ? `${displaySlug}.${rootDomain}` : `…${rootDomain}`;

  return (
    <section className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Hos geldiniz</h1>
      <p className="mt-2 text-sm text-gray-600">
        Restoran adinizi yazin; menü adresiniz otomatik olusur. Canlida musteriler{" "}
        <span className="font-medium text-gray-800">{`{slug}.${rootDomain}`}</span> uzerinden menüye
        ulasir.
      </p>

      {localError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </p>
      ) : null}

      <form action={completeRestaurantOnboarding} className="mt-6 space-y-5">
        <div>
          <label htmlFor="restaurant_name" className="mb-1 block text-sm font-medium text-gray-700">
            Restoran adi
          </label>
          <input
            id="restaurant_name"
            name="restaurant_name"
            required
            autoComplete="organization"
            value={restaurantName}
            onChange={(e) => {
              setRestaurantName(e.target.value);
              slugManualRef.current = false;
            }}
            placeholder="Ornek: Durumcu Ekrem"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-indigo-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
            Menü adresi (slug)
          </label>
          <input
            id="slug"
            name="slug"
            required
            value={displaySlug}
            onChange={(e) => {
              slugManualRef.current = true;
              setSlug(e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="otomatik"
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm outline-none ring-indigo-500 transition focus:ring-2"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            {isPreviewPending ? "Kontrol ediliyor..." : null}
            {preview && !preview.baseAvailable && !preview.error ? (
              <span className="text-amber-700">
                {" "}
                Taban adres dolu; size musait bir adres secildi. Isterseniz asagidakilerden birini
                tiklayin.
              </span>
            ) : null}
          </p>
          <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">
            https://{publicUrl}
          </p>
        </div>

        {preview && preview.alternateSlugs.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Alternatif adresler
            </p>
            <div className="flex flex-wrap gap-2">
              {[preview.recommendedSlug, ...preview.alternateSlugs]
                .filter((s, i, a) => a.indexOf(s) === i)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      slugManualRef.current = true;
                      setSlug(s);
                    }}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-xs text-gray-800 hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!displaySlug || isPreviewPending}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restorani olustur ve panele git
        </button>
      </form>

      <form action={signOutAndReturnToLogin} className="mt-4">
        <button
          type="submit"
          className="w-full text-center text-sm text-gray-500 underline hover:text-gray-800"
        >
          Farkli hesapla giris yap
        </button>
      </form>
    </section>
  );
}
