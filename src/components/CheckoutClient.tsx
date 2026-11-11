"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PRODUCTS, Product } from "@/data/products";
import { useAuth } from "@/context/AuthContext";
import CheckoutSchedule from "@/components/CheckoutSchedule";
import { jakartaDate,scheduleError,deliveryPrice } from "@/lib/checkout-rules";
import Footer from "@/components/Footer";
import PinHandoverDemo from "@/components/PinHandoverDemo";
import { compressAndUploadImage } from "@/lib/client-image";
import {
  ArrowLeft,
  ShieldCheck,
  Store,
  MapPin,
  Truck,
  CheckCircle2,
  QrCode,
  CreditCard,
  Clock,
  Check,
  Package,
  Calendar,
  Navigation,
  Search,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  X,
  RotateCw,
  RotateCcw,
  Lock,
  ExternalLink,
  ChevronRight,
  Wallet,
  Building2,
  Smartphone,
  AlertCircle,
  Coins,
  Upload,
  ImageIcon,
} from "lucide-react";

// 5 Lokasi COD Resmi yang Disediakan oleh Seller (Sneaker Zone Jember)
const SELLER_COD_LOCATIONS = [
  {
    id: "unej",
    name: "Universitas Jember",
    address: "Jl. Kalimantan No. 37, Krajan Timur, Sumbersari, Jember",
    detail: "Area Gedung Soetardjo / Bundaran UNEJ",
    lat: -8.16441,
    lng: 113.7178,
  },
  {
    id: "stasiun",
    name: "Stasiun Jember",
    address: "Jl. Wijaya Kusuma No. 1, Jemberlor, Patrang, Jember",
    detail: "Pintu Masuk Utama / Drop-Off Stasiun",
    lat: -8.1654,
    lng: 113.7032,
  },
  {
    id: "alun_alun",
    name: "Alun-Alun Jember",
    address: "Jl. PB Sudirman, Kaliwates, Kp. Using, Jember",
    detail: "Depan Kantor Pemkab / Seberang Masjid Jami'",
    lat: -8.1724,
    lng: 113.7008,
  },
  {
    id: "semanggi",
    name: "Jembatan Semanggi Jember",
    address: "Jl. Bengawan Solo, Sumbersari, Jember",
    detail: "Area Jembatan Semanggi Jember",
    lat: -8.1695,
    lng: 113.7152,
  },
  {
    id: "geladak_kembar",
    name: "Geladak Kembar Jember",
    address: "Jl. Ahmad Yani, Kebondalem, Kepatihan, Kec. Kaliwates, Kabupaten Jember, Jawa Timur 68131",
    detail: "Area Jembatan Geladak Kembar",
    lat: -8.1722,
    lng: 113.7025,
  },
];

// Curated Jember Landmarks Database for Instant, Zero-Latency Search
const JEMBER_LOCATIONS_DATABASE: Record<string, { lat: number; lng: number; name: string }> = {
  "stasiun jember": {
    lat: -8.1652,
    lng: 113.7037,
    name: "Stasiun Jember, Jl. Wijaya Kusuma, Jemberlor, Patrang",
  },
  "stasiun": {
    lat: -8.1652,
    lng: 113.7037,
    name: "Stasiun Jember, Jl. Wijaya Kusuma, Jemberlor, Patrang",
  },
  "alun-alun jember": {
    lat: -8.1706,
    lng: 113.7001,
    name: "Alun-Alun Kota Jember, Jl. PB Sudirman, Kaliwates",
  },
  "alun alun jember": {
    lat: -8.1706,
    lng: 113.7001,
    name: "Alun-Alun Kota Jember, Jl. PB Sudirman, Kaliwates",
  },
  "alun-alun": {
    lat: -8.1706,
    lng: 113.7001,
    name: "Alun-Alun Kota Jember, Jl. PB Sudirman, Kaliwates",
  },
  "alun alun": {
    lat: -8.1706,
    lng: 113.7001,
    name: "Alun-Alun Kota Jember, Jl. PB Sudirman, Kaliwates",
  },
  "unej": {
    lat: -8.1662,
    lng: 113.7169,
    name: "Universitas Jember (UNEJ), Jl. Kalimantan No. 37, Sumbersari",
  },
  "universitas jember": {
    lat: -8.1662,
    lng: 113.7169,
    name: "Universitas Jember (UNEJ), Jl. Kalimantan No. 37, Sumbersari",
  },
  "pkm unej": {
    lat: -8.1648,
    lng: 113.7175,
    name: "Gedung PKM UNEJ, Jl. Kalimantan, Sumbersari",
  },
  "polije": {
    lat: -8.1565,
    lng: 113.7226,
    name: "Politeknik Negeri Jember (POLIJE), Jl. Mastrip, Sumbersari",
  },
  "politeknik negeri jember": {
    lat: -8.1565,
    lng: 113.7226,
    name: "Politeknik Negeri Jember (POLIJE), Jl. Mastrip, Sumbersari",
  },
  "roxy": {
    lat: -8.1812,
    lng: 113.6848,
    name: "Roxy Square Mall Jember, Jl. Hayam Wuruk, Gerbangpurnama",
  },
  "roxy square": {
    lat: -8.1812,
    lng: 113.6848,
    name: "Roxy Square Mall Jember, Jl. Hayam Wuruk, Gerbangpurnama",
  },
  "roxy mall": {
    lat: -8.1812,
    lng: 113.6848,
    name: "Roxy Square Mall Jember, Jl. Hayam Wuruk, Gerbangpurnama",
  },
  "lippo": {
    lat: -8.1818,
    lng: 113.6820,
    name: "Lippo Plaza Jember, Jl. Gajah Mada No. 106, Kaliwates",
  },
  "lippo plaza": {
    lat: -8.1818,
    lng: 113.6820,
    name: "Lippo Plaza Jember, Jl. Gajah Mada No. 106, Kaliwates",
  },
  "transmart": {
    lat: -8.1788,
    lng: 113.6892,
    name: "Transmart Carrefour Jember, Jl. Hayam Wuruk, Sempusari",
  },
  "transmart jember": {
    lat: -8.1788,
    lng: 113.6892,
    name: "Transmart Carrefour Jember, Jl. Hayam Wuruk, Sempusari",
  },
  "uin khas": {
    lat: -8.1969,
    lng: 113.6705,
    name: "UIN KHAS Jember, Jl. Mataram No. 1, Mangli",
  },
  "iain jember": {
    lat: -8.1969,
    lng: 113.6705,
    name: "UIN KHAS Jember, Jl. Mataram No. 1, Mangli",
  },
  "pasar tanjung": {
    lat: -8.1742,
    lng: 113.6974,
    name: "Pasar Tanjung Jember, Jl. Samanhudi, Kaliwates",
  },
  "rsud soebandi": {
    lat: -8.1485,
    lng: 113.7153,
    name: "RSUD Dr. Soebandi, Jl. Dr. Soebandi No. 1, Patrang",
  },
  "golden market": {
    lat: -8.1738,
    lng: 113.6953,
    name: "Golden Market Jember, Jl. Trunojoyo, Kaliwates",
  },
  "jl kalimantan": {
    lat: -8.1680,
    lng: 113.7150,
    name: "Jl. Kalimantan, Sumbersari, Jember",
  },
  "jalan kalimantan": {
    lat: -8.1680,
    lng: 113.7150,
    name: "Jl. Kalimantan, Sumbersari, Jember",
  },
  "jl riau": {
    lat: -8.1630,
    lng: 113.7140,
    name: "Jl. Riau, Sumbersari, Jember",
  },
  "jl jawa": {
    lat: -8.1645,
    lng: 113.7180,
    name: "Jl. Jawa, Sumbersari, Jember",
  },
  "jl mastrip": {
    lat: -8.1580,
    lng: 113.7210,
    name: "Jl. Mastrip, Sumbersari, Jember",
  },
  "jl gajah mada": {
    lat: -8.1800,
    lng: 113.6870,
    name: "Jl. Gajah Mada, Kaliwates, Jember",
  },
  "jl hayam wuruk": {
    lat: -8.1820,
    lng: 113.6810,
    name: "Jl. Hayam Wuruk, Sempusari, Jember",
  },
};

interface CheckoutClientProps {
  initialProduct: Product | null;
  initialStore: any | null;
  initialLocations: any[];
  initialUserId: string | null;
  initialUserName?: string | null;
  initialUserPhone?: string | null;
  initialAddresses: any[];
  initialWalletBalance: number | null;
  initialCoins: number | null;
}

