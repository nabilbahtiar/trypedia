"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function IdentityVerification() {
  const { user, openLoginModal } = useAuth();
  const [data, setData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("KTP");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const r = await fetch("/api/identity");
    if (r.ok) {
      const next = await r.json();
      setData(next);
      if (next.isVerified !== user?.isVerified) {
        window.dispatchEvent(new Event("trypedia_identity_change"));
      }
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => clearInterval(t);
  }, [user?.id, user?.isVerified]);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("documentType", kind);
      const r = await fetch("/api/identity", { method: "POST", body });
      const d = await r.json();
      if (r.status === 401) openLoginModal();
      if (!r.ok) throw Error(d.message);
      setFile(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unggahan gagal.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const verified = Boolean(data?.isVerified ?? user.isVerified);

  // Jika akun sudah terverifikasi, jangan tampilkan kotak verifikasi sama sekali
  if (verified) return null;

  const pending = data?.verification?.status === "PENDING";

  return (
    <section className="mb-6 space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
      <h2 className="font-bold text-gray-900">Verifikasi Identitas</h2>
      <p className="text-sm text-gray-600">
        Upload foto KTP atau KTM untuk membuka akses transaksi setelah disetujui admin.
      </p>

      {pending ? (
        <p className="text-sm font-semibold text-gray-700">
          Dokumen sedang diperiksa admin.
        </p>
      ) : (
        <>
          {data?.verification?.status === "REJECTED" && (
            <p className="text-sm text-red-600">
              Ditolak: {data.verification.reason}. Silakan unggah ulang.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Jenis identitas"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded-xl border border-gray-300 p-2 text-sm focus:outline-hidden focus:border-[#03AC0E]"
            >
              <option>KTP</option>
              <option>KTM</option>
            </select>
            <input
              aria-label="Foto KTP atau KTM"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="max-w-full text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Maksimal 5 MB. Foto hanya dapat dilihat Anda dan admin.
          </p>
          <button
            disabled={!file || busy}
            onClick={submit}
            className="rounded-xl bg-[#03AC0E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-[#02980C] transition cursor-pointer"
          >
            {busy ? "Mengunggah..." : "Kirim untuk Verifikasi"}
          </button>
        </>
      )}

      {data?.verification && (
        <a
          className="block text-sm text-[#03AC0E] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          href={"/api/identity/document/" + user.id}
        >
          Lihat dokumen saya
        </a>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
