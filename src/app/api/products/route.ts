import { NextResponse } from "next/server";
import { getMarketplaceProducts } from "@/lib/queries/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sellerId = searchParams.get("sellerId");
    const id = searchParams.get("id");
    const summary = searchParams.get("summary") === "1";

    const products = await getMarketplaceProducts({
      id,
      category,
      sellerId,
      summary,
    });

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
