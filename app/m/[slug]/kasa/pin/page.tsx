import { redirect } from "next/navigation";
import CashierPinForm from "@/components/kasa/cashier-pin-form";
import { getCashierSessionValidForSlug } from "@/lib/kasa/cashier-tenant";
import { requireCashierTenantForSlug } from "@/lib/staff/guard";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ next?: string }>;
};

function normalizeKasaNextPath(nextRaw: string | undefined): string {
  if (nextRaw && nextRaw.startsWith("/kasa")) return nextRaw;
  return "/kasa";
}

export default async function TenantKasaPinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = searchParams ? await searchParams : {};
  const nextPath = normalizeKasaNextPath(typeof q.next === "string" ? q.next : undefined);

  const tenant = await requireCashierTenantForSlug(slug);

  if (await getCashierSessionValidForSlug(slug)) {
    redirect(nextPath);
  }

  const pinConfigured = !!tenant.cashier_pin_hash && !!tenant.cashier_pin_set_at;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-surface-container-highest bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">KendiSepetim</p>
          <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-background sm:text-4xl">
            Kasa
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-secondary sm:text-base">
            Masa hesaplarını görüntüleyin, ödemeyi alın ve oturumu kapatın. Gel-al ve paket siparişler sonraki
            fazlarda buraya eklenecek.
          </p>
          <div className="mt-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">İşletme</p>
            <p className="mt-2 font-headline text-2xl font-bold text-on-background">{tenant.business_name}</p>
            <p className="mt-1 text-sm text-secondary">{tenant.table_count} masa</p>
          </div>
        </section>

        <section className="self-center">
          <div className="mb-6">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-background">PIN doğrulama</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Paylaşılan kasa cihazı için operasyon PIN&apos;inizi girin.
            </p>
          </div>
          <CashierPinForm
            slug={slug}
            nextPath={nextPath}
            pinConfigured={pinConfigured}
            businessName={tenant.business_name}
          />
        </section>
      </div>
    </div>
  );
}
