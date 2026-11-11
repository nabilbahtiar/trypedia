import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";
import { parseGoogleMapsLink } from "@/lib/google-maps-link";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const sellerName = searchParams.get("sellerName");

    let sql = `
      SELECT id, seller_id as "sellerId", location_id as "locationId",
             name, address, detail, maps_url as "mapsUrl", lat, lng, created_at as "createdAt"
      FROM seller_cod_locations
    `;
    const params: any[] = [];

    if (sellerId) {
      sql += ` WHERE seller_id = $1 ORDER BY id ASC`;
      params.push(sellerId);
    } else if (sellerName) {
      // Find sellerId by store name
      const storeRows = await query(
        `SELECT user_id FROM stores WHERE store_name ILIKE $1`,
        [`%${sellerName}%`]
      );
      if (storeRows && storeRows.length > 0) {
        sql += ` WHERE seller_id = $1 ORDER BY id ASC`;
        params.push(storeRows[0].user_id);
      } else {
        // Fallback default
        sql += ` WHERE seller_id = 'usr_002' ORDER BY id ASC`;
      }
    } else {
      sql += ` ORDER BY id ASC`;
    }

    const rows = await query(sql, params);

    return NextResponse.json({
      success: true,
      locations: rows || [],
      count: rows?.length || 0,
      maxAllowed: 5,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const body = await request.json();
  const maps = parseGoogleMapsLink(body.mapsUrl);
  if (!body.name?.trim() || !body.address?.trim() || !maps) return NextResponse.json({ success: false, message: "Isi nama titik temu, alamat lengkap, dan link Google Maps yang valid." }, { status: 400 });
  if (body.sellerId && body.sellerId !== user.id) return NextResponse.json({ success: false, message: "Toko tidak sesuai." }, { status: 403 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [user.id]);
    const count = await client.query("SELECT COUNT(*)::int AS count FROM seller_cod_locations WHERE seller_id = $1", [user.id]);
    if (count.rows[0].count >= 5) {
      await client.query("ROLLBACK");
      return NextResponse.json({ success: false, message: "Maksimal 5 titik temu. Edit atau hapus lokasi yang sudah ada." }, { status: 400 });
    }
    const locId = `loc-${crypto.randomUUID()}`;
    await client.query(`INSERT INTO seller_cod_locations (seller_id,location_id,name,address,detail,maps_url,lat,lng)
      VALUES ($1,$2,$3,$4,'',$5,$6,$7)`, [user.id, locId, body.name.trim(), body.address.trim(), maps.url, maps.lat, maps.lng]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, locationId: locId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("COD location create failed", error);
    return NextResponse.json({ success: false, message: "Titik temu gagal disimpan." }, { status: 500 });
  } finally { client.release(); }
}

export async function PUT(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  try {
    const body = await request.json();
    const maps = parseGoogleMapsLink(body.mapsUrl);
    if (!body.id || !body.name?.trim() || !body.address?.trim() || !maps) return NextResponse.json({ success: false, message: "Isi nama titik temu, alamat lengkap, dan link Google Maps yang valid." }, { status: 400 });
    const rows = await query(`UPDATE seller_cod_locations SET name=$1,address=$2,maps_url=$3,lat=$4,lng=$5
      WHERE id=$6 AND seller_id=$7 RETURNING id`, [body.name.trim(), body.address.trim(), maps.url, maps.lat, maps.lng, body.id, user.id]);
    if (!rows.length) return NextResponse.json({ success: false, message: "Titik temu tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("COD location update failed", error);
    return NextResponse.json({ success: false, message: "Titik temu gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getServerSessionUser();
  if (!user) return NextResponse.json({ success: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "Pilih titik temu yang akan dihapus." }, { status: 400 });
  const rows = await query("DELETE FROM seller_cod_locations WHERE id=$1 AND seller_id=$2 RETURNING id", [id,user.id]);
  if (!rows.length) return NextResponse.json({ success: false, message: "Titik temu tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ success: true });
}
