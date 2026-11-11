export const STORE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
export interface StoreHoursValue { days: string[]; open: string; close: string; allDay: boolean }

export function parseStoreHours(value: string): StoreHoursValue {
  const times = value.match(/\b\d{1,2}[:.]\d{2}\b/g) || [];
  const prefix = value.split("(")[0];
  const range = prefix.match(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s*-\s*(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/);
  let days: string[] = STORE_DAYS.filter(day => prefix.includes(day));
  if (range) {
    const from = STORE_DAYS.indexOf(range[1] as typeof STORE_DAYS[number]);
    const to = STORE_DAYS.indexOf(range[2] as typeof STORE_DAYS[number]);
    days = STORE_DAYS.filter((_, index) => from <= to ? index >= from && index <= to : index >= from || index <= to);
  }
  if (value && (!days.length || value.includes("Setiap Hari"))) days = [...STORE_DAYS];
  return { days, open: times[0]?.replace(".", ":").padStart(5, "0") || "09:00", close: times[1]?.replace(".", ":").padStart(5, "0") || "21:00", allDay: /24 jam/i.test(value) };
}

export function formatStoreHours(value: StoreHoursValue) {
  const days = STORE_DAYS.filter(day => value.days.includes(day));
  if (!days.length) return "";
  const time = value.allDay ? "24 Jam" : `${value.open} - ${value.close} WIB`;
  return days.length === 7 ? time : `${days.join(", ")} (${time})`;
}
