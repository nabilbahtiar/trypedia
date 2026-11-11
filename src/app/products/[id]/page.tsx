import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getProductDetailBundle } from "@/lib/queries/marketplace";
import { query } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, viewer] = await Promise.all([getProductDetailBundle(id), getServerSessionUser()]);

  if (!bundle) {
    notFound();
  }

  const cartRows = viewer ? await query("SELECT product_id FROM cart_items WHERE user_id=$1 AND product_id=$2", [viewer.id,id]) : [];

  return (
    <ProductDetailClient
      initialProduct={bundle.product}
      initialStore={bundle.store}
      initialStats={bundle.stats}
      initialReviews={bundle.reviews}
      initialViewerId={viewer?.id ?? null}
      initialCartContains={cartRows.length > 0}
    />
  );
}
