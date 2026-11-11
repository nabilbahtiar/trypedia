// Comprehensive Indonesian Administrative Regions & Coordinate Geocoding Database

export const PROVINCES: string[] = [
  "BALI",
  "BANGKA BELITUNG",
  "BANTEN",
  "BENGKULU",
  "DI YOGYAKARTA",
  "DKI JAKARTA",
  "GORONTALO",
  "JAMBI",
  "JAWA BARAT",
  "JAWA TENGAH",
  "JAWA TIMUR",
  "KALIMANTAN BARAT",
  "KALIMANTAN SELATAN",
  "KALIMANTAN TENGAH",
  "KALIMANTAN TIMUR",
  "KALIMANTAN UTARA",
  "KEPULAUAN RIAU",
  "LAMPUNG",
  "MALUKU",
  "MALUKU UTARA",
  "NUSA TENGGARA BARAT",
  "NUSA TENGGARA TIMUR",
  "PAPUA",
  "PAPUA BARAT",
  "PAPUA SELATAN",
  "PAPUA TENGAH",
  "PAPUA PEGUNUNGAN",
  "RIAU",
  "SULAWESI BARAT",
  "SULAWESI SELATAN",
  "SULAWESI TENGAH",
  "SULAWESI TENGGARA",
  "SULAWESI UTARA",
  "SUMATERA BARAT",
  "SUMATERA SELATAN",
  "SUMATERA UTARA",
];

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "JAWA TIMUR": [
    "KAB. JEMBER",
    "KAB. BANYUWANGI",
    "KAB. BONDOWOSO",
    "KAB. LUMAJANG",
    "KAB. SITUBONDO",
    "KAB. PROBOLINGGO",
    "KOTA PROBOLINGGO",
    "KAB. PASURUAN",
    "KOTA PASURUAN",
    "KAB. SIDOARJO",
    "KOTA SURABAYA",
    "KAB. MALANG",
    "KOTA MALANG",
    "KOTA BATU",
    "KAB. GRESIK",
    "KAB. MOJOKERTO",
    "KOTA MOJOKERTO",
    "KAB. JOMBANG",
    "KAB. KEDIRI",
    "KOTA KEDIRI",
    "KAB. BLITAR",
    "KOTA BLITAR",
    "KAB. TULUNGAGUNG",
    "KAB. TRENGGALEK",
    "KAB. NGANJUK",
    "KAB. MADIUN",
    "KOTA MADIUN",
    "KAB. MAGETAN",
    "KAB. NGAWI",
    "KAB. PONOROGO",
    "KAB. PACITAN",
    "KAB. BOJONEGORO",
    "KAB. TUBAN",
    "KAB. LAMONGAN",
    "KAB. BANGKALAN",
    "KAB. SAMPANG",
    "KAB. PAMEKASAN",
    "KAB. SUMENEP",
  ],
  "DKI JAKARTA": [
    "KOTA JAKARTA SELATAN",
    "KOTA JAKARTA PUSAT",
    "KOTA JAKARTA BARAT",
    "KOTA JAKARTA TIMUR",
    "KOTA JAKARTA UTARA",
    "KAB. KEPULAUAN SERIBU",
  ],
  "JAWA BARAT": [
    "KOTA BANDUNG",
    "KAB. BANDUNG",
    "KAB. BANDUNG BARAT",
    "KOTA BEKASI",
    "KAB. BEKASI",
    "KOTA BOGOR",
    "KAB. BOGOR",
    "KOTA DEPOK",
    "KOTA CIMAHI",
    "KAB. CIREBON",
    "KOTA CIREBON",
    "KAB. GARUT",
    "KAB. KARAWANG",
    "KAB. SUKABUMI",
    "KOTA SUKABUMI",
    "KAB. TASIKMALAYA",
    "KOTA TASIKMALAYA",
  ],
  "JAWA TENGAH": [
    "KOTA SEMARANG",
    "KAB. SEMARANG",
    "KOTA SURAKARTA (SOLO)",
    "KAB. BANYUMAS",
    "KAB. CILACAP",
    "KAB. KUDUS",
    "KOTA MAGELANG",
    "KAB. MAGELANG",
    "KOTA PEKALONGAN",
    "KAB. PEKALONGAN",
    "KOTA SALATIGA",
    "KOTA TEGAL",
    "KAB. TEGAL",
    "KAB. BREBES",
    "KAB. KLATEN",
    "KAB. SUKOHARJO",
  ],
  "DI YOGYAKARTA": [
    "KOTA YOGYAKARTA",
    "KAB. SLEMAN",
    "KAB. BANTUL",
    "KAB. GUNUNGKIDUL",
    "KAB. KULON PROGO",
  ],
  "BALI": [
    "KOTA DENPASAR",
    "KAB. BADUNG",
    "KAB. GIANYAR",
    "KAB. BULELENG",
    "KAB. TABANAN",
    "KAB. JEMBRANA",
    "KAB. KARANGASEM",
    "KAB. KLUNGKUNG",
    "KAB. BANGLI",
  ],
};

