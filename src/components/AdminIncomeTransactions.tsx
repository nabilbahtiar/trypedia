"use client";
import { useState } from "react";
import type { FinanceTransaction } from "@/lib/finance";

const money = (value:number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
export default function AdminIncomeTransactions({transactions}:{transactions:FinanceTransaction[]}) {
  const [search,setSearch] = useState("");
  const [page,setPage] = useState(1);
  const filtered = transactions.filter(row => [row.transactionId,row.orderId,row.sellerId,row.sellerName,row.buyerId,row.buyerName,row.title].some(value => (value||"").toLowerCase().includes(search.toLowerCase())));
  const pages = Math.max(1,Math.ceil(filtered.length/10));
  const current = Math.min(page,pages);
  return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
      <div><h2 className="font-bold text-gray-900">Rincian Transaksi</h2><p className="mt-1 text-sm text-gray-500">{filtered.length} transaksi</p></div>
      <input aria-label="Cari transaksi pendapatan" value={search} onChange={event=>{setSearch(event.target.value);setPage(1);}} placeholder="Cari transaksi, produk, atau pengguna..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:w-72" />
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500"><tr>{["Tanggal (WIB)","Transaksi / Produk","Penjual","Pembeli","Metode Bayar","Total Pembayaran","Pendapatan Penjual","Biaya Layanan","Biaya Asuransi","Pendapatan Platform"].map((label,index)=><th key={label} className={`whitespace-nowrap px-4 py-3 font-medium ${index>=5?'text-right':''}`}>{label}</th>)}</tr></thead>
      <tbody>{filtered.slice((current-1)*10,current*10).map(row=><tr key={row.transactionId} className="border-b border-gray-100 align-top hover:bg-gray-50/60">
        <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{new Date(row.createdAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium",timeStyle:"short"})}</td>
        <td className="max-w-64 px-4 py-4"><p className="font-mono text-xs font-semibold text-gray-900">{row.transactionId}</p>{row.transactionId!==row.orderId&&<p className="mt-1 text-xs text-gray-500">Pesanan: {row.orderId}</p>}<p className="mt-1 text-xs text-gray-600">{row.title}</p><span className="mt-2 inline-block rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{row.kind}</span></td>
        <td className="px-4 py-4"><p className="whitespace-nowrap text-xs text-gray-900">{row.sellerName}</p><p className="mt-1 font-mono text-xs text-gray-500">{row.sellerId}</p></td>
        <td className="px-4 py-4"><p className="whitespace-nowrap text-xs text-gray-900">{row.buyerName}</p><p className="mt-1 font-mono text-xs text-gray-500">{row.buyerId}</p></td>
        <td className="px-4 py-4 text-xs text-gray-600">{row.paymentMethod}</td>
        {[row.totalPayment,row.sellerIncome,row.serviceFee,row.insuranceFee,row.serviceFee+row.insuranceFee].map((amount,index)=><td key={index} className={`whitespace-nowrap px-4 py-4 text-right text-xs tabular-nums ${index===4?'font-semibold text-[#03AC0E]':'text-gray-700'}`}>{money(amount)}</td>)}
      </tr>)}</tbody>
    </table>{!filtered.length&&<p className="p-8 text-center text-sm text-gray-500">Tidak ada transaksi yang ditemukan.</p>}</div>
    <div className="flex items-center justify-between gap-3 p-4 text-xs text-gray-500"><span>Halaman {current} dari {pages}</span><div className="flex gap-2"><button disabled={current===1} onClick={()=>setPage(current-1)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 disabled:opacity-40">Sebelumnya</button><button disabled={current===pages} onClick={()=>setPage(current+1)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-700 disabled:opacity-40">Berikutnya</button></div></div>
  </section>;
}
