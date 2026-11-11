import { notFound, redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/server-auth";
import { getRentalPurchaseSummary } from "@/lib/queries/marketplace";
import RentalPurchaseClient from "@/components/RentalPurchaseClient";

export const dynamic = "force-dynamic";

export default async function RentalPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSessionUser();
  if (!user) redirect("/orders");
  const { id } = await params;
  const summary = await getRentalPurchaseSummary(id, user.id);
  if (!summary) notFound();
  return <RentalPurchaseClient initialSummary={summary} />;
}