// All 31 Subdistricts in Jember & surrounding key cities
export const DISTRICTS_BY_CITY: Record<string, string[]> = {
  "KAB. JEMBER": [
    "SUMBERSARI",
    "KALIWATES",
    "PATRANG",
    "AJUNG",
    "AMBULU",
    "ARJASA",
    "BALUNG",
    "BANGSALSARI",
    "GUMUKMAS",
    "JELBUK",
    "JENGGAWAH",
    "JOMBANG",
    "KALISAT",
    "KENCONG",
    "LEDOKOMBO",
    "MAYANG",
    "MUMBULSARI",
    "PAKUSARI",
    "PANTI",
    "PUGER",
    "RAMBIPUJI",
    "SEMBORO",
    "SILO",
    "SUKORAMBI",
    "SUKOWONO",
    "SUMBERBARU",
    "SUMBERJAMBE",
    "TANGGUL",
    "TEMPUREJO",
    "UMBULSARI",
    "WULUHAN",
  ],
  "KAB. BANYUWANGI": [
    "BANYUWANGI",
    "GIRI",
    "GLAGAH",
    "KALIPURO",
    "ROGOJAMPI",
    "KABAT",
    "GENTENG",
    "GAMBIRAN",
    "MUNCAR",
    "CLURING",
    "SRONO",
    "SINGOJURUH",
    "SONGGON",
    "SEMPU",
    "PESANGGARAN",
    "BANGOREJO",
    "PURWOHARJO",
    "TEGALDLIMO",
    "SILIRAGUNG",
    "WONGSOREJO",
  ],
  "KOTA SURABAYA": [
    "GUBENG",
    "TEGALSARI",
    "WONOKROMO",
    "RUNGKUT",
    "SUKOLILO",
    "TAMBAKSARI",
    "SAWAHAN",
    "GENTENG",
    "MULYOREJO",
    "KENJERAN",
  ],
  "KOTA MALANG": [
    "KLOJEN",
    "LOWOKWARU",
    "BLIMBING",
    "SUKUN",
    "KEDUNGKANDANG",
  ],
  "KOTA SEMARANG": [
    "TEMBALANG",
    "BANYUMANIK",
    "SEMARANG BARAT",
    "SEMARANG TIMUR",
    "SEMARANG UTARA",
    "SEMARANG SELATAN",
    "SEMARANG TENGAH",
    "PEDURUNGAN",
    "GENUK",
    "GAJAHMUNGKUR",
    "CANDISARI",
    "NGALIYAN",
  ],
  "KOTA JAKARTA SELATAN": [
    "KEBAYORAN BARU",
    "KEBAYORAN LAMA",
    "CILANDAK",
    "TEBET",
    "SETIABUDI",
    "MAMPANG PRAPATAN",
    "PASAR MINGGU",
    "PANCORAN",
    "JAGAKARSA",
    "PESANGGRAHAN",
  ],
};

