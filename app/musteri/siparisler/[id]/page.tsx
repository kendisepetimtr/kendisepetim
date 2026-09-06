import MusteriOrderTrack from "@/components/musteri/musteri-order-track";
import { loadCustomerOrderById } from "@/lib/musteri/orders-service";
import { requireMusteriCustomer } from "@/lib/musteri/require-customer";
import { customerOrderPath } from "@/lib/musteri/paths";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Sipariş takibi",
};

export default async function MusteriOrderTrackPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireMusteriCustomer(customerOrderPath(id));
  const order = await loadCustomerOrderById(userId, id);
  if (!order) notFound();
  return <MusteriOrderTrack initialOrder={order} />;
}
