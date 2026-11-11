import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { persistImageArrayIfNeeded, persistDataUrlIfNeeded } from "@/lib/media";
import { getServerSessionUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return NextResponse.json(
        { success: false, message: "sellerId wajib disertakan" },
        { status: 400 }
      );
    }

    const rows = await query(
      `SELECT id, seller_id as "sellerId", seller_name as "sellerName", name, category,
              image, images, condition, size,
              rent_price_daily as "rentPriceDaily",
              rent_price_3d as "rentPrice3d",
              rent_price_7d as "rentPrice7d",
              buy_price as "buyPrice",
              stock, rating, review_count as "reviewCount", rent_count as "rentCount",
              description, features, package_includes as "packageIncludes", deposit,
              created_at as "createdAt"
       FROM products
       WHERE seller_id = $1
       ORDER BY created_at DESC`,
      [sellerId]
    );

    const formatted = (rows || []).map((r: any) => ({
      ...r,
      rentPriceDaily: parseFloat(r.rentPriceDaily) || 0,
      rentPrice3d: parseFloat(r.rentPrice3d) || (parseFloat(r.rentPriceDaily) * 2.8) || 0,
      rentPrice7d: parseFloat(r.rentPrice7d) || (parseFloat(r.rentPriceDaily) * 5.8) || 0,
      buyPrice: parseFloat(r.buyPrice) || 0,
      images: Array.isArray(r.images) && r.images.length > 0 ? r.images : [r.image],
    }));

    return NextResponse.json({
      success: true,
      products: formatted,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if(!user.isVerified||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
    const body = await request.json();
    const {
      sellerId,
      name,
      category,
      images = [],
      image,
      condition = "Seperti Baru",
      rentPriceDaily,
      rentPrice3d,
      rentPrice7d,
      buyPrice,
      stock = 1,
      description,
      features = [],
      packageIncludes = [],
      deposit = 0,
    } = body;

    if (sellerId !== user.id) return NextResponse.json({ success: false, message: "Anda tidak dapat mengelola produk toko lain." }, { status: 403 });
    if (!sellerId || !name || !category || !rentPriceDaily || !buyPrice || !description) {
      return NextResponse.json(
        { success: false, message: "Nama produk, kategori, harga sewa 1 hari, harga beli, dan deskripsi wajib diisi" },
        { status: 400 }
      );
    }

    // Get live seller profile / store name
    const storeRows = await query(
      `SELECT COALESCE(u.name, s.store_name) as "storeName"
       FROM users u
       LEFT JOIN stores s ON s.user_id = u.id
       WHERE u.id = $1`,
      [sellerId]
    );
    const sellerName = storeRows[0]?.storeName || "Toko TryPedia";

    const id = `prd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Normalize and externalize photos array (max 5 photos)
    const rawList: string[] = Array.isArray(images) && images.length > 0
      ? images.slice(0, 5)
      : image
      ? [image]
      : ["/images/new-balance-2022r.jpg"];
    const photoList = await persistImageArrayIfNeeded(rawList, "products");
    const primaryImage = photoList[0];

    const dailyPrice = parseFloat(rentPriceDaily);
    const price3d = parseFloat(rentPrice3d) || (dailyPrice * 2.8);
    const price7d = parseFloat(rentPrice7d) || (dailyPrice * 5.8);

    await query(
      `INSERT INTO products (
         id, seller_id, seller_name, name, category, image, images, condition, size,
         rent_price_daily, rent_price_3d, rent_price_7d, buy_price, stock, rating, review_count, rent_count,
         description, features, package_includes, deposit
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, '-', $9, $10, $11, $12, $13, 0, 0, 0, $14, $15::jsonb, $16::jsonb, $17)`,
      [
        id,
        sellerId,
        sellerName,
        name,
        category,
        primaryImage,
        JSON.stringify(photoList),
        condition,
        dailyPrice,
        price3d,
        price7d,
        parseFloat(buyPrice),
        parseInt(stock) || 1,
        description || "Deskripsi produk belum ditambahkan.",
        JSON.stringify(features.length ? features : ["Bisa Sewa-Milik (Rent to Own)", condition, "COD Area Jember"]),
        JSON.stringify(Array.isArray(packageIncludes) && packageIncludes.length ? packageIncludes : ["Unit Produk"]),
        parseFloat(deposit) || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Produk berhasil diunggah ke etalase toko!",
      productId: id,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// Full Update Product
export async function PUT(request: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if(!user.isVerified||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
    const body = await request.json();
    const {
      productId,
      name,
      category,
      condition,
      rentPriceDaily,
      rentPrice3d,
      rentPrice7d,
      buyPrice,
      stock,
      description,
      images = [],
      packageIncludes = [],
    } = body;

    const owned = await query(`SELECT id FROM products WHERE id = $1 AND seller_id = $2`, [productId, user.id]);
    if (!owned.length) return NextResponse.json({ success: false, message: "Produk tidak ditemukan di toko Anda." }, { status: 404 });
    if (!productId || !name || !category || !rentPriceDaily || !buyPrice || !description) {
      return NextResponse.json(
        { success: false, message: "Parameter tidak lengkap (nama, kategori, tarif sewa, harga beli, dan deskripsi wajib diisi)" },
        { status: 400 }
      );
    }

    const rawList: string[] = Array.isArray(images) && images.length > 0
      ? images.slice(0, 5)
      : ["/images/new-balance-2022r.jpg"];
    const photoList = await persistImageArrayIfNeeded(rawList, "products");
    const primaryImage = photoList[0];

    const dailyPrice = parseFloat(rentPriceDaily);
    const price3d = parseFloat(rentPrice3d) || (dailyPrice * 2.8);
    const price7d = parseFloat(rentPrice7d) || (dailyPrice * 5.8);

    const packageList = Array.isArray(packageIncludes) && packageIncludes.length > 0
      ? packageIncludes
      : ["Unit Produk"];

    await query(
      `UPDATE products SET
         name = $1,
         category = $2,
         condition = $3,
         rent_price_daily = $4,
         rent_price_3d = $5,
         rent_price_7d = $6,
         buy_price = $7,
         stock = COALESCE($8, stock),
         description = $9,
         image = $10,
         images = $11::jsonb,
         package_includes = $12::jsonb
       WHERE id = $13`,
      [
        name,
        category,
        condition || "Seperti Baru",
        dailyPrice,
        price3d,
        price7d,
        parseFloat(buyPrice),
        stock !== undefined ? parseInt(stock) : null,
        description,
        primaryImage,
        JSON.stringify(photoList),
        JSON.stringify(packageList),
        productId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Perubahan produk berhasil disimpan!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user=await getServerSessionUser();
    if(!user)return NextResponse.json({success:false},{status:401});
    if(!user.isVerified||user.role==='SUPERADMIN')return NextResponse.json({success:false,message:'Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.'},{status:403});
    const body = await request.json();
    const { productId, stock } = body;

    if (!productId || stock === undefined) {
      return NextResponse.json(
        { success: false, message: "productId dan stock wajib disertakan" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE products SET stock = $1 WHERE id = $2 AND seller_id=$3`,
      [parseInt(stock), productId,user.id]
    );

    return NextResponse.json({
      success: true,
      message: "Stok produk berhasil diperbarui",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getServerSessionUser();
    if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if(!user?.isVerified||user.role==='SUPERADMIN')return NextResponse.json({success:false},{status:403});
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "productId wajib disertakan" },
        { status: 400 }
      );
    }

    const removed = await query(`DELETE FROM products WHERE id = $1 AND seller_id = $2
      AND NOT EXISTS (SELECT 1 FROM orders WHERE product_id = $1
        AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA')) RETURNING id`, [productId, user.id]);
    if (!removed.length) return NextResponse.json({ success: false, message: "Produk tidak ditemukan atau masih memiliki pesanan aktif." }, { status: 409 });

    return NextResponse.json({
      success: true,
      message: "Produk berhasil dihapus dari toko",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
