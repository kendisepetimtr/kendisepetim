import { getSuperadminAllowedEmails, getSuperadminAuthUser } from "@/lib/superadmin/auth";
import { requireSuperadminOrRedirect } from "@/lib/superadmin/guard";

export default async function SuperadminAccountPage() {
  await requireSuperadminOrRedirect();
  const user = await getSuperadminAuthUser();
  const allowed = getSuperadminAllowedEmails();

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">Hesap</h1>
        <p className="mt-1 text-sm text-secondary">
          Süperadmin girişi Supabase Authentication kullanır. Kullanıcıyı Dashboard → Authentication →
          Users üzerinden oluşturursunuz.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-base font-bold">Oturum açık</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">E-posta</dt>
            <dd className="font-semibold text-on-background">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-secondary">Kullanıcı ID</dt>
            <dd className="break-all font-mono text-xs text-secondary">{user?.id ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h2 className="font-headline text-base font-bold">İzinli e-postalar</h2>
        <p className="mt-2 text-sm text-secondary">
          Yalnızca <code className="text-xs">SUPERADMIN_ALLOWED_EMAILS</code> listesindeki hesaplar
          paneli açabilir. Yeni kullanıcı eklemek için:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-on-background">
          <li>Supabase → Authentication → Users → Add user</li>
          <li>E-posta ve şifreyi belirleyin</li>
          <li>
            Vercel / <code className="text-xs">.env.local</code> içinde e-postayı listeye ekleyin
          </li>
          <li>Production’da redeploy yapın</li>
        </ol>
        <ul className="mt-4 space-y-1 rounded-xl bg-surface-container-low/80 px-4 py-3 text-sm">
          {allowed.length === 0 ? (
            <li className="text-amber-900">Liste boş — env değişkenini tanımlayın.</li>
          ) : (
            allowed.map((email) => (
              <li key={email} className="font-mono text-xs font-semibold">
                {email}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
