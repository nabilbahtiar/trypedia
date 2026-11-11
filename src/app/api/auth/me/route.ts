import { NextResponse } from "next/server";
import { getVerifiedSessionUser } from "@/lib/auth-session";
export async function GET(){return NextResponse.json({user:await getVerifiedSessionUser()},{headers:{'Cache-Control':'private, no-store'}});}
