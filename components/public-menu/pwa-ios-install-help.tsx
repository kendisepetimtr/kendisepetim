"use client";

import PwaInstallGuideVideo from "@/components/public-menu/pwa-install-guide-video";

const IOS_STEPS = [
  {
    icon: "safari",
    title: "Safari kullanın",
    body: "Kurulum yalnızca Safari'de çalışır. Chrome veya uygulama içi tarayıcıdaysanız bu sayfayı Safari'de açın.",
  },
  {
    icon: "ios_share",
    title: "Paylaş menüsünü açın",
    body: "Ekranın altındaki Paylaş simgesine dokunun (kare içinde yukarı ok).",
  },
  {
    icon: "add_box",
    title: "Ana Ekrana Ekle",
    body: "Açılan listede aşağı kaydırın ve «Ana Ekrana Ekle» seçeneğine dokunun.",
  },
  {
    icon: "check_circle",
    title: "Ekle'ye onay verin",
    body: "Sağ üstteki «Ekle» ile onaylayın. Menü ana ekranınızda uygulama gibi görünür.",
  },
] as const;

type PwaIosInstallHelpProps = {
  businessName: string;
  variant?: "inline" | "sheet";
  onDismiss?: () => void;
};

export default function PwaIosInstallHelp({
  businessName,
  variant = "inline",
  onDismiss,
}: PwaIosInstallHelpProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-on-background">iPhone / iPad — Ana ekrana ekleme</p>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            <span className="font-semibold text-on-background">{businessName}</span> menüsünü ana ekrana
            eklemek için aşağıdaki adımları izleyin. Videodaki hareketleri birebir takip edebilirsiniz.
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-xl p-2 text-secondary hover:bg-surface-container-low"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-surface-container-highest bg-black/5">
        <PwaInstallGuideVideo className="mx-auto max-h-56 sm:max-h-64" playWhenVisible />
      </div>

      <ol className="mt-4 space-y-3">
        {IOS_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-2xl border border-surface-container-highest bg-white px-3 py-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-on-background">
                <span className="material-symbols-outlined text-[18px] text-primary">{step.icon}</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        «Ana Ekrana Ekle» listede görünmüyorsa listeyi aşağı kaydırın veya önce «Daha Fazla» seçeneğine
        bakın. Kurulumdan sonra menüyü ana ekrandaki simgeden açın.
      </p>
    </>
  );

  if (variant === "sheet") {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-ios-help-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onDismiss?.();
        }}
      >
        <div className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl">
          <span id="pwa-ios-help-title" className="sr-only">
            iOS ana ekrana ekleme rehberi
          </span>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4">{content}</div>
  );
}
