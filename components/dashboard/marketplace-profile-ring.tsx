"use client";

import type { MarketplaceChecklistItem } from "@/lib/marketplace-profile-checklist";

type ChecklistItemWithStatus = MarketplaceChecklistItem & { complete: boolean };

type MarketplaceProfileRingProps = {
  logoUrl: string;
  businessName: string;
  items: ChecklistItemWithStatus[];
  completedCount: number;
  totalCount: number;
  onItemActivate?: (item: ChecklistItemWithStatus) => void;
};

function ownerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function MarketplaceProfileRing({
  logoUrl,
  businessName,
  items,
  completedCount,
  totalCount,
  onItemActivate,
}: MarketplaceProfileRingProps) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const ringRadius = 118;
  const gapDeg = 5;
  const segmentDeg = (360 - gapDeg * items.length) / items.length;

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          aria-hidden
        >
          {items.map((item, index) => {
            const start = index * (segmentDeg + gapDeg);
            const end = start + segmentDeg;
            const complete = item.complete;
            return (
              <path
                key={item.key}
                d={describeArc(cx, cy, ringRadius, start, end)}
                fill="none"
                strokeWidth={10}
                strokeLinecap="round"
                stroke={complete ? "#10b981" : "#e2e8f0"}
              />
            );
          })}
        </svg>

        {items.map((item, index) => {
          const midAngle = index * (segmentDeg + gapDeg) + segmentDeg / 2;
          const labelPos = polarToCartesian(cx, cy, ringRadius + 22, midAngle);
          const complete = item.complete;
          return (
            <button
              key={`label-${item.key}`}
              type="button"
              title={item.label}
              onClick={() => onItemActivate?.(item)}
              className={[
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight transition-colors",
                complete
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-surface-container-highest bg-white text-secondary hover:border-primary/40 hover:text-on-background",
              ].join(" ")}
              style={{ left: labelPos.x, top: labelPos.y }}
            >
              {item.shortLabel}
            </button>
          );
        })}

        <div
          className={[
            "absolute left-1/2 top-1/2 flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[3px] bg-surface-container-low shadow-inner",
            completedCount === totalCount ? "border-emerald-500" : "border-surface-container-highest",
          ].join(" ")}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-headline text-xl font-bold text-primary">{ownerInitials(businessName)}</span>
          )}
        </div>
      </div>

      <p className="mt-4 text-center font-headline text-base font-bold text-on-background">
        Profili tamamla
      </p>
      <p className="mt-1 text-center text-sm text-secondary">
        <span className="font-semibold text-emerald-700">{completedCount}</span>
        {" / "}
        {totalCount} adım tamamlandı
        {completedCount === totalCount ? " — yayına hazırsınız!" : ""}
      </p>
    </div>
  );
}
