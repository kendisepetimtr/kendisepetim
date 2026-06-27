import Link from "next/link";
import { redirect } from "next/navigation";
import OwnerAdminPinForm from "@/components/dashboard/owner-admin-pin-form";
import { requireOwnerTenantSlugMatch } from "@/lib/admin/tenant-slug-guard";
import { getOwnerAdminSessionValid } from "@/lib/owner-admin/guard";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ next?: string }>;
};

function normalizeAdminNextPath(nextRaw: string | undefined): string {
  if (nextRaw && nextRaw.startsWith("/admin")) return nextRaw;
  return "/admin";
}

export default async function TenantAdminPinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = searchParams ? await searchParams : {};
  const nextPath = normalizeAdminNextPath(typeof q.next === "string" ? q.next : undefined);

  const tenant = await requireOwnerTenantSlugMatch(slug);

  if (await getOwnerAdminSessionValid()) {
    redirect(nextPath);
  }

  const pinConfigured = !!tenant.owner_admin_pin_hash && !!tenant.owner_admin_pin_set_at;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-surface-container-highest bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">KendiSepetim</p>
          <h1 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-background sm:text-4xl">
            Admin
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-secondary sm:text-base">
            Ciro raporları, operasyon logları ve sipariş iptali için ek PIN doğrulaması gerekir.
          </p>
          <div className="mt-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">İşletme</p>
            <p className="mt-2 font-headline text-2xl font-bold text-on-background">{tenant.business_name}</p>
            <p className="mt-1 text-sm text-secondary">{tenant.email}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container"
            >
              Dashboard&apos;a dön
            </Link>
          </div>
        </section>

        <section className="self-center">
          <div className="mb-6">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-background">PIN doğrulama</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              E-posta oturumunuz açık. Devam etmek için admin PIN&apos;inizi girin.
            </p>
          </div>
          <OwnerAdminPinForm nextPath={nextPath} pinConfigured={pinConfigured} />
        </section>
      </div>
    </div>
  );
}
