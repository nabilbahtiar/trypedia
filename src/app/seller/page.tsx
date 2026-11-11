import SellerClient from "@/components/SellerClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getSellerDashboardBundleSSR } from "@/lib/queries/marketplace";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SellerPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; edit?: string; create?: string; orderTab?: string }>;
}) {
  const sessionUser = await getServerSessionUser();
  if (sessionUser?.role === "SUPERADMIN") redirect("/admin");
  if(sessionUser&&!sessionUser.isVerified)redirect("/settings?verification=required");
  const sp = await searchParams;
  if (sessionUser) {
    if (!sp.tab && !sp.edit && !sp.create) redirect(`/store/${sessionUser.id}?tab=beranda`);
    if (sp.tab === "products" && !sp.edit && !sp.create) redirect(`/store/${sessionUser.id}?tab=produk`);
  }
  const initialBundle = sessionUser?.id
    ? await getSellerDashboardBundleSSR(sessionUser.id, sp.orderTab)
    : null;
  if (sessionUser && sp.edit && !initialBundle?.products.some((product: any) => product.id === sp.edit)) notFound();

  return (
    <SellerClient
      initialUserId={sessionUser?.id ?? null}
      initialBundle={initialBundle}
      initialTab={sp.edit || sp.create ? "products" : sp.tab === "locations" ? "locations" : sp.tab === "settings" ? "settings" : "orders"}
      productAction={sp.edit ? "edit" : sp.create ? "create" : undefined}
      productId={sp.edit}
      initialOrderSubTab={sp.orderTab === "SELESAI" || sp.orderTab === "DISEWA" || sp.orderTab === "DIJADWALKAN_DIKIRIM" ? sp.orderTab : "PERLU_KONFIRMASI"}
    />
  );
}
