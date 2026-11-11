import { calculateDistanceKm } from "@/lib/geo";

export function jakartaDate(now = new Date(), offset = 0) {
  return new Date(now.getTime()+7*3600000+offset*86400000).toISOString().slice(0,10);
}
export function scheduleError(day: string, time: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<jakartaDate(now)||day>jakartaDate(now,2)) return "Pilih tanggal hari ini, besok, atau lusa.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Pilih waktu serah-terima.";
  const timestamp = new Date(`${day}T${time}:00+07:00`).getTime();
  if (!Number.isFinite(timestamp)||jakartaDate(new Date(timestamp))!==day) return "Tanggal tidak valid.";
  return timestamp<=now.getTime()?"Pilih waktu setelah waktu sekarang.":"";
}
export function deliveryPrice(fromLat: unknown, fromLng: unknown, toLat: unknown, toLng: unknown) {
  const values=[fromLat,fromLng,toLat,toLng];
  if(values.some(value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value)))) return null;
  const [a,b,c,d]=values.map(Number);
  if(Math.abs(a)>90||Math.abs(c)>90||Math.abs(b)>180||Math.abs(d)>180) return null;
  const distanceKm=calculateDistanceKm(a,b,c,d);
  return {distanceKm,shippingFee:Math.round(Math.max(3,distanceKm)*2000)};
}
