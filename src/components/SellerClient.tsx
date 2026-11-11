"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreHoursInput from "@/components/StoreHoursInput";
import { useAuth } from "@/context/AuthContext";
import { compressAndUploadImage } from "@/lib/client-image";
import {
  Store,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Settings,
  ChevronRight,
  X,
  Upload,
  LogOut,
  Info,
  Check,
  KeyRound,
  Copy,
  Timer,
  Loader2,
} from "lucide-react";

type SellerTab = "orders" | "products" | "locations" | "settings";
type OrderSubTab = "PERLU_KONFIRMASI" | "DIJADWALKAN_DIKIRIM" | "DISEWA" | "SELESAI";



export interface SellerDashboardBundle {
  store: any;
  stats: any;
  locations: any[];
  products: any[];
  orders: any[];
  counts: any;
}

interface SellerClientProps {
  initialUserId?: string | null;
  initialBundle?: SellerDashboardBundle | null;
  initialTab?: SellerTab;
  productAction?: "create" | "edit";
  productId?: string;
  initialOrderSubTab?: OrderSubTab;
}

// Per-user in-memory cache for seller dashboard data across client navigation
const sellerDashboardCache: Record<string, SellerDashboardBundle> = {};

export default function SellerClient({
  initialUserId = null,
  initialBundle = null,
  initialTab = "orders",
  productAction,
  productId,
  initialOrderSubTab = "PERLU_KONFIRMASI",
}: SellerClientProps) {
  const router = useRouter();
  const { user: authenticatedUser, logout, openLoginModal } = useAuth();
  const user = React.useMemo(() => authenticatedUser || (initialUserId ? { id: initialUserId, name: initialBundle?.store?.storeName || "", email: "" } : null), [authenticatedUser, initialUserId, initialBundle?.store?.storeName]);
  const activeUid = user?.id || initialUserId || "";
  const seeded = initialBundle || (activeUid ? sellerDashboardCache[activeUid] : null) || null;

  const initialProduct = productAction === "edit" ? seeded?.products.find(product => product.id === productId) : null;
  const isProductEditor = Boolean(productAction);
  const storeHref = activeUid ? `/store/${encodeURIComponent(activeUid)}` : "/seller";
  const returnHref = productAction === "edit" && productId ? `/products/${encodeURIComponent(productId)}` : `${storeHref}?tab=produk`;
  const [activeTab, setActiveTab] = useState<SellerTab>(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>(initialOrderSubTab);

  useEffect(() => setOrderSubTab(initialOrderSubTab), [initialOrderSubTab]);

  // Store data
  const [storeData, setStoreData] = useState<any | null>(seeded?.store ?? null);
  const [storeStats, setStoreStats] = useState<any>(
    seeded?.stats ?? {
      totalProducts: 0,
      totalOrders: 0,
      pendingOrdersCount: 0,
      scheduledOrdersCount: 0,
      completedOrdersCount: 0,
      codLocationsCount: 0,
    }
  );

  // Orders data
  const [orders, setOrders] = useState<any[]>(seeded?.orders ?? []);
  const [orderCounts, setOrderCounts] = useState(
    seeded?.counts ?? { pending: 0, scheduled: 0, rented: 0, completed: 0, total: 0 }
  );
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(!seeded);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Live countdown timer state (ticks every second)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRentalCountdown = (ord: any) => {
    let endMs = 0;
    if (ord.rentEndAt) {
      endMs = new Date(ord.rentEndAt).getTime();
    } else if (ord.rentStartedAt) {
      const dur = ord.rentDuration || 3;
      endMs = new Date(ord.rentStartedAt).getTime() + dur * 24 * 60 * 60 * 1000;
    } else if (ord.createdAt) {
      const dur = ord.rentDuration || 3;
      endMs = new Date(ord.createdAt).getTime() + dur * 24 * 60 * 60 * 1000;
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

  const getConfirmationCountdown = (ord: any) => {
    const createdMs = ord.createdAt ? new Date(ord.createdAt).getTime() : now;
    const deadlineMs = createdMs + 24 * 60 * 60 * 1000;
    const diff = deadlineMs - now;

    if (diff <= 0) return "Batas Waktu Berakhir";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60) % 60));
    const seconds = Math.floor((diff / 1000) % 60);

    return `${hours.toString().padStart(2, "0")}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`;
  };

  // Products data
  const [products, setProducts] = useState<any[]>(seeded?.products ?? []);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(!seeded);

  // Locations data
  const [locations, setLocations] = useState<any[]>(seeded?.locations ?? []);
  const [isLocationsLoading, setIsLocationsLoading] = useState<boolean>(!seeded);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(productAction === "create");
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(productAction === "edit");
  const [editingProduct, setEditingProduct] = useState<any | null>(initialProduct || null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [isStoreSettingsSaving, setIsStoreSettingsSaving] = useState<boolean>(false);
  const [selectedPinOrder, setSelectedPinOrder] = useState<any | null>(null);
  const [isSellerPinModalOpen, setIsSellerPinModalOpen] = useState<boolean>(false);
  const [isCopiedPin, setIsCopiedPin] = useState<boolean>(false);

  // Reject Order States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectingOrder, setRejectingOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Barang belum siap disewa");
  const [customRejectReason, setCustomRejectReason] = useState<string>("");
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Form states: Product (Shared for Upload & Edit)
  const [productFormName, setProductFormName] = useState(initialProduct?.name || "");
  const [productFormCategory, setProductFormCategory] = useState(initialProduct?.category || "Fashion & Aksesori");
  const [productFormCondition, setProductFormCondition] = useState<string>(initialProduct?.condition === "Baik" || initialProduct?.condition === "Cukup Baik" ? initialProduct.condition : "Seperti Baru");
  const [productFormRent1d, setProductFormRent1d] = useState(initialProduct?.rentPriceDaily != null ? Number(initialProduct.rentPriceDaily).toLocaleString("id-ID") : "");
  const [productFormRent3d, setProductFormRent3d] = useState(initialProduct?.rentPrice3d != null ? Number(initialProduct.rentPrice3d).toLocaleString("id-ID") : "");
  const [productFormRent7d, setProductFormRent7d] = useState(initialProduct?.rentPrice7d != null ? Number(initialProduct.rentPrice7d).toLocaleString("id-ID") : "");
  const [productFormBuyPrice, setProductFormBuyPrice] = useState(initialProduct?.buyPrice != null ? Number(initialProduct.buyPrice).toLocaleString("id-ID") : "");
  const [productFormDesc, setProductFormDesc] = useState(initialProduct?.description || "");
  const [productFormImages, setProductFormImages] = useState<string[]>(initialProduct?.images?.length ? initialProduct.images : initialProduct?.image ? [initialProduct.image] : []);
  const [productFormPackageIncludes, setProductFormPackageIncludes] = useState<string[]>(initialProduct?.packageIncludes || []);
  const [newPackageItem, setNewPackageItem] = useState<string>("");
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Form states: Location
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locMapsUrl, setLocMapsUrl] = useState("");
  const [isSubmittingLoc, setIsSubmittingLoc] = useState(false);

  // Form states: Store Settings
  const [editStoreHours, setEditStoreHours] = useState(seeded?.store?.hours || "09:00 - 21:00 WIB");
  const [editStoreDesc, setEditStoreDesc] = useState(seeded?.store?.storeDescription || "");

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const applyStoreHoursState = (store: any) => {
    setEditStoreDesc(store.storeDescription || "");
    setEditStoreHours(store.hours || "09:00 - 21:00 WIB");
  };

  // 1. Fetch Store Profile & Stats
  const fetchStore = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/seller/store?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && data.store) {
        sellerDashboardCache[user.id] = {
          ...(sellerDashboardCache[user.id] || { store: null, stats: null, locations: [], products: [], orders: [], counts: null }),
          store: data.store,
          stats: data.stats,
        };
        setStoreData(data.store);
        setStoreStats(data.stats);
        applyStoreHoursState(data.store);
      }
    } catch (e) {
      console.warn("Failed to fetch store info:", e);
    }
  };

  // 2. Fetch Orders for this Seller
  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `/api/seller/orders?sellerId=${encodeURIComponent(user.id)}&tab=${orderSubTab}`
      );
      const data = await res.json();
      if (data.success) {
        sellerDashboardCache[user.id] = {
          ...(sellerDashboardCache[user.id] || { store: null, stats: null, locations: [], products: [], orders: [], counts: null }),
          orders: data.orders || [],
          counts: data.counts || orderCounts,
        };
        setOrders(data.orders || []);
        if (data.counts) {
          setOrderCounts(data.counts);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch seller orders:", e);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // 3. Fetch Products for this Seller
  const fetchProducts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/seller/products?sellerId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        sellerDashboardCache[user.id] = {
          ...(sellerDashboardCache[user.id] || { store: null, stats: null, locations: [], products: [], orders: [], counts: null }),
          products: data.products || [],
        };
        setProducts(data.products || []);
      }
    } catch (e) {
      console.warn("Failed to fetch seller products:", e);
    } finally {
      setIsProductsLoading(false);
    }
  };

  // 4. Fetch COD Locations for this Seller
  const fetchLocations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/seller/locations?sellerId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        sellerDashboardCache[user.id] = {
          ...(sellerDashboardCache[user.id] || { store: null, stats: null, locations: [], products: [], orders: [], counts: null }),
          locations: data.locations || [],
        };
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.warn("Failed to fetch seller locations:", e);
    } finally {
      setIsLocationsLoading(false);
    }
  };

  const didSkipInitialFetchRef = React.useRef(false);

  useEffect(() => {
    if (!user) return;
    if (initialBundle && initialUserId && user.id === initialUserId && !didSkipInitialFetchRef.current) {
      didSkipInitialFetchRef.current = true;
      sellerDashboardCache[user.id] = initialBundle;
      return;
    }
    fetchStore();
    fetchOrders();
    fetchProducts();
    fetchLocations();
  }, [user, initialBundle, initialUserId]);

  const isFirstSubTabRenderRef = React.useRef(true);
  useEffect(() => {
    if (isFirstSubTabRenderRef.current) {
      isFirstSubTabRenderRef.current = false;
      if (initialBundle && initialUserId === user?.id) return;
    }
    if (user) {
      fetchOrders();
    }
  }, [orderSubTab]);

  // Action: Confirm Order
  const handleConfirmOrder = async (orderId: string) => {
    if (!user) return;
    setProcessingOrderId(orderId);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action: "CONFIRM",
          sellerId: user.id,
        }),
      });
      if (res.status === 401) { openLoginModal(() => handleConfirmOrder(orderId)); return; }
      const data = await res.json();
      if (data.success) {
        setOrders((previous:any[])=>previous.filter((order:any)=>order.orderId!==orderId));
        setOrderCounts((previous:any)=>({...previous,pending:Math.max(0,previous.pending-1),scheduled:previous.scheduled+1}));
        setOrderSubTab("DIJADWALKAN_DIKIRIM");
        alert("Pesanan berhasil dikonfirmasi! Jadwal serah-terima dicatat dan pembeli telah diberitahu.");
      } else {
        alert(data.message || "Gagal mengonfirmasi pesanan");
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Action: Tolak Pesanan Pembeli (Auto-Refund 100% to Buyer)
  const handleOpenRejectModal = (ord: any) => {
    setRejectingOrder(ord);
    setRejectReason("Barang belum siap disewa");
    setCustomRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectOrder = async () => {
    if (!rejectingOrder || !user) return;
    const finalReason =
      rejectReason === "Alasan lainnya"
        ? customRejectReason.trim() || "Alasan lainnya"
        : rejectReason;

    setIsSubmittingReject(true);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: rejectingOrder.orderId,
          action: "REJECT",
          reason: finalReason,
          sellerId: user.id,
        }),
      });
      if (res.status === 401) { openLoginModal(() => handleConfirmRejectOrder()); return; }
      const data = await res.json();
      if (data.success) {
        setIsRejectModalOpen(false);
        setRejectingOrder(null);
        await fetchOrders();
        alert("Pesanan telah ditolak.");
      } else {
        alert(data.message || "Gagal menolak pesanan");
      }
    } catch {
      alert("Terjadi kesalahan koneksi saat menolak pesanan");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Action: Complete Order (Serah Terima Selesai)
  const handleCompleteOrder = async (orderId: string) => {
    if (!user) return;
    if (!confirm("Konfirmasi bahwa serah-terima barang telah berhasil dilakukan dengan pembeli? Dana akan langsung masuk ke Dompet Toko Anda.")) {
      return;
    }
    setProcessingOrderId(orderId);
    try {
      const res = await fetch("/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action: "COMPLETE",
          sellerId: user.id,
        }),
      });
      if (res.status === 401) { openLoginModal(() => handleCompleteOrder(orderId)); return; }
      const data = await res.json();
      if (data.success) {
        setOrders((previous:any[])=>previous.filter((order:any)=>order.orderId!==orderId));
        setOrderCounts((previous:any)=>({...previous,rented:Math.max(0,previous.rented-1),completed:previous.completed+1}));
        setOrderSubTab("SELESAI");
        alert("🎉 Pesanan selesai! Dana hasil penjualan telah berhasil ditambahkan ke saldo Dompet Toko Anda.");
      } else {
        alert(data.message || "Gagal menyelesaikan pesanan");
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Product Helpers & Actions
  const formatThousandNumber = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "";
    const cleanDigits = value.toString().replace(/\D/g, "");
    if (!cleanDigits) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(cleanDigits, 10));
  };

  const parseRawPrice = (val: string | number | null | undefined): number => {
    if (!val) return 0;
    const cleanDigits = val.toString().replace(/\D/g, "");
    return cleanDigits ? parseInt(cleanDigits, 10) : 0;
  };

  const handleRent1dChange = (rawInput: string) => {
    const formatted = formatThousandNumber(rawInput);
    setProductFormRent1d(formatted);
    const num = parseRawPrice(rawInput);
    if (num > 0) {
      setProductFormRent3d(formatThousandNumber(Math.round(num * 2.8)));
      setProductFormRent7d(formatThousandNumber(Math.round(num * 5.8)));
    } else {
      setProductFormRent3d("");
      setProductFormRent7d("");
    }
  };

  const handleRent3dChange = (rawInput: string) => {
    setProductFormRent3d(formatThousandNumber(rawInput));
  };

  const handleRent7dChange = (rawInput: string) => {
    setProductFormRent7d(formatThousandNumber(rawInput));
  };

  const handleBuyPriceChange = (rawInput: string) => {
    setProductFormBuyPrice(formatThousandNumber(rawInput));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - productFormImages.length;
    if (remainingSlots <= 0) {
      alert("Maksimal 5 foto per produk.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    for (const file of filesToUpload) {
      try {
        const uploadedUrl = await compressAndUploadImage(file, "products", 1200, 0.82);
        setProductFormImages((prev) => {
          if (prev.length >= 5) return prev;
          return [...prev, uploadedUrl];
        });
      } catch {
        // Fallback if canvas compression fails on unusual file
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            setProductFormImages((prev) => {
              if (prev.length >= 5) return prev;
              return [...prev, base64];
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setProductFormImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddPackageItem = () => {
    const trimmed = newPackageItem.trim();
    if (!trimmed) return;
    if (productFormPackageIncludes.includes(trimmed)) {
      alert("Kelengkapan paket ini sudah ada di daftar!");
      return;
    }
    setProductFormPackageIncludes((prev) => [...prev, trimmed]);
    setNewPackageItem("");
  };

  const handleRemovePackageItem = (indexToRemove: number) => {
    setProductFormPackageIncludes((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleOpenUploadProduct = () => {
    setEditingProduct(null);
    setProductFormName("");
    setProductFormCategory("Fashion & Aksesori");
    setProductFormCondition("Seperti Baru");
    setProductFormRent1d("");
    setProductFormRent3d("");
    setProductFormRent7d("");
    setProductFormBuyPrice("");
    setProductFormDesc("");
    setProductFormImages([]);
    setProductFormPackageIncludes([]);
    setNewPackageItem("");
    setIsUploadModalOpen(true);
  };

  const handleOpenEditProduct = (prd: any) => {
    setEditingProduct(prd);
    setProductFormName(prd.name || "");
    setProductFormCategory(prd.category || "Fashion & Aksesori");
    setProductFormCondition(
      prd.condition === "Baik" || prd.condition === "Cukup Baik" ? prd.condition : "Seperti Baru"
    );
    setProductFormRent1d(prd.rentPriceDaily != null ? formatThousandNumber(prd.rentPriceDaily) : "");
    setProductFormRent3d(prd.rentPrice3d != null ? formatThousandNumber(prd.rentPrice3d) : "");
    setProductFormRent7d(prd.rentPrice7d != null ? formatThousandNumber(prd.rentPrice7d) : "");
    setProductFormBuyPrice(prd.buyPrice != null ? formatThousandNumber(prd.buyPrice) : "");
    setProductFormDesc(prd.description || "");
    const imgs: string[] =
      Array.isArray(prd.images) && prd.images.length > 0
        ? prd.images
        : prd.image
        ? [prd.image]
        : [];
    setProductFormImages(imgs);
    const incs: string[] =
      Array.isArray(prd.packageIncludes) && prd.packageIncludes.length > 0
        ? prd.packageIncludes
        : Array.isArray(prd.package_includes) && prd.package_includes.length > 0
        ? prd.package_includes
        : [];
    setProductFormPackageIncludes(incs);
    setNewPackageItem("");
    setIsEditModalOpen(true);
  };

  const closeProductEditor = () => {
    setIsUploadModalOpen(false);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    if (isProductEditor) React.startTransition(() => router.push(returnHref));
  };

  const handleUploadProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (productFormImages.length === 0) {
      alert("Silakan masukkan minimal 1 foto produk!");
      return;
    }
    if (productFormPackageIncludes.length === 0) {
      alert("Silakan masukkan minimal 1 kelengkapan paket!");
      return;
    }
    if (!productFormDesc.trim()) {
      alert("Silakan isi deskripsi produk!");
      return;
    }

    const rent1dNum = parseRawPrice(productFormRent1d);
    const rent3dNum = parseRawPrice(productFormRent3d);
    const rent7dNum = parseRawPrice(productFormRent7d);
    const buyPriceNum = parseRawPrice(productFormBuyPrice);

    if (rent1dNum <= 0) {
      alert("Silakan masukkan tarif sewa 1 hari!");
      return;
    }
    if (buyPriceNum <= 0) {
      alert("Silakan masukkan harga beli penuh!");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: user.id,
          name: productFormName,
          category: productFormCategory,
          condition: productFormCondition,
          rentPriceDaily: rent1dNum,
          rentPrice3d: rent3dNum || Math.round(rent1dNum * 2.8),
          rentPrice7d: rent7dNum || Math.round(rent1dNum * 5.8),
          buyPrice: buyPriceNum,
          description: productFormDesc.trim(),
          images: productFormImages,
          features: [
            "Bisa Sewa-Milik (Rent to Own)",
            productFormCondition,
            "COD Area Jember",
          ],
          packageIncludes: productFormPackageIncludes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (isProductEditor) {
          window.dispatchEvent(new Event("trypedia_products_change"));
          React.startTransition(() => { router.refresh(); router.push(`${storeHref}?tab=produk`); });
          return;
        }
        setIsUploadModalOpen(false);
        await fetchProducts();
        await fetchStore();
        router.refresh();
        window.dispatchEvent(new Event("trypedia_products_change"));
        alert("✓ Produk baru berhasil diunggah ke etalase toko Anda!");
      } else {
        alert(data.message || "Gagal mengunggah produk");
      }
    } catch {
      alert("Terjadi kesalahan saat mengunggah produk");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (productFormImages.length === 0) {
      alert("Silakan masukkan minimal 1 foto produk!");
      return;
    }
    if (productFormPackageIncludes.length === 0) {
      alert("Silakan masukkan minimal 1 kelengkapan paket!");
      return;
    }
    if (!productFormDesc.trim()) {
      alert("Silakan isi deskripsi produk!");
      return;
    }

    const rent1dNum = parseRawPrice(productFormRent1d);
    const rent3dNum = parseRawPrice(productFormRent3d);
    const rent7dNum = parseRawPrice(productFormRent7d);
    const buyPriceNum = parseRawPrice(productFormBuyPrice);

    if (rent1dNum <= 0) {
      alert("Silakan masukkan tarif sewa 1 hari!");
      return;
    }
    if (buyPriceNum <= 0) {
      alert("Silakan masukkan harga beli penuh!");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const res = await fetch("/api/seller/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editingProduct.id,
          name: productFormName,
          category: productFormCategory,
          condition: productFormCondition,
          rentPriceDaily: rent1dNum,
          rentPrice3d: rent3dNum || Math.round(rent1dNum * 2.8),
          rentPrice7d: rent7dNum || Math.round(rent1dNum * 5.8),
          buyPrice: buyPriceNum,
          description: productFormDesc.trim(),
          images: productFormImages,
          packageIncludes: productFormPackageIncludes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (isProductEditor) {
          window.dispatchEvent(new Event("trypedia_products_change"));
          React.startTransition(() => { router.refresh(); router.push(returnHref); });
          return;
        }
        setIsEditModalOpen(false);
        setEditingProduct(null);
        await fetchProducts();
        window.dispatchEvent(new Event("trypedia_products_change"));
        alert("✓ Perubahan produk berhasil disimpan ke database!");
      } else {
        alert(data.message || "Gagal menyimpan perubahan");
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Action: Toggle Product Stock
  const handleToggleStock = async (productId: string, currentStock: number) => {
    const newStock = currentStock > 0 ? 0 : 1;
    try {
      const res = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, stock: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
      }
    } catch {
      alert("Gagal memperbarui stok produk");
    }
  };

  // Action: Delete Product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini dari etalase toko?")) return;
    try {
      const res = await fetch(`/api/seller/products?productId=${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
        await fetchStore();
        router.refresh();
      }
    } catch {
      alert("Gagal menghapus produk");
    }
  };

  // Action: Add / Edit COD Location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingLoc(true);

    try {
      if (editingLocation) {
        // Edit existing location
        const res = await fetch("/api/seller/locations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLocation.id,
            sellerId: user.id,
            name: locName,
            address: locAddress,
            mapsUrl: locMapsUrl,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setIsLocationModalOpen(false);
          setEditingLocation(null);
          await fetchLocations();
          router.refresh();
        } else {
          alert(data.message || "Gagal memperbarui titik temu");
        }
      } else {
        // Add new location (strictly enforced max 5)
        const res = await fetch("/api/seller/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerId: user.id,
            name: locName,
            address: locAddress,
            mapsUrl: locMapsUrl,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setIsLocationModalOpen(false);
          await fetchLocations();
          router.refresh();
        } else {
          alert(data.message || "Gagal menambahkan titik temu");
        }
      }
    } catch {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingLoc(false);
    }
  };

  // Action: Delete COD Location
  const handleDeleteLocation = async (id: number | string) => {
    if (!user) return;
    if (!confirm("Hapus titik temu ini dari daftar opsi COD pembeli?")) return;
    try {
      const res = await fetch(`/api/seller/locations?id=${id}&sellerId=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchLocations();
          router.refresh();
      }
    } catch {
      alert("Gagal menghapus lokasi");
    }
  };

  // Action: Save Store Settings
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!editStoreHours.trim()) return;
    setIsStoreSettingsSaving(true);
    try {
      const res = await fetch("/api/seller/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          hours: editStoreHours,
          storeDescription: editStoreDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStore();
        router.refresh();
        alert("✓ Pengaturan toko berhasil disimpan.");
      } else {
        alert(data.message || "Gagal menyimpan pengaturan toko");
      }
    } catch {
      alert("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsStoreSettingsSaving(false);
    }
  };

  // Unauthenticated Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-[#03AC0E] border border-emerald-200 flex items-center justify-center mb-5 shadow-xs">
            <Store className="w-10 h-10 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Manajemen Toko TryPedia</h1>
          <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
            Silakan masuk ke akun penjual Anda untuk mengelola rincian pesanan, katalog produk sewa-ke-beli, dan titik temu COD di Jember.
          </p>

          <div className="w-full max-w-sm">
            <button
              onClick={() => openLoginModal()}
              className="w-full py-3 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Masuk ke Akun Toko
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isSneakerZone = user.email.toLowerCase().includes("sneakerzone");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header />

      {!isProductEditor && <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 md:py-8">
        {/* Breadcrumb Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
          <div className="flex items-center gap-1.5">
            <Link href={`${storeHref}?tab=beranda`} className="hover:text-[#03AC0E] transition-colors">
              Kembali ke Toko
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-900 font-semibold">Manajemen Toko</span>
          </div>
        </div>

        <h1 className="mb-5 text-xl font-bold text-gray-900">{activeTab === "orders" ? "Pesanan Toko" : "Pengaturan Toko"}</h1>

        {/* Settings navigation and selected editor */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {(activeTab === "settings" || activeTab === "locations") && (
            <aside className="w-full lg:w-60 lg:sticky lg:top-24 shrink-0 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xs">
              <nav aria-label="Pengaturan toko" className="grid grid-cols-2 gap-1 lg:grid-cols-1">
                {([
                  { id: "settings", label: "Profil Toko", detail: "Deskripsi dan jam buka", Icon: Settings },
                  { id: "locations", label: "Titik Temu COD", detail: "Lokasi serah terima", Icon: MapPin },
                ] as const).map(({ id, label, detail, Icon }) => (
                  <Link key={id} href={`/seller?tab=${id}`} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? "page" : undefined}
                    className={`flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors ${activeTab === id ? "bg-[#EBF8EE] text-[#03AC0E]" : "text-gray-600 hover:bg-gray-50"}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 hidden text-xs text-gray-500 sm:block">{detail}</span></span>
                  </Link>
                ))}
              </nav>
            </aside>
          )}
          {/* RIGHT MAIN CONTENT AREA */}
          <section className="flex-1 min-w-0 space-y-5 w-full">

            {/* TAB 1: RINCIAN PESANAN TOKO */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 md:p-6 space-y-6">
                {/* 4 Core Sub-tabs: Perlu Konfirmasi, Dijadwalkan/Dikirim, Disewa, Selesai */}
                <div className="flex justify-center items-center">
                  <div className="w-full max-w-2xl bg-gray-100 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setOrderSubTab("PERLU_KONFIRMASI")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderSubTab === "PERLU_KONFIRMASI"
                          ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Clock className={`w-3.5 h-3.5 ${orderSubTab === "PERLU_KONFIRMASI" ? "text-amber-600" : "text-gray-400"}`} />
                      <span>Perlu Konfirmasi</span>
                      {orderCounts.pending > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800">
                          {orderCounts.pending}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderSubTab("DIJADWALKAN_DIKIRIM")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderSubTab === "DIJADWALKAN_DIKIRIM"
                          ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Calendar className={`w-3.5 h-3.5 ${orderSubTab === "DIJADWALKAN_DIKIRIM" ? "text-blue-600" : "text-gray-400"}`} />
                      <span>Dijadwalkan / Dikirim</span>
                      {orderCounts.scheduled > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 text-blue-800">
                          {orderCounts.scheduled}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderSubTab("DISEWA")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderSubTab === "DISEWA"
                          ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Timer className={`w-3.5 h-3.5 ${orderSubTab === "DISEWA" ? "text-teal-600" : "text-gray-400"}`} />
                      <span>Disewa</span>
                      {orderCounts.rented > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-teal-100 text-teal-800">
                          {orderCounts.rented}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderSubTab("SELESAI")}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderSubTab === "SELESAI"
                          ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${orderSubTab === "SELESAI" ? "text-[#03AC0E]" : "text-gray-400"}`} />
                      <span>Selesai</span>
                      {orderCounts.completed > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-[#03AC0E]">
                          {orderCounts.completed}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Orders Content List */}
                {isOrdersLoading && orders.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                      <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-gray-800">Memuat Pesanan Toko</h3>
                      <p className="text-xs text-gray-500">Sedang menyinkronkan data transaksi toko Anda...</p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                      <Package className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">Tidak Ada Pesanan pada Tahap Ini</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {orderSubTab === "PERLU_KONFIRMASI"
                        ? isSneakerZone
                          ? "Semua pesanan masuk telah Anda konfirmasi."
                          : "Toko Khayru belum menerima pesanan masuk karena belum mengunggah produk."
                        : orderSubTab === "DIJADWALKAN_DIKIRIM"
                        ? "Tidak ada jadwal serah-terima COD atau pesanan berjalan saat ini."
                        : orderSubTab === "DISEWA"
                        ? "Tidak ada produk yang sedang dalam masa sewa oleh pembeli saat ini."
                        : "Belum ada riwayat transaksi yang selesai."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => {
                      const isPending = ord.status === "SEDANG_DIKEMAS";
                      const isScheduled = ord.status === "DIJADWALKAN_DIKIRIM";
                      const isRented = ord.status === "DISEWA";
                      const isDone = ord.status === "SELESAI" || ord.status === "SELESAI_DIBELI";

                      return (
                        <div
                          key={ord.orderId}
                          className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                        >
                          {/* Order Card Header */}
                          <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-emerald-100/70 text-[#03AC0E] flex items-center justify-center font-bold text-xs">
                                🛍️
                              </span>
                              <div>
                                <span className="text-xs font-bold text-gray-900">
                                  Pembeli: {ord.userName || "Khayru Nabiel Bahtiar"}
                                </span>
                                <span className="text-gray-400 text-xs block font-mono">
                                  No. Pesanan: {ord.orderId}
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPending && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Perlu Konfirmasi</span>
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-700 text-white flex items-center gap-1.5 shadow-xs">
                                    <Timer className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                                    <span>Batas: {getConfirmationCountdown(ord)}</span>
                                  </span>
                                </div>
                              )}
                              {isScheduled && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Dijadwalkan / Sedang Berjalan</span>
                                </span>
                              )}
                              {isRented && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5 shadow-2xs">
                                    <Timer className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Sedang Disewa</span>
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-teal-700 text-white flex items-center gap-1.5 shadow-xs">
                                    <Clock className="w-3.5 h-3.5 text-teal-200 animate-pulse" />
                                    <span>Sisa: {getRentalCountdown(ord)}</span>
                                  </span>
                                </div>
                              )}
                              {isDone && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#03AC0E] border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Pesanan Selesai (Dana Masuk)</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Card Body */}
                          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <div className="flex gap-3.5 min-w-0">
                              <img
                                src={ord.productImage || "/images/new-balance-2022r.jpg"}
                                alt={ord.productTitle}
                                className="w-20 h-20 object-cover rounded-xl border border-gray-200 shrink-0 bg-gray-50"
                              />
                              <div className="space-y-1.5 min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                                  {ord.productTitle}
                                </h4>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                  <span className="bg-emerald-50 text-[#03AC0E] px-2 py-0.2 rounded font-semibold border border-emerald-100">
                                    {ord.orderType === "rent" ? "Sewa" : "Beli Penuh"}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Metode Bayar: <strong>{ord.paymentMethod}</strong>
                                  </span>
                                </div>

                                {/* Meetup details */}
                                <div className="text-[11px] text-gray-700 flex items-start gap-1.5 pt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#03AC0E] shrink-0 mt-0.5" />
                                  <span>
                                    {ord.deliveryOption === "cod"
                                      ? `COD di ${ord.codLocation || "Universitas Jember"}`
                                      : `Antar ke Rumah: ${ord.codLocation}`}
                                  </span>
                                </div>

                                {ord.codDate && (
                                  <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span>
                                      Jadwal Serah-Terima: <strong>{ord.codDate}</strong> pukul <strong>{ord.codTime || "16:00"} WIB</strong>
                                    </span>
                                  </div>
                                )}

                                {ord.codNotes && (
                                  <div className="text-[11px] text-gray-500 italic">
                                    Catatan Pembeli: &ldquo;{ord.codNotes}&rdquo;
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Total Section */}
                            <div className="w-full sm:w-auto text-left sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                              <span className="text-[11px] text-gray-500 block">Total Pendapatan:</span>
                              <span className="text-base sm:text-lg font-black text-[#03AC0E] font-mono">
                                {formatRupiah(ord.sellerIncome || ord.totalPrice)}
                              </span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">
                                ({ord.orderType === "rent" ? `Sewa ${ord.rentDuration || 3} Hari` : "Harga Beli Produk"})
                              </span>
                            </div>
                          </div>

                          {/* Order Footer & Actions */}
                          <div className="p-3.5 sm:px-5 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              {/* Chat Pembeli Button */}
                              <Link
                                prefetch={true}
                                href={`/chat?buyer=${encodeURIComponent(ord.userName || "Pembeli")}&orderId=${encodeURIComponent(ord.orderId)}`}
                                className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#03AC0E]" />
                                <span>Chat Pembeli</span>
                              </Link>

                              <div className="text-[11px] text-gray-500 hidden md:block">
                                {isPending && (
                                  <span>
                                    Pembeli telah membayar via Rekber TryPedia. Periksa ketersediaan barang dan konfirmasi pesanan.
                                  </span>
                                )}
                                {isScheduled && (
                                  <span>
                                    Jadwal telah disepakati. Lakukan serah-terima barang dengan pembeli pada waktu yang ditentukan.
                                  </span>
                                )}
                                {isRented && (
                                  <span>
                                    Barang telah diserahterimakan dan sedang aktif disewa oleh pembeli ({ord.userName}). Pantau masa sewa melalui hitungan mundur di atas.
                                  </span>
                                )}
                                {isDone && (
                                  <span>
                                    Transaksi selesai. Dana penjualan telah otomatis dicairkan ke Dompet Toko Anda.
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Decision action buttons (Side-by-side, perfect symmetry) */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                              {/* Action: Tolak Pesanan */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(ord)}
                                  disabled={processingOrderId === ord.orderId}
                                  className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 hover:border-red-400 font-semibold text-xs rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5 text-red-600" />
                                  <span>Tolak Pesanan</span>
                                </button>
                              )}

                              {/* Action 1: Konfirmasi Pesanan */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmOrder(ord.orderId)}
                                  disabled={processingOrderId === ord.orderId}
                                  className="px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {processingOrderId === ord.orderId
                                      ? "Memproses..."
                                      : "Konfirmasi Pesanan"}
                                  </span>
                                </button>
                              )}

                              {/* Action 2: Tampilkan PIN Serah Terima */}
                              {isScheduled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPinOrder(ord);
                                    setIsSellerPinModalOpen(true);
                                    setIsCopiedPin(false);
                                  }}
                                  className="px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Tampilkan PIN Serah Terima</span>
                                </button>
                              )}

                              {/* Action 3: Selesaikan Peminjaman (Pengembalian Barang Selesai) */}
                              {isRented && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteOrder(ord.orderId)}
                                  disabled={processingOrderId === ord.orderId}
                                  className="px-4 py-2 bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>
                                    {processingOrderId === ord.orderId
                                      ? "Memproses..."
                                      : "Selesaikan Peminjaman"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: KATALOG PRODUK TOKO */}
            {activeTab === "products" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      Katalog Produk Toko ({products.length})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kelola etalase barang preloved Anda yang terhubung dengan opsi Sewa ke Beli dan COD di Jember.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenUploadProduct()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer w-fit"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Produk Baru</span>
                  </button>
                </div>

                {isProductsLoading && products.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                      <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-gray-800">Memuat Katalog Produk</h3>
                      <p className="text-xs text-gray-500">Sedang mengambil daftar etalase produk...</p>
                    </div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Belum Ada Produk di Toko Anda</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {isSneakerZone
                        ? "Anda belum menambahkan produk ke etalase toko."
                        : "Akun Khayru telah terdaftar sebagai toko namun belum mengunggah produk apa pun."}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUploadProduct()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Upload Produk Pertama</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((prd) => {
                      const isAvailable = prd.stock > 0;
                      const photoCount = Array.isArray(prd.images) && prd.images.length > 0 ? prd.images.length : 1;

                      return (
                        <div
                          key={prd.id}
                          className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="flex gap-4">
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                              <img
                                src={prd.image || "/images/new-balance-2022r.jpg"}
                                alt={prd.name}
                                className="w-full h-full object-cover"
                              />
                              {photoCount > 1 && (
                                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                  {photoCount} Foto
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[#03AC0E] uppercase tracking-wider">
                                  {prd.category}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                  {prd.condition || "Seperti Baru"}
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                                {prd.name}
                              </h4>

                              {/* Tiered rental rates (No size table) */}
                              <div className="pt-1 flex flex-wrap gap-1.5 text-[10.5px]">
                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-medium">
                                  1h: <strong className="text-gray-900">{formatRupiah(prd.rentPriceDaily)}</strong>
                                </span>
                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-medium">
                                  3h: <strong className="text-gray-900">{formatRupiah(prd.rentPrice3d || prd.rentPriceDaily * 2.8)}</strong>
                                </span>
                                <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-medium">
                                  7h: <strong className="text-gray-900">{formatRupiah(prd.rentPrice7d || prd.rentPriceDaily * 5.8)}</strong>
                                </span>
                              </div>

                              <div className="text-[11px] text-gray-600 font-medium pt-0.5">
                                Harga Beli: <strong className="text-gray-900">{formatRupiah(prd.buyPrice)}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Card Action Controls */}
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStock(prd.id, prd.stock)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isAvailable
                                  ? "bg-emerald-50 text-[#03AC0E] hover:bg-emerald-100 border border-emerald-200"
                                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-[#03AC0E]" : "bg-red-500"}`} />
                              <span>{isAvailable ? "Stok: 1 (Tersedia)" : "Stok: 0 (Habis)"}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {/* Edit Produk Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(prd)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#03AC0E] border border-gray-300 hover:border-[#03AC0E] hover:bg-emerald-50 flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Edit informasi produk"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Lihat di Katalog Pembeli */}
                              <Link
                                href={`/products/${prd.id}`}
                                target="_blank"
                                className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors"
                                title="Lihat di katalog pembeli"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>

                              {/* Hapus Produk */}
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prd.id)}
                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Hapus produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PENGATURAN TOKO */}
            {activeTab === "settings" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 md:p-6 space-y-5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Pengaturan Profil Toko
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Informasi ini ditampilkan kepada pembeli pada kartu produk dan detail toko di Jember.
                  </p>
                </div>

                <form onSubmit={handleSaveStoreSettings} className="space-y-4">
                  <StoreHoursInput value={editStoreHours} onChange={setEditStoreHours} />

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Deskripsi Lengkap Toko:
                    </label>
                    <textarea
                      rows={4}
                      value={editStoreDesc}
                      onChange={(e) => setEditStoreDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isStoreSettingsSaving || !editStoreHours.trim()}
                      className="px-6 py-2.5 bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {isStoreSettingsSaving ? "Menyimpan..." : "Simpan Perubahan Toko"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: TITIK TEMU COD (STRICTLY MAXIMUM 5) */}
            {activeTab === "locations" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">
                        Titik Temu COD Resmi Toko
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${locations.length >= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-[#03AC0E]"}`}>
                        {locations.length} / 5 Lokasi Digunakan
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Atur maksimal 5 lokasi strategis di area Jember. Lokasi ini langsung muncul sebagai opsi pilihan COD pembeli di halaman Checkout.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={locations.length >= 5}
                    onClick={() => {
                      setEditingLocation(null);
                      setLocName("");
                      setLocAddress("");
                      setLocMapsUrl("");
                      setIsLocationModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#03AC0E] hover:bg-[#02980C] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer w-fit"
                    title={locations.length >= 5 ? "Batas maksimal 5 titik temu telah tercapai" : ""}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Titik Temu</span>
                  </button>
                </div>

                {/* Quota limit warning */}
                {locations.length >= 5 && (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Kuota maksimal 5 titik temu telah penuh. Untuk menambahkan lokasi baru, silakan edit atau hapus salah satu titik temu yang ada.
                    </span>
                  </div>
                )}

                {isLocationsLoading && locations.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#03AC0E] flex items-center justify-center shadow-xs">
                      <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-gray-800">Memuat Titik Temu COD</h3>
                      <p className="text-xs text-gray-500">Sedang mengambil titik lokasi dari database...</p>
                    </div>
                  </div>
                ) : locations.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                      <MapPin className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">Belum Ada Titik Temu COD</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Tambahkan hingga 5 titik temu strategis di Jember (misal: UNEJ, Alun-Alun, Stasiun) agar pembeli dapat memilih lokasi serah-terima dengan mudah.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locations.map((loc, idx) => (
                      <div
                        key={loc.id}
                        className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-[#03AC0E]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#03AC0E] font-black text-xs flex items-center justify-center shrink-0 border border-emerald-100">
                            {idx + 1}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                              {loc.name}
                            </h4>
                            <p className="text-xs text-gray-600 leading-snug">
                              {loc.address}
                            </p>
                            {loc.detail && (
                              <p className="text-[11px] text-gray-400">
                                Patokan: <em>{loc.detail}</em>
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 font-mono">
                              Koordinat: {loc.lat}, {loc.lng}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <a
                            href={loc.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Peta</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocation(loc);
                              setLocName(loc.name);
                              setLocAddress(loc.address);
                              setLocMapsUrl(loc.mapsUrl || "");
                              setIsLocationModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit titik temu"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus titik temu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </section>
        </div>
      </main>}

      {/* MODAL: Upload & Edit Produk */}
      {(isUploadModalOpen || isEditModalOpen) && (
        <div
          className={isProductEditor ? "flex-1 w-full max-w-3xl mx-auto px-4 py-6" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"}
          onClick={isProductEditor ? undefined : closeProductEditor}
        >
          <div
            className={isProductEditor ? "bg-white rounded-2xl w-full border border-gray-200 shadow-xs flex flex-col" : "bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col"}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-[#03AC0E]">
                  {editingProduct ? <Edit3 className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                    {editingProduct ? "Edit Informasi Produk" : "Tambah Produk Baru"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {editingProduct
                      ? "Perbarui foto, harga sewa berjenjang, dan kondisi barang"
                      : "Lengkapi data produk, foto, tarif sewa berjenjang, dan kondisi barang"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeProductEditor();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={editingProduct ? handleSaveEditProduct : handleUploadProduct}
              className="p-4 sm:p-6 space-y-4 flex-1 text-xs"
            >
              {/* Nama Produk */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Nama / Judul Produk: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productFormName}
                  onChange={(e) => setProductFormName(e.target.value)}
                  placeholder="Contoh: Sepatu Adidas Samba OG - White Green"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              {/* Kategori & Kondisi Barang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-800 block mb-1">
                    Kategori Produk: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productFormCategory}
                    onChange={(e) => setProductFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] bg-white cursor-pointer"
                  >
                    <option value="Fashion & Aksesori">Fashion & Aksesori</option>
                    <option value="Gadget & Elektronik">Gadget & Elektronik</option>
                    <option value="Hobi & Koleksi">Hobi & Koleksi</option>
                    <option value="Perlengkapan Rumah Tangga & Furnitur">Perlengkapan Rumah Tangga & Furnitur</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">
                    Kondisi Fisik Barang: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productFormCondition}
                    onChange={(e) => setProductFormCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] bg-white cursor-pointer"
                  >
                    <option value="Seperti Baru">Seperti Baru</option>
                    <option value="Baik">Baik</option>
                    <option value="Cukup Baik">Cukup Baik</option>
                  </select>
                </div>
              </div>

              {/* Paket Tarif Sewa & Beli */}
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-[#03AC0E]" />
                    Paket Tarif Sewa & Opsi Beli Penuh
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Sewa 1 Hari (Rp):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={productFormRent1d}
                      onChange={(e) => handleRent1dChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#03AC0E]"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Sewa 3 Hari (Rp):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={productFormRent3d}
                      onChange={(e) => handleRent3dChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#03AC0E]"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Sewa 7 Hari (Rp):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={productFormRent7d}
                      onChange={(e) => handleRent7dChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#03AC0E]"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Harga Beli Penuh (Rp):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={productFormBuyPrice}
                      onChange={(e) => handleBuyPriceChange(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#03AC0E]"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Foto Produk (Maks 5 Foto) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-800">
                    Foto Produk: <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {productFormImages.length} dari maks 5 Foto
                  </span>
                </div>

                {/* Grid Thumbnails + Upload Box */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {productFormImages.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group"
                    >
                      <img
                        src={imgSrc}
                        alt={`Foto produk ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-[#03AC0E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Utama
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-md"
                        title="Hapus foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {productFormImages.length < 5 && (
                    <label
                      htmlFor="seller-product-image-input"
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#03AC0E] hover:bg-green-50/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-gray-500 hover:text-[#03AC0E]"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-semibold text-center px-1">
                        Tambah Foto
                      </span>
                      <input
                        id="seller-product-image-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Format gambar JPG, PNG, atau WEBP. Foto pertama otomatis dijadikan foto etalase utama.
                </p>
              </div>

              {/* Kelengkapan Paket */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Kelengkapan Paket: <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPackageItem}
                    onChange={(e) => setNewPackageItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPackageItem();
                      }
                    }}
                    placeholder="Contoh: Ces, Kabel data, Box..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                  />
                  <button
                    type="button"
                    onClick={handleAddPackageItem}
                    className="px-4 py-2.5 bg-[#03AC0E] hover:bg-[#02980C] text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Daftar item kelengkapan yang ditambahkan */}
                {productFormPackageIncludes.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {productFormPackageIncludes.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-800 text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5 text-[#03AC0E] shrink-0" />
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePackageItem(idx)}
                          className="w-4 h-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                          title="Hapus item kelengkapan ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic mt-1.5">
                    Belum ada kelengkapan paket yang ditambahkan. Ketik di atas lalu tekan Tambah.
                  </p>
                )}
              </div>

              {/* Deskripsi Produk */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Deskripsi Produk: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={productFormDesc}
                  onChange={(e) => setProductFormDesc(e.target.value)}
                  placeholder="Jelaskan kondisi barang, kelengkapan dalam boks, riwayat pemakaian, dan kelebihan produk..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    closeProductEditor();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-6 py-2.5 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct
                    ? "Menyimpan..."
                    : editingProduct
                    ? "Simpan Perubahan Produk"
                    : "Simpan & Upload Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Titik Temu COD */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#03AC0E]" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  {editingLocation ? "Edit Titik Temu COD" : "Tambah Titik Temu COD Baru (Maks 5)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-4 sm:p-6 space-y-4 flex-1">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">
                  Nama Titik Temu: *
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Contoh: Universitas Jember"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">
                  Alamat Lengkap: *
                </label>
                <input
                  type="text"
                  required
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Jl. Kalimantan No. 37, Sumbersari, Jember"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1">Link Google Maps: <span className="text-red-500">*</span></label>
                <input type="url" required value={locMapsUrl} onChange={event => setLocMapsUrl(event.target.value)} placeholder="https://maps.app.goo.gl/..." className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]" />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoc}
                  className="px-6 py-2.5 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLoc ? "Menyimpan..." : "Simpan Titik Temu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tampilkan PIN Serah Terima untuk Penjual */}
      {isSellerPinModalOpen && selectedPinOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsSellerPinModalOpen(false)}
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
                    PIN Serah-Terima COD
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    No. Pesanan: {selectedPinOrder.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSellerPinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 text-center">
              <p className="text-xs text-gray-600 leading-relaxed">
                Tunjukkan atau sebutkan <strong>6 digit PIN</strong> ini kepada pembeli (<strong>{selectedPinOrder.userName}</strong>) saat Anda telah bertemu langsung dan menyerahkan produk:
              </p>

              {/* 6-Digit PIN Display Card */}
              <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-[#03AC0E]/30 space-y-3">
                <div className="flex justify-center items-center gap-1.5 sm:gap-2">
                  {String(selectedPinOrder.handoverPin || "123456")
                    .split("")
                    .map((digit: string, idx: number) => (
                      <span
                        key={idx}
                        className="w-10 h-12 sm:w-11 sm:h-14 bg-white border border-[#03AC0E]/40 rounded-xl text-xl sm:text-2xl font-black text-[#03AC0E] font-mono flex items-center justify-center shadow-xs"
                      >
                        {digit}
                      </span>
                    ))}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(String(selectedPinOrder.handoverPin || ""));
                      setIsCopiedPin(true);
                      setTimeout(() => setIsCopiedPin(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 hover:border-[#03AC0E] rounded-lg text-xs font-semibold text-gray-700 hover:text-[#03AC0E] transition-all cursor-pointer shadow-2xs"
                  >
                    {isCopiedPin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#03AC0E]" />
                        <span className="text-[#03AC0E]">PIN Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Salin PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Information Footnote */}
              <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl text-[11.5px] text-gray-700 text-left space-y-1">
                <p className="leading-relaxed text-[11px]">
                  Tunjukkan PIN ini kepada pembeli saat serah terima barang COD. Setelah pembeli memasukkan PIN di akunnya, status pesanan otomatis berpindah ke <strong>Disewa</strong>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSellerPinModalOpen(false)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tolak Pesanan Pembeli */}
      {isRejectModalOpen && rejectingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            if (!isSubmittingReject) {
              setIsRejectModalOpen(false);
              setRejectingOrder(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                    Tolak Pesanan
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    No. Pesanan: {rejectingOrder.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingReject) {
                    setIsRejectModalOpen(false);
                    setRejectingOrder(null);
                  }
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-800 block mb-1.5">
                  Pilih Alasan Penolakan:
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-500 bg-white cursor-pointer"
                >
                  <option value="Barang belum siap disewa">
                    Barang belum siap disewa
                  </option>
                  <option value="Kendala operasional toko">
                    Kendala operasional toko
                  </option>
                  <option value="Jadwal tidak memungkinkan">
                    Jadwal tidak memungkinkan
                  </option>
                  <option value="Alasan lainnya">
                    Alasan lainnya
                  </option>
                </select>

                {rejectReason === "Alasan lainnya" && (
                  <div className="mt-3">
                    <label className="font-semibold text-gray-700 block mb-1">
                      Tuliskan Alasan:
                    </label>
                    <textarea
                      rows={3}
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      placeholder="Tuliskan alasan penolakan pesanan..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmittingReject}
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectingOrder(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReject || (rejectReason === "Alasan lainnya" && !customRejectReason.trim())}
                  onClick={handleConfirmRejectOrder}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isSubmittingReject ? "Memproses..." : "Tolak Pesanan"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
