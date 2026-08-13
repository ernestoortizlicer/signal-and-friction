"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders, supabase } from "@/lib/supabase";
import { ADMIN_MODULES, moduleForPath, type AdminModuleId } from "@/lib/admin-module-registry";

type Signal = { health:"ready"|"attention"|"unavailable"; value:number|null; label:string; detail:string };
type OverviewPayload = { observedAt:string; modules:Partial<Record<AdminModuleId,Signal>> };

function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}

export default function AdminShellV3({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = pathname?.replace(/\/$/, "") || "";
  const isLogin = normalizedPath === "/admin/login";
  const activeModule = useMemo(() => moduleForPath(normalizedPath), [normalizedPath]);
  const [authorized,setAuthorized]=useState(false);
  const [signals,setSignals]=useState<OverviewPayload|null>(null);

  useEffect(()=>{
    if(isLogin)return;
    const allowed=(process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL||process.env.NEXT_PUBLIC_ADMIN_EMAILS||"ernestoortiz@gmail.com,ernestoortizlicer@gmail.com").split(",").map(x=>x.trim().toLowerCase());
    function authorize(session:{access_token:string;user?:{email?:string}}|null){
      if(!session){setAuthorized(false);router.push("/admin/login");return}
      const email=(session.user?.email||"").toLowerCase();
      if(!allowed.includes(email)){void supabase.auth.signOut();document.cookie="sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";setAuthorized(false);router.push("/admin/login?error=unauthorized");return}
      document.cookie=`sf-admin-session=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      setAuthorized(true);
    }
    void supabase.auth.getSession().then(({data:{session}})=>authorize(session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>authorize(session));
    return()=>subscription.unsubscribe();
  },[router,isLogin]);

  useEffect(()=>{
    if(isLogin||!authorized)return;
    let cancelled=false;
    void fetch(`/api/system/overview?date=${localDay()}`,{headers:getAuthHeaders()})
      .then(async r=>{if(!r.ok)throw new Error(`System overview ${r.status}`);return r.json()})
      .then((payload:OverviewPayload)=>{if(!cancelled)setSignals(payload)})
      .catch(()=>{if(!cancelled)setSignals(null)});
    return()=>{cancelled=true};
  },[authorized,isLogin,normalizedPath]);

  if(isLogin)return <>{children}</>;
  if(!authorized)return <div className="min-h-screen bg-[#0A0908] flex items-center justify-center"><span className="font-mono text-xs uppercase tracking-[0.2em] text-[#7A6F65]">Verifying clearance…</span></div>;

  const logout=async()=>{await supabase.auth.signOut();document.cookie="sf-admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";router.push("/admin/login")};
  const command=signals?.modules.command;
  const sales=signals?.modules.sales;
  const reliability=signals?.modules.reliability;

  return <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] flex flex-col">
    <header className="h-14 border-b border-[#D4A853]/10 px-4 md:px-5 flex items-center gap-4 bg-[#0A0908] sticky top-0 z-40">
      <Link href="/admin/overview" className="flex items-center gap-3 min-w-fit"><span className="w-3 h-3 rotate-45 border border-[#D4A853]"/><span className="font-mono text-xs font-semibold tracking-[0.16em]">S&amp;F</span><span className="hidden sm:block text-[10px] font-mono uppercase tracking-[0.18em] text-[#7A6F65]">Backend OS</span></Link>
      <div className="w-px h-5 bg-[#D4A853]/10"/>
      <div className="min-w-0"><span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-[#7A6F65]">Current module</span><span className="block text-xs text-[#D4A853] truncate">{activeModule?.label??(normalizedPath==="/admin/overview"?"Overview":"System")}</span></div>
      <div className="ml-auto hidden lg:flex items-center gap-2">
        <TopSignal label="Actions" value={command?.value} health={command?.health}/>
        <TopSignal label="Projects" value={sales?.value} health={sales?.health}/>
        <TopSignal label="Incidents" value={reliability?.value} health={reliability?.health}/>
      </div>
      <button onClick={logout} className="ml-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[#7A6F65] hover:text-[#F5F0EB]">Exit ×</button>
    </header>

    <div className="flex flex-1 min-h-0">
      <aside className="w-[72px] md:w-[248px] border-r border-[#D4A853]/10 bg-[#0D0B0A] flex-shrink-0 overflow-y-auto">
        <nav className="p-2 md:p-3 space-y-1">
          <Nav href="/admin/overview" code="OS" label="Overview" active={normalizedPath==="/admin/overview"||normalizedPath==="/admin"}/>
          <div className="my-3 border-t border-[#D4A853]/8"/>
          {ADMIN_MODULES.map(module=>{
            const active=activeModule?.id===module.id;
            const live=signals?.modules[module.id];
            return <div key={module.id}>
              <Nav href={module.href} code={module.code} label={module.label} active={active} health={live?.health}/>
              {active&&module.surfaces.length>1&&<div className="hidden md:block ml-10 mb-2 space-y-0.5">{module.surfaces.map(surface=><Link key={surface.href} href={surface.href} className={`block px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-[0.12em] ${normalizedPath===surface.href?"text-[#D4A853] bg-[#D4A853]/6":"text-[#7A6F65] hover:text-[#B0A89E]"}`}>{surface.label}</Link>)}</div>}
            </div>
          })}
        </nav>
        <div className="hidden md:block mt-4 mx-4 mb-5 p-3 border border-[#D4A853]/10 rounded-lg bg-[#110F0D]">
          <span className="block text-[9px] font-mono uppercase tracking-[0.15em] text-[#D4A853]">Architecture contract</span>
          <span className="block text-[10px] text-[#7A6F65] leading-relaxed mt-1">One purpose · one authority · explicit connections · live truth over UI claims.</span>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto relative"><div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage:"linear-gradient(rgba(212,168,83,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,168,83,.025) 1px,transparent 1px)",backgroundSize:"64px 64px"}}/><div className="relative z-10 min-h-full">{children}</div></main>
    </div>
  </div>;
}

function Nav({href,code,label,active,health}:{href:string;code:string;label:string;active:boolean;health?:Signal["health"]}){
  return <Link href={href} className={`flex items-center gap-3 rounded-lg px-2 md:px-3 py-2.5 border transition-colors ${active?"border-[#D4A853]/25 bg-[#D4A853]/8 text-[#F5F0EB]":"border-transparent text-[#A79D93] hover:bg-[#D4A853]/5 hover:text-[#F5F0EB]"}`}>
    <span className={`w-10 md:w-9 text-center font-mono text-[10px] tracking-[0.1em] ${active?"text-[#D4A853]":"text-[#7A6F65]"}`}>{code}</span>
    <span className="hidden md:block text-xs font-medium tracking-wide">{label}</span>
    {health&&<span className={`hidden md:block ml-auto w-1.5 h-1.5 rounded-full ${health==="ready"?"bg-[#5C9A6B]":health==="attention"?"bg-amber-400":"bg-[#C85C5C]"}`}/>} 
  </Link>
}

function TopSignal({label,value,health}:{label:string;value:number|null|undefined;health?:Signal["health"]}){
  return <div className="border border-[#D4A853]/10 bg-[#110F0D] rounded px-2.5 py-1 flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${health==="ready"?"bg-[#5C9A6B]":health==="attention"?"bg-amber-400":health==="unavailable"?"bg-[#C85C5C]":"bg-[#7A6F65]"}`}/><span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#7A6F65]">{label}</span><span className="text-xs font-mono tabular-nums">{value??"—"}</span></div>
}
