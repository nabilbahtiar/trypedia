import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSessionUser } from "@/lib/server-auth";
import { getNotifications } from "@/lib/queries/account-activity";
export async function GET() {
  const user=await getServerSessionUser();
  if (!user) return NextResponse.json({success:false},{status:401});
  return NextResponse.json({success:true,notifications:await getNotifications(user.id)});
}
export async function PATCH(request:Request) {
  const user=await getServerSessionUser();
  if (!user) return NextResponse.json({success:false},{status:401});
  const {id,all}=await request.json();
  if(all===true) await query('UPDATE notifications SET is_read=true WHERE user_id=$1',[user.id]);
  else if(typeof id==='string') await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',[id,user.id]);
  else return NextResponse.json({success:false},{status:400});
  return NextResponse.json({success:true});
}
