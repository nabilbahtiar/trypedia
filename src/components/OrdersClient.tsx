"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { qrisSecondsRemaining, formatQrisCountdown } from "@/lib/qris-payment";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { compressAndUploadImage } from "@/lib/client-image";
import {
  Package,
  Search,
  ShoppingBag,
  Inbox,
  Clock,
  ArrowRight,
  Filter,
  Store,
  MapPin,
  Calendar,
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
  ShieldCheck,
  MessageSquare,
  KeyRound,
  Check,
  Sparkles,
  Timer,
  Loader2,
  Star,
  Image as ImageIcon,
} from "lucide-react";

type OrderTab =
  | "SEMUA"
  | "BELUM_BAYAR"
  | "SEDANG_DIKEMAS"
  | "DIJADWALKAN_DIKIRIM"
  | "DISEWA"
  | "SELESAI"
  | "DIBATALKAN";

interface TabItem {
  key: OrderTab;
  label: string;
}

const TABS: TabItem[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "BELUM_BAYAR", label: "Belum Bayar" },
  { key: "SEDANG_DIKEMAS", label: "Menunggu Konfirmasi" },
  { key: "DIJADWALKAN_DIKIRIM", label: "Dijadwalkan/Dikirim" },
  { key: "DISEWA", label: "Disewa" },
  { key: "SELESAI", label: "Selesai" },
  { key: "DIBATALKAN", label: "Dibatalkan" },
];

type ConfirmationSubTab = "ADMIN" | "SELLER";

// Per-user in-memory cache for orders across client navigations
const ordersCacheByUser: Record<string, any[]> = {};

interface OrdersClientProps {
  initialUserId?: string | null;
  initialOrders?: any[] | null;
}

