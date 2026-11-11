"use client";
import { startTransition, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import type { CartItem } from "@/lib/queries/account-activity";
const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export default function CartClient({initialItems,initialUserId}:{initialItems:CartItem[];initialUserId:string|null}) {
  const [items,setItems]=useState(initialItems),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
  const router=useRouter(); const {openLoginModal}=useAuth();
  useEffect(()=>setItems(initialItems),[initialItems]);
  async function proceed(item:CartItem) {
    setBusy(item.productId);setError('');
    try {
      const response=await fetch('/api/cart');
      if(!response.ok) throw new Error('Keranjang gagal dimuat. Silakan coba lagi.');
      const data=await response.json();setItems(data.items);
      const current=data.items.find((entry:CartItem)=>entry.productId===item.productId);
      if(!current?.available)throw new Error('Produk sedang tidak tersedia.');
      startTransition(()=>router.push(`/checkout?id=${encodeURIComponent(current.productId)}&type=${current.mode}&duration=${current.duration}`));
    }catch(err){setError(err instanceof Error?err.message:'Checkout gagal dibuka.');}finally{setBusy(null);}
  }
  async function change(item:CartItem,remove=false) {
    setBusy(item.productId);setError('');
    try {
      const response=await fetch('/api/cart'+(remove?'?productId='+encodeURIComponent(item.productId):''),{method:remove?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:remove?undefined:JSON.stringify(item)});
      const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||'Keranjang gagal diperbarui.');
      setItems(prev=>remove?prev.filter(p=>p.productId!==item.productId):prev.map(p=>p.productId===item.productId?item:p));
      window.dispatchEvent(new Event('trypedia_activity_change'));
    } catch(err){setError(err instanceof Error?err.message:'Keranjang gagal diperbarui.');}finally{setBusy(null);}
  }
  return <div className="min-h-screen flex flex-col bg-[#F7F8FA]"><Header /><main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-5">
    <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><ShoppingCart className="h-6 w-6 text-[#03AC0E]" />Keranjang</h1>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    {!initialUserId?<div className="rounded-2xl border border-gray-200 bg-white p-8 text-center space-y-4"><p>Masuk untuk melihat keranjang Anda.</p><button type="button" onClick={()=>openLoginModal(()=>router.refresh())} className="rounded-xl bg-[#03AC0E] px-5 py-2.5 font-semibold text-white">Masuk</button></div>:items.length===0?<div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-4"><ShoppingCart className="mx-auto h-10 w-10 text-gray-300" /><h2 className="font-semibold text-gray-900">Keranjang masih kosong</h2><Link href="/" className="inline-flex rounded-xl bg-[#03AC0E] px-5 py-2.5 text-sm font-semibold text-white">Cari Produk</Link></div>:items.map(item=>{
      const price=item.mode==='buy'?item.buyPrice:item.duration===1?item.rent1d:item.duration===7?item.rent7d:item.rent3d;
      return <article key={item.productId} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <Link href={'/store/'+item.sellerId} className="text-sm font-semibold text-gray-900 hover:text-[#03AC0E]">{item.sellerName}</Link>
        <div className="flex items-start gap-4"><Link href={'/products/'+item.productId} className="shrink-0"><img src={item.image} alt={item.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover border border-gray-200" /></Link><div className="min-w-0 flex-1 space-y-3"><Link href={'/products/'+item.productId} className="font-semibold text-gray-900">{item.name}</Link><div className="flex flex-wrap gap-2"><select aria-label={`Jenis transaksi ${item.name}`} value={item.mode} disabled={busy!==null||!item.available} onChange={e=>change({...item,mode:e.target.value as 'rent'|'buy'})} className="rounded-xl border border-gray-200 p-2 text-sm"><option value="rent">Sewa</option><option value="buy">Beli</option></select>{item.mode==='rent'&&<select aria-label={`Durasi sewa ${item.name}`} value={item.duration} disabled={busy!==null||!item.available} onChange={e=>change({...item,duration:Number(e.target.value)})} className="rounded-xl border border-gray-200 p-2 text-sm">{[1,3,7].map(days=><option key={days} value={days}>{days} Hari</option>)}</select>}</div><p className="font-bold text-gray-900">{money(price)}</p>{!item.available&&<p className="text-xs text-gray-500">Produk sedang tidak tersedia.</p>}</div></div>
        <div className="flex justify-end items-center gap-2 border-t border-gray-100 pt-4"><button type="button" aria-label={`Hapus ${item.name}`} disabled={busy!==null} onClick={()=>change(item,true)} className="rounded-xl border border-gray-200 p-2.5 text-gray-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button><button type="button" disabled={!item.available||busy!==null} onClick={()=>proceed(item)} className="rounded-xl bg-[#03AC0E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#02980C] disabled:opacity-40">Lanjut ke Checkout</button></div>
      </article>;
    })}
  </main><Footer /></div>;
}
