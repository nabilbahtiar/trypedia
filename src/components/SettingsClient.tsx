"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import IdentityVerification from "@/components/IdentityVerification";
import Footer from "@/components/Footer";
import RegionCascadingPicker from "@/components/RegionCascadingPicker";
import { compressAndUploadImage } from "@/lib/client-image";
import {
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
  Save,
  MapPin,
  Plus,
  Home,
  Building2,
  Briefcase,
  X,
  Search,
  Check,
  Navigation,
  Loader2,
} from "lucide-react";

interface AddressItem {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  provinceCityDistrict: string;
  streetAddress: string;
  addressNotes?: string;
  latitude: number;
  longitude: number;
  label: "Rumah" | "Kantor" | "Kos";
  isPrimary: boolean;
  isShopAddress?: boolean;
  frontPhotoUrl?: string | null;
}

interface SettingsClientProps {
  initialUserId?: string | null;
  initialUser?: {
    name?: string;
    email?: string;
    phone?: string;
    photoUrl?: string | null;
  } | null;
  initialAddresses?: AddressItem[] | null;
}

export default function SettingsClient({
  initialUserId = null,
  initialUser = null,
  initialAddresses = null,
}: SettingsClientProps) {
  const router = useRouter();
  const { user, isLoggedIn, isInitialized, updateUser, openLoginModal } = useAuth();

  const [activeTab, setActiveTab] = useState<"biodata" | "addresses">("biodata");

  // Profile Form States
  const [name, setName] = useState(initialUser?.name || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialUser?.photoUrl ?? null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<AddressItem[]>(initialAddresses ?? []);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Address Modal States
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [modalRecipientName, setModalRecipientName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalProvinceCity, setModalProvinceCity] = useState("");
  const [modalStreetAddress, setModalStreetAddress] = useState("");
  const [modalAddressNotes, setModalAddressNotes] = useState("");
  const [modalLabel, setModalLabel] = useState<"Rumah" | "Kantor" | "Kos">("Rumah");
  const [modalIsPrimary, setModalIsPrimary] = useState(false);
  const [modalIsShop, setModalIsShop] = useState(false);
  const [modalLat, setModalLat] = useState<number>(-8.1725);
  const [modalLng, setModalLng] = useState<number>(113.7000);
  const [hasPinnedCoords, setHasPinnedCoords] = useState<boolean>(false);
  const [isGeocodingAddr, setIsGeocodingAddr] = useState<boolean>(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [addressLookup, setAddressLookup] = useState<Record<string,unknown>|null>(null);
  const locationRequestId = useRef(0);
  const locationAbort = useRef<AbortController|null>(null);
  const [modalFrontPhotoUrl, setModalFrontPhotoUrl] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const addressFileInputRef = useRef<HTMLInputElement | null>(null);
  const addrMapContainerRef = useRef<HTMLDivElement | null>(null);
  const addrMapRef = useRef<any>(null);
  const addrMarkerRef = useRef<any>(null);
  const addressCoordsRef = useRef({lat:modalLat,lng:modalLng});
  addressCoordsRef.current={lat:modalLat,lng:modalLng};
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setPhotoUrl(user.photoUrl || null);
    }
  }, [user]);

  // Fetch addresses from PostgreSQL
  const fetchAddresses = async () => {
    if (!user) return;
    setIsLoadingAddresses(true);
    try {
      const res = await fetch(`/api/addresses?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && data.addresses) {
        setAddresses(data.addresses);
      }
    } catch (e) {
      console.warn("Error fetching addresses:", e);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const didSkipInitialAddressesFetch = React.useRef(false);

  useEffect(() => {
    if (!user) return;
    if (
      initialAddresses !== null &&
      initialUserId &&
      user.id === initialUserId &&
      !didSkipInitialAddressesFetch.current
    ) {
      didSkipInitialAddressesFetch.current = true;
      return;
    }
    fetchAddresses();
  }, [user, initialUserId, initialAddresses]);

  const handleFrontPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran foto maksimal 8MB!");
      return;
    }

    try {
      setIsCompressingPhoto(true);
      const uploadedUrl = await compressAndUploadImage(file, "addresses", 1200, 0.82);
      setModalFrontPhotoUrl(uploadedUrl);
    } catch {
      alert("Gagal memproses foto. Silakan coba file lain.");
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleRemoveFrontPhoto = () => {
    setModalFrontPhotoUrl(null);
    if (addressFileInputRef.current) {
      addressFileInputRef.current.value = "";
    }
  };

  // Initialize / update mini Leaflet map inside Add/Edit Address modal
  const applyAddressPin = (lat: number, lng: number) => {
    addressCoordsRef.current={lat,lng};
    setModalLat(lat);
    setModalLng(lng);
    if (addrMarkerRef.current) {
      addrMarkerRef.current.setLatLng([lat, lng]);
    }
    if (addrMapRef.current) {
      addrMapRef.current.setView([lat, lng], 15, { animate: true });
    }
  };

  const invalidateAddressLocation = () => {
    locationRequestId.current++;locationAbort.current?.abort();setAddressLookup(null);
    setHasPinnedCoords(false);setIsGeocodingAddr(false);
    setLocationError("Alamat berubah. Klik Cari dari Alamat untuk mencocokkan pin kembali.");
  };
  const moveAddressPin = (lat:number,lng:number,_pinned=true) => {
    locationRequestId.current++;locationAbort.current?.abort();applyAddressPin(lat,lng);
    setHasPinnedCoords(false);setLocationError("");setIsGeocodingAddr(true);
    setAddressLookup({mode:"reverse",latitude:lat,longitude:lng});
  };
  useEffect(() => {
    if(!isAddressModalOpen||!addressLookup)return;
    const id=++locationRequestId.current,controller=new AbortController();locationAbort.current=controller;
    setIsGeocodingAddr(true);setHasPinnedCoords(false);
    const timer=setTimeout(async()=>{
      try{
        let response:Response|null=null;
        for(let attempt=0;attempt<3;attempt++){
          response=await fetch("/api/addresses/resolve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(addressLookup),signal:controller.signal});
          if(response.status!==429||attempt===2)break;
          await new Promise(resolve=>setTimeout(resolve,1500));
          if(controller.signal.aborted)return;
        }
        if(!response)return;
        const data=await response.json();
        if(controller.signal.aborted||id!==locationRequestId.current)return;
        if(response.status===401){openLoginModal();throw new Error(data.message);}
        if(!response.ok||!data.address)throw new Error(data.message||"Alamat belum berhasil dibaca.");
        applyAddressPin(data.address.latitude,data.address.longitude);
        setModalStreetAddress(data.address.streetAddress);setModalProvinceCity(data.address.provinceCityDistrict);
        setHasPinnedCoords(Boolean(data.address.streetAddress));
        setLocationError(data.address.streetAddress?"":"Nama jalan belum tersedia di titik ini. Cari nama jalan atau pilih pin di jalan yang bernama.");
      }catch(error){if(!controller.signal.aborted&&id===locationRequestId.current)setLocationError(error instanceof Error?error.message:"Alamat belum berhasil dibaca.");}
      finally{if(!controller.signal.aborted&&id===locationRequestId.current)setIsGeocodingAddr(false);}
    },450);
    return()=>{clearTimeout(timer);controller.abort();locationRequestId.current++;};
  },[isAddressModalOpen,addressLookup]);
  useEffect(()=>{if(!isAddressModalOpen){locationRequestId.current++;locationAbort.current?.abort();setIsGeocodingAddr(false);}},[isAddressModalOpen]);

  useEffect(() => {
    if (!isAddressModalOpen) return;
    let isMounted = true;

    const setupAddrMap = async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;
      if (!isMounted || !addrMapContainerRef.current) return;

      if (addrMapRef.current) {
        addrMapRef.current.remove();
        addrMapRef.current = null;
      }

      const map = L.map(addrMapContainerRef.current, {
        center: [addressCoordsRef.current.lat, addressCoordsRef.current.lng],
        zoom: 15,
        zoomControl: true,
      });
      addrMapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "trypedia-addr-pin",
        html: `<div style="transform: translate(-50%, -100%); filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));"><svg width="30" height="38" viewBox="0 0 24 24" fill="#03AC0E" stroke="#ffffff" stroke-width="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([addressCoordsRef.current.lat, addressCoordsRef.current.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);
      addrMarkerRef.current = marker;

      marker.on("dragend", (ev: any) => {
        const pos = ev.target.getLatLng();
        moveAddressPin(pos.lat, pos.lng, true);
      });

      map.on("click", (ev: any) => {
        moveAddressPin(ev.latlng.lat, ev.latlng.lng, true);
      });

      setTimeout(() => {
        if (addrMapRef.current) addrMapRef.current.invalidateSize();
      }, 200);
    };

    setupAddrMap();

    return () => {
      isMounted = false;
      if (addrMapRef.current) {
        addrMapRef.current.remove();
        addrMapRef.current = null;
      }
    };
  }, [isAddressModalOpen]);

  const handleFindCoordsFromAddress = () => {
    if(!modalStreetAddress.trim()){setLocationError("Isi nama jalan terlebih dahulu.");return;}
    locationRequestId.current++;locationAbort.current?.abort();setHasPinnedCoords(false);setLocationError("");setIsGeocodingAddr(true);
    setAddressLookup({mode:"search",streetAddress:modalStreetAddress.trim(),provinceCityDistrict:modalProvinceCity.trim()});
  };
  const handleUseGpsForAddress = () => {
    if(typeof navigator==="undefined"||!navigator.geolocation){setLocationError("GPS tidak tersedia. Pilih titik langsung pada peta.");return;}
    locationAbort.current?.abort();const id=++locationRequestId.current;
    setHasPinnedCoords(false);setIsGeocodingAddr(true);setLocationError("");
    navigator.geolocation.getCurrentPosition(pos=>{
      if(id!==locationRequestId.current)return;
      moveAddressPin(pos.coords.latitude,pos.coords.longitude);
    },()=>{if(id===locationRequestId.current){setIsGeocodingAddr(false);setLocationError("GPS belum berhasil dibaca. Izinkan akses lokasi atau pilih titik di peta.");}}, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  };

  // Open modal to add new address
  const handleOpenAddModal = () => {
    locationRequestId.current++;locationAbort.current?.abort();setAddressLookup(null);setLocationError("");setIsGeocodingAddr(false);
    setEditingAddressId(null);
    setModalRecipientName(user?.name || "Pelanggan TryPedia");
    setModalPhone(user?.phone || "(+62) 813 3553 1338");
    setModalProvinceCity("");
    setModalStreetAddress("");
    setModalAddressNotes("");
    setModalLabel("Rumah");
    setModalIsPrimary(addresses.length === 0);
    setModalIsShop(false);
    setModalLat(-8.1725);
    setModalLng(113.7000);
    setHasPinnedCoords(false);
    setModalFrontPhotoUrl(null);
    if (addressFileInputRef.current) addressFileInputRef.current.value = "";
    setIsAddressModalOpen(true);
  };

  // Open modal to edit existing address
  const handleOpenEditModal = (addr: AddressItem) => {
    const validPoint=typeof addr.latitude==='number'&&typeof addr.longitude==='number'&&Number.isFinite(addr.latitude)&&Number.isFinite(addr.longitude);
    setEditingAddressId(addr.id);
    setModalRecipientName(addr.recipientName);
    setModalPhone(addr.phone);
    setModalProvinceCity(addr.provinceCityDistrict);
    setModalStreetAddress(addr.streetAddress);
    setModalAddressNotes(addr.addressNotes || "");
    setModalLabel(addr.label || "Rumah");
    setModalIsPrimary(addr.isPrimary);
    setModalIsShop(Boolean(addr.isShopAddress));
    setModalLat(validPoint?addr.latitude:-8.1725);
    setModalLng(validPoint?addr.longitude:113.7000);
    setHasPinnedCoords(false);setLocationError(validPoint?"":"Pilih titik alamat menggunakan GPS atau pin peta.");
    setAddressLookup(validPoint?{mode:"reverse",latitude:addr.latitude,longitude:addr.longitude}:null);
    setModalFrontPhotoUrl(addr.frontPhotoUrl || null);
    if (addressFileInputRef.current) addressFileInputRef.current.value = "";
    setIsAddressModalOpen(true);
  };

  // Save address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!modalRecipientName.trim() || !modalPhone.trim() || !modalStreetAddress.trim()) {
      alert("Nama lengkap, nomor telepon, dan nama jalan/alamat wajib diisi!");
      return;
    }

    if(isGeocodingAddr||!hasPinnedCoords){setLocationError("Cocokkan alamat dan titik peta sebelum menyimpan.");return;}
    const finalLat=modalLat,finalLng=modalLng;
    setIsSavingAddress(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAddressId || undefined,
          userId: user.id,
          recipientName: modalRecipientName.trim(),
          phone: modalPhone.trim(),
          provinceCityDistrict: modalProvinceCity.trim(),
          streetAddress: modalStreetAddress.trim(),
          addressNotes: modalAddressNotes.trim(),
          latitude: finalLat,
          longitude: finalLng,
          label: modalLabel,
          isPrimary: modalIsPrimary,
          isShopAddress: modalIsShop,
          frontPhotoUrl: modalFrontPhotoUrl,
        }),
      });

      const data = await res.json();
      if(res.status===401)openLoginModal();
      if (data.success) {
        setIsAddressModalOpen(false);
        fetchAddresses();
        window.dispatchEvent(new Event("trypedia_address_change"));
        router.refresh();
      } else {
        setLocationError(data.message || "Gagal menyimpan alamat");
      }
    } catch {
      setLocationError("Alamat gagal disimpan. Silakan coba lagi.");
    } finally { setIsSavingAddress(false); }
  };

  // Set address as primary
  const handleSetPrimary = async (addressId: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: addressId, userId: user.id, action: "set_primary" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAddresses();
      }
    } catch (e) {
      console.warn("Failed to set primary address:", e);
    }
  };

  // Set address as shop address
  const handleSetShopAddress = async (addressId: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: addressId, userId: user.id, action: "set_shop" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAddresses();
      }
    } catch (e) {
      console.warn("Failed to set shop address:", e);
    }
  };

  // Delete address
  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;
    try {
      const res = await fetch(`/api/addresses?id=${addressId}&userId=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchAddresses();
      }
    } catch (e) {
      console.warn("Failed to delete address:", e);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }

    if (!name.trim()) {
      setStatusMessage({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setStatusMessage({ type: "error", text: "Masukkan alamat email yang valid." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const success = await updateUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      photoUrl: photoUrl || undefined,
    });

    setIsSubmitting(false);

    if (success) {
      setStatusMessage({
        type: "success",
        text: "Perubahan profil berhasil disimpan ke database!",
      });
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } else {
      setStatusMessage({
        type: "error",
        text: "Gagal menyimpan perubahan. Pastikan email belum digunakan akun lain.",
      });
    }
  };

  // Profile photo upload (compress WebP + upload to /api/media/avatars)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        type: "error",
        text: "Ukuran file terlalu besar! Maksimal 5MB.",
      });
      return;
    }

    try {
      const uploadedUrl = await compressAndUploadImage(file, "avatars", 600, 0.85);
      setPhotoUrl(uploadedUrl);
      setStatusMessage(null);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setPhotoUrl(result);
        setStatusMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Prevent flicker only if SSR had no user session either
  if (!isInitialized && !initialUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#03AC0E]"></div>
          <span className="text-xs text-gray-500 font-medium">Memuat sesi akun...</span>
        </div>
      </div>
    );
  }

  const effectiveLoggedIn = isLoggedIn || Boolean(initialUserId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
        <IdentityVerification />
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#03AC0E] flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-semibold">Pengaturan Akun</span>
        </div>

        {!effectiveLoggedIn ? (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-10 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <UserIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Anda Belum Masuk</h3>
              <p className="text-xs text-gray-500 mt-1">
                Silakan masuk terlebih dahulu untuk mengakses dan mengelola profil akun Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* SISI KIRI: SIDEBAR AKUN (Profil & Alamat) */}
            <aside className="md:col-span-1 space-y-3.5">
              {/* User Mini Profile Header */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#03AC0E] to-emerald-400 text-white font-bold text-base flex items-center justify-center shrink-0 border-2 border-white shadow-xs">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.avatar || "KN"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                    {user?.name || "Khayru Nabiel Bahtiar"}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-[#03AC0E] font-bold">
                    <ShieldCheck className="w-3 h-3 text-[#03AC0E]" />
                    <span>{user?.isVerified ? "Terverifikasi" : "Belum Terverifikasi"}</span>
                  </span>
                </div>
              </div>

              {/* Sidebar Menu */}
              <div className="bg-white rounded-2xl p-2 border border-gray-200/90 shadow-2xs space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("biodata")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all cursor-pointer text-left ${
                    activeTab === "biodata"
                      ? "bg-[#EBF8EE] text-[#03AC0E] shadow-2xs"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <span>Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("addresses")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all cursor-pointer text-left ${
                    activeTab === "addresses"
                      ? "bg-[#EBF8EE] text-[#03AC0E] shadow-2xs"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Alamat</span>
                  </div>
                  {addresses.length > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === "addresses"
                          ? "bg-[#03AC0E] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {addresses.length}
                    </span>
                  )}
                </button>
              </div>
            </aside>

            {/* SISI KANAN: KONTEN UTAMA */}
            <section className="md:col-span-3 bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden min-h-[460px]">
              {/* TAB 1: PROFIL */}
              {activeTab === "biodata" && (
                <div className="animate-in fade-in">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/40 via-white to-transparent">
                    <h1 className="text-lg font-bold text-gray-900">Profil Saya</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun.
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-8">
                  {statusMessage && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                        statusMessage.type === "success"
                          ? "bg-[#EBF8EE] border border-[#03AC0E]/30 text-[#03AC0E]"
                          : "bg-rose-50 border border-rose-200 text-rose-700"
                      }`}
                    >
                      {statusMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#03AC0E]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{statusMessage.text}</span>
                    </div>
                  )}

                  {/* Foto Profil */}
                  <div className="border-b border-gray-100 pb-8">
                    <h2 className="text-sm font-bold text-gray-900 mb-1">Foto Profil</h2>
                    <p className="text-xs text-gray-500 mb-4">
                      Foto ini akan ditampilkan di navbar akun dan profil transaksi Anda.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-tr from-[#03AC0E] to-emerald-400 text-white font-bold text-2xl flex items-center justify-center border-4 border-white shadow-md">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt="Foto Profil"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{user?.avatar || "KN"}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#03AC0E] text-white flex items-center justify-center hover:bg-[#02980C] shadow-md transition-all cursor-pointer border-2 border-white"
                          title="Ubah Foto Profil"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-center sm:text-left">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Pilih Foto Baru</span>
                          </button>

                          {photoUrl && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-400">
                          Format file yang didukung: JPG, JPEG, PNG, atau WebP. Maksimal 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Biodata Fields */}
                  <div className="space-y-5">
                    <h2 className="text-sm font-bold text-gray-900 mb-1">Biodata Akun</h2>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Masukkan nama lengkap"
                          className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition-all"
                        />
                        <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Alamat Email <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="contoh@gmail.com"
                          className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition-all"
                        />
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nomor Telepon
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0813-xxxx-xxxx"
                          className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E] transition-all"
                        />
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* Submit Profile */}
                  <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-98 flex items-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

              {/* TAB 2: ALAMAT SAYA (Matches Screenshot 1) */}
              {activeTab === "addresses" && (
                <div className="p-6 sm:p-8 space-y-6 animate-in fade-in">
                  {/* Top Bar: Title & + Tambahkan Alamat Button */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Alamat Saya</h2>
                      <p className="text-xs text-gray-500">
                        Atur alamat pengiriman dan titik temu pesanan Anda.
                      </p>
                    </div>

                    {/* Red-Orange button like user's screenshot */}
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="bg-[#EE4D2D] hover:bg-[#d73f20] text-white font-bold px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Tambahkan Alamat</span>
                    </button>
                  </div>

                  {/* List of Address Cards */}
                  {isLoadingAddresses ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      Memuat daftar alamat dari database...
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-gray-500">
                        Belum ada alamat tersimpan. Silakan tambahkan alamat baru Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4 group"
                        >
                          {/* Address Details */}
                          <div className="space-y-1.5 max-w-2xl text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900">
                                {addr.recipientName}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span className="text-xs text-gray-500 font-mono">
                                {addr.phone}
                              </span>
                              {addr.label && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                  {addr.label}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-600 leading-relaxed">
                              {addr.streetAddress}
                              {addr.addressNotes ? ` (${addr.addressNotes})` : ""}
                            </p>

                            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">
                              {addr.provinceCityDistrict}
                            </p>

                            {/* Foto Tampak Depan Alamat Thumbnail */}
                            {addr.frontPhotoUrl ? (
                              <div className="pt-2 flex items-center gap-2.5">
                                <div
                                  onClick={() =>
                                    setPreviewImageModal({
                                      url: addr.frontPhotoUrl!,
                                      title: `Foto Tampak Depan - ${addr.recipientName} (${addr.label || "Alamat"})`,
                                    })
                                  }
                                  className="relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer group shadow-2xs shrink-0"
                                  title="Klik untuk memperbesar foto tampak depan alamat"
                                >
                                  <img
                                    src={addr.frontPhotoUrl}
                                    alt="Foto Tampak Depan"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-4 h-4 text-white drop-shadow" />
                                  </div>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#03AC0E]" />
                                    <span>Foto Tampak Depan Terlampir</span>
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    Memudahkan kurir mengenali rumah saat pengiriman
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(addr)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#03AC0E] hover:text-[#02980C] bg-[#EBF8EE] hover:bg-[#d8f3dc] px-2.5 py-1 rounded-lg border border-[#03AC0E]/25 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>Tambah Foto Tampak Depan</span>
                                </button>
                              </div>
                            )}

                            {/* Badges */}
                            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                              {addr.isPrimary && (
                                <span className="text-[11px] font-bold text-[#EE4D2D] border border-[#EE4D2D] px-2 py-0.5 rounded">
                                  Utama
                                </span>
                              )}
                              {addr.isShopAddress && (
                                <span className="text-[11px] font-medium text-gray-500 border border-gray-400 px-2 py-0.5 rounded">
                                  Alamat Toko
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions on the Right */}
                          <div className="flex md:flex-col items-end gap-2 shrink-0 pt-1">
                            <div className="flex items-center gap-3 text-xs">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(addr)}
                                className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                              >
                                Ubah
                              </button>
                              {!addr.isPrimary && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddress(addr.id)}
                                    className="text-gray-400 hover:text-rose-600 font-medium cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row md:flex-col items-end gap-1.5 mt-1">
                              {!addr.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(addr.id)}
                                  className="border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Atur sebagai alamat utama
                                </button>
                              )}

                              {!addr.isShopAddress && (
                                <button
                                  type="button"
                                  onClick={() => handleSetShopAddress(addr.id)}
                                  className="border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer"
                                >
                                  Atur sebagai alamat toko
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* MODAL TAMBAH / UBAH ALAMAT (Matches Screenshot 2) */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col relative animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {editingAddressId ? "Ubah Alamat" : "Alamat Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Row 1: Nama Lengkap & Nomor Telepon (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    value={modalRecipientName}
                    onChange={(e) => setModalRecipientName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="Nomor Telepon"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                  />
                </div>
              </div>

              {/* Row 2: Provinsi, Kota, Kecamatan, Kode Pos (Cascading Picker - Matches Screenshot) */}
              <div>
                <RegionCascadingPicker
                  value={modalProvinceCity}
                  onChange={(val) => {setModalProvinceCity(val);invalidateAddressLocation();}}
                />
              </div>

              {/* Row 3: Nama Jalan, Gedung, No. Rumah */}
              <div>
                <input
                  type="text"
                  required
                  value={modalStreetAddress}
                  onChange={(e) => {setModalStreetAddress(e.target.value);invalidateAddressLocation();}}
                  placeholder="Nama Jalan, Gedung, No. Rumah"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              {/* Row 4: Detail Lainnya */}
              <div>
                <input
                  type="text"
                  value={modalAddressNotes}
                  onChange={(e) => setModalAddressNotes(e.target.value)}
                  placeholder="Nomor rumah, blok/unit, atau patokan (opsional)"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#03AC0E] focus:ring-1 focus:ring-[#03AC0E]"
                />
              </div>

              {/* Row 4.5: Pinpoint Peta OpenStreetMap Alamat */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#03AC0E]" />
                    <span>Titik Lokasi di Peta</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isGeocodingAddr}
                      onClick={handleFindCoordsFromAddress}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:border-[#03AC0E] hover:text-[#03AC0E] text-gray-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isGeocodingAddr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      <span>Cari dari Alamat</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeocodingAddr}
                      onClick={handleUseGpsForAddress}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:border-[#03AC0E] hover:text-[#03AC0E] text-gray-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>GPS</span>
                    </button>
                  </div>
                </div>
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-300 bg-gray-100">
                  <div ref={addrMapContainerRef} className="w-full h-full z-0" />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-gray-500">
                  <span>Klik peta atau geser pin hijau untuk menentukan titik alamat yang akurat.</span>
                  <span className="font-mono text-gray-600 shrink-0 ml-2">
                    {modalLat.toFixed(5)}, {modalLng.toFixed(5)}
                  </span>
                </div>
                {locationError && <p role="alert" className="text-xs text-red-600">{locationError}</p>}
              </div>

              {/* Row 5: Foto Tampak Depan Alamat (Memudahkan Pengiriman Kurir) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#03AC0E]" />
                    <span>Foto Tampak Depan Alamat</span>
                    <span className="text-[10px] font-normal text-gray-400">(Opsional / Memudahkan Kurir)</span>
                  </label>
                  {modalFrontPhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveFrontPhoto}
                      className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Unggah foto tampak depan rumah, pagar, atau ruko Anda agar kurir dapat mengenali dan mengantarkan pesanan dengan cepat dan akurat.
                </p>

                {modalFrontPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-300 group bg-gray-100 flex items-center justify-center">
                    <img
                      src={modalFrontPhotoUrl}
                      alt="Foto Tampak Depan Alamat"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => addressFileInputRef.current?.click()}
                        className="bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImageModal({
                            url: modalFrontPhotoUrl,
                            title: "Foto Tampak Depan Alamat",
                          })
                        }
                        className="bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Perbesar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      disabled={isCompressingPhoto}
                      onClick={() => addressFileInputRef.current?.click()}
                      className="w-full py-4 px-3 border-2 border-dashed border-gray-300 hover:border-[#03AC0E] rounded-xl bg-white hover:bg-[#EBF8EE]/40 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#EBF8EE] text-gray-500 group-hover:text-[#03AC0E] flex items-center justify-center transition-colors">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-gray-700 group-hover:text-[#03AC0E]">
                        {isCompressingPhoto
                          ? "Memproses Foto..."
                          : "+ Ambil / Unggah Foto Tampak Depan"}
                      </span>
                      <span className="text-[10.5px] text-gray-400">
                        Format JPG, PNG, atau WEBP (Foto dari arah jalan)
                      </span>
                    </button>
                  </div>
                )}

                <input
                  ref={addressFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFrontPhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Row 6: Tandai Sebagai (Rumah | Kantor | Kos) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Tandai Sebagai:
                </label>
                <div className="flex items-center gap-2">
                  {(["Rumah", "Kantor", "Kos"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setModalLabel(lbl)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        modalLabel === lbl
                          ? "border-[#03AC0E] bg-emerald-50 text-[#03AC0E] shadow-2xs"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 7: Checkbox Atur Sebagai Utama & Alamat Toko */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="primaryAddressCheckbox"
                    checked={modalIsPrimary}
                    onChange={(e) => setModalIsPrimary(e.target.checked)}
                    className="w-4 h-4 text-[#03AC0E] accent-[#03AC0E] rounded cursor-pointer"
                  />
                  <label
                    htmlFor="primaryAddressCheckbox"
                    className="text-xs text-gray-700 font-medium cursor-pointer"
                  >
                    Atur sebagai alamat utama
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shopAddressCheckbox"
                    checked={modalIsShop}
                    onChange={(e) => setModalIsShop(e.target.checked)}
                    className="w-4 h-4 text-[#03AC0E] accent-[#03AC0E] rounded cursor-pointer"
                  />
                  <label
                    htmlFor="shopAddressCheckbox"
                    className="text-xs text-gray-700 font-medium cursor-pointer"
                  >
                    Atur sebagai alamat toko
                  </label>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Nanti Saja
                </button>
                <button
                  type="submit"
                  disabled={isGeocodingAddr || isSavingAddress || !hasPinnedCoords}
                  className="bg-[#03AC0E] hover:bg-[#02980C] text-white font-bold px-7 py-2.5 rounded-lg text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingAddress ? "Menyimpan..." : isGeocodingAddr ? "Mencari Alamat..." : "Simpan Alamat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal for Front Photo */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 truncate">
                {previewImageModal.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-gray-900 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                Foto tampak depan ini memudahkan kurir menemukan titik alamat saat pengiriman.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
