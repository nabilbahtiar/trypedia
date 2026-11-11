import { NextResponse } from "next/server";
import { getUserChatConversationsSSR } from "@/lib/queries/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Parameter userId wajib disertakan." },
        { status: 400 }
      );
    }

    const conversations = await getUserChatConversationsSSR(userId);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (err: any) {
    console.error("Error in GET /api/chat/conversations:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Gagal memuat daftar obrolan." },
      { status: 500 }
    );
  }
}
