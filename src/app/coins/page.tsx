import CoinsClient from "@/components/CoinsClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getCoinsBundleSSR } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function CoinsPage() {
  const sessionUser = await getServerSessionUser();
  const bundle = sessionUser?.id ? await getCoinsBundleSSR(sessionUser.id) : null;

  return (
    <CoinsClient
      initialUserId={sessionUser?.id ?? null}
      initialCoins={bundle?.coins ?? null}
      initialTransactions={bundle?.transactions ?? null}
    />
  );
}
