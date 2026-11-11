"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock, X } from "lucide-react";
import { STORE_DAYS, parseStoreHours } from "@/lib/store-hours";

function jakartaToday() {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(new Date());
}

export default function StoreHoursDisplay({ hours, compact = false }: { hours?: string | null; compact?: boolean }) {
  const [today, setToday] = useState(jakartaToday);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const schedule = parseStoreHours(hours || "");
  const time = schedule.allDay ? "24 Jam" : `${schedule.open} - ${schedule.close} WIB`;
  const label = (day: string) => !hours?.trim() ? "Belum diatur" : schedule.days.includes(day) ? time : "Tutup";
  useEffect(() => {
    setToday(jakartaToday());
    const timer = setInterval(() => setToday(jakartaToday()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      // The close button is the only focusable item in this dialog.
      if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open]);
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
      aria-label={`Lihat jadwal toko. Hari ini, ${today}: ${label(today)}`}
      className={`inline-flex items-center gap-1.5 text-left hover:text-[#03AC0E] transition-colors ${compact ? "text-xs text-gray-500" : "mt-1 text-sm font-semibold text-gray-900"}`}>
      {compact && <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
      <span>Hari ini: {label(today)}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
    </button>
    {open && <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Jam operasional toko" className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" onClick={event => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-gray-900">Jam Operasional Toko</h2><button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Tutup jadwal toko" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
        <dl className="space-y-1 border-t border-gray-100 pt-3">
          {STORE_DAYS.map(day => <div key={day} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-xs ${day === today ? "bg-[#EBF8EE] font-semibold text-gray-900" : "text-gray-600"}`}>
            <dt>{day}{day === today && <span className="ml-1 text-[#03AC0E]">(Hari ini)</span>}</dt><dd className="whitespace-nowrap font-medium">{label(day)}</dd>
          </div>)}
        </dl>
      </section>
    </div>}
  </>;
}