function CheckoutContent({
  initialProduct,
  initialStore,
  initialLocations,
  initialUserId,
  initialUserName,
  initialUserPhone,
  initialAddresses,
  initialWalletBalance,
  initialCoins,
}: CheckoutClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoggedIn, openLoginModal } = useAuth();

  const productId = searchParams.get("id") || initialProduct?.id || "new-balance-2022r";
  const orderType = (searchParams.get("type") as "rent" | "buy") || "rent";
  const duration = parseInt(searchParams.get("duration") || "3", 10);
  const urlPrice = searchParams.get("price");

  const defaultProduct: Product =
    initialProduct || PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];
  const [product, setProduct] = useState<Product>(defaultProduct);

  useEffect(() => {
    if (initialProduct && initialProduct.id === productId) {
      setProduct(initialProduct);
      return;
    }
    fetch(`/api/products?id=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.products?.[0]) {
          setProduct(data.products[0]);
        }
      })
      .catch(() => {});
  }, [productId, initialProduct]);

  // Delivery / Handover Option: 'pickup' | 'cod' | 'delivery'
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "cod" | "delivery">("cod");

  const getTodayStr = () => jakartaDate();
  const normalizedInitialLocations =
    initialLocations && initialLocations.length > 0
      ? initialLocations.map((l: any) => ({
          id: l.locationId || String(l.id),
          name: l.name,
          address: l.address,
          detail: l.detail || "",
          mapsUrl: l.mapsUrl || "",
          lat: parseFloat(l.lat),
          lng: parseFloat(l.lng),
        }))
      : SELLER_COD_LOCATIONS;

  const firstLoc = normalizedInitialLocations[0] || SELLER_COD_LOCATIONS[0];

  // COD Locations & Scheduling states (Sinkron Dinamis dari Database Penjual)
  const [codLocations, setCodLocations] = useState<any[]>(normalizedInitialLocations);
  const [selectedCodId, setSelectedCodId] = useState<string>(firstLoc.id);
  const [codCoords, setCodCoords] = useState<{ lat: number; lng: number }>({
    lat: firstLoc.lat,
    lng: firstLoc.lng,
  });
  const [codLocationName, setCodLocationName] = useState(firstLoc.name);
  const [sellerStore, setSellerStore] = useState<any | null>(initialStore);

  useEffect(() => {
    const sellerId = product.sellerId || product.seller?.id;
    const sellerName = product.seller?.name;
    // Skip redundant client fetches if SSR already hydrated matching seller & locations
    if (
      initialProduct &&
      initialProduct.id === product.id &&
      (initialStore || initialLocations.length > 0)
    ) {
      return;
    }

    const fetchSellerLocations = async () => {
      try {
        const qs = sellerId
          ? `sellerId=${encodeURIComponent(sellerId)}`
          : `sellerName=${encodeURIComponent(sellerName || "")}`;
        const res = await fetch(`/api/seller/locations?${qs}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
          const formatted = data.locations.map((l: any) => ({
            id: l.locationId || String(l.id),
            name: l.name,
            address: l.address,
            detail: l.detail || "",
          mapsUrl: l.mapsUrl || "",
            lat: parseFloat(l.lat),
            lng: parseFloat(l.lng),
          }));
          setCodLocations(formatted);
        }
      } catch (err) {
        console.warn("Failed to fetch seller COD locations:", err);
      }
    };

    const fetchSellerStore = async () => {
      try {
        const qs = sellerId
          ? `userId=${encodeURIComponent(sellerId)}`
          : `storeName=${encodeURIComponent(sellerName || "")}`;
        const res = await fetch(`/api/seller/store?${qs}`);
        const data = await res.json();
        if (data.success && data.store) {
          setSellerStore(data.store);
        }
      } catch (err) {
        console.warn("Failed to fetch seller store dynamic info:", err);
      }
    };

    if (sellerId || sellerName) {
      fetchSellerLocations();
      fetchSellerStore();
    }
  }, [product.id, product.sellerId, product.seller?.id, product.seller?.name, initialProduct, initialStore, initialLocations.length]);

  const handleSelectCodPoint = (loc: any) => {
    setSelectedCodId(loc.id);
    setCodLocationName(loc.name);
    if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) setCodCoords({ lat: loc.lat, lng: loc.lng });
  };
  const [searchQuery, setSearchQuery] = useState(
    "Jl. Kalimantan No. 37, Sumbersari, Jember (Dekat Kampus UNEJ)"
  );
  const [suggestions, setSuggestions] = useState<Array<{ lat: number; lng: number; name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false); // Toggle perlebar peta
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // Fullscreen modal peta

  const [codDate, setCodDate] = useState<string>(getTodayStr());
  const [codTime, setCodTime] = useState<string>("");
  const [codNotes, setCodNotes] = useState<string>("");
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const initialPrimaryAddr =
    initialAddresses && initialAddresses.length > 0
      ? initialAddresses.find((a: any) => a.isPrimary) || initialAddresses[0]
      : null;

  // Home Delivery Address states
  const [userAddressesList, setUserAddressesList] = useState<any[]>(initialAddresses || []);
  const [selectedAddressItem, setSelectedAddressItem] = useState<any | null>(initialPrimaryAddr);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState<boolean>(false);
  const [isDeliveryPhotoModalOpen, setIsDeliveryPhotoModalOpen] = useState<boolean>(false);

  const [recipientName, setRecipientName] = useState(
    initialPrimaryAddr?.recipientName || initialUserName || user?.name || "Pelanggan TryPedia"
  );
  const [recipientPhone, setRecipientPhone] = useState(
    initialPrimaryAddr?.phone || initialUserPhone || user?.phone || "(+62) 813 3553 1338"
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialPrimaryAddr
      ? `${initialPrimaryAddr.streetAddress}, ${initialPrimaryAddr.provinceCityDistrict}`
      : "Perum PTP & Kaliurang Regency Kavling 43, Krajan Barat, Sumbersari, Kecamatan Sumbersari, Kabupaten Jember, Jawa Timur 68121"
  );
  const [addressNotes, setAddressNotes] = useState(initialPrimaryAddr?.addressNotes || "AR KOST PUTRA");
  const [deliveryFrontPhotoUrl, setDeliveryFrontPhotoUrl] = useState<string | null>(
    initialPrimaryAddr?.frontPhotoUrl || null
  );

  // Sync recipient and delivery address when client user differs from SSR user
  useEffect(() => {
    const targetUserId = user?.id || initialUserId;
    if (!targetUserId) return;
    if (user?.name) setRecipientName((prev: string) => prev || user.name);
    if (user?.phone) setRecipientPhone((prev: string) => prev || user.phone);

    if (
      initialUserId &&
      targetUserId === initialUserId &&
      initialWalletBalance !== null &&
      initialCoins !== null
    ) {
      return;
    }

    fetch(`/api/addresses?userId=${encodeURIComponent(targetUserId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.addresses && data.addresses.length > 0) {
          setUserAddressesList(data.addresses);
          const primary = data.addresses.find((a: any) => a.isPrimary) || data.addresses[0];
          if (primary) {
            setSelectedAddressItem(primary);
            setDeliveryAddress(`${primary.streetAddress}, ${primary.provinceCityDistrict}`);
            if (primary.addressNotes) setAddressNotes(primary.addressNotes);
            if (primary.recipientName) setRecipientName(primary.recipientName);
            if (primary.phone) setRecipientPhone(primary.phone);
            if (primary.frontPhotoUrl) setDeliveryFrontPhotoUrl(primary.frontPhotoUrl);
            if (primary.latitude && primary.longitude) {
              setCodCoords({ lat: Number(primary.latitude), lng: Number(primary.longitude) });
            }
          }
        }
      })
      .catch(() => {});

    fetch(`/api/wallet?userId=${encodeURIComponent(targetUserId)}&summary=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.balance === "number") {
          setWalletBalance(data.balance);
        }
      })
      .catch(() => {});

    fetch(`/api/coins?userId=${encodeURIComponent(targetUserId)}&summary=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.coins === "number") {
          setAvailableCoins(data.coins);
        }
      })
      .catch(() => {});
  }, [user, initialUserId, initialWalletBalance, initialCoins]);

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressItem(addr);
    setDeliveryAddress(`${addr.streetAddress}, ${addr.provinceCityDistrict}`);
    setAddressNotes(addr.addressNotes || "");
    setRecipientName(addr.recipientName || user?.name || "");
    setRecipientPhone(addr.phone || user?.phone || "");
    setDeliveryFrontPhotoUrl(addr.frontPhotoUrl || null);
    if (addr.latitude && addr.longitude) {
      setCodCoords({ lat: Number(addr.latitude), lng: Number(addr.longitude) });
    }
    setIsAddressPickerOpen(false);
  };

  // Coins / Points states
  const [availableCoins, setAvailableCoins] = useState<number>(initialCoins ?? 0);
  const [useCoins, setUseCoins] = useState<boolean>(false);

  // Payment Method: only 'trypedia_wallet' | 'qris'
  const [paymentMethod, setPaymentMethod] = useState<"trypedia_wallet" | "qris">("trypedia_wallet");
  const [walletBalance, setWalletBalance] = useState<number>(initialWalletBalance ?? 0);
  const [isPayingWithWallet, setIsPayingWithWallet] = useState<boolean>(false);

  // QRIS Modal, Unique Code & Proof Upload states
  const [isQrisModalOpen, setIsQrisModalOpen] = useState<boolean>(false);
  const [isQrisPending, setIsQrisPending] = useState<boolean>(false);
  const [qrisProofImage, setQrisProofImage] = useState<string | null>(null);
  const [qrisProofFileName, setQrisProofFileName] = useState<string>("");
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string>("");
  const [lastCreatedOrderStatus, setLastCreatedOrderStatus] = useState<"SEDANG_DIKEMAS" | "BELUM_BAYAR">("SEDANG_DIKEMAS");

  // Timer 10 Menit Pembayaran QRIS (600 detik)
  const [qrisTimeLeft, setQrisTimeLeft] = useState<number>(600);
  const [isTimerExpired, setIsTimerExpired] = useState<boolean>(false);

  // Status Terkunci jika QRIS sedang berlangsung (opsi serah terima, metode bayar dll tidak bisa diubah)
  const isLocked = isQrisPending && !isTimerExpired;

  // Format Timer mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Helper sinkronisasi stok produk
  const lockProductStock = async (durationSec: number = 600) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`trypedia_stock_${product.id}`, "0");
        window.dispatchEvent(new Event("trypedia_stock_change"));
      }
      await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          action: "lock",
          durationSeconds: durationSec,
          lockedBy: user?.id || "usr_001",
        }),
      }).catch(() => {});
    } catch {}
  };

  const releaseProductStock = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`trypedia_stock_${product.id}`, "1");
        window.dispatchEvent(new Event("trypedia_stock_change"));
      }
      await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          action: "release",
        }),
      }).catch(() => {});
    } catch {}
  };

  // Efek Countdown Timer QRIS (10 Menit) - tetap berjalan jika isQrisModalOpen atau isQrisPending
  useEffect(() => {
    if (!isQrisModalOpen && !isQrisPending) {
      setQrisTimeLeft(600);
      setIsTimerExpired(false);
      return;
    }

    if (isTimerExpired) return;

    const timer = setInterval(() => {
      setQrisTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerExpired(true);
          // Pembayaran gagal (waktu habis) -> kembalikan stok jadi 1
          releaseProductStock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQrisModalOpen, isQrisPending, isTimerExpired]);

  const getPaymentMethodName = () => {
    if (paymentMethod === "trypedia_wallet") return "Saldo TryPedia";
    return "QRIS";
  };

  // Success / PIN modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [isShopPhotoModalOpen, setIsShopPhotoModalOpen] = useState(false);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const modalMapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const modalLeafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const modalMarkerRef = useRef<any>(null);

  // Currency Formatter
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Date Formatter in Indonesian
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Pricing Calculations with Tiered Rent Options
  const tieredRentPrice =
    urlPrice
      ? parseFloat(urlPrice)
      : duration === 1
      ? product.rentPriceDaily
      : duration === 7
      ? (product.rentPrice7d || Math.round(product.rentPriceDaily * 5.8))
      : (product.rentPrice3d || Math.round(product.rentPriceDaily * 2.8));

  const productPrice =
    orderType === "rent"
      ? tieredRentPrice
      : product.buyPrice;

  const deliveryQuote = deliveryPrice(sellerStore?.latitude, sellerStore?.longitude, selectedAddressItem?.latitude, selectedAddressItem?.longitude);
  const shippingFee = deliveryOption === "delivery" ? (deliveryQuote?.shippingFee ?? 0) : 0;
  const checkoutDetails = {productId:product.id,deliveryOption,deliveryAddressId:selectedAddressItem?.id,codDate,codTime,shippingFee};
  const serviceFee = 2000;
  // Biaya Asuransi & Proteksi Barang: 0,5% dari harga barang, dihitung otomatis
  const insuranceFee = Math.round(product.buyPrice * 0.005);

  const subtotalBeforeCoins = productPrice + shippingFee + serviceFee + insuranceFee;
  const maxCoinsRedeemable = Math.min(availableCoins, subtotalBeforeCoins);
  const coinsDiscount = useCoins ? maxCoinsRedeemable : 0;
  const totalPayment = Math.max(0, subtotalBeforeCoins - coinsDiscount);

  // Handle Proof Upload
  const handleFileProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrisProofFileName(file.name);
    try {
      const uploadedUrl = await compressAndUploadImage(file, "proofs", 1200, 0.82);
      setQrisProofImage(uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setQrisProofImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitOrderToDb = async (
    orderStatus: "SEDANG_DIKEMAS" | "BELUM_BAYAR" = "SEDANG_DIKEMAS",
    proofUrl: string | null = null,
    directRedirect: boolean = true
  ) => {
    try {
      const validation = await fetch("/api/checkout/validate", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(checkoutDetails)});
      const checked = await validation.json();
      if(!validation.ok) throw new Error(checked.message || "Jadwal atau ongkir tidak valid.");
      // Deduct coins if used
      if (useCoins && coinsDiscount > 0) {
        await fetch("/api/coins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || "usr_001",
            amount: coinsDiscount,
            orderId: `TRY-${Date.now().toString().slice(-6)}`,
            orderDescription: `Tukar ${coinsDiscount.toLocaleString("id-ID")} Koin untuk pesanan`,
          }),
        }).catch(() => {});
        setAvailableCoins((prev) => Math.max(0, prev - coinsDiscount));
      }

      const generatedOrderId = `TRY-${Date.now().toString().slice(-6)}`;
      setLastCreatedOrderId(generatedOrderId);
      setLastCreatedOrderStatus(orderStatus);

      if (paymentMethod === "trypedia_wallet") {
        setIsPayingWithWallet(true);
        const payRes = await fetch("/api/wallet/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || "usr_001",
            amount: totalPayment,
            checkout: checkoutDetails,
            orderId: generatedOrderId,
            orderDescription: `Pembayaran ${orderType === "rent" ? "Sewa" : "Beli"} ${product.name}`,
          }),
        });
        const payData = await payRes.json();
        if (payRes.status === 401) { openLoginModal(); setIsPayingWithWallet(false); return; }
        if (!payRes.ok || !payData.success) {
          alert(payData.message || "Gagal memproses pembayaran dengan Saldo Trypedia");
          setIsPayingWithWallet(false);
          return;
        }
        setWalletBalance((prev) => Math.max(0, prev - totalPayment));
        setIsPayingWithWallet(false);
      }

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: generatedOrderId,
          userId: user?.id || "usr_001",
          userName: user?.name || recipientName,
          productId: product.id,
          productTitle: product.name,
          productImage: product.image,
          sellerName: sellerStore?.storeName || product.seller.name,
          orderType,
          deliveryOption,
          shippingFee,
          deliveryAddressId: selectedAddressItem?.id,
          codLocation:
            deliveryOption === "cod"
              ? codLocationName
              : deliveryOption === "pickup"
              ? (sellerStore?.address || product.seller.location)
              : deliveryAddress,
          codDate,
          codTime,
          codNotes,
          paymentMethod: getPaymentMethodName(),
          totalPrice: totalPayment,
          sellerIncome: productPrice,
          status: orderStatus,
          paymentProofUrl: proofUrl,
          paymentVerified: paymentMethod === "trypedia_wallet",
          rentDuration: orderType === "rent" ? duration : undefined,
        }),
      });

      const orderResult = await orderResponse.json();
      if (orderResponse.status === 401) { openLoginModal(); return; }
      if (!orderResponse.ok || !orderResult.success) throw new Error(orderResult.message || "Pesanan gagal disimpan.");
      window.dispatchEvent(new Event("trypedia_wallet_change"));
      if (directRedirect) {
        router.push(`/orders?tab=${orderStatus}`);
        return;
      }
    } catch (e) {
      console.warn("Could not save to db:", e);
      alert(e instanceof Error ? e.message : "Pesanan gagal disimpan.");
      return;
    }
    setIsOrderSuccess(true);
  };

  const handlePayNow = () => {
    if(user&&!user.isVerified){alert("Lengkapi verifikasi KTP/KTM di profil terlebih dahulu.");router.push("/settings");return;}
    const error = scheduleError(codDate,codTime);
    if(error){alert(error);return;}
    if(deliveryOption === "delivery" && !deliveryQuote){alert("Lengkapi pin lokasi alamat toko dan alamat pengantaran terlebih dahulu.");return;}
    if (paymentMethod === "trypedia_wallet" && walletBalance < totalPayment) {
      alert(
        `Saldo TryPedia Anda tidak mencukupi (Saldo: ${formatRupiah(
          walletBalance
        )}, Total Pembayaran: ${formatRupiah(
          totalPayment
        )}). Silakan isi saldo Anda terlebih dahulu di menu Dompet atau gunakan metode pembayaran QRIS.`
      );
      return;
    }

    if (!isLoggedIn) {
      openLoginModal(() => {
        if (paymentMethod === "qris") {
          lockProductStock(600);
          setIsQrisPending(true);
          setIsQrisModalOpen(true);
        } else {
          lockProductStock(86400);
          submitOrderToDb("SEDANG_DIKEMAS", null, true);
        }
      });
      return;
    }

    if (paymentMethod === "qris") {
      lockProductStock(600);
      setIsQrisPending(true);
      setIsQrisModalOpen(true);
    } else {
      lockProductStock(86400);
      submitOrderToDb("SEDANG_DIKEMAS", null, true);
    }
  };

  const handleCloseQrisModal = () => {
    setIsQrisModalOpen(false);
    setIsQrisPending(true);
  };

  const handleResetExpiredQris = () => {
    releaseProductStock();
    setIsQrisPending(false);
    setIsTimerExpired(false);
    setQrisTimeLeft(600);
    setIsQrisModalOpen(false);
  };

  const handleFinishQris = async () => {
    setIsQrisModalOpen(false);
    setIsQrisPending(false);
    lockProductStock(86400);
    const targetStatus = qrisProofImage ? "SEDANG_DIKEMAS" : "BELUM_BAYAR";
    await submitOrderToDb(targetStatus, qrisProofImage, true);
  };

  // Initialize and load Leaflet in the browser
  useEffect(() => {
    if (typeof window === "undefined" || !Number.isFinite(codCoords.lat) || !Number.isFinite(codCoords.lng)) return;

    // 1. Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. Initialize Leaflet Map
    const initLeaflet = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [codCoords.lat, codCoords.lng],
        zoom: 16,
        zoomControl: false, // We use custom styled + and - buttons
      });

      // Add OpenStreetMap standard tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Animated Marker Pin
      const pinIcon = L.divIcon({
        className: "custom-cod-pin-wrapper",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:grab;">
            <div style="background:#dc2626;color:white;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;margin-bottom:3px;border:1px solid white;">
              Titik Temu COD
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#ef4444" stroke="#991b1b" stroke-width="1.5">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
            <div style="width:10px;height:4px;background:rgba(0,0,0,0.35);border-radius:50%;margin-top:-2px;filter:blur(1px);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([codCoords.lat, codCoords.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      // Drag listener
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setCodCoords({ lat: pos.lat, lng: pos.lng });
        fetchAddressForCoords(pos.lat, pos.lng);
      });

      // Map click listener (moves pin immediately to clicked point)
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setCodCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        fetchAddressForCoords(e.latlng.lat, e.latlng.lng);
      });

      leafletMapRef.current = map;
      markerRef.current = marker;
    };

    // 3. Load Leaflet Script if not present
    if (!(window as any).L) {
      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          setTimeout(initLeaflet, 100);
        };
        document.body.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if ((window as any).L) {
            clearInterval(interval);
            initLeaflet();
          }
        }, 100);
      }
    } else {
      setTimeout(initLeaflet, 50);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [deliveryOption]);

  // Handle map resizing when user toggles expand
  useEffect(() => {
    if (leafletMapRef.current) {
      setTimeout(() => {
        leafletMapRef.current.invalidateSize();
      }, 250);
    }
  }, [isMapExpanded]);

  // Initialize Fullscreen Map Modal
  useEffect(() => {
    if (!isMapModalOpen || typeof window === "undefined" || !Number.isFinite(codCoords.lat) || !Number.isFinite(codCoords.lng)) return;

    const L = (window as any).L;
    if (!L || !modalMapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (modalLeafletMapRef.current) {
        modalLeafletMapRef.current.remove();
        modalLeafletMapRef.current = null;
      }

      const modalMap = L.map(modalMapContainerRef.current, {
        center: [codCoords.lat, codCoords.lng],
        zoom: 16,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(modalMap);

      const pinIcon = L.divIcon({
        className: "custom-modal-pin-wrapper",
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%, -100%);cursor:grab;">
            <div style="background:#dc2626;color:white;font-size:11px;font-weight:bold;padding:3px 10px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;margin-bottom:3px;border:1.5px solid white;">
              Titik Temu COD
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="#ef4444" stroke="#991b1b" stroke-width="1.5">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
              <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
            <div style="width:12px;height:5px;background:rgba(0,0,0,0.35);border-radius:50%;margin-top:-2px;filter:blur(1px);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const modalMarker = L.marker([codCoords.lat, codCoords.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(modalMap);

      modalMarker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setCodCoords({ lat: pos.lat, lng: pos.lng });
        fetchAddressForCoords(pos.lat, pos.lng);
      });

      modalMap.on("click", (e: any) => {
        modalMarker.setLatLng(e.latlng);
        setCodCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        fetchAddressForCoords(e.latlng.lat, e.latlng.lng);
      });

      modalLeafletMapRef.current = modalMap;
      modalMarkerRef.current = modalMarker;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (modalLeafletMapRef.current) {
        modalLeafletMapRef.current.remove();
        modalLeafletMapRef.current = null;
      }
    };
  }, [isMapModalOpen]);

  // Reverse Geocoding via OSM Nominatim
  const fetchAddressForCoords = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "id,en" } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.residential || addr.street;
        const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.city_district;
        const city = addr.city || addr.town || addr.county || "Jember";

        let formatted = "";
        if (road && suburb) {
          formatted = `${road}, ${suburb}, ${city}`;
        } else if (road) {
          formatted = `${road}, ${city}`;
        } else if (suburb) {
          formatted = `${suburb}, ${city}`;
        } else if (data.display_name) {
          formatted = data.display_name.split(",").slice(0, 3).join(", ");
        } else {
          formatted = `Titik Temu COD (${lat.toFixed(4)}, ${lng.toFixed(4)}), ${city}`;
        }
        setCodLocationName(formatted);
        setSearchQuery(formatted);
      }
    } catch {
      const fallback = `Titik Temu COD (${lat.toFixed(4)}, ${lng.toFixed(4)}), Jember`;
      setCodLocationName(fallback);
      setSearchQuery(fallback);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Move both Leaflet maps to specified coordinates
  const moveMapToCoordinates = (lat: number, lng: number) => {
    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
      markerRef.current.setLatLng([lat, lng]);
    }
    if (modalLeafletMapRef.current && modalMarkerRef.current) {
      modalLeafletMapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
      modalMarkerRef.current.setLatLng([lat, lng]);
    }
  };

  // Search Location by Text (e.g., "Stasiun Jember", "Alun-Alun", "Roxy", etc.)
  const handleSearchLocation = async (queryText?: string) => {
    const query = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!query) return;

    setIsSearching(true);
    setShowSuggestions(false);

    const normalized = query.toLowerCase().trim();

    // 1. Check local Jember database first (instant match!)
    for (const [key, loc] of Object.entries(JEMBER_LOCATIONS_DATABASE)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        setCodCoords({ lat: loc.lat, lng: loc.lng });
        setCodLocationName(loc.name);
        setSearchQuery(loc.name);
        moveMapToCoordinates(loc.lat, loc.lng);
        setIsSearching(false);
        return;
      }
    }

    // 2. Query OSM Nominatim Geocoding API with Jember context
    try {
      const qWithJember = query.toLowerCase().includes("jember") ? query : `${query}, Jember, Jawa Timur`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qWithJember)}&addressdetails=1&limit=5`,
        { headers: { "Accept-Language": "id,en" } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const newLat = parseFloat(first.lat);
          const newLng = parseFloat(first.lon);
          const cleanName = first.display_name.split(",").slice(0, 3).join(", ");

          setCodCoords({ lat: newLat, lng: newLng });
          setCodLocationName(cleanName);
          setSearchQuery(cleanName);
          moveMapToCoordinates(newLat, newLng);
        } else {
          // If not found in Jember, search broader
          const broaderRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`,
            { headers: { "Accept-Language": "id,en" } }
          );
          if (broaderRes.ok) {
            const broaderData = await broaderRes.json();
            if (broaderData && broaderData.length > 0) {
              const bFirst = broaderData[0];
              const bLat = parseFloat(bFirst.lat);
              const bLng = parseFloat(bFirst.lon);
              const bName = bFirst.display_name.split(",").slice(0, 3).join(", ");
              setCodCoords({ lat: bLat, lng: bLng });
              setCodLocationName(bName);
              setSearchQuery(bName);
              moveMapToCoordinates(bLat, bLng);
            }
          }
        }
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Live Auto-Suggestion as user types
  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    setCodLocationName(val);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalized = val.toLowerCase().trim();
    const matches: Array<{ lat: number; lng: number; name: string }> = [];

    // Filter local Jember database
    for (const [key, loc] of Object.entries(JEMBER_LOCATIONS_DATABASE)) {
      if (key.includes(normalized) || normalized.includes(key) || loc.name.toLowerCase().includes(normalized)) {
        if (!matches.some((m) => m.name === loc.name)) {
          matches.push(loc);
        }
      }
    }

    setSuggestions(matches.slice(0, 5));
    setShowSuggestions(matches.length > 0);
  };

  // Select suggestion item
  const handleSelectSuggestion = (loc: { lat: number; lng: number; name: string }) => {
    setCodCoords({ lat: loc.lat, lng: loc.lng });
    setCodLocationName(loc.name);
    setSearchQuery(loc.name);
    setShowSuggestions(false);
    moveMapToCoordinates(loc.lat, loc.lng);
  };

  // Detect Current User GPS Location
  const detectCurrentGps = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setIsLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCodCoords({ lat, lng });
          moveMapToCoordinates(lat, lng);
          fetchAddressForCoords(lat, lng);
          setIsLocatingUser(false);
        },
        () => {
          setIsLocatingUser(false);
        }
      );
    }
  };

  // Zoom In / Out Handlers
  const handleZoomIn = (isModal = false) => {
    const targetMap = isModal ? modalLeafletMapRef.current : leafletMapRef.current;
    if (targetMap) {
      targetMap.zoomIn();
    }
  };

  const handleZoomOut = (isModal = false) => {
    const targetMap = isModal ? modalLeafletMapRef.current : leafletMapRef.current;
    if (targetMap) {
      targetMap.zoomOut();
    }
  };

  // Handover method label
  const getHandoverSummary = () => {
    if (deliveryOption === "pickup") {
      return `Ambil di Toko ${sellerStore?.storeName || product.seller.name} (${sellerStore?.address || product.seller.location}) | ${formatDateIndo(codDate)}, ${codTime} WIB`;
    }
    if (deliveryOption === "cod") {
      return `COD di ${codLocationName} • ${formatDateIndo(codDate)}, ${codTime} WIB`;
    }
    return `${deliveryAddress} (Penerima: ${recipientName} - ${recipientPhone}) | ${formatDateIndo(codDate)}, ${codTime} WIB`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      {/* Top Navbar Checkout (Tokopedia Style) */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/products/${product.id}`}
              className="text-gray-500 hover:text-gray-800 transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-100"
              title="Kembali ke Detail Produk"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/trypedia-logo.png"
                alt="TryPedia Logo"
                className="h-7 sm:h-8 object-contain"
              />
              <span className="text-gray-300">|</span>
              <span className="text-base font-bold text-gray-800">Checkout</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#03AC0E] bg-[#EBF8EE] px-3 py-1.5 rounded-full border border-[#03AC0E]/20">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Transaksi Aman Rekber TryPedia</span>
            <span className="sm:hidden">100% Aman</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Rincian Barang (Top), Opsi Pengiriman, Metode Pembayaran */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. RINCIAN BARANG (DITARUH DI PALING ATAS, TANPA NOMOR) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      Rincian Barang
                    </h2>
                    <span className="text-[11px] text-gray-500">
                      Penjual: <strong>{product.seller.name}</strong> • {product.seller.district}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-[#03AC0E] bg-[#EBF8EE] px-2.5 py-1 rounded-full border border-[#03AC0E]/20">
                  {orderType === "rent" ? `Sewa ${duration} Hari` : "Beli Penuh"}
                </span>
              </div>

              {/* Item Card */}
              <div className="flex gap-3 sm:gap-4 items-start pt-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        orderType === "rent"
                          ? "bg-[#EBF8EE] text-[#03AC0E] border border-[#03AC0E]/30"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {orderType === "rent" ? `Sewa (${duration} Hari)` : "Beli Sekarang"}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {product.condition}
                    </span>
                    {isLocked ? (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-600" />
                        <span>Stok: 0 (Sedang Anda Bayar)</span>
                      </span>
                    ) : isTimerExpired ? (
                      <span className="text-[10px] font-bold bg-emerald-50 text-[#03AC0E] border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Stok: 1 Unit (Tersedia Kembali)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-50 text-[#03AC0E] border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Stok: 1 Unit</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                    {product.name}
                  </h3>

                  <p className="text-[11px] text-gray-500">
                    Kondisi: <strong className="text-gray-800">{product.condition || "Seperti Baru"}</strong>
                  </p>

                  <div className="pt-1 flex items-baseline justify-between">
                    <div className="text-xs text-gray-600">
                      {orderType === "rent" ? (
                        <span>
                          Paket Sewa ({duration} hari)
                        </span>
                      ) : (
                        <span>Harga Beli Penuh</span>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatRupiah(productPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. OPSI PENGIRIMAN & SERAH TERIMA BARANG (TANPA NOMOR) */}
            <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs space-y-4 transition-all ${isLocked ? "pointer-events-none opacity-60 bg-gray-50/70" : ""}`}>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      Opsi Serah Terima
                    </h2>
                    {isLocked && (
                      <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Radio Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opsi 1: Ambil di Seller */}
                <button
                  type="button"
                  onClick={() => setDeliveryOption("pickup")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    deliveryOption === "pickup"
                      ? "border-[#03AC0E] bg-[#EBF8EE]/60 ring-1 ring-[#03AC0E]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center">
                        <Store className="w-4 h-4" />
                      </div>
                      {deliveryOption === "pickup" && (
                        <CheckCircle2 className="w-4 h-4 text-[#03AC0E]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      Ambil di Seller
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Ambil langsung ke toko {product.seller.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#03AC0E] mt-2 block">
                    Gratis
                  </span>
                </button>

                {/* Opsi 2: COD di Titik Temu */}
                <button
                  type="button"
                  onClick={() => setDeliveryOption("cod")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    deliveryOption === "cod"
                      ? "border-[#03AC0E] bg-[#EBF8EE]/60 ring-1 ring-[#03AC0E]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      {deliveryOption === "cod" && (
                        <CheckCircle2 className="w-4 h-4 text-[#03AC0E]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      Bertemu di tempat umum
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Pilih titik temu yang disediakan seller
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#03AC0E] mt-2 block">
                    Gratis
                  </span>
                </button>

                {/* Opsi 3: Antar ke Rumah */}
                <button
                  type="button"
                  onClick={() => setDeliveryOption("delivery")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    deliveryOption === "delivery"
                      ? "border-[#03AC0E] bg-[#EBF8EE]/60 ring-1 ring-[#03AC0E]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Truck className="w-4 h-4" />
                      </div>
                      {deliveryOption === "delivery" && (
                        <CheckCircle2 className="w-4 h-4 text-[#03AC0E]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      Antar ke Rumah
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Seller akan mengantarkan ke alamat Anda
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 mt-2 block">
                    {deliveryQuote ? formatRupiah(deliveryQuote.shippingFee) : "Pilih alamat tujuan"}
                  </span>
                </button>
              </div>

              {/* Dynamic Detail input according to deliveryOption */}
              {deliveryOption === "pickup" && (
                <div className="space-y-3">
                  {/* Foto Toko Penjemputan (Tampak Depan Toko) */}
                  <div
                    onClick={() => setIsShopPhotoModalOpen(true)}
                    className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border border-gray-200 shadow-2xs group bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={sellerStore?.frontPhotoUrl || "/images/toko-nabil123.webp"}
                      alt={`Foto Toko ${sellerStore?.storeName || product.seller.name}`}
                      className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/20 shadow-md pointer-events-none">
                      <Store className="w-3.5 h-3.5 text-[#03AC0E]" />
                      <span>Foto Tampak Depan Toko ({sellerStore?.storeName || product.seller.name})</span>
                    </div>

                    {/* Tombol Perbesar Gambar di Kanan Atas Foto (Ikon Saja) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShopPhotoModalOpen(true);
                      }}
                      className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white p-2 rounded-xl flex items-center justify-center backdrop-blur-xs border border-white/30 shadow-md transition-all active:scale-95 cursor-pointer"
                      title="Perbesar Foto"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info Lokasi Penjemputan Toko Card */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/90 space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                          <Store className="w-4 h-4 text-[#03AC0E]" />
                          <span className="text-sm">Lokasi Penjemputan Toko:</span>
                        </div>
                        <p className="text-gray-800 font-semibold text-xs sm:text-sm">
                          {sellerStore?.storeName || product.seller.name} — {sellerStore?.address || product.seller.location}
                        </p>
                        <p className="text-gray-500 text-[11.5px]">
                          Jam Operasional: <strong>{sellerStore?.hours || product.seller.hours}</strong>. Anda dapat mengambil barang langsung setelah pesanan terkonfirmasi.
                        </p>
                      </div>

                      {/* Tombol Petunjuk Arah ke Google Maps dengan Titik Tujuan Otomatis Terisi */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sellerStore?.address || product.seller.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-[#EBF8EE] text-[#03AC0E] border border-[#03AC0E] hover:border-[#02980C] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
                        title="Petunjuk Arah Google Maps"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-[#03AC0E]" />
                        <span>Petunjuk Arah</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#03AC0E]" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* COD DENGAN 5 LOKASI PILIHAN SELLER (SNEAKER ZONE JEMBER) */}
              {deliveryOption === "cod" && (
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200/90 space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#03AC0E]" />
                      <span>Pilih Titik Temu COD dari Seller:</span>
                    </label>
                    <p className="text-[11.5px] text-gray-500 mt-0.5">
                      Seller ({product.seller.name}) menyediakan {codLocations.length} lokasi resmi untuk serah-terima dan inspeksi barang langsung:
                    </p>
                  </div>

                  {/* Lokasi Pilihan Seller */}
                  <div className="space-y-2.5">
                    {codLocations.map((loc) => {
                      const isSelected = selectedCodId === loc.id;
                      return (
                        <div
                          key={loc.id}
                          onClick={() => handleSelectCodPoint(loc)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? "border-[#03AC0E] bg-[#EBF8EE]/50 shadow-xs ring-1 ring-[#03AC0E]"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 shrink-0">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? "border-[#03AC0E] bg-[#03AC0E] text-white"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-bold block ${
                                  isSelected ? "text-gray-900" : "text-gray-800"
                                }`}
                              >
                                {loc.name}
                              </span>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                {loc.address}
                              </p>
                            </div>
                          </div>

                          <a
                            href={loc.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${loc.name}, ${loc.address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white hover:bg-gray-100 text-gray-700 hover:text-[#03AC0E] border border-gray-300 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer"
                            title="Buka rute ke lokasi ini di Google Maps"
                          >
                            <Navigation className="w-3 h-3 text-[#03AC0E]" />
                            <span>Petunjuk Arah</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </a>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* Antar ke Rumah (Alamat Pengiriman Otomatis & Bisa Pilih Alamat Lain) */}
              {deliveryOption === "delivery" && (
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200/90 space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#03AC0E]" />
                      <span className="font-bold text-gray-900 text-sm block">
                        Alamat Pengantaran:
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddressPickerOpen(true)}
                      className="self-start sm:self-auto bg-white hover:bg-[#EBF8EE] text-[#03AC0E] border border-[#03AC0E]/50 hover:border-[#03AC0E] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <span>Pilih Alamat Lain</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Selected Address Display Card */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3">
                    {/* Recipient info & badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        {recipientName || selectedAddressItem?.recipientName || "Penerima"}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 font-medium">
                        {recipientPhone || selectedAddressItem?.phone}
                      </span>
                      {selectedAddressItem?.isPrimary && (
                        <span className="bg-emerald-50 text-[#03AC0E] border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10.5px]">
                          Utama
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded text-[10.5px]">
                        {selectedAddressItem?.label || "Rumah"}
                      </span>
                    </div>

                    {/* Full Street Address & City */}
                    <p className="text-gray-800 text-xs sm:text-[13px] leading-relaxed">
                      {deliveryAddress}
                    </p>

                    {/* Catatan untuk Kurir (if present) */}
                    {addressNotes && (
                      <div className="flex items-start gap-1.5 bg-amber-50/70 border border-amber-200/70 text-amber-900 px-3 py-2 rounded-lg text-[11px]">
                        <span className="font-bold shrink-0">Catatan Kurir:</span>
                        <span className="text-amber-800">{addressNotes}</span>
                      </div>
                    )}

                    {/* Foto Tampak Depan Alamat untuk Kurir */}
                    {deliveryFrontPhotoUrl && (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                        <img
                          src={deliveryFrontPhotoUrl}
                          alt="Foto Tampak Depan"
                          className="w-14 h-14 rounded-lg object-cover border border-emerald-300 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setIsDeliveryPhotoModalOpen(true)}
                          title="Klik untuk memperbesar foto"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E]" />
                            <span>Foto Tampak Depan Alamat Terlampir</span>
                          </span>
                          <p className="text-[10.5px] text-emerald-800/80 mt-0.5 leading-snug">
                            Foto tampak depan rumah sudah disematkan untuk memudahkan kurir mengenali titik pengantaran pesanan Anda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDeliveryPhotoModalOpen(true)}
                          className="text-[11px] font-bold text-[#03AC0E] hover:underline shrink-0 p-1 cursor-pointer"
                        >
                          Lihat Full
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {deliveryOption === "delivery" && <p className="text-xs text-gray-500">{deliveryQuote ? `Jarak toko ke alamat tujuan ${deliveryQuote.distanceKm.toLocaleString("id-ID",{maximumFractionDigits:2})} km. ` : ""}Rp2.000/km, minimum 3 km (Rp6.000).</p>}
              <CheckoutSchedule day={codDate} time={codTime} notes={codNotes} onDay={setCodDate} onTime={setCodTime} onNotes={setCodNotes} />
            </div>

            {/* 3. METODE PEMBAYARAN */}
            <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs space-y-4 transition-all ${isLocked ? "pointer-events-none opacity-60 bg-gray-50/70" : ""}`}>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">
                      Pilih Metode Pembayaran
                    </h2>
                    {isLocked && (
                      <span className="text-[10px] bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-50 text-[#03AC0E] border border-emerald-200/60 font-bold px-2 py-0.5 rounded-md">
                  Semua Rekber Aman
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Saldo TryPedia */}
                <div
                  onClick={() => setPaymentMethod("trypedia_wallet")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === "trypedia_wallet"
                      ? "border-[#03AC0E] bg-[#EBF8EE]/60 ring-1 ring-[#03AC0E] shadow-2xs"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#03AC0E] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            Saldo TryPedia
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs text-gray-600">Saldo Anda:</span>
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            {formatRupiah(walletBalance)}
                          </span>
                        </div>

                        {walletBalance >= totalPayment ? (
                          <p className="text-[11px] text-[#03AC0E] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saldo mencukupi.</span>
                          </p>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-amber-700 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Kurang {formatRupiah(totalPayment - walletBalance)}</span>
                            </span>
                            <Link
                              href="/wallet"
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#03AC0E] font-semibold underline hover:text-[#02980C]"
                            >
                              Top Up Saldo
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "trypedia_wallet"}
                      onChange={() => setPaymentMethod("trypedia_wallet")}
                      className="accent-[#03AC0E] w-4 h-4 cursor-pointer mt-1"
                    />
                  </div>
                </div>

                {/* 2. QRIS (Scan & Upload Bukti Transfer) */}
                <div
                  onClick={() => setPaymentMethod("qris")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "qris"
                      ? "border-[#03AC0E] bg-[#EBF8EE]/50 ring-1 ring-[#03AC0E] shadow-2xs"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#03AC0E] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-5 h-5 text-white" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900">
                            QRIS (Scan Bank / E-Wallet)
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, DANA, LinkAja & mobile banking lainnya.
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "qris"}
                      onChange={() => setPaymentMethod("qris")}
                      className="accent-[#03AC0E] w-4 h-4 cursor-pointer mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Ringkasan Belanja (Sticky Summary - 5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm sticky top-20 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Ringkasan Belanja
              </h2>

              {/* Opsi Tukarkan Koin TryPedia */}
              <div className="p-3 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 to-yellow-50/60 flex items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate">
                      Tukarkan Koin TryPedia
                    </span>
                    <span className="text-[11px] text-gray-600 block truncate">
                      {availableCoins > 0 ? (
                        <>
                          Pakai hingga <strong>{maxCoinsRedeemable.toLocaleString("id-ID")} Koin</strong> (Ada {availableCoins.toLocaleString("id-ID")})
                        </>
                      ) : (
                        "Saldo Koin Anda: 0"
                      )}
                    </span>
                  </div>
                </div>

                <label className={`relative inline-flex items-center shrink-0 ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={useCoins}
                    disabled={isLocked || availableCoins <= 0}
                    onChange={(e) => setUseCoins(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#03AC0E] disabled:opacity-50"></div>
                </label>
              </div>

              {/* Rincian Harga Lengkap */}
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span>
                    Total Harga {orderType === "rent" ? `Sewa (${duration} Hari)` : "Produk"}:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(productPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Biaya Pengiriman:</span>
                  <span className="font-semibold text-gray-900">
                    {deliveryOption === "delivery" && !deliveryQuote ? "Lengkapi alamat tujuan" : shippingFee === 0 ? (
                      <span className="text-[#03AC0E]">Gratis</span>
                    ) : (
                      formatRupiah(shippingFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <span>Biaya Layanan</span>
                    <span className="text-[10px] text-gray-400" title="Biaya pemeliharaan sistem TryPedia">ⓘ</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(serviceFee)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <span>Biaya Asuransi & Proteksi Barang (0,5%)</span>
                    <span className="text-[10px] text-gray-400" title={`0,5% dari nilai harga barang (${formatRupiah(product.buyPrice)})`}>ⓘ</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(insuranceFee)}
                  </span>
                </div>

                {useCoins && coinsDiscount > 0 && (
                  <div className="flex justify-between items-center text-[#03AC0E] font-bold">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>Diskon Koin TryPedia:</span>
                    </span>
                    <span>- {formatRupiah(coinsDiscount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Total Pembayaran:</span>
                    <span className="text-[10.5px] text-gray-500">Termasuk pajak & proteksi</span>
                  </div>
                  <span className="text-xl font-extrabold text-[#03AC0E]">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>
              </div>

              {/* Catatan Sewa ke Beli */}
              {orderType === "rent" && (
                <div className="bg-[#EBF8EE] border border-[#03AC0E]/30 rounded-xl p-3 text-[11px] text-emerald-950">
                  <p className="leading-relaxed">
                    💡 <strong>Keuntungan Sewa ke Beli:</strong> Uang sewa sebesar <strong>{formatRupiah(productPrice)}</strong> ini akan langsung memotong sisa harga beli jika Anda memutuskan membeli permanen.
                  </p>
                </div>
              )}

              {/* Tombol Utama Bayar Sekarang / Selesaikan Pembayaran */}
              {isLocked ? (
                <button
                  type="button"
                  onClick={() => setIsQrisModalOpen(true)}
                  className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Clock className="w-4 h-4 text-white" />
                  <span>Selesaikan Pembayaran dalam {formatTimer(qrisTimeLeft)}</span>
                </button>
              ) : isQrisPending && isTimerExpired ? (
                <button
                  type="button"
                  onClick={handleResetExpiredQris}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span>Waktu Pembayaran Habis (Ulangi)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={isPayingWithWallet}
                  className="w-full bg-[#03AC0E] hover:bg-[#02980C] disabled:bg-gray-400 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isPayingWithWallet ? "Memproses Pembayaran..." : "Bayar Sekarang"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Modal QRIS & Upload Bukti Pembayaran */}
      {isQrisModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleCloseQrisModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#03AC0E] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Pembayaran QRIS TryPedia
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Scan kode QRIS & lampirkan screenshot bukti transfer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseQrisModal}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Tutup (Pesanan Terkunci)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - 2 Kolom Sejajar: Kiri (QRIS) & Kanan (Timer & Upload) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* KOLOM KIRI: Total Nominal & QRIS Code */}
                <div className="space-y-3 flex flex-col items-center">
                  {/* Banner Total Pembayaran */}
                  <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-gray-600 font-medium block">
                      Total Nominal yang Harus Ditransfer:
                    </span>
                    <span className="text-2xl font-black text-[#03AC0E] font-mono mt-0.5 tracking-tight block">
                      {formatRupiah(totalPayment)}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      *Pastikan nominal transfer sesuai dengan total pembayaran di atas.
                    </span>
                  </div>

                  {/* Tampilan Gambar QRIS */}
                  <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center justify-center text-center">
                    <div className="p-1.5 bg-white rounded-xl border border-gray-100 shadow-inner">
                      <img
                        src="/images/qris-user.jpg"
                        alt="Kode QRIS TryPedia"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg mx-auto"
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-800 mt-2">
                      QRIS TryPedia Official • Rekber Aman
                    </p>
                    <p className="text-[10.5px] text-gray-500 max-w-xs mx-auto leading-snug mt-0.5">
                      Mendukung BCA, Mandiri Livin, BRImo, BNI, GoPay, OVO, ShopeePay, DANA & seluruh e-wallet / mobile banking.
                    </p>
                  </div>
                </div>

                {/* KOLOM KANAN: Timer 10 Menit, Form Upload Screenshot & Panduan */}
                <div className="space-y-3 flex flex-col h-full">
                  {/* Countdown Timer 10 Menit */}
                  {!isTimerExpired ? (
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 text-left min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 animate-pulse text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-900 block truncate">
                            Bayar Dalam 10 Menit
                          </span>
                          <span className="text-[10.5px] text-amber-800 block leading-tight">
                            Selesaikan pembayaran sebelum waktu habis atau pesanan dibatalkan otomatis
                          </span>
                        </div>
                      </div>

                      <div className="bg-white border border-amber-300 px-3 py-1.5 rounded-lg shadow-xs font-mono font-black text-amber-700 text-base sm:text-lg tracking-wider shrink-0">
                        {formatTimer(qrisTimeLeft)}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 text-red-900 animate-in fade-in">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <div className="text-left text-xs space-y-0.5">
                        <span className="font-bold block">Waktu Pembayaran Telah Habis!</span>
                        <span className="text-[11px] text-red-700 block">
                          Batas waktu pembayaran 10 menit telah berakhir. Pesanan otomatis dibatalkan oleh sistem.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Upload Screenshot Bukti Transfer */}
                  <div className="text-left space-y-2 flex-1 flex flex-col">
                    <label className="text-xs font-bold text-gray-900 block">
                      Upload Bukti Screenshot Transfer:
                    </label>

                    {qrisProofImage ? (
                      <div className="p-4 bg-emerald-50/70 rounded-2xl border border-[#03AC0E]/30 flex flex-col sm:flex-row items-center justify-between gap-3 flex-1 min-h-[180px]">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={qrisProofImage}
                            alt="Bukti Transfer"
                            className="w-16 h-16 object-cover rounded-xl border border-emerald-300 shrink-0 shadow-xs"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {qrisProofFileName || "Screenshot Bukti Bayar Terpilih"}
                            </span>
                            <span className="text-[11px] text-[#03AC0E] font-semibold flex items-center gap-1 mt-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Bukti transfer siap dikonfirmasi</span>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQrisProofImage(null);
                            setQrisProofFileName("");
                          }}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer border border-red-200"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-300 hover:border-[#03AC0E] bg-gray-50/70 hover:bg-emerald-50/20 rounded-2xl py-8 sm:py-10 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all flex-1 min-h-[180px]">
                        <div className="w-12 h-12 rounded-full bg-emerald-100/70 text-[#03AC0E] flex items-center justify-center shadow-2xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 text-center">
                          Pilih atau Unggah Foto / Screenshot Bukti
                        </span>
                        <span className="text-[10.5px] text-gray-500 text-center">
                          Format file JPG, PNG, atau WEBP
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileProofChange}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {/* Info status routing */}
                    {qrisProofImage ? (
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed">
                        ✨ <strong>Bukti bayar terlampir:</strong> Saat Anda menekan tombol <strong>Selesai</strong>, pesanan akan langsung dipindahkan ke tab <strong>Menunggu Konfirmasi</strong> dan bukti akan diverifikasi oleh Admin TryPedia.
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
                        💡 <strong>Belum unggah bukti?</strong> Jangan khawatir! Jika Anda menekan tombol <strong>Selesai</strong> tanpa mengunggah bukti, pesanan akan disimpan di tab <strong>Belum Bayar</strong> di menu Pesanan Saya dan Anda dapat mengunggah bukti kapan saja.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer dengan Tombol Selesai (Tanpa Tombol Kembali) */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end shrink-0">
              {isTimerExpired ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Waktu pembayaran habis • Pesanan dibatalkan sistem</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetExpiredQris}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishQris}
                  className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Selesai</span>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pesanan Berhasil */}
      {isOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl border border-gray-100">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ring-8 ${
                lastCreatedOrderStatus === "SEDANG_DIKEMAS"
                  ? "bg-[#EBF8EE] text-[#03AC0E] ring-emerald-50"
                  : "bg-amber-50 text-amber-600 ring-amber-100/50"
              }`}
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {lastCreatedOrderStatus === "SEDANG_DIKEMAS"
                  ? "Pesanan Berhasil & Menunggu Konfirmasi!"
                  : "Pesanan Dibuat (Menunggu Pembayaran)"}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {lastCreatedOrderStatus === "SEDANG_DIKEMAS" ? (
                  paymentMethod === "trypedia_wallet" ? (
                    <>Saldo TryPedia Anda berhasil dipotong. Seller akan segera mengonfirmasi dan menyiapkan pesanan Anda.</>
                  ) : (
                    <>Bukti transfer QRIS telah diterima dan menunggu validasi Admin TryPedia. Pesanan Anda kini berada di tab <strong>Menunggu Konfirmasi</strong>.</>
                  )
                ) : (
                  <>Pesanan Anda telah disimpan di tab <strong>Belum Bayar</strong>. Silakan segera selesaikan pembayaran QRIS dan unggah bukti transfer di halaman Pesanan Saya.</>
                )}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 text-left text-xs space-y-2 border border-gray-200/80">
              <div className="flex justify-between">
                <span className="text-gray-500">No. Pesanan:</span>
                <span className="font-mono font-bold text-gray-800">
                  {lastCreatedOrderId || `TRY-${Date.now().toString().slice(-6)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status Pesanan:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    lastCreatedOrderStatus === "SEDANG_DIKEMAS"
                      ? "bg-emerald-100 text-[#03AC0E]"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {lastCreatedOrderStatus === "SEDANG_DIKEMAS" ? "Menunggu Konfirmasi" : "Belum Bayar"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jenis Transaksi:</span>
                <span className="font-semibold text-[#03AC0E]">
                  {orderType === "rent" ? `Sewa (${duration} Hari)` : "Beli Penuh"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Penyerahan:</span>
                <span className="font-medium text-gray-800 truncate max-w-[200px]" title={getHandoverSummary()}>
                  {deliveryOption === "pickup"
                    ? "Ambil di Seller"
                    : deliveryOption === "cod"
                    ? `COD: ${codLocationName}`
                    : "Antar ke Rumah"}
                </span>
              </div>
              {(
                <div className="flex justify-between text-[11px] text-gray-700 bg-emerald-50 p-2 rounded-lg border border-[#03AC0E]/20">
                  <span className="text-gray-500">Jadwal Serah-Terima:</span>
                  <span className="font-bold text-[#03AC0E]">
                    {formatDateIndo(codDate)}, {codTime} WIB
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Metode Bayar:</span>
                <span className="font-semibold text-gray-800 truncate max-w-[200px]" title={getPaymentMethodName()}>
                  {getPaymentMethodName()}
                </span>
              </div>
              {useCoins && coinsDiscount > 0 && (
                <div className="flex justify-between text-[#03AC0E] font-semibold">
                  <span className="text-gray-500">Diskon Koin TryPedia:</span>
                  <span>- {formatRupiah(coinsDiscount)}</span>
                </div>
              )}
              {paymentMethod === "trypedia_wallet" && (
                <div className="flex justify-between text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-[#03AC0E]/20">
                  <span className="text-gray-600">Sisa Saldo Trypedia:</span>
                  <span className="font-bold text-[#03AC0E]">
                    {formatRupiah(walletBalance)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                <span>Total Pembayaran:</span>
                <span className="text-[#03AC0E]">{formatRupiah(totalPayment)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsOrderSuccess(false);
                  router.push(`/orders?tab=${lastCreatedOrderStatus}`);
                }}
                className="w-full bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>
                  Lihat di Pesanan Saya ({lastCreatedOrderStatus === "SEDANG_DIKEMAS" ? "Menunggu Konfirmasi" : "Belum Bayar"})
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {deliveryOption === "cod" && (
                <button
                  onClick={() => {
                    setIsOrderSuccess(false);
                    setIsPinModalOpen(true);
                  }}
                  className="w-full border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-[#03AC0E] font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Buka Simulasi PIN Serah-Terima COD</span>
                </button>
              )}

              <button
                onClick={() => router.push("/")}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PIN Serah-Terima COD Modal */}
      <PinHandoverDemo
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Lightbox Modal: Full View Foto Toko (Tanpa Terpotong) */}
      {isShopPhotoModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsShopPhotoModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#03AC0E] flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    Tampak Depan Toko - {sellerStore?.storeName || product.seller.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 truncate">
                    {sellerStore?.address || product.seller.location}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShopPhotoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Foto Full Resolusi Tanpa Terpotong */}
            <div className="p-3 bg-gray-950 flex items-center justify-center overflow-auto flex-1">
              <img
                src={sellerStore?.frontPhotoUrl || "/images/toko-nabil123.webp"}
                alt={`Foto Tampak Depan ${sellerStore?.storeName || product.seller.name}`}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Footer Modal dengan Tombol Buka Rute */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <p className="text-[11px] text-gray-600 text-center sm:text-left">
                Toko fisik berlokasi di {sellerStore?.address || product.seller.location}. Buka jam {sellerStore?.hours || product.seller.hours}.
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sellerStore?.address || product.seller.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-[#03AC0E] hover:bg-[#02980C] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" />
                <span>Petunjuk Arah</span>
                <ExternalLink className="w-3 h-3 text-white" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Alamat Pengiriman */}
      {isAddressPickerOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsAddressPickerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Pilih Alamat Pengiriman
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pilih salah satu alamat tersimpan untuk pengantaran pesanan ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Address List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {userAddressesList.map((addr: any) => {
                const isSelected =
                  selectedAddressItem?.id === addr.id ||
                  deliveryAddress.includes(addr.streetAddress);
                return (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "border-[#03AC0E] bg-[#EBF8EE]/40 ring-1 ring-[#03AC0E] shadow-xs"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? "border-[#03AC0E] bg-[#03AC0E] text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {addr.recipientName}
                            </span>
                            <span className="text-gray-400 text-xs">•</span>
                            <span className="text-gray-600 text-xs">{addr.phone}</span>
                            {addr.isPrimary && (
                              <span className="bg-emerald-50 text-[#03AC0E] border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Utama
                              </span>
                            )}
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-1.5 py-0.5 rounded">
                              {addr.label}
                            </span>
                          </div>

                          <p className="text-xs text-gray-700 leading-snug">
                            {addr.streetAddress}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {addr.provinceCityDistrict}
                          </p>

                          {addr.addressNotes && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded inline-block">
                              📌 {addr.addressNotes}
                            </p>
                          )}

                          {addr.frontPhotoUrl && (
                            <div className="flex items-center gap-2 pt-1">
                              <img
                                src={addr.frontPhotoUrl}
                                alt="Tampak depan"
                                className="w-10 h-10 rounded-md object-cover border border-emerald-200 shrink-0"
                              />
                              <span className="text-[10.5px] text-emerald-700 font-medium">
                                Foto tampak depan tersedia
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAddress(addr);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#03AC0E] text-white"
                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {isSelected ? "Terpilih" : "Pilih"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {userAddressesList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xs">Belum ada daftar alamat yang tersimpan.</p>
                </div>
              )}
            </div>

            {/* Modal Footer: Link to Settings to add new address */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <Link
                href="/settings?tab=addresses"
                className="text-xs font-bold text-[#03AC0E] hover:underline flex items-center gap-1.5"
                onClick={() => setIsAddressPickerOpen(false)}
              >
                <Plus className="w-4 h-4" />
                <span>Kelola atau Tambah Alamat Baru di Pengaturan</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsAddressPickerOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal: Foto Tampak Depan Alamat Pengiriman */}
      {isDeliveryPhotoModalOpen && deliveryFrontPhotoUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsDeliveryPhotoModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  Foto Tampak Depan Alamat
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  {deliveryAddress}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryPhotoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-gray-950 flex items-center justify-center overflow-auto flex-1">
              <img
                src={deliveryFrontPhotoUrl}
                alt="Foto Tampak Depan Alamat"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <p className="text-[11px] text-gray-600">
                Foto ini membantu kurir lokal mengenali gerbang/fasad rumah saat pengantaran.
              </p>
              <button
                type="button"
                onClick={() => setIsDeliveryPhotoModalOpen(false)}
                className="bg-[#03AC0E] hover:bg-[#02980C] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutClient(props: CheckoutClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03AC0E]"></div>
        </div>
      }
    >
      <CheckoutContent {...props} />
    </Suspense>
  );
}
