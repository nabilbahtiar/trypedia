import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { updateDummyUser } from "@/data/users";
import { persistDataUrlIfNeeded } from "@/lib/media";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, phone, photoUrl } = body;
    const session = await getServerSessionUser();
    if (!session || session.id !== id || session.role === "SUPERADMIN") return NextResponse.json({success:false},{status:403});

    if (!id || !name || !email) {
      return NextResponse.json(
        { success: false, message: "ID, Nama, dan Email wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : "";
    const safePhotoUrl = await persistDataUrlIfNeeded(photoUrl, "avatars");

    // Generate 2-letter initials for avatar
    const nameWords = trimmedName.split(" ").filter(Boolean);
    const avatar =
      nameWords.length >= 2
        ? (nameWords[0][0] + nameWords[1][0]).toUpperCase()
        : trimmedName.slice(0, 2).toUpperCase();

    try {
      // Check if email already taken by another user
      const existing = await query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
        [normalizedEmail, id]
      );

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { success: false, message: "Email ini sudah digunakan oleh akun lain." },
          { status: 400 }
        );
      }

      const updatedRows = await query(
        `UPDATE users
         SET name = $1, email = $2, phone = $3, avatar = $4, photo_url = $5
         WHERE id = $6
         RETURNING id, name, email, phone, avatar, photo_url as "photoUrl", is_verified as "isVerified"`,
        [trimmedName, normalizedEmail, cleanPhone, avatar, safePhotoUrl, id]
      );

      // Keep stores and products in sync with user profile name and photo
      await query(
        `UPDATE stores 
         SET store_name = $1,
             photo_url = COALESCE($2, photo_url)
         WHERE user_id = $3`,
        [trimmedName, safePhotoUrl, id]
      ).catch(() => {});

      await query(
        `UPDATE products 
         SET seller_name = $1
         WHERE seller_id = $2`,
        [trimmedName, id]
      ).catch(() => {});

      if (updatedRows && updatedRows.length > 0) {
        updateDummyUser(id, {
          name: trimmedName,
          email: normalizedEmail,
          phone: cleanPhone,
          avatar,
          photoUrl: safePhotoUrl || undefined,
        });
        return NextResponse.json({
          success: true,
          user: updatedRows[0],
          message: "Profil berhasil diperbarui di PostgreSQL!",
        });
      }
    } catch (dbErr: any) {
      console.warn("DB update failed, using fallback:", dbErr.message);
    }

    return NextResponse.json({success:false,message:"Profil gagal disimpan. Silakan coba lagi."},{status:503});
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}