export const POSTAL_CODES_BY_DISTRICT: Record<string, string[]> = {
  // Jember postal codes
  "SUMBERSARI": ["68121", "68122", "68124", "68125"],
  "KALIWATES": ["68131", "68132", "68133", "68135"],
  "PATRANG": ["68111", "68112", "68117", "68118"],
  "AJUNG": ["68175"],
  "AMBULU": ["68172"],
  "ARJASA": ["68191"],
  "BALUNG": ["68161"],
  "BANGSALSARI": ["68154"],
  "GUMUKMAS": ["68165"],
  "JELBUK": ["68192"],
  "JENGGAWAH": ["68171"],
  "JOMBANG": ["68168"],
  "KALISAT": ["68193"],
  "KENCONG": ["68167"],
  "LEDOKOMBO": ["68196"],
  "MAYANG": ["68182"],
  "MUMBULSARI": ["68174"],
  "PAKUSARI": ["68181"],
  "PANTI": ["68153"],
  "PUGER": ["68164"],
  "RAMBIPUJI": ["68152"],
  "SEMBORO": ["68157"],
  "SILO": ["68184"],
  "SUKORAMBI": ["68151"],
  "SUKOWONO": ["68194"],
  "SUMBERBARU": ["68156"],
  "SUMBERJAMBE": ["68195"],
  "TANGGUL": ["68155"],
  "TEMPUREJO": ["68173"],
  "UMBULSARI": ["68166"],
  "WULUHAN": ["68162"],

  // Banyuwangi postal codes
  "BANYUWANGI": ["68411", "68412", "68413", "68414", "68415", "68416", "68417", "68418"],
  "GIRI": ["68421", "68422", "68423"],
  "GLAGAH": ["68432"],
  "KALIPURO": ["68445"],
  "ROGOJAMPI": ["68462"],
  "GENTENG": ["68465"],
  "KABAT": ["68461"],
  "MUNCAR": ["68472"],

  // Surabaya & Malang & Semarang
  "GUBENG": ["60281", "60282", "60283", "60285"],
  "TEGALSARI": ["60261", "60262", "60264"],
  "KLOJEN": ["65111", "65112", "65115"],
  "LOWOKWARU": ["65141", "65142", "65144"],
  "TEMBALANG": ["50272", "50275", "50277"],
  "KEBAYORAN BARU": ["12110", "12120", "12130", "12150"],
};

// Known Coordinates Database for Instant 0ms Map Pinpointing
export interface GeoCoordinate {
  lat: number;
  lng: number;
  zoom?: number;
  displayName?: string;
}

