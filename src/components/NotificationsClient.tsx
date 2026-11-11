"use client";
import { startTransition,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import type { AccountNotification } from "@/lib/queries/account-activity";
export default function NotificationsClient({initialItems,initialUserId}:{initialItems:AccountNotification[];initialUserId:string|null}) {
  const [items,setItems]=useState(initialItems),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();const {openLoginModal}=useAuth();
  useEffect(()=>setItems(initialItems),[initialItems]);
  useEffect(()=>{if(!initialUserId)return;let active=true;const refresh=async()=>{try{const r=await fetch('/api/notifications');if(r.ok){const d=await r.json();if(active)setItems(d.notifications);}}catch{}};const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[initialUserId]);
  async function read(item?:AccountNotification) {
    setBusy(true);setError('');
    try{const response=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(item?{id:item.id}:{all:true})});if(!response.ok)throw new Error('ไม่');setItems(prev=>prev.map(n=>!item||n.id===item.id?{...n,isRead:true}:n));window.dispatchEvent(new Event('trypedia_activity_change'));if(item)startTransition(()=>router.push(item.href));}catch{setError('Notifikasi gagal diperbarui. Silakan coba lagi.');}finally{setBusy(false);}
  }
  return <div className="min-h-screen flex flex-col bg-[#F7F8FA]"><Header /><main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><Bell className="h-6 w-6 text-[#03AC0E]" />Notifikasi</h1>{items.some(n=>!n.isRead)&&<button type="button" disabled={busy} onClick={()=>read()} className="text-sm font-semibold text-[#03AC0E]">Tandai semua dibaca</button>}</div>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    {!initialUserId?<div className="rounded-2xl bg-white border border-gray-200 p-8 text-center space-y-4"><p>Masuk untuk melihat notifikasi Anda.</p><button type="button" onClick={()=>openLoginModal(()=>router.refresh())} className="rounded-xl bg-[#03AC0E] px-5 py-2.5 font-semibold text-white">Masuk</button></div>:!items.length?<div className="rounded-2xl bg-white border border-gray-200 p-10 text-center space-y-3"><Bell className="mx-auto h-10 w-10 text-gray-300" /><h2 className="font-semibold text-gray-900">Belum ada notifikasi</h2></div>:<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">{items.map(item=><button type="button" key={item.id} disabled={busy} onClick={()=>read(item)} className={`flex w-full gap-3 p-5 text-left hover:bg-gray-50 ${!item.isRead?'bg-[#EBF8EE]/50':''}`}><span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${item.isRead?'bg-transparent':'bg-[#03AC0E]'}`} /><div className="space-y-1"><h2 className="text-sm font-semibold text-gray-900">{item.title}</h2><p className="text-sm text-gray-600">{item.message}</p><time className="block text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'})} WIB</time></div></button>)}</div>}
  </main><Footer /></div>;
}
