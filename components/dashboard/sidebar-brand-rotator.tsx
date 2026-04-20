"use client";

import type { LocalTenantProfile } from "@/lib/local-tenant";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/** İlk yüklemede platform markası süresi */
const INTRO_PLATFORM_MS = 10_000;
/** Döngüde platform (KendiSepetim) süresi */
const PLATFORM_CYCLE_MS = 60_000;
/** Döngüde işletme süresi */
const BUSINESS_CYCLE_MS = 300_000;

type Face = "platform" | "business";
type Phase = "intro" | "cycle";
type RotatorMode = "expanded" | "iconOnly" | "mobile";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useBrandRotation(): Face {
  const [face, setFace] = useState<Face>("platform");
  const [phase, setPhase] = useState<Phase>("intro");

  useEffect(() => {
    const delay = phase === "intro" ? INTRO_PLATFORM_MS : face === "business" ? BUSINESS_CYCLE_MS : PLATFORM_CYCLE_MS;
    const t = window.setTimeout(() => {
      if (phase === "intro") {
        setFace("business");
        setPhase("cycle");
      } else {
        setFace((f) => (f === "business" ? "platform" : "business"));
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [phase, face]);

  return face;
}

function BusinessMark({
  tenant,
  sizePx,
  roundedClass,
}: {
  tenant: LocalTenantProfile;
  sizePx: number;
  roundedClass: string;
}) {
  if (tenant.logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logoDataUrl}
        alt=""
        width={sizePx}
        height={sizePx}
        className={`shrink-0 object-contain ${roundedClass}`}
        style={{ width: sizePx, height: sizePx }}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-surface-container-low text-secondary ${roundedClass}`}
      style={{ width: sizePx, height: sizePx }}
      aria-hidden
    >
      <span className="material-symbols-outlined" style={{ fontSize: Math.round(sizePx * 0.55) }}>
        store
      </span>
    </span>
  );
}

export default function SidebarBrandRotator({ tenant, mode }: { tenant: LocalTenantProfile; mode: RotatorMode }) {
  const face = useBrandRotation();
  const reducedMotion = usePrefersReducedMotion();
  const showBusiness = face === "business";

  const flipMs = reducedMotion ? 0 : 600;
  const rotated = showBusiness ? 180 : 0;

  if (mode === "iconOnly") {
    const size = 40;
    return (
      <Link
        href="/"
        className="flex shrink-0 items-center justify-center rounded-xl p-1 transition-colors duration-200 hover:bg-surface-container-low active:bg-surface-container-high/70"
        style={{ perspective: reducedMotion ? undefined : 900 }}
        title={showBusiness ? tenant.businessName : "KendiSepetim"}
      >
        <div
          className="relative"
          style={{
            width: size,
            height: size,
            transformStyle: reducedMotion ? undefined : "preserve-3d",
            transition: reducedMotion ? undefined : `transform ${flipMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            transform: reducedMotion ? undefined : `rotateY(${rotated}deg)`,
          }}
        >
          {reducedMotion ? (
            showBusiness ? (
              <BusinessMark tenant={tenant} sizePx={size} roundedClass="rounded-xl border border-surface-container-high bg-white" />
            ) : (
              <Image
                src="/ks-logo.png"
                alt="KendiSepetim"
                width={size}
                height={size}
                className="object-contain"
                priority={false}
              />
            )
          ) : (
            <>
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <Image
                  src="/ks-logo.png"
                  alt="KendiSepetim"
                  width={size}
                  height={size}
                  className="object-contain"
                  priority={false}
                />
              </span>
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <BusinessMark tenant={tenant} sizePx={size} roundedClass="rounded-xl border border-surface-container-high bg-white" />
              </span>
            </>
          )}
        </div>
      </Link>
    );
  }

  /* expanded + mobile: logo + text row */
  const logoSize = mode === "mobile" ? 56 : 72;
  const textPlatform = "font-headline text-base font-bold tracking-tight text-[#bc000c]";
  const textBusiness = "font-headline min-w-0 flex-1 truncate text-base font-bold tracking-tight text-on-background";

  return (
    <Link
      href="/"
      className="flex min-w-0 flex-1 items-center"
      style={{ perspective: reducedMotion ? undefined : 900 }}
    >
      <div
        className="relative w-full min-w-0"
        style={{
          minHeight: logoSize,
          transformStyle: reducedMotion ? undefined : "preserve-3d",
          transition: reducedMotion ? undefined : `transform ${flipMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          transform: reducedMotion ? undefined : `rotateY(${rotated}deg)`,
        }}
      >
        {reducedMotion ? (
          <div className="flex min-w-0 items-center gap-3">
            {showBusiness ? (
              <>
                <BusinessMark
                  tenant={tenant}
                  sizePx={logoSize}
                  roundedClass="rounded-2xl border border-surface-container-high bg-white shadow-sm"
                />
                <span className={textBusiness}>{tenant.businessName}</span>
              </>
            ) : (
              <>
                <Image
                  src="/ks-logo.png"
                  alt="KendiSepetim"
                  width={logoSize}
                  height={logoSize}
                  className="shrink-0 object-contain"
                  style={{ width: logoSize, height: logoSize }}
                  priority={mode === "mobile"}
                />
                <span className={textPlatform}>KendiSepetim</span>
              </>
            )}
          </div>
        ) : (
          <>
            <div
              className="absolute left-0 top-0 flex w-full min-w-0 items-center gap-3"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <Image
                src="/ks-logo.png"
                alt="KendiSepetim"
                width={logoSize}
                height={logoSize}
                className="shrink-0 object-contain"
                style={{ width: logoSize, height: logoSize }}
                priority={mode === "mobile"}
              />
              <span className={textPlatform}>KendiSepetim</span>
            </div>
            <div
              className="absolute left-0 top-0 flex w-full min-w-0 items-center gap-3"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <BusinessMark
                tenant={tenant}
                sizePx={logoSize}
                roundedClass="rounded-2xl border border-surface-container-high bg-white shadow-sm"
              />
              <span className={textBusiness} title={tenant.businessName}>
                {tenant.businessName}
              </span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
