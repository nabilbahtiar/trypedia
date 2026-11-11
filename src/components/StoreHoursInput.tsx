"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { STORE_DAYS, parseStoreHours, formatStoreHours, type StoreHoursValue } from "@/lib/store-hours";

export default function StoreHoursInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hours, setHours] = useState(() => parseStoreHours(value));
  const lastValue = useRef(value);
  const [picker, setPicker] = useState<"open" | "close" | null>(null);
  const [part, setPart] = useState<"hour" | "minute">("hour");
  const [draft, setDraft] = useState("09:00");
  const everyDayRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (value !== lastValue.current) { lastValue.current = value; setHours(parseStoreHours(value)); }
  }, [value]);
  useEffect(() => {
    if (everyDayRef.current) everyDayRef.current.indeterminate = hours.days.length > 0 && hours.days.length < 7;
  }, [hours.days]);
  useEffect(() => {
    if (!picker) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setPicker(null); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [picker]);
  function update(next: StoreHoursValue) {
    setHours(next);
    lastValue.current = formatStoreHours(next);
    onChange(lastValue.current);
  }
  function openPicker(target: "open" | "close") { setDraft(hours[target]); setPart("hour"); setPicker(target); }
  const [hour, minute] = draft.split(":");
  const checkboxClass = "h-4 w-4 rounded border-gray-300 accent-[#03AC0E]";
  return <div className="space-y-5">
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-gray-900">Hari Operasional</legend>
      <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
        <input ref={everyDayRef} type="checkbox" checked={hours.days.length === 7} onChange={event => update({ ...hours, days: event.target.checked ? [...STORE_DAYS] : [] })} className={checkboxClass} />Setiap Hari
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STORE_DAYS.map(day => <label key={day} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${hours.days.includes(day) ? "border-[#03AC0E]/30 bg-[#EBF8EE] text-gray-900" : "border-gray-200 text-gray-600"}`}>
          <input type="checkbox" checked={hours.days.includes(day)} onChange={event => update({ ...hours, days: event.target.checked ? [...hours.days, day] : hours.days.filter(item => item !== day) })} className={checkboxClass} />{day}
        </label>)}
      </div>
      {!hours.days.length && <p role="alert" className="mt-2 text-xs text-red-600">Pilih minimal satu hari operasional.</p>}
    </fieldset>
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={hours.allDay} onChange={event => update({ ...hours, allDay: event.target.checked })} className={checkboxClass} />Buka 24 jam</label>
      {!hours.allDay && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([['open', 'Jam Buka'], ['close', 'Jam Tutup']] as const).map(([key, label]) => <div key={key}>
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
          <button type="button" onClick={() => openPicker(key)} aria-label={`${label}: ${hours[key]} WIB`} aria-haspopup="dialog" className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm font-semibold text-gray-900 hover:border-[#03AC0E] focus-visible:outline-[#03AC0E]">
            <Clock className="h-4 w-4 text-gray-400" /><span className="font-mono">{hours[key]}</span><span className="ml-auto text-xs text-gray-500">WIB</span>
          </button>
        </div>)}
      </div>}
    </div>
    {picker && <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" onClick={() => setPicker(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="time-picker-title" className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" onClick={event => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 id="time-picker-title" className="text-sm font-bold text-gray-900">{picker === "open" ? "Jam Buka" : "Jam Tutup"}</h3><button type="button" onClick={() => setPicker(null)} aria-label="Tutup pemilih waktu" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4"><span className="text-xs font-semibold text-gray-500">Waktu Dipilih:</span><div className="flex items-center gap-2 font-mono text-lg font-bold">
          <button type="button" autoFocus onClick={() => setPart("hour")} aria-label="Pilih jam" className={`rounded-lg px-3 py-1.5 ${part === "hour" ? "bg-[#03AC0E] text-white" : "bg-gray-100 text-gray-700"}`}>{hour}</button><span className="text-gray-400">:</span>
          <button type="button" onClick={() => setPart("minute")} aria-label="Pilih menit" className={`rounded-lg px-3 py-1.5 ${part === "minute" ? "bg-[#03AC0E] text-white" : "bg-gray-100 text-gray-700"}`}>{minute}</button><span className="text-xs text-gray-500">WIB</span>
        </div></div>
        <p className="mb-3 mt-4 text-xs font-semibold text-gray-800">{part === "hour" ? "Pilih jam (00 - 23)" : "Pilih menit (00 - 59)"}</p>
        <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain">
          {Array.from({ length: part === "hour" ? 24 : 60 }, (_, index) => String(index).padStart(2, "0")).map(number => <button key={number} type="button" aria-pressed={number === (part === "hour" ? hour : minute)} onClick={() => { setDraft(part === "hour" ? `${number}:${minute}` : `${hour}:${number}`); if (part === "hour") setPart("minute"); }} className={`rounded-xl border py-2 font-mono text-sm font-semibold ${number === (part === "hour" ? hour : minute) ? "border-[#03AC0E] bg-[#03AC0E] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[#03AC0E]"}`}>{number}</button>)}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3"><span className="text-xs text-gray-500">Terpilih: <strong>{draft} WIB</strong></span><button type="button" onClick={() => { update({ ...hours, [picker]: draft }); setPicker(null); }} className="rounded-xl bg-[#03AC0E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02980C]">Selesai</button></div>
      </section>
    </div>}
  </div>;
}
