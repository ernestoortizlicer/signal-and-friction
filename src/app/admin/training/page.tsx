"use client";

import { useState } from "react";
import DailyTrainingPlanV3 from "../learning/DailyTrainingPlanV3";
import DiagnosticCalibration from "../learning/DiagnosticCalibration";
import ReasoningActivities from "../learning/ReasoningActivities";

type Tab="today"|"calibration"|"reasoning";

export default function TrainingPage(){
 const[tab,setTab]=useState<Tab>("today");
 return <main className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-4 md:p-6 font-mono">
  <div className="max-w-[1400px] mx-auto space-y-5">
   <header className="border-b border-[#D4A853]/15 pb-5"><span className="text-[10px] text-[#D4A853]/70 tracking-[0.35em] uppercase">Training OS v3 · Deliberate Practice</span><h1 className="font-serif text-3xl mt-1">Train capability. Validate evidence. Track fluency.</h1><p className="text-xs text-[#7A6F65] mt-2 max-w-3xl">Resources are inputs, not proof. Server-timed practice, evidence and calibration are the active authority; premium authorization remains a separate fail-closed gate.</p></header>
   <nav className="flex gap-5 border-b border-[#D4A853]/10">{([["today","Today"],["calibration","Diagnostic Calibration"],["reasoning","Reasoning Lab"]] as [Tab,string][]).map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`pb-3 text-xs uppercase tracking-widest border-b-2 ${tab===k?"border-[#D4A853] text-[#D4A853]":"border-transparent text-[#7A6F65]"}`}>{l}</button>)}</nav>
   {tab==="today"&&<DailyTrainingPlanV3 onOpenCalibration={()=>setTab("calibration")} onOpenReasoning={()=>setTab("reasoning")}/>} {tab==="calibration"&&<DiagnosticCalibration/>} {tab==="reasoning"&&<ReasoningActivities/>}
  </div>
 </main>
}
