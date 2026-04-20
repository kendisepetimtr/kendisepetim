import type { Metadata } from "next";
import Section from "@/components/section";
import SimplePageHeader from "@/components/simple-page-header";

export const metadata: Metadata = {
  title: "Hakkimizda",
  description: "KendiSepetim'in vizyonu, degerleri ve calisma yaklasimi.",
};

export default function AboutPage() {
  return (
    <>
      <SimplePageHeader />
      <Section
        title="Guven temelli uzun vadeli is ortakligi"
        description="KendiSepetim, kurumlarin sureclerini guclendirmek ve surdurulebilir buyume hedeflerini desteklemek icin kurulmustur."
      >
      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-on-background">Vizyonumuz</h3>
          <p className="mt-3 text-sm leading-7 text-secondary">
            Isletmelerin degisen pazar kosullarina hizla uyum saglayarak rekabet avantajlarini korumalarina
            yardimci olmak.
          </p>
        </article>
        <article className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-on-background">Calisma Modelimiz</h3>
          <p className="mt-3 text-sm leading-7 text-secondary">
            Analiz, planlama ve uygulama asamalarinda kurum ekipleriyle birlikte calisir; surec boyunca
            seffaf raporlama sunariz.
          </p>
        </article>
      </div>
    </Section>
    </>
  );
}
