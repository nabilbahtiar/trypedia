import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/server-auth";
import HomeClient from "@/components/HomeClient";
import { getMarketplaceProducts } from "@/lib/queries/marketplace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if ((await getServerSessionUser())?.role === "SUPERADMIN") redirect("/admin");
  const products = await getMarketplaceProducts({ summary: true });
  return <HomeClient initialProducts={products} />;
}
