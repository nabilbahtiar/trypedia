"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const slides = [
  { src: "/images/banner-realistic.jpg", alt: "Koleksi barang second TryPedia Jember", photo: true },
  { src: "/images/banner-marketplace-green.webp", alt: "Ilustrasi marketplace dan pilihan produk", photo: false },
  { src: "/images/banner-shopping-green.webp", alt: "Ilustrasi belanja melalui marketplace", photo: false },
];

export default function HomeBannerGallery() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reducedMotion) return;
    const timer = setInterval(() => {
      if (!document.hidden) setActive(current => (current + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused, hovered, focused, reducedMotion]);
  return <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-[#EBF8EE]"
    role="region" aria-roledescription="carousel" aria-label="Galeri TryPedia"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className="relative aspect-[16/9] w-full overflow-hidden">
    {slides.map((slide, index) => <div key={slide.src} aria-hidden={active !== index} className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${active === index ? "opacity-100" : "opacity-0"}`}>
      <img src={slide.src} alt={slide.alt} fetchPriority={index === 0 ? "high" : "auto"} className={`w-full h-full transition-transform duration-[5000ms] ease-linear motion-reduce:transform-none motion-reduce:transition-none ${slide.photo ? "object-cover" : "object-contain bg-[#EBF8EE]"} ${active === index ? "scale-105" : "scale-100"}`} />
    </div>)}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center gap-0.5">
        {slides.map((slide,index)=><button key={slide.src} type="button" aria-label={`Tampilkan gambar ${index+1}`} aria-current={active===index?"true":undefined} onClick={()=>setActive(index)} className="flex h-7 w-7 items-center justify-center rounded-lg focus-visible:outline-[#03AC0E]"><span className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${active===index?"w-4 bg-[#03AC0E]":"w-1.5 bg-gray-300"}`} /></button>)}
      </div>
      <div className="flex items-center gap-1 text-gray-500">
        <button type="button" onClick={()=>setPaused(current=>!current)} aria-label={paused?"Putar galeri otomatis":"Jeda galeri"} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100">{paused?<Play className="h-3.5 w-3.5" />:<Pause className="h-3.5 w-3.5" />}</button>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <button type="button" onClick={()=>setActive(current=>(current+slides.length-1)%slides.length)} aria-label="Gambar sebelumnya" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={()=>setActive(current=>(current+1)%slides.length)} aria-label="Gambar berikutnya" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  </div>;
}
