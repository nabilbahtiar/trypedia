import { getServerSessionUser } from "@/lib/server-auth";
import { getNotifications } from "@/lib/queries/account-activity";
import NotificationsClient from "@/components/NotificationsClient";
export const dynamic="force-dynamic";
export default async function NotificationsPage() {
  const user=await getServerSessionUser();
  return <NotificationsClient initialItems={user ? await getNotifications(user.id):[]} initialUserId={user?.id ?? null} />;
}
