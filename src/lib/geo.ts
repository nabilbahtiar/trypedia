export interface Coordinates {
  lat: number;
  lng: number;
}

export type RadiusFilter = number | "jember";

export const RADIUS_OPTIONS: RadiusFilter[] = [2, 5, 10, "jember"];

/** Geographic bounding box covering Kabupaten Jember (Kencong/Sumberbaru to Silo/Sumberjambe). */
export const JEMBER_MAP_BOUNDS: [[number, number], [number, number]] = [
  [-8.41, 113.30],
  [-7.97, 113.98],
];

const NON_JEMBER_REGION_KEYWORDS = [
  "banyuwangi",
  "bondowoso",
  "lumajang",
  "situbondo",
  "probolinggo",
  "pasuruan",
  "malang",
  "surabaya",
  "sidoarjo",
  "gresik",
  "mojokerto",
  "jombang",
  "kediri",
  "blitar",
  "madiun",
  "jakarta",
  "bandung",
  "semarang",
  "yogyakarta",
  "denpasar",
];

export function parseStoredRadius(raw: string | null): RadiusFilter {
  if (!raw) return 2;
  if (raw === "jember") return "jember";
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 2;
}

export function formatRadiusLabel(
  radius: RadiusFilter,
  unit: "Km" | "km" = "Km"
): string {
  if (radius === "jember") return "Seluruh Jember";
  return `${radius} ${unit}`;
}

export function isWithinJemberBounds(lat: number, lng: number): boolean {
  return lat >= -8.52 && lat <= -7.93 && lng >= 113.22 && lng <= 114.04;
}

export function isSellerRegisteredInJember(seller?: {
  location?: string | null;
  district?: string | null;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  if (!seller) return false;
  const locationLower = (seller.location || "").toLowerCase();
  const districtLower = (seller.district || "").toLowerCase();
  const combined = `${locationLower} ${districtLower}`.trim();

  const hasCoords =
    typeof seller.lat === "number" &&
    Number.isFinite(seller.lat) &&
    typeof seller.lng === "number" &&
    Number.isFinite(seller.lng);

  if (hasCoords && !isWithinJemberBounds(seller.lat as number, seller.lng as number)) {
    return false;
  }

  const mentionsKabJember =
    combined.includes("kab. jember") || combined.includes("kabupaten jember");
  const mentionsOtherCity = NON_JEMBER_REGION_KEYWORDS.some((city) =>
    combined.includes(city)
  );
  if (mentionsOtherCity && !mentionsKabJember) {
    return false;
  }

  if (/\bjember\b/i.test(combined)) {
    return true;
  }

  return hasCoords && isWithinJemberBounds(seller.lat as number, seller.lng as number);
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "";
  if (distanceKm < 0.1) return "< 0.1 km";
  return `${distanceKm.toFixed(1)} km`;
}

