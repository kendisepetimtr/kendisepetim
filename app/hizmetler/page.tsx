import type { Metadata } from "next";
import Section from "@/components/section";
import SimplePageHeader from "@/components/simple-page-header";

export const metadata: Metadata = {
  title: "Hizmetler",
  description: "KendiSepetim'in sundugu strateji, operasyon ve dijital donusum hizmetleri.",
};

const services = [
  {
    title: "Stratejik Danismanlik",
    text: "Hedef odakli yol haritasi olusturarak is kararlarinin etkisini artiriyoruz.",
  },
  {
    title: "Operasyonel Iyilestirme",
    text: "Sureclerde verimlilik saglayip maliyetleri optimize edecek iyilestirmeleri devreye aliyoruz.",
  },
  {
    title: "Dijital Donusum",
    text: "Veri odakli yaklasimla dijital araclari is akislarina entegre ediyoruz.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <SimplePageHeader />
      <Section
        title="Isletmeniz icin ozel hizmet paketleri"
        description="Ihtiyaciniza gore uyarlanabilen cozumlerle kurumunuzun buyume ve verimlilik hedeflerine destek oluyoruz."
      >
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="rounded-xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-on-background">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-secondary">{service.text}</p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
