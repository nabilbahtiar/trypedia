"use client";

import { useState } from "react";
import { Wallet, QrCode, CheckCircle2, Upload } from "lucide-react";
import { compressAndUploadImage } from "@/lib/client-image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { RentalPurchaseSummary } from "@/lib/rental-purchase";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function RentalPurchaseClient({ initialSummary: summary }: { initialSummary: RentalPurchaseSummary }) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(summary.status === "SELESAI_DIBELI");
  const [method, setMethod] = useState<"wallet" | "qris">("wallet");
  const [pending, setPending] = useState(summary.paymentStatus === "PENDING");
  const [proofUrl, setProofUrl] = useState(summary.proofUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const insufficient = summary.balance < summary.totalDue;

  async function uploadProof(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setProofUrl(await compressAndUploadImage(file, "proofs", 1200, 0.82));
    } catch {
      setError("Bukti pembayaran gagal diunggah. Silakan coba lagi.");
    } finally { setUploading(false); }
  }

  async function pay() {
    if (paying || paid || pending || uploading) return;
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/api/orders/rental-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: summary.orderId, expectedAmount: summary.totalDue, paymentMethod: method, proofUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Pembayaran gagal. Silakan coba lagi.");
      if (data.pending) setPending(true);
      else setPaid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pembayaran gagal. Silakan coba lagi.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA]">
      <Header />
      <main className="w-full max-w-5xl mx-auto flex-1 px-4 py-8 space-y-5">
        <Link href="/orders?tab=DISEWA" className="text-sm text-gray-600 hover:text-[#03AC0E]">Kembali ke pesanan</Link>
        <h1 className="text-2xl font-bold text-gray-900">{paid ? "Pembelian selesai" : "Pembayaran sisa harga beli"}</h1>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-5">
        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Ringkasan produk</h2>
          <div className="flex items-center gap-4">
            {summary.productImage && <img src={summary.productImage} alt={summary.productTitle} className="w-20 h-20 rounded-xl object-cover border border-gray-200" />}
            <div><p className="text-xs text-gray-500 mb-1">{summary.orderId}</p><h2 className="font-semibold text-gray-900">{summary.productTitle}</h2></div>
          </div>
          <dl className="text-sm space-y-3 border-t border-gray-100 pt-5">
            <div className="flex justify-between gap-3"><dt>Harga beli penuh</dt><dd>{rupiah(summary.buyPrice)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Biaya sewa sudah dibayar</dt><dd>− {rupiah(summary.rentPaid)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 font-bold"><dt>Sisa bayar beli</dt><dd className="text-gray-900">{rupiah(summary.remaining)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Biaya layanan</dt><dd>{rupiah(summary.serviceFee)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 font-bold"><dt>Total pembayaran pembelian</dt><dd className="text-[#03AC0E]">{rupiah(summary.totalDue)}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-5">
          {paid ? (
            <div className="space-y-4"><p className="text-sm text-gray-700">Produk ini sekarang menjadi milik Anda.</p><Link href="/orders?tab=SELESAI" className="inline-flex rounded-xl bg-[#03AC0E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#02980C]">Lihat pesanan</Link></div>
          ) : pending ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-8 h-8 text-[#03AC0E]" />
              <h2 className="font-bold text-gray-900">Menunggu verifikasi pembayaran</h2>
              <p className="text-sm text-gray-600">Bukti pembayaran QRIS Anda sudah diterima. Pembelian selesai setelah pembayaran diverifikasi.</p>
              <Link href="/orders?tab=DISEWA" className="inline-flex text-sm font-semibold text-[#03AC0E]">Lihat pesanan</Link>
            </div>
          ) : summary.status !== "DISEWA" ? <p className="text-sm text-gray-600">Pesanan ini tidak dapat dilanjutkan ke pembelian.</p> : (
            <div className="space-y-4">
              {summary.paymentStatus === "REJECTED" && summary.rejectionReason && <p className="text-sm text-red-600">Bukti pembayaran ditolak: {summary.rejectionReason}</p>}
              <h2 className="text-base font-bold text-gray-900">Metode pembayaran</h2>
              <fieldset className="space-y-3">
                <legend className="sr-only">Pilih metode pembayaran</legend>
                <label className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer ${method === "wallet" ? "border-[#03AC0E] bg-[#EBF8EE]" : "border-gray-200"}`}>
                  <Wallet className="w-5 h-5 text-[#03AC0E] shrink-0" />
                  <span className="flex-1 text-sm"><span className="block font-semibold text-gray-900">Saldo TryPedia</span><span className="block mt-1 text-xs text-gray-600">Saldo tersedia: {rupiah(summary.balance)}</span></span>
                  <input type="radio" name="purchase-method" value="wallet" checked={method === "wallet"} onChange={() => setMethod("wallet")} disabled={paying} className="accent-[#03AC0E]" />
                </label>
                <label className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer ${method === "qris" ? "border-[#03AC0E] bg-[#EBF8EE]" : "border-gray-200"}`}>
                  <QrCode className="w-5 h-5 text-[#03AC0E] shrink-0" />
                  <span className="flex-1 text-sm"><span className="block font-semibold text-gray-900">QRIS</span><span className="block mt-1 text-xs text-gray-600">Bayar melalui aplikasi bank atau e-wallet</span></span>
                  <input type="radio" name="purchase-method" value="qris" checked={method === "qris"} onChange={() => setMethod("qris")} disabled={paying} className="accent-[#03AC0E]" />
                </label>
              </fieldset>
              {method === "wallet" && insufficient && <p className="text-sm text-gray-600">Saldo belum cukup. <Link href="/wallet" className="text-[#03AC0E] font-semibold">Top Up Saldo</Link> atau pilih QRIS.</p>}
              {method === "qris" && summary.totalDue > 0 && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600">Scan QRIS dan bayar sebesar <strong className="text-gray-900">{rupiah(summary.totalDue)}</strong>.</p>
                  <img src="/images/qris-user.jpg" alt="Kode QRIS TryPedia" className="mx-auto w-full max-w-64 rounded-xl border border-gray-200" />
                  <label className="block text-sm font-semibold text-gray-900">Bukti pembayaran <span className="text-red-500">*</span>
                    <span className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-xs font-normal text-gray-600"><Upload className="h-4 w-4 shrink-0" /><input type="file" accept="image/*" onChange={e => uploadProof(e.target.files?.[0])} disabled={uploading || paying} className="min-w-0 w-full" /></span>
                  </label>
                  {uploading && <p role="status" className="text-xs text-gray-500">Mengunggah bukti pembayaran...</p>}
                  {proofUrl && <img src={proofUrl} alt="Bukti pembayaran QRIS" className="max-h-48 rounded-xl border border-gray-200 object-contain" />}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm font-bold"><span>Total pembayaran</span><span className="text-lg text-[#03AC0E]">{rupiah(summary.totalDue)}</span></div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="button" onClick={pay} disabled={paying || uploading || (method === "wallet" && insufficient) || (method === "qris" && summary.totalDue > 0 && !proofUrl)} className="w-full rounded-xl bg-[#03AC0E] hover:bg-[#02980C] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">{paying ? "Memproses pembayaran…" : method === "qris" && summary.totalDue > 0 ? "Kirim bukti pembayaran" : `Bayar ${rupiah(summary.totalDue)}`}</button>
            </div>
          )}
        </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
