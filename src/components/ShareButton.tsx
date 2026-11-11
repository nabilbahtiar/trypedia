"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Link as LinkIcon, Mail, MessageCircle, Share2, X } from "lucide-react";

export default function ShareButton({ title, description, image, path }: { title: string; description?: string | null; image?: string | null; path: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>('button,a[href],input');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keydown);
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open]);
  async function copy() {
    setError("");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        input.current?.select();
        if (!document.execCommand("copy")) throw new Error("copy failed");
      }
      setCopied(true);
    } catch {
      input.current?.focus({ preventScroll: true }); input.current?.select();
      setError("Link belum berhasil disalin. Salin dari kolom tautan di bawah.");
    }
  }
  const message = `${title}\n${url}`;
  const actionClass = "flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors";
  const iconClass = "flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[#03AC0E]";
  return <>
    <button ref={trigger} type="button" onClick={() => { setUrl(new URL(path, window.location.origin).href); setCopied(false); setError(""); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
      <Share2 className="h-3.5 w-3.5" />Bagikan
    </button>
    {open && <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/45 p-4" onClick={() => setOpen(false)}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={heading} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 id={heading} className="text-xl font-bold text-gray-900">Bagikan</h2><button type="button" onClick={() => setOpen(false)} aria-label="Tutup Bagikan" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
            {image && <img src={image} alt={title} className="w-24 sm:w-28 min-h-28 object-cover shrink-0" />}
            <div className="min-w-0 self-center p-3 space-y-1"><p className="line-clamp-2 text-sm font-semibold text-gray-900">{title}</p>{description && <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">{description}</p>}<p className="truncate text-xs text-[#03AC0E]">{new URL(url).host}</p></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={copy} className={actionClass}><span className={iconClass}>{copied ? <Check className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}</span>{copied ? "Tersalin" : "Copy Link"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={actionClass}><span className={iconClass}><MessageCircle className="h-6 w-6" /></span>WhatsApp</a>
          <a href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={actionClass}><span className={iconClass}><Mail className="h-6 w-6" /></span>Gmail</a>
        </div>
        <div><label className="sr-only" htmlFor={`${heading}-url`}>Link untuk dibagikan</label><input ref={input} id={`${heading}-url`} readOnly value={url} onFocus={event => event.currentTarget.select()} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600" />{copied && <p role="status" className="mt-2 text-xs text-[#03AC0E]">Link berhasil disalin.</p>}{error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}</div>
      </section>
    </div>}
  </>;
}
