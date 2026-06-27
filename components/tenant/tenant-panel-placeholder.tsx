type TenantPanelPlaceholderProps = {
  slug: string;
  panel: "dashboard" | "admin" | "garson" | "kasa" | "masa";
  tableNumber?: string;
};

const PANEL_COPY: Record<
  TenantPanelPlaceholderProps["panel"],
  { title: string; description: string; icon: string }
> = {
  dashboard: {
    title: "Dashboard",
    description: "Faz 1'de isletme ayarlari ve siparis yonetimi buraya tasınacak.",
    icon: "dashboard",
  },
  admin: {
    title: "Admin",
    description: "Faz 2'de ciro raporlari, loglar ve iptal islemleri burada olacak.",
    icon: "admin_panel_settings",
  },
  garson: {
    title: "Garson",
    description: "Faz 4'te masa grid'i, siparis alma ve hesap iste burada olacak.",
    icon: "room_service",
  },
  kasa: {
    title: "Kasa",
    description: "Faz 5–7'de masalar, online gel-al ve paket siparis operasyonu burada olacak.",
    icon: "point_of_sale",
  },
  masa: {
    title: "Masa Menusu",
    description: "Faz 3'te musteri masadan siparis verebilecek.",
    icon: "table_restaurant",
  },
};

export default function TenantPanelPlaceholder({ slug, panel, tableNumber }: TenantPanelPlaceholderProps) {
  const copy = PANEL_COPY[panel];
  const panelPath =
    panel === "masa" && tableNumber ? `/masa/${tableNumber}` : `/${panel}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-8 text-center shadow-sm">
        <span className="material-symbols-outlined mb-4 text-5xl text-primary" aria-hidden>
          {copy.icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{slug}.kendisepetim.com</p>
        <h1 className="font-headline mt-2 text-2xl font-bold text-on-background">{copy.title}</h1>
        {tableNumber ? (
          <p className="mt-1 text-sm font-medium text-primary">Masa {tableNumber}</p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-secondary">{copy.description}</p>
        <p className="mt-6 rounded-lg bg-surface-container-low px-3 py-2 font-mono text-xs text-secondary">
          {panelPath}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Menuye don
        </a>
      </div>
    </div>
  );
}