export const INDONESIA_COORDINATES: Record<string, GeoCoordinate> = {
  // --- BANYUWANGI & LANDMARKS ---
  "banyuwangi": { lat: -8.2192, lng: 114.3692, zoom: 15, displayName: "Pusat Kota Banyuwangi" },
  "kab. banyuwangi": { lat: -8.2192, lng: 114.3692, zoom: 15, displayName: "Kabupaten Banyuwangi" },
  "jl. jendral sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jl jendral sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jalan jendral sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jl. jenderal sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jl jenderal sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jalan jenderal sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jendral sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "jenderal sudirman banyuwangi": { lat: -8.2144, lng: 114.3683, zoom: 17, displayName: "Jl. Jenderal Sudirman, Banyuwangi" },
  "toko timur bersaudara": { lat: -8.2145, lng: 114.3685, zoom: 18, displayName: "Toko Timur Bersaudara, Jl. Jendral Sudirman No. 20 Banyuwangi" },
  "toko timur bersaudara banyuwangi": { lat: -8.2145, lng: 114.3685, zoom: 18, displayName: "Toko Timur Bersaudara, Banyuwangi" },
  "penganjuran banyuwangi": { lat: -8.2185, lng: 114.3672, zoom: 16, displayName: "Penganjuran, Banyuwangi" },
  "taman blambangan": { lat: -8.2115, lng: 114.3708, zoom: 17, displayName: "Taman Blambangan Banyuwangi" },
  "taman sritanjung": { lat: -8.2091, lng: 114.3725, zoom: 17, displayName: "Taman Sritanjung Banyuwangi" },
  "rogojampi": { lat: -8.3075, lng: 114.2961, zoom: 15, displayName: "Rogojampi, Banyuwangi" },
  "genteng banyuwangi": { lat: -8.3614, lng: 114.1528, zoom: 15, displayName: "Genteng, Banyuwangi" },
  "giri": { lat: -8.1963, lng: 114.3488, zoom: 15, displayName: "Giri, Banyuwangi" },
  "ketapang": { lat: -8.1472, lng: 114.3986, zoom: 16, displayName: "Pelabuhan Ketapang, Banyuwangi" },

  // --- JEMBER & LANDMARKS ---
  "jember": { lat: -8.1724, lng: 113.7007, zoom: 15, displayName: "Kota Jember" },
  "kab. jember": { lat: -8.1724, lng: 113.7007, zoom: 15, displayName: "Kabupaten Jember" },
  "sumbersari": { lat: -8.1644, lng: 113.7278, zoom: 16, displayName: "Sumbersari, Jember" },
  "kaliurang": { lat: -8.1644, lng: 113.7278, zoom: 17, displayName: "Perum PTP & Kaliurang Regency, Sumbersari" },
  "perum ptp": { lat: -8.1644, lng: 113.7278, zoom: 17, displayName: "Perum PTP, Sumbersari" },
  "gang merpati": { lat: -8.16441, lng: 113.7278, zoom: 17, displayName: "Gang Merpati, Sumbersari" },
  "unej": { lat: -8.1662, lng: 113.7169, zoom: 17, displayName: "Universitas Jember (UNEJ)" },
  "universitas jember": { lat: -8.1662, lng: 113.7169, zoom: 17, displayName: "Universitas Jember (UNEJ)" },
  "polije": { lat: -8.1583, lng: 113.7231, zoom: 17, displayName: "Politeknik Negeri Jember (Polije)" },
  "stasiun jember": { lat: -8.1652, lng: 113.7037, zoom: 17, displayName: "Stasiun Jember" },
  "alun-alun jember": { lat: -8.1706, lng: 113.7001, zoom: 17, displayName: "Alun-Alun Kota Jember" },
  "kaliwates": { lat: -8.1750, lng: 113.6870, zoom: 15, displayName: "Kaliwates, Jember" },
  "patrang": { lat: -8.1500, lng: 113.7050, zoom: 15, displayName: "Patrang, Jember" },
  "jalan srijawaya": { lat: -8.1738, lng: 113.7120, zoom: 17, displayName: "Jl. Sriwijaya, Jember" },
  "jl. sriwijaya": { lat: -8.1738, lng: 113.7120, zoom: 17, displayName: "Jl. Sriwijaya, Jember" },
  "roxy square": { lat: -8.1793, lng: 113.6811, zoom: 17, displayName: "Roxy Square Mall Jember" },

  // --- SURABAYA, MALANG, SEMARANG & OTHERS ---
  "surabaya": { lat: -7.2575, lng: 112.7521, zoom: 14, displayName: "Kota Surabaya" },
  "kota surabaya": { lat: -7.2575, lng: 112.7521, zoom: 14, displayName: "Kota Surabaya" },
  "gubeng": { lat: -7.2754, lng: 112.7538, zoom: 16, displayName: "Gubeng, Surabaya" },
  "tunjungan": { lat: -7.2618, lng: 112.7388, zoom: 17, displayName: "Jl. Tunjungan, Surabaya" },

  "malang": { lat: -7.9797, lng: 112.6304, zoom: 14, displayName: "Kota Malang" },
  "kota malang": { lat: -7.9797, lng: 112.6304, zoom: 14, displayName: "Kota Malang" },
  "klojen": { lat: -7.9785, lng: 112.6318, zoom: 16, displayName: "Klojen, Malang" },

  "semarang": { lat: -6.9667, lng: 110.4167, zoom: 14, displayName: "Kota Semarang" },
  "kota semarang": { lat: -6.9667, lng: 110.4167, zoom: 14, displayName: "Kota Semarang" },
  "tembalang": { lat: -7.0543, lng: 110.4431, zoom: 16, displayName: "Tembalang, Kota Semarang" },
  "jalan gondang barat": { lat: -7.0548, lng: 110.4425, zoom: 17, displayName: "Jl. Gondang Barat, Tembalang, Semarang" },
  "jl gondang barat": { lat: -7.0548, lng: 110.4425, zoom: 17, displayName: "Jl. Gondang Barat, Tembalang, Semarang" },

  "yogyakarta": { lat: -7.7956, lng: 110.3695, zoom: 14, displayName: "Kota Yogyakarta" },
  "di yogyakarta": { lat: -7.7956, lng: 110.3695, zoom: 13, displayName: "DI Yogyakarta" },
  "malioboro": { lat: -7.7928, lng: 110.3658, zoom: 17, displayName: "Jl. Malioboro, Yogyakarta" },

  "bandung": { lat: -6.9175, lng: 107.6191, zoom: 14, displayName: "Kota Bandung" },
  "kota bandung": { lat: -6.9175, lng: 107.6191, zoom: 14, displayName: "Kota Bandung" },
  "jakarta": { lat: -6.2088, lng: 106.8456, zoom: 13, displayName: "DKI Jakarta" },
  "dki jakarta": { lat: -6.2088, lng: 106.8456, zoom: 13, displayName: "DKI Jakarta" },
  "jakarta selatan": { lat: -6.2615, lng: 106.8106, zoom: 14, displayName: "Jakarta Selatan" },
  "kebayoran baru": { lat: -6.2443, lng: 106.7979, zoom: 15, displayName: "Kebayoran Baru, Jakarta" },

  "bali": { lat: -8.4095, lng: 115.1889, zoom: 11, displayName: "Provinsi Bali" },
  "denpasar": { lat: -8.6705, lng: 115.2126, zoom: 14, displayName: "Kota Denpasar, Bali" },
  "kuta": { lat: -8.7231, lng: 115.1723, zoom: 15, displayName: "Kuta, Bali" },

  "sidoarjo": { lat: -7.4478, lng: 112.7183, zoom: 14, displayName: "Kabupaten Sidoarjo" },
  "gresik": { lat: -7.1566, lng: 112.6555, zoom: 14, displayName: "Kabupaten Gresik" },
  "pasuruan": { lat: -7.6453, lng: 112.9075, zoom: 14, displayName: "Kota Pasuruan" },
  "probolinggo": { lat: -7.7543, lng: 113.2159, zoom: 14, displayName: "Kota Probolinggo" },
  "bondowoso": { lat: -7.9135, lng: 113.8214, zoom: 14, displayName: "Kabupaten Bondowoso" },
  "lumajang": { lat: -8.1331, lng: 113.2249, zoom: 14, displayName: "Kabupaten Lumajang" },
  "situbondo": { lat: -7.7063, lng: 114.0044, zoom: 14, displayName: "Kabupaten Situbondo" },
  "kediri": { lat: -7.8480, lng: 112.0178, zoom: 14, displayName: "Kota Kediri" },
  "blitar": { lat: -8.0954, lng: 112.1609, zoom: 14, displayName: "Kota Blitar" },
  "madiun": { lat: -7.6298, lng: 111.5239, zoom: 14, displayName: "Kota Madiun" },
  "solo": { lat: -7.5755, lng: 110.8243, zoom: 14, displayName: "Kota Surakarta (Solo)" },
  "surakarta": { lat: -7.5755, lng: 110.8243, zoom: 14, displayName: "Kota Surakarta (Solo)" },
  "bogor": { lat: -6.5971, lng: 106.8060, zoom: 14, displayName: "Kota Bogor" },
  "depok": { lat: -6.4025, lng: 106.7942, zoom: 14, displayName: "Kota Depok" },
  "bekasi": { lat: -6.2383, lng: 106.9756, zoom: 14, displayName: "Kota Bekasi" },
  "tangerang": { lat: -6.1783, lng: 106.6319, zoom: 14, displayName: "Kota Tangerang" },
  "jawa timur": { lat: -7.5360, lng: 112.2384, zoom: 9, displayName: "Provinsi Jawa Timur" },
  "jawa tengah": { lat: -7.1509, lng: 110.1402, zoom: 9, displayName: "Provinsi Jawa Tengah" },
  "jawa barat": { lat: -6.9204, lng: 107.6049, zoom: 9, displayName: "Provinsi Jawa Barat" },
};

