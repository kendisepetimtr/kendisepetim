import type { Metadata } from "next";
import Section from "@/components/section";
import SimplePageHeader from "@/components/simple-page-header";

export const metadata: Metadata = {
  title: "Iletisim",
  description: "KendiSepetim ile iletisime gecmek icin telefon, e-posta ve adres bilgileri.",
};

export default function ContactPage() {
  return (
    <>
      <SimplePageHeader />
      <Section
        title="Iletisim"
        description="Projenizi dinlemek ve en uygun cozum modelini olusturmak icin bizimle iletisime gecebilirsiniz."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="text-base font-semibold text-on-background">Telefon</h3>
            <p className="mt-2 text-sm text-secondary">+90 212 000 00 00</p>
          </article>
          <article className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="text-base font-semibold text-on-background">E-posta</h3>
            <p className="mt-2 text-sm text-secondary">info@kendisepetim.com</p>
          </article>
          <article className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="text-base font-semibold text-on-background">Adres</h3>
            <p className="mt-2 text-sm text-secondary">Istanbul, Turkiye</p>
          </article>
        </div>
      </Section>
    </>
  );
}
