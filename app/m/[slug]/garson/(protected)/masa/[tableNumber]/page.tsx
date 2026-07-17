import { redirect } from "next/navigation";

/** Eski masa menü yolu — sipariş artık grid + modal üzerinden. */
export default async function GarsonTableOrderRedirect({
  params,
}: {
  params: Promise<{ slug: string; tableNumber: string }>;
}) {
  await params;
  redirect("/garson");
}
