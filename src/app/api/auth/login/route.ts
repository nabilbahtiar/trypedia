import { NextResponse } from "next/server";
import { allowAuthAttempt } from "@/lib/account-access";
import { query } from "@/lib/db";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth-session";

export async function POST(request: Request) {
  if(!await allowAuthAttempt(request,"login"))return NextResponse.json({success:false,message:"Terlalu banyak percobaan. Coba lagi nanti."},{status:429});
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    try {
      // 1. Check if user with this email exists in PostgreSQL
      const userExists = await query<{ id: string; password: string }>(
        `SELECT id, password FROM users WHERE LOWER(email) = LOWER($1)`,
        [normalizedEmail]
      );

      if (!userExists || userExists.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Email yang Anda masukkan tidak terdaftar.",
          },
          { status: 404 }
        );
      }

      // 2. Check if password matches
      const isPasswordMatch = verifyPassword(cleanPassword,userExists[0].password);

      if (!isPasswordMatch) {
        return NextResponse.json(
          {
            success: false,
            message: "Password yang Anda masukkan salah.",
          },
          { status: 401 }
        );
      }

      // 3. User & password matched, retrieve full profile
      const rows = await query(
        `SELECT id, name, email, phone, avatar, photo_url as "photoUrl", is_verified as "isVerified",role
         FROM users 
         WHERE LOWER(email) = LOWER($1)`,
        [normalizedEmail]
      );

      const token=await createSession(rows[0].id);
      const response=NextResponse.json({
        success: true,
        user: rows[0],
        source: "postgresql",
      });
      response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:30*86400});
      return response;
    } catch (dbErr: any) {
      console.error("Login database failed:", dbErr.message);
      return NextResponse.json({ success: false, message: "Login belum berhasil. Silakan coba lagi." }, { status: 503 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}

