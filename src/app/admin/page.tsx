import { redirect } from "next/navigation";
import { getSuperadmin } from "@/lib/auth-session";
import { getAdminFinance } from "@/lib/finance";
import AdminFinanceClient from "@/components/AdminFinanceClient";
export const dynamic='force-dynamic';
export default async function AdminPage(){const admin=await getSuperadmin();if(!admin)redirect('/');return <AdminFinanceClient initialData={await getAdminFinance()} name={admin.name||'Superadmin'} />;}
