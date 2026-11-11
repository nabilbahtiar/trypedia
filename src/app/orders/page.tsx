import OrdersClient from "@/components/OrdersClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getUserOrdersSSR } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const sessionUser = await getServerSessionUser();
  const initialOrders = sessionUser?.id
    ? await getUserOrdersSSR(sessionUser.id)
    : null;

  return (
    <OrdersClient
      initialUserId={sessionUser?.id ?? null}
      initialOrders={initialOrders}
    />
  );
}
