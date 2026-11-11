"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteProductButton({ productId, sellerId }: { productId: string; sellerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/seller/products?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Produk gagal dihapus.");
      window.dispatchEvent(new Event("trypedia_products_change"));
      startTransition(() => { router.refresh(); router.push(`/store/${encodeURIComponent(sellerId)}?tab=produk`); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Produk gagal dihapus.");
      setSaving(false);
    }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Hapus Produk</button>
    {open && <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="delete-product-title" className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 id="delete-product-title" className="font-bold text-gray-900">Hapus produk ini?</h2>
        <p className="text-sm text-gray-600">Produk akan dihapus dari etalase toko.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold text-gray-700">Batal</button>
          <button type="button" disabled={saving} onClick={remove} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menghapus..." : "Hapus Produk"}</button>
        </div>
      </section>
    </div>}
  </>;
}
