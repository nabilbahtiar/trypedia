import { redirect } from "next/navigation";
import { getWalletRequests } from "@/lib/finance";
import WalletClient from "@/components/WalletClient";
import { getServerSessionUser } from "@/lib/server-auth";
import { getWalletBundleSSR } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const sessionUser = await getServerSessionUser();
  if (sessionUser?.role === "SUPERADMIN") redirect("/admin");
  const requests = sessionUser ? await getWalletRequests(sessionUser.id) : [];
  const bundle = sessionUser?.id ? await getWalletBundleSSR(sessionUser.id) : null;

  return (
    <WalletClient
      initialUserId={sessionUser?.id ?? null}
      initialBalance={bundle?.balance ?? null}
      initialTransactions={bundle?.transactions ?? null}
      initialRequests={requests}
    />
  );
}
