"use client";

import { useEffect } from "react";

export type LegalModalKind = "terms" | "privacy";

const CONTENT: Record<
  LegalModalKind,
  { title: string; paragraphs: string[] }
> = {
  terms: {
    title: "Kullanım şartları (özet)",
    paragraphs: [
      "KendiSepetim’i yalnızca işletmenizin meşru faaliyetleri ve sunduğumuz hizmetlerin amacı doğrultusunda kullanırsınız.",
      "Hesap ve şifre güvenliğinden siz sorumlusunuz; şüpheli kullanımda bizi bilgilendirmenizi rica ederiz.",
      "Platformu kötüye kullanmak, yasadışı içerik barındırmak veya üçüncü kişilerin haklarını ihlal etmek yasaktır.",
      "Hizmet kapsamı ve ücretlendirme ile ilgili güncellemeler size uygulanabilir kanallar üzerinden duyurulabilir.",
      "Bu metin özet niteliğindedir. Ayrıntılı kullanım şartları ileride sitede yayımlanacaktır.",
    ],
  },
  privacy: {
    title: "Gizlilik politikası (özet)",
    paragraphs: [
      "Kayıt sırasında paylaştığınız işletme, iletişim ve hesap bilgileri ile hizmeti sunmak için gerekli teknik kayıtlar işlenebilir.",
      "Verileriniz hizmeti işletmek, güvenliği sağlamak, yasal yükümlülükleri yerine getirmek ve sizinle iletişim kurmak için kullanılır.",
      "Kişisel verileriniz, kanunun öngördüğü haller veya hizmeti sağlayan iş ortaklarımızla sınırlı ve güvenli şekilde paylaşılabilir.",
      "6698 sayılı KVKK kapsamındaki haklarınız (bilgi talebi, düzeltme, silme vb.) için bizimle iletişime geçebilirsiniz.",
      "Bu metin özet niteliğindedir. Ayrıntılı aydınlatma ve politika metni ileride sitede yayımlanacaktır.",
    ],
  },
};

type LegalSummaryModalProps = {
  kind: LegalModalKind | null;
  onClose: () => void;
};

export default function LegalSummaryModal({ kind, onClose }: LegalSummaryModalProps) {
  const open = kind !== null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!kind) return null;

  const { title, paragraphs } = CONTENT[kind];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Pencereyi kapat"
        className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-2xl"
      >
        <div className="border-b border-surface-container-high px-6 py-4">
          <h2 id="legal-modal-title" className="font-headline text-lg font-bold text-on-background">
            {title}
          </h2>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-6 py-5">
          <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-secondary">
            {paragraphs.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="border-t border-surface-container-high bg-surface-container-low/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-container"
          >
            Okudum, anladım
          </button>
        </div>
      </div>
    </div>
  );
}
