import { redirect } from "next/navigation";
import WaiterPinForm from "@/components/garson/waiter-pin-form";
import { countActiveWaiters, getWaiterSessionValidForSlug } from "@/lib/garson/waiter-tenant";
import { requireWaiterTenantForSlug } from "@/lib/staff/guard";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ next?: string }>;
};

function normalizeGarsonNextPath(nextRaw: string | undefined): string {
  if (nextRaw && nextRaw.startsWith("/garson")) return nextRaw;
  return "/garson";
}

export default async function TenantGarsonPinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = searchParams ? await searchParams : {};
  const nextPath = normalizeGarsonNextPath(typeof q.next === "string" ? q.next : undefined);

  const tenant = await requireWaiterTenantForSlug(slug);

  if (await getWaiterSessionValidForSlug(slug)) {
    redirect(nextPath);
  }

  const pinConfigured = (await countActiveWaiters(tenant.id)) > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-surface-container-highest bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">KendiSepetim</p>
          <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-background sm:text-4xl">
            Garson
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-secondary sm:text-base">
            Masa grid&apos;i, sipariş alma ve hesap iste. Ödeme alma bu panelde yok — kasa masada tahsil eder.
            Fiş basımı kasa / panelde yapılır.
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
              Kişisel 4 haneli garson PIN&apos;inizi girin. Tek aktif garsonda oturum uzun kalır; birden fazla
              garsonda 30 dakika sonra yeniden PIN istenir.
            </p>
          </div>
          <WaiterPinForm
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
