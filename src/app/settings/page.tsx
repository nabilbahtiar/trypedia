import SettingsClient from "@/components/SettingsClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getUserAddressesSSR } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionUser = await getServerSessionUser();
  const addresses = sessionUser?.id ? await getUserAddressesSSR(sessionUser.id) : null;

  return (
    <SettingsClient
      initialUserId={sessionUser?.id ?? null}
      initialUser={
        sessionUser
          ? {
              name: sessionUser.name,
              email: sessionUser.email,
              phone: sessionUser.phone,
              photoUrl: sessionUser.photoUrl ?? null,
            }
          : null
      }
      initialAddresses={addresses}
    />
  );
}
