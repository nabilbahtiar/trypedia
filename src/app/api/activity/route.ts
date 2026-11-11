import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";
export async function GET() {
  const user=await getServerSessionUser();
  if (!user) return NextResponse.json({cartCount:0,unreadCount:0});
  const [row]=await query(`SELECT (SELECT COUNT(*)::int FROM cart_items WHERE user_id=$1) AS "cartCount",
    (SELECT COUNT(*)::int FROM notifications WHERE user_id=$1 AND NOT is_read) AS "unreadCount"`,[user.id]);
  return NextResponse.json(row);
}
