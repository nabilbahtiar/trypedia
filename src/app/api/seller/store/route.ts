import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSellerStoreBundle } from "@/lib/queries/marketplace";
import { persistDataUrlIfNeeded } from "@/lib/media";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const storeName = searchParams.get("storeName");

    if (!userId && !storeName) {
      return NextResponse.json(
        { success: false, message: "userId atau storeName wajib disertakan" },
        { status: 400 }
      );
    }

    const bundle = await getSellerStoreBundle({ userId, storeName });
    if (!bundle) {
      return NextResponse.json(
        { success: false, message: "Toko tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      store: bundle.store,
      stats: bundle.stats,
      locations: bundle.locations,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, storeName, storeSlogan, storeDescription, address, district, hours, photoUrl, frontPhotoUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId wajib diisi" },
        { status: 400 }
      );
    }

    const [safePhotoUrl, safeFrontPhotoUrl] = await Promise.all([
      persistDataUrlIfNeeded(photoUrl, "stores"),
      persistDataUrlIfNeeded(frontPhotoUrl, "stores"),
    ]);

    await query(
      `UPDATE stores
       SET store_name = COALESCE($1, store_name),
           store_slogan = COALESCE($2, store_slogan),
           store_description = COALESCE($3, store_description),
           address = COALESCE($4, address),
           district = COALESCE($5, district),
           hours = COALESCE($6, hours),
           photo_url = COALESCE($7, photo_url),
           front_photo_url = COALESCE($8, front_photo_url)
       WHERE user_id = $9`,
      [storeName || null, storeSlogan, storeDescription, address, district, hours, safePhotoUrl, safeFrontPhotoUrl, userId]
    );

    // If address updated, also sync user_addresses shop address
    if (address) {
      try {
        await query(
          `UPDATE user_addresses
           SET street_address = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND (is_shop_address = true OR is_primary = true)`,
          [address, userId]
        );
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Profil toko berhasil diperbarui",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