function OrdersContent({ initialUserId = null, initialOrders = null }: OrdersClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const activeUid = user?.id || initialUserId || "usr_001";
  const seededOrders =
    (initialUserId && activeUid === initialUserId ? initialOrders : null) ??
    ordersCacheByUser[activeUid] ??
    null;

  const tabParam = searchParams.get("tab") as OrderTab | null;
  const [activeTab, setActiveTab] = useState<OrderTab>(
    tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "SEMUA"
  );
  const [confirmationSubTab, setConfirmationSubTab] = useState<ConfirmationSubTab>("ADMIN");
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orders, setOrders] = useState<any[]>(seededOrders ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!seededOrders);

  // Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<any | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string>("");
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);

  // Lightbox for proof preview
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Modal State for PIN Handover (Buyer)
  const [isBuyerPinModalOpen, setIsBuyerPinModalOpen] = useState<boolean>(false);
  const [selectedOrderForPinInput, setSelectedOrderForPinInput] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Modal State for Review (Beri Ulasan)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewMaskName, setReviewMaskName] = useState(true);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [isUploadingReviewPhotos, setIsUploadingReviewPhotos] = useState(false);
  const reviewUploadBusy = React.useRef(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const handleOpenReviewModal = (ord: any) => {
    setSelectedOrderForReview(ord);
    setReviewRating(5);
    setReviewHoverRating(0);
    setReviewComment("");
    setReviewMaskName(true);
    setReviewPhotos([]);
    setReviewError(null);
    setReviewSuccessMsg(null);
    setIsReviewModalOpen(true);
  };

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files || []);
    if (!files.length || reviewUploadBusy.current) return;
    const remaining = 3 - reviewPhotos.length;
    if (remaining <= 0) return;
    reviewUploadBusy.current = true;
    setIsUploadingReviewPhotos(true);
    setReviewError(null);
    try {
      for (const file of files.slice(0, remaining)) {
        const url = await compressAndUploadImage(file, "reviews", 1000, 0.8);
        setReviewPhotos(prev => [...prev, url].slice(0, 3));
      }
    } catch {
      setReviewError("Foto gagal diunggah. Silakan coba lagi.");
    } finally {
      input.value = "";
      reviewUploadBusy.current = false;
      setIsUploadingReviewPhotos(false);
    }
  };

  const handleRemoveReviewPhoto = (indexToRemove: number) => {
    setReviewPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReview || isUploadingReviewPhotos || isSubmittingReview) return;
    const cleanComment = reviewComment.trim();
    if (!cleanComment) {
      setReviewError("Silakan tulis deskripsi ulasan mengenai produk ini.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForReview.orderId,
          productId: selectedOrderForReview.productId,
          rating: reviewRating,
          comment: cleanComment,
          photos: reviewPhotos,
          maskName: reviewMaskName,
          userId: activeUid,
          reviewerName: user?.name || selectedOrderForReview.userName || "Pengguna TryPedia",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReviewSuccessMsg("Ulasan Anda berhasil diterbitkan! (+500 Koin)");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("trypedia_wallet_change"));
        }
        // Update local state to mark hasReview = true
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === selectedOrderForReview.orderId
              ? { ...o, hasReview: true }
              : o
          )
        );
        setTimeout(() => {
          setIsReviewModalOpen(false);
          setSelectedOrderForReview(null);
          setReviewSuccessMsg(null);
        }, 1500);
      } else {
        setReviewError(data.message || "Gagal mengirim ulasan");
      }
    } catch {
      setReviewError("Terjadi kesalahan koneksi saat mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Live countdown timer state (ticks every second)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRentalCountdown = (order: any) => {
    let endMs = 0;
    if (order.rentEndAt) {
      endMs = new Date(order.rentEndAt).getTime();
    } else if (order.rentStartedAt) {
      const dur = order.rentDuration || 3;
      endMs = new Date(order.rentStartedAt).getTime() + dur * 24 * 60 * 60 * 1000;
    } else if (order.createdAt) {
      const dur = order.rentDuration || 3;
      endMs = new Date(order.createdAt).getTime() + dur * 24 * 60 * 60 * 1000;
    } else {
      endMs = now + 3 * 24 * 60 * 60 * 1000;
    }

    const diff = endMs - now;
    if (diff <= 0) return "Masa Sewa Habis";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (days > 0) {
      return `${days}h ${hours.toString().padStart(2, "0")}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`;
    }
    return `${hours.toString().padStart(2, "0")}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`;
  };

  const getConfirmationCountdown = (order: any) => {
    const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : now;
    const deadlineMs = createdMs + 24 * 60 * 60 * 1000;
    const diff = deadlineMs - now;

    if (diff <= 0) return "Batas Berakhir";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60) % 60));
    const seconds = Math.floor((diff / 1000) % 60);

    return `${hours.toString().padStart(2, "0")}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`;
  };

  // Load orders
  const fetchOrders = async () => {
    try {
      const targetUserId = user?.id || initialUserId || "usr_001";
      const res = await fetch(`/api/orders?userId=${encodeURIComponent(targetUserId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        ordersCacheByUser[targetUserId] = data.orders;
        setOrders(data.orders);
      }
    } catch (e) {
      console.warn("Failed to fetch orders:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const expiredQrisIds = orders.filter(order => order.status === "BELUM_BAYAR" && order.paymentMethod === "QRIS" && qrisSecondsRemaining(order.createdAt, now) === 0).map(order => order.orderId).join(",");
  useEffect(() => {
    if (!expiredQrisIds) return;
    fetchOrders();
    const retry = setInterval(fetchOrders, 5000);
    return () => clearInterval(retry);
  }, [expiredQrisIds]);

  const didSkipInitialOrdersFetch = React.useRef(false);

  useEffect(() => {
    const uid = user?.id || initialUserId;
    if (
      initialOrders &&
      initialUserId &&
      uid === initialUserId &&
      !didSkipInitialOrdersFetch.current
    ) {
      didSkipInitialOrdersFetch.current = true;
      ordersCacheByUser[initialUserId] = initialOrders;
      setOrders(initialOrders);
      setIsLoading(false);
      return;
    }
    fetchOrders();
  }, [user, initialUserId, initialOrders]);

  // Sync tab if query param changes
  useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFileName(file.name);
    try {
      const uploadedUrl = await compressAndUploadImage(file, "proofs", 1200, 0.82);
      setProofImage(uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Hitung jumlah antrean verifikasi untuk tab Menunggu Konfirmasi
  const adminPendingCount = orders.filter(
    (o) => o.status === "SEDANG_DIKEMAS" && o.paymentMethod === "QRIS" && !o.paymentVerified
  ).length;
  const sellerPendingCount = orders.filter(
    (o) =>
      o.status === "SEDANG_DIKEMAS" &&
      (o.paymentVerified || o.paymentMethod?.toLowerCase().includes("saldo"))
  ).length;

  const handleVerifyOrderAsAdmin = async (orderId: string) => {
    setVerifyingOrderId(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentVerified: true,
          status: "SEDANG_DIKEMAS",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders();
        setConfirmationSubTab("SELLER");
      } else {
        alert(data.message || "Gagal memverifikasi pesanan");
      }
    } catch {
      alert("Terjadi kesalahan saat memproses verifikasi pesanan");
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedOrderForPay) return;
    if (qrisSecondsRemaining(selectedOrderForPay.createdAt, Date.now()) === 0) {
      setIsPayModalOpen(false);
      await fetchOrders();
      return;
    }
    setIsSubmittingProof(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForPay.orderId,
          paymentProofUrl: proofImage || null,
          status: "SEDANG_DIKEMAS",
          paymentVerified: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPayModalOpen(false);
        setProofImage(null);
        setProofFileName("");
        setSelectedOrderForPay(null);
        await fetchOrders();
        setActiveTab("SEDANG_DIKEMAS");
        setConfirmationSubTab("ADMIN");
      } else {
        alert(data.message || "Gagal mengunggah bukti pembayaran");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat mengunggah bukti");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPinInput || !pinInput) return;

    if (pinInput.trim().length !== 6) {
      setPinError("PIN harus terdiri dari 6 digit angka.");
      return;
    }

    setIsVerifyingPin(true);
    setPinError(null);

    try {
      const res = await fetch("/api/orders/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForPinInput.orderId,
          pin: pinInput.trim(),
          userId: user?.id || "usr_001",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsBuyerPinModalOpen(false);
        setPinInput("");
        setSelectedOrderForPinInput(null);
        await fetchOrders();
        setActiveTab(data.newStatus === "SELESAI" ? "SELESAI" : "DISEWA");
        alert(data.message || "🎉 Verifikasi serah-terima berhasil! Produk resmi diserahterimakan dan status pesanan kini Disewa.");
      } else {
        setPinError(data.message || "PIN serah terima salah. Pastikan Anda memasukkan 6 digit PIN yang diberikan oleh penjual.");
      }
    } catch {
      setPinError("Terjadi kesalahan koneksi server. Silakan coba lagi.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const tabStatus = order.status === "SELESAI_DIBELI" ? "SELESAI" : order.status;
    if (activeTab !== "SEMUA" && tabStatus !== activeTab) return false;

    // Filter sub-opsi pada tab Menunggu Konfirmasi
    if (activeTab === "SEDANG_DIKEMAS") {
      const isWaitingAdmin = order.paymentMethod === "QRIS" && !order.paymentVerified;
      if (confirmationSubTab === "ADMIN" && !isWaitingAdmin) return false;
      if (confirmationSubTab === "SELLER" && isWaitingAdmin) return false;
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchSeller = order.sellerName?.toLowerCase().includes(q);
      const matchProduct = order.productTitle?.toLowerCase().includes(q);
      const matchId = order.orderId?.toLowerCase().includes(q);
      return matchSeller || matchProduct || matchId;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center text-xs text-gray-500 mb-6 gap-2">
          <Link href="/" className="hover:text-[#03AC0E] transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/settings" className="hover:text-[#03AC0E] transition-colors">
            Profil
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-semibold">Pesanan Saya</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-[#03AC0E] border border-emerald-100">
                <Package className="w-6 h-6" />
              </span>
              Pesanan Saya
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Pantau status verifikasi QRIS, pesanan menunggu konfirmasi, dan jadwal serah-terima.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white text-xs font-bold rounded-xl shadow-xs transition-all w-fit"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mulai Belanja</span>
          </Link>
        </div>

        {/* Orders Container */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          {/* Status Tabs Navigation */}
          <div className="border-b border-gray-100 overflow-x-auto scrollbar-none">
            <div className="flex items-center min-w-max px-2 sm:px-4">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = orders.filter((o) =>
                  tab.key === "SEMUA" ? true : (o.status === "SELESAI_DIBELI" ? "SELESAI" : o.status) === tab.key
                ).length;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "text-[#03AC0E]"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-[#03AC0E] text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#03AC0E] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box inside Orders */}
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan No. Pesanan, Nama Toko, atau Nama Produk..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100/90 hover:bg-gray-100 rounded-xl border border-transparent focus:border-emerald-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#03AC0E]/20 text-xs sm:text-sm text-gray-800 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs khusus tab Menunggu Konfirmasi (ditaruh di bawah kolom pencarian, di tengah & lebar) */}
          {activeTab === "SEDANG_DIKEMAS" && (
            <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-white flex justify-center items-center">
              <div className="w-full max-w-3xl bg-gray-100/90 p-1.5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setConfirmationSubTab("ADMIN")}
                  className={`py-2.5 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    confirmationSubTab === "ADMIN"
                      ? "bg-white text-gray-900 shadow-xs border border-gray-200/90"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 shrink-0 ${
                      confirmationSubTab === "ADMIN" ? "text-amber-600" : "text-gray-400"
                    }`}
                  />
                  <span>Menunggu Verifikasi Pembayaran</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${
                      confirmationSubTab === "ADMIN"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {adminPendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmationSubTab("SELLER")}
                  className={`py-2.5 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    confirmationSubTab === "SELLER"
                      ? "bg-white text-gray-900 shadow-xs border border-gray-200/90"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Store
                    className={`w-4 h-4 shrink-0 ${
                      confirmationSubTab === "SELLER" ? "text-[#03AC0E]" : "text-gray-400"
                    }`}
                  />
                  <span>Menunggu Konfirmasi Penjual</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${
                      confirmationSubTab === "SELLER"
                        ? "bg-emerald-100 text-[#03AC0E]"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {sellerPendingCount}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Orders Content Area */}
          <div className="p-4 sm:p-6">
            {isLoading && orders.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-800">Memuat Pesanan</h3>
                  <p className="text-xs text-gray-500">Sedang mengambil riwayat transaksi Anda...</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="max-w-sm mx-auto flex flex-col items-center py-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
                  <Inbox className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  Belum Ada Pesanan
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed">
                  {activeTab === "BELUM_BAYAR"
                    ? "Tidak ada pembayaran yang tertunda saat ini."
                    : activeTab === "SEDANG_DIKEMAS"
                    ? confirmationSubTab === "ADMIN"
                      ? "Tidak ada pesanan QRIS yang sedang menunggu verifikasi pembayaran oleh Admin TryPedia."
                      : "Tidak ada pesanan yang sedang menunggu konfirmasi Penjual."
                    : activeTab === "DISEWA"
                    ? "Tidak ada produk yang sedang dalam masa sewa aktif saat ini."
                    : "Semua transaksi belanja atau riwayat pesanan Anda pada status ini akan tercatat dan ditampilkan di sini."}
                </p>

                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#03AC0E] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#02910c] active:scale-95 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Mulai Belanja</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isBelumBayar = order.status === "BELUM_BAYAR";
                  const isSedangDikemas = order.status === "SEDANG_DIKEMAS";
                  const isWaitingAdmin =
                    isSedangDikemas && order.paymentMethod === "QRIS" && !order.paymentVerified;
                  const isWaitingSeller = isSedangDikemas && !isWaitingAdmin;

                  return (
                    <div
                      key={order.orderId}
                      className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                    >
                      {/* Card Header: Seller & Order Status */}
                      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/40">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {order.sellerName || "Sneaker Zone Jember"}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] font-mono text-gray-500">
                            {order.orderId}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isBelumBayar && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{order.paymentMethod === "QRIS" ? `Belum Bayar | ${qrisSecondsRemaining(order.createdAt, now) > 0 ? formatQrisCountdown(qrisSecondsRemaining(order.createdAt, now)) : "Waktu habis"}` : "Belum Bayar"}</span>
                            </span>
                          )}
                          {isSedangDikemas && (
                            isWaitingAdmin ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Menunggu Verifikasi Pembayaran</span>
                              </span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                                  <Store className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Menunggu Konfirmasi Penjual</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-700 text-white flex items-center gap-1.5 shadow-xs">
                                  <Timer className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                                  <span>Batas: {getConfirmationCountdown(order)}</span>
                                </span>
                              </div>
                            )
                          )}
                          {order.status === "DIJADWALKAN_DIKIRIM" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                              <span>Dijadwalkan / Dikirim</span>
                            </span>
                          )}
                          {order.status === "DISEWA" && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 shadow-2xs">
                                <Timer className="w-3.5 h-3.5 text-teal-600" />
                                <span>Sedang Disewa</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-teal-700 text-white flex items-center gap-1.5 shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-teal-200 animate-pulse" />
                                <span>Sisa: {getRentalCountdown(order)}</span>
                              </span>
                            </div>
                          )}
                          {(order.status === "SELESAI" || order.status === "SELESAI_DIBELI") && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E]" />
                              <span>{order.status === "SELESAI_DIBELI" ? "Selesai dibeli" : "Selesai"}</span>
                            </span>
                          )}
                          {order.status === "DIBATALKAN" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5">
                              <span>Dibatalkan</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body: Product Info & Price */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="flex gap-3.5 min-w-0">
                          <img
                            src={order.productImage || "/images/new-balance-2002r.png"}
                            alt={order.productTitle || "Produk"}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-200 shrink-0 bg-gray-50"
                          />
                          <div className="space-y-1.5 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug truncate sm:whitespace-normal">
                              {order.productTitle || "Produk TryPedia"}
                            </h4>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                              <span className="bg-emerald-50 text-[#03AC0E] px-2 py-0.2 rounded font-semibold border border-emerald-100">
                                {order.orderType === "rent" ? "Sewa Produk" : "Beli Penuh"}
                              </span>
                              <span>•</span>
                              <span className="text-gray-600">
                                Metode: <strong>{order.paymentMethod || "QRIS"}</strong>
                              </span>
                            </div>

                            {/* Handover Details */}
                            <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
                              <span className="truncate max-w-xs sm:max-w-md">
                                {order.deliveryOption === "cod"
                                  ? `COD: ${order.codLocation || "Universitas Jember"}`
                                  : order.deliveryOption === "delivery"
                                  ? `Antar ke Rumah: ${order.codLocation}`
                                  : "Ambil di Toko Seller"}
                              </span>
                            </div>

                            {order.codDate && (
                              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>
                                  Jadwal Serah-Terima: <strong>{order.codDate}</strong> pukul <strong>{order.codTime || "16:00"} WIB</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Total Price Section */}
                        <div className="w-full sm:w-auto text-left sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                          <span className="text-[11px] text-gray-500 block">Total Pembayaran:</span>
                          <span className="text-base sm:text-lg font-black text-[#03AC0E] font-mono">
                            {formatRupiah(order.totalPrice)}
                          </span>

                          {order.status === "SELESAI_DIBELI" && order.purchaseAmount != null && (
                            <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                              <p>Pembayaran sewa: {formatRupiah(Number(order.rentalTotalPrice))}</p>
                              <p>Pembayaran pembelian: {formatRupiah(Number(order.purchaseAmount))}</p>
                            </div>
                          )}
                          {/* Bukti badge if present */}
                          {order.paymentProofUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewProofUrl(order.paymentProofUrl)}
                              className="mt-2 text-[11px] text-[#03AC0E] hover:text-[#02980C] font-semibold flex items-center sm:justify-end gap-1 underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Bukti Transfer</span>
                            </button>
                          ) : isSedangDikemas && order.paymentMethod?.includes("Saldo") ? (
                            <span className="mt-1 text-[10.5px] text-gray-500 block">
                              Terbayar via Saldo TryPedia
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Card Footer: Contextual notices and Action Buttons */}
                      <div className="p-3.5 sm:px-5 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        {/* Notice info */}
                        <div className="text-[11px] leading-relaxed">
                          {isBelumBayar && (
                            <span className="text-amber-800 flex items-center gap-1.5 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                Selesaikan pembayaran QRIS dan unggah screenshot bukti transfer agar pesanan dapat diproses.
                              </span>
                            </span>
                          )}
                          {isSedangDikemas && (
                            isWaitingAdmin ? (
                              <span className="text-amber-900 flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  Bukti pembayaran QRIS terlampir. Admin TryPedia sedang memvalidasi keabsahan transfer Rekber.
                                </span>
                              </span>
                            ) : (
                              <span className="text-emerald-900 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
                                <span>
                                  {order.paymentMethod === "QRIS"
                                    ? "Pembayaran QRIS telah diverifikasi Admin TryPedia! Penjual sedang menyiapkan pesanan Anda."
                                    : "Pembayaran lunas via Saldo TryPedia. Penjual sedang menyiapkan pesanan Anda."}
                                </span>
                              </span>
                            )
                          )}
                          {order.status === "DIJADWALKAN_DIKIRIM" && (
                            <span className="text-blue-900 flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                Jadwal serah-terima telah disepakati. Saat bertemu penjual dan menerima barang, mintalah 6 digit PIN untuk memulai masa sewa.
                              </span>
                            </span>
                          )}
                          {order.status === "DISEWA" && (
                            <span className="text-teal-950 flex items-center gap-1.5 font-medium">
                              <Timer className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>
                                Barang sedang aktif Anda sewa. Sebelum masa sewa habis, Anda dapat memutuskan untuk membeli permanen (biaya sewa memotong harga beli) atau mengembalikan barang ke penjual.
                              </span>
                            </span>
                          )}
                          {order.status === "SELESAI" && (
                            <span className="text-gray-500">
                              Pesanan telah selesai.
                            </span>
                          )}
                          {order.status === "DIBATALKAN" && (
                            <span className="text-red-700 flex items-center gap-1.5 font-medium text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>
                                {order.cancellationReason?.startsWith("Bukti pembayaran ditolak:")
                                  ? order.cancellationReason
                                  : order.cancellationReason === "Waktu pembayaran QRIS 10 menit telah habis"
                                  ? "Pesanan dibatalkan karena batas waktu pembayaran QRIS telah habis."
                                  : order.cancellationReason
                                  ? `Pesanan ditolak penjual: "${order.cancellationReason}". Seluruh dana ${formatRupiah(order.totalPrice)} telah dikembalikan 100% ke Saldo Dompet Anda.`
                                  : `Pesanan dibatalkan. Seluruh dana ${formatRupiah(order.totalPrice)} telah dikembalikan 100% ke Saldo Dompet Anda.`}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                          {isBelumBayar && (
                            <button
                              type="button"
                              onClick={() => {
                                setProofImage(null);
                                setProofFileName("");
                                setSelectedOrderForPay(order);
                                setIsPayModalOpen(true);
                              }}
                              disabled={order.paymentMethod === "QRIS" && qrisSecondsRemaining(order.createdAt, now) === 0}
                              className="w-full sm:w-auto px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Bayar / Upload Bukti QRIS</span>
                            </button>
                          )}

                          {/* Tombol Chat Penjual ketika sudah di tahap Menunggu Konfirmasi Penjual */}
                          {isWaitingSeller && (
                            <Link
                              href={`/chat?seller=${encodeURIComponent(order.sellerName || "Penjual")}&orderId=${encodeURIComponent(order.orderId)}`}
                              prefetch={true}
                              className="w-full sm:w-auto px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Chat Penjual</span>
                            </Link>
                          )}

                          {/* Tombol untuk Order yang sedang Dijadwalkan / Dikirim (DIJADWALKAN_DIKIRIM) */}
                          {order.status === "DIJADWALKAN_DIKIRIM" && (
                            <>
                              <Link
                                href={`/chat?seller=${encodeURIComponent(order.sellerName || "Penjual")}&orderId=${encodeURIComponent(order.orderId)}`}
                                prefetch={true}
                                className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#03AC0E]" />
                                <span>Chat Penjual</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForPinInput(order);
                                  setPinInput("");
                                  setPinError(null);
                                  setIsBuyerPinModalOpen(true);
                                }}
                                className="w-full sm:w-auto px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Masukkan PIN Serah Terima</span>
                              </button>
                            </>
                          )}

                          {order.status === "DISEWA" && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/chat?seller=${encodeURIComponent(order.sellerName || "Penjual")}&orderId=${encodeURIComponent(order.orderId)}`}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chat Penjual</span>
                              </Link>
                              <Link
                                href={`/orders/${encodeURIComponent(order.orderId)}/payment`}
                                prefetch={false}
                                className="px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center whitespace-nowrap"
                              >
                                {order.purchasePaymentStatus === "PENDING" ? "Lihat pembayaran" : "Beli Sekarang"}
                              </Link>
                            </div>
                          )}

                          {order.status === "SELESAI_DIBELI" && (
                            <Link href={`/orders/${encodeURIComponent(order.orderId)}/payment`} className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100">Lihat pembelian</Link>
                          )}

                          {/* Tombol untuk Order yang Selesai (SELESAI) */}
                          {(order.status === "SELESAI" || order.status === "SELESAI_DIBELI") && (
                            <>
                              <Link
                                href={`/chat?seller=${encodeURIComponent(order.sellerName || "Penjual")}&orderId=${encodeURIComponent(order.orderId)}`}
                                prefetch={true}
                                className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#03AC0E]" />
                                <span>Chat Penjual</span>
                              </Link>

                              {order.hasReview ? (
                                <span className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center gap-1.5 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E]" />
                                  <span>Sudah Diulas</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviewModal(order)}
                                  className="w-full sm:w-auto px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                                  <span>Beri Ulasan</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Modal Bayar QRIS & Upload Bukti untuk Order di Tab Belum Bayar */}
      {isPayModalOpen && selectedOrderForPay && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsPayModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#03AC0E] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Selesaikan Pembayaran QRIS
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    No. Pesanan: {selectedOrderForPay.orderId}
                    <span className="block mt-1 font-semibold text-gray-700">{qrisSecondsRemaining(selectedOrderForPay.createdAt, now) > 0 ? `Sisa waktu: ${formatQrisCountdown(qrisSecondsRemaining(selectedOrderForPay.createdAt, now))}` : "Waktu pembayaran habis"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 2 Kolom Kiri (QRIS) & Kanan (Upload Bukti) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* KOLOM KIRI: Total Pembayaran & QRIS */}
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-gray-600 font-medium block">
                      Total Pembayaran:
                    </span>
                    <span className="text-2xl font-black text-[#03AC0E] font-mono mt-0.5 tracking-tight block">
                      {formatRupiah(selectedOrderForPay.totalPrice)}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      *Transfer tepat sesuai nominal pembayaran di atas.
                    </span>
                  </div>

                  <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <div className="p-1.5 bg-white rounded-xl border border-gray-100 shadow-inner">
                      <img
                        src="/images/qris-user.jpg"
                        alt="Kode QRIS TryPedia"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg mx-auto"
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-800 mt-2">
                      QRIS TryPedia Official
                    </p>
                    <p className="text-[10.5px] text-gray-500 max-w-xs mx-auto leading-snug mt-0.5">
                      BCA, Livin Mandiri, BRImo, BNI, GoPay, OVO, ShopeePay, DANA & seluruh aplikasi mobile banking.
                    </p>
                  </div>
                </div>

                {/* KOLOM KANAN: Upload Screenshot Bukti Transfer & Panduan */}
                <div className="space-y-3 flex flex-col h-full justify-between">
                  <div className="text-left space-y-2">
                    <label className="text-xs font-bold text-gray-900 block">
                      Unggah Screenshot Bukti Transfer:
                    </label>

                    {proofImage ? (
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-[#03AC0E]/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={proofImage}
                            alt="Bukti Transfer"
                            className="w-14 h-14 object-cover rounded-lg border border-emerald-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {proofFileName || "Screenshot Bukti Bayar Terpilih"}
                            </span>
                            <span className="text-[11px] text-[#03AC0E] font-medium flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Siap dikirim untuk verifikasi</span>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProofImage(null);
                            setProofFileName("");
                          }}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors shrink-0"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-300 hover:border-[#03AC0E] bg-gray-50/70 hover:bg-emerald-50/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-[#03AC0E] flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          Pilih atau Unggah Screenshot Bukti Transfer
                        </span>
                        <span className="text-[10.5px] text-gray-500">
                          Format file JPG, PNG, atau WEBP
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileChange}
                          className="sr-only"
                        />
                      </label>
                    )}

                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed">
                      ✨ Setelah Anda menekan <strong>Kirim Bukti Pembayaran</strong>, status pesanan akan langsung berpindah ke <strong>Menunggu Konfirmasi</strong> dan akan diverifikasi oleh Admin TryPedia.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !proofImage || qrisSecondsRemaining(selectedOrderForPay.createdAt, now) === 0}
                className="px-6 py-2.5 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isSubmittingProof ? "Mengirim Bukti..." : "Kirim Bukti Pembayaran"}</span>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal: Preview Bukti Transfer Terlampir */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#03AC0E]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Bukti Screenshot Pembayaran QRIS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-gray-950 flex items-center justify-center overflow-auto flex-1">
              <img
                src={previewProofUrl}
                alt="Bukti Transfer QRIS"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-600">
                Bukti transfer ini telah disimpan di sistem Rekber TryPedia untuk validasi Admin TryPedia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Masukkan PIN Serah Terima (Pembeli) */}
      {isBuyerPinModalOpen && selectedOrderForPinInput && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsBuyerPinModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#03AC0E] text-white flex items-center justify-center shadow-xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Konfirmasi Serah-Terima Barang
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    No. Pesanan: {selectedOrderForPinInput.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyerPinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleVerifyPin} className="p-5 sm:p-6 space-y-4">
              {/* Product Preview */}
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                <img
                  src={selectedOrderForPinInput.productImage || "/images/new-balance-2022r.jpg"}
                  alt={selectedOrderForPinInput.productTitle}
                  className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {selectedOrderForPinInput.productTitle}
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    Penjual: <strong>{selectedOrderForPinInput.sellerName || "Sneaker Zone Jember"}</strong>
                  </p>
                  <span className="text-xs font-extrabold text-[#03AC0E]">
                    {formatRupiah(selectedOrderForPinInput.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-600 leading-relaxed text-center">
                Masukkan <strong>6 digit PIN</strong> yang diberikan oleh penjual saat menyerahkan produk kepada Anda:
              </div>

              {/* Error message */}
              {pinError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* 6 Digit Input */}
              <div className="space-y-1.5 text-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, "");
                    setPinInput(onlyNums);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="000000"
                  className="w-full py-3 px-4 text-center font-mono text-3xl font-black tracking-[0.4em] bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:bg-white focus:ring-2 focus:ring-[#03AC0E]/20 transition-all placeholder-gray-300"
                />
                <span className="text-[11px] text-gray-400 block font-medium">
                  {pinInput.length} / 6 Digit
                </span>
              </div>

              {/* Warning Notice */}
              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Perhatian:</strong> Pastikan Anda telah memeriksa fisik barang dan puas dengan kondisinya sebelum memasukkan PIN. Setelah PIN diverifikasi, pesanan akan diselesaikan dan dana otomatis diteruskan ke penjual.
              </div>

              {/* Footer buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuyerPinModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin || pinInput.length !== 6}
                  className="w-2/3 py-2.5 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isVerifyingPin ? (
                    <span>Memverifikasi PIN...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Verifikasi & Selesaikan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Beri Ulasan (Bintang, Deskripsi, Foto Maks 3) */}
      {isReviewModalOpen && selectedOrderForReview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsReviewModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-xs">
                  <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Beri Ulasan Produk
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    No. Pesanan: {selectedOrderForReview.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReview} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Product Preview Card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <img
                  src={selectedOrderForReview.productImage || "/images/new-balance-2022r.jpg"}
                  alt={selectedOrderForReview.productTitle}
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                    {selectedOrderForReview.productTitle}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Penjual: <span className="font-semibold text-gray-700">{selectedOrderForReview.sellerName || "Sneaker Zone Jember"}</span>
                  </p>
                </div>
              </div>

              {reviewSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#03AC0E] shrink-0" />
                  <span>{reviewSuccessMsg}</span>
                </div>
              )}

              {reviewError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Bintang Rating (1 - 5) */}
              <div className="space-y-2 text-center py-2 bg-gray-50/70 rounded-xl border border-gray-100 p-4">
                <label className="text-xs font-bold text-gray-800 block">
                  Penilaian Kualitas Produk
                </label>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (reviewHoverRating || reviewRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        className="p-1 rounded-lg hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                        aria-label={`Beri bintang ${star}`}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            isFilled
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "text-gray-300 fill-gray-100"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-bold text-amber-600 mt-1">
                  {reviewRating === 5 && "⭐ Sangat Puas!"}
                  {reviewRating === 4 && "⭐ Puas"}
                  {reviewRating === 3 && "⭐ Cukup Puas"}
                  {reviewRating === 2 && "⭐ Kurang Puas"}
                  {reviewRating === 1 && "⭐ Sangat Kecewa"}
                </p>
              </div>

              {/* Deskripsi Ulasan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 block">
                  Deskripsi Ulasan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda menggunakan produk ini, kondisi barang, dan kelengkapannya..."
                  className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-xl p-3 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition resize-none placeholder-gray-400"
                />
                <span className="text-[10.5px] text-gray-400 block text-right">
                  {reviewComment.length} karakter
                </span>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={reviewMaskName} onChange={event => setReviewMaskName(event.target.checked)} disabled={isSubmittingReview} className="h-4 w-4 accent-[#03AC0E]" />
                Sensor Nama
              </label>

              {/* Upload Foto (Maksimal 3 Foto) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 block">
                  Foto Produk (Opsional, Maksimal 3 Foto):
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {reviewPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-18 h-18 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group shrink-0"
                    >
                      <img
                        src={photoUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewPhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-xs cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {reviewPhotos.length < 3 && (
                    <label className="w-18 h-18 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#03AC0E] bg-gray-50 hover:bg-emerald-50/40 text-gray-500 hover:text-[#03AC0E] flex flex-col items-center justify-center cursor-pointer transition shrink-0">
                      <ImageIcon className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">
                        Tambah ({reviewPhotos.length}/3)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReviewPhotoUpload}
                        disabled={isUploadingReviewPhotos || isSubmittingReview}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview || isUploadingReviewPhotos || !reviewComment.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#03AC0E] hover:bg-[#02980C] rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmittingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim Ulasan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Kirim Ulasan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersClient(props: OrdersClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col items-center gap-3.5 max-w-xs w-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-800">Memuat Pesanan Saya</h3>
              <p className="text-xs text-gray-500">Sedang menyiapkan data transaksi...</p>
            </div>
          </div>
        </div>
      }
    >
      <OrdersContent {...props} />
    </Suspense>
  );
}
