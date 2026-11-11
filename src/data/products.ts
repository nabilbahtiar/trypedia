export interface Product {
  id: string;
  sellerId?: string;
  name: string;
  category: string;
  image: string;
  images?: string[];
  condition: "Seperti Baru" | "Baik" | "Cukup Baik" | string;
  size?: string;
  shutterCount?: string;
  rentPriceDaily: number;
  rentPrice3d?: number;
  rentPrice7d?: number;
  buyPrice: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  rentCount: number;
  stock?: number;
  isStockLocked?: boolean;
  seller: {
    id?: string;
    name: string;
    avatar: string;
    photoUrl?: string | null;
    location: string;
    district: string;
    distance: string;
    lat?: number;
    lng?: number;
    responseSpeed: string;
    hours: string;
    isVerified: boolean;
    rating: number;
  };
  features: string[];
  deposit: number;
  description: string;
  packageIncludes: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: "new-balance-2022r",
    name: "Sepatu New Balance 2022R - Second Like New Original",
    category: "Fashion & Aksesori",
    image: "/images/new-balance-2022r.jpg",
    images: ["/images/new-balance-2022r.jpg"],
    condition: "Seperti Baru",
    rentPriceDaily: 30000,
    rentPrice3d: 84000,
    rentPrice7d: 174000,
    buyPrice: 1450000,
    rating: 0,
    reviewCount: 0,
    rentCount: 0,
    stock: 1,
    seller: {
      name: "Sneaker Zone Jember",
      avatar: "SZ",
      location: "Jl. Kalimantan No.84a, Krajan Timur, Sumbersari, Kec. Sumbersari, Kabupaten Jember, Jawa Timur 68121",
      district: "Sumbersari",
      distance: "1.2 km dari Anda",
      responseSpeed: "~10 Menit",
      hours: "09.00 - 21.00 WIB",
      isVerified: true,
      rating: 0,
    },
    features: [
      "Bisa Sewa-Milik (Rent to Own)",
      "Kondisi Seperti Baru Terawat",
      "Teknologi Sole N-ergy & ABZORB Empuk",
      "COD Area Sumbersari / UNEJ Jember",
    ],
    deposit: 100000,
    description: "Dijual / Disewakan sepatu koleksi pribadi New Balance 2022R (2002R series). Pemakaian santai indoor, outsole masih sangat tebal dan grip aman tidak licin. Upper mesh dan suede bersih terawat. Cocok dicoba sewa dulu buat event, hangout, atau kuliah sebelum memutuskan beli permanen!",
    packageIncludes: [
      "Unit Sepatu New Balance 2022R (Kiri & Kanan)",
      "Shoe Tree Foam Pelindung Bentuk",
      "Insole Original New Balance",
      "Tali Sepatu Bawaan",
      "Replacement Box",
    ],
  },
];

export const CATEGORIES = [
  { id: "fashion", name: "Fashion & Aksesori", icon: "Shirt" },
  { id: "gadget", name: "Gadget & Elektronik", icon: "Smartphone" },
  { id: "hobi", name: "Hobi & Koleksi", icon: "Gamepad2" },
  { id: "furnitur", name: "Perlengkapan Rumah Tangga & Furnitur", icon: "Armchair" },
];

export const JEMBER_DISTRICTS = [
  "Semua Area Jember",
  "Sumbersari (Area Kampus UNEJ & POLIJE)",
  "Kaliwates (Gajah Mada & Hayam Wuruk)",
  "Patrang (dr. Soebandi & Stasiun Jember)",
  "Kebonsari & Gladak Pakem",
  "Tegal Besar & Mangli",
];
