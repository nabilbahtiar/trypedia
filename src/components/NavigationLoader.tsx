"use client";
import {Suspense,useEffect,useState} from "react";
import {usePathname,useSearchParams,useRouter} from "next/navigation";
function Progress(){
 const pathname=usePathname(),search=useSearchParams(),router=useRouter();const [active,setActive]=useState(false),[progress,setProgress]=useState(0);
 useEffect(()=>{setActive(false);setProgress(0);},[pathname,search]);
 useEffect(()=>{const prefetched=new Map<string,number>();
 const target=(event:Event)=>{const anchor=(event.target as HTMLElement)?.closest('a');if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return null;const url=new URL(anchor.href,location.href);if(url.origin!==location.origin||url.pathname.startsWith('/api/')||(url.pathname===location.pathname&&url.search===location.search))return null;return url;};
 const click=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(target(event)){setActive(true);setProgress(25);}};
 const prefetch=(event:Event)=>{const url=target(event);if(!url)return;const key=url.pathname+url.search;if(Date.now()-(prefetched.get(key)||0)<30000)return;prefetched.set(key,Date.now());router.prefetch(key);};
 document.addEventListener('click',click,true);document.addEventListener('pointerover',prefetch);document.addEventListener('focusin',prefetch);
 return()=>{document.removeEventListener('click',click,true);document.removeEventListener('pointerover',prefetch);document.removeEventListener('focusin',prefetch);};},[router]);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setProgress(value=>Math.min(90,value+(90-value)/4)),300);const stop=setTimeout(()=>setActive(false),15000);return()=>{clearInterval(timer);clearTimeout(stop);};},[active]);
 return active?<div role="progressbar" aria-label="Memuat halaman" className="pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[3px]"><div className="h-full bg-[#03AC0E] transition-[width] duration-300" style={{width:progress+'%'}} /></div>:null;
}
export default function NavigationLoader(){return <Suspense fallback={null}><Progress /></Suspense>;}
