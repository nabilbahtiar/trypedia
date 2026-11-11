import { getServerSessionUser } from "@/lib/server-auth";
import { getCartItems } from "@/lib/queries/account-activity";
import CartClient from "@/components/CartClient";
export const dynamic="force-dynamic";
export default async function CartPage() {
  const user=await getServerSessionUser();
  return <CartClient initialItems={user ? await getCartItems(user.id) : []} initialUserId={user?.id ?? null} />;
}
