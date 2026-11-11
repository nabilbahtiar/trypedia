import CheckoutClient from "@/components/CheckoutClient";
import { getServerSessionUser } from "@/lib/server-auth";
import {
  getProductDetailBundle,
  getWalletBundleSSR,
  getCoinsBundleSSR,
  getUserAddressesSSR,
} from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; type?: string; duration?: string; price?: string }>;
}) {
  const sp = await searchParams;
  const productId = sp?.id || "new-balance-2022r";

  const [bundle, sessionUser] = await Promise.all([
    getProductDetailBundle(productId),
    getServerSessionUser(),
  ]);

  const userId = sessionUser?.id || null;
  const [wallet, coins, addresses] = userId
    ? await Promise.all([
        getWalletBundleSSR(userId),
        getCoinsBundleSSR(userId),
        getUserAddressesSSR(userId),
      ])
    : [null, null, []];

  return (
    <CheckoutClient
      initialProduct={bundle?.product || null}
      initialStore={bundle?.store || null}
      initialLocations={bundle?.locations || []}
      initialUserId={userId}
      initialUserName={sessionUser?.name || null}
      initialUserPhone={sessionUser?.phone || null}
      initialAddresses={addresses}
      initialWalletBalance={wallet?.balance ?? null}
      initialCoins={coins?.coins ?? null}
    />
  );
}
