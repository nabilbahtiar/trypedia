import { notFound } from "next/navigation";
import StoreClient from "@/components/StoreClient";
import { getPublicStorePageBundle } from "@/lib/queries/marketplace";
import { getServerSessionUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bundle, sessionUser] = await Promise.all([
    getPublicStorePageBundle(id),
    getServerSessionUser(),
  ]);

  if (!bundle) {
    notFound();
  }

  return (
    <StoreClient
      store={bundle.store}
      stats={bundle.stats}
      locations={bundle.locations}
      products={bundle.products}
      reviews={bundle.reviews}
      initialViewerId={sessionUser?.id ?? null}
    />
  );
}