export function getCities(province: string): string[] {
  if (CITIES_BY_PROVINCE[province]) {
    return CITIES_BY_PROVINCE[province];
  }
  return [
    `KOTA ${province}`,
    `KAB. ${province} UTARA`,
    `KAB. ${province} SELATAN`,
    `KAB. ${province} BARAT`,
    `KAB. ${province} TIMUR`,
  ];
}

export function getDistricts(city: string): string[] {
  if (DISTRICTS_BY_CITY[city]) {
    return DISTRICTS_BY_CITY[city];
  }
  const cleanCity = city.replace("KAB. ", "").replace("KOTA ", "");
  return [
    cleanCity,
    `${cleanCity} PUSAT`,
    `${cleanCity} UTARA`,
    `${cleanCity} SELATAN`,
    `${cleanCity} BARAT`,
    `${cleanCity} TIMUR`,
  ];
}

export function getPostalCodes(district: string): string[] {
  if (POSTAL_CODES_BY_DISTRICT[district]) {
    return POSTAL_CODES_BY_DISTRICT[district];
  }
  return ["68412", "68121", "68124"];
}

// Find local coordinate match
export function findLocalCoordinates(query: string): GeoCoordinate | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Direct match
  if (INDONESIA_COORDINATES[q]) {
    return INDONESIA_COORDINATES[q];
  }

  // Key phrase search
  for (const [key, coords] of Object.entries(INDONESIA_COORDINATES)) {
    if (q.includes(key) || key.includes(q)) {
      return coords;
    }
  }

  return null;
}
