"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";
import { AdminStatCard } from "@/components/admin/AdminComponents";

interface PriorityTask {
  id: string;
  title: string;
  description?: string;
  category: 'beta_project' | 'incident' | 'finance' | 'manual' | 'learning';
  effort_minutes: number;
  energy_required: 'deep' | 'shallow' | 'creative' | 'analytical' | 'admin';
  deadline?: string;
  status: 'pending' | 'in_progress' | 'done' | 'delegated' | 'eliminated';
  priority_score: number;
  quadrant: 'do_now' | 'schedule' | 'delegate' | 'eliminate' | 'learn';
  revenue_impact: number;
  learning_multiplier: number;
  source_table?: string;
  source_id?: string;
  auto_generated: boolean;
  actual_minutes?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface PriorityScoreLog {
  id: string;
  task_id: string;
  score: number;
  quadrant: string;
  urgency_component: number;
  importance_component: number;
  learning_component: number;
  effort_component: number;
  age_component: number;
  energy_component: number;
  snapshot_at: string;
}

const springConfig = { type: "spring" as const, stiffness: 100, damping: 18 };

const QUADRANT_META: Record<string, { label: string; emoji: string; glow: string; border: string; bg: string }> = {
  do_now:   { label: "Do Now",    emoji: "🔥", glow: "shadow-[0_0_30px_rgba(184,92,56,0.15)]", border: "border-[#B85C38]/30", bg: "bg-[#B85C38]/[0.04]" },
  schedule: { label: "Schedule",  emoji: "📅", glow: "", border: "border-blue-500/20",          bg: "bg-blue-500/[0.03]" },
  delegate: { label: "Delegate",  emoji: "🤖", glow: "", border: "border-amber-500/20",         bg: "bg-amber-500/[0.03]" },
  eliminate:{ label: "Eliminate", emoji: "🗑️", glow: "", border: "border-white/10",             bg: "bg-white/[0.02]" },
  learn:    { label: "Learn",     emoji: "🧠", glow: "", border: "border-purple-500/20",         bg: "bg-purple-500/[0.03]" },
};

const ENERGY_ICONS: Record<string, string> = {
  deep: "🧬", shallow: "☀️", creative: "🎨", analytical: "🔬", admin: "📋"
};

const CATEGORY_COLORS: Record<string, string> = {
  beta_project: "text-[#B85C38] border-[#B85C38]/20 bg-[#B85C38]/5",
  incident: "text-[#C85C5C] border-[#C85C5C]/20 bg-[#C85C5C]/5",
  finance: "text-[#5C9A6B] border-[#5C9A6B]/20 bg-[#5C9A6B]/5",
  manual: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  learning: "text-purple-400 border-purple-500/20 bg-purple-500/5",
};

export default function PriorityCommandCenter() {
  const QUADRANT_LABELS: Record<string, string> = {
    do_now: "Do Now",
    schedule: "Schedule",
    delegate: "Delegate",
    eliminate: "Eliminate",
    learn: "Learn",
  };
  const [activeView, setActiveView] = useState<'next3' | 'matrix' | 'dayplan' | 'autopilot'>('next3');
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [scoreLogs, setScoreLogs] = useState<PriorityScoreLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autopilotMinutes, setAutopilotMinutes] = useState(60);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [energyFilter, setEnergyFilter] = useState<string>('all');

  const updateTaskQuadrant = async (taskId: string, newQuadrant: PriorityTask['quadrant']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, quadrant: newQuadrant } : t));
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks?id=eq.${taskId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quadrant: newQuadrant,
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Failed to update task quadrant");
    } catch (err) {
      console.error("Error updating quadrant:", err);
    }
  };

  const startTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'in_progress' } : t));
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks?id=eq.${taskId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Failed to start task");
    } catch (err) {
      console.error("Error starting task:", err);
    }
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";

  useEffect(() => {
    async function fetchData() {
      setFetchError(null);
      try {
        const headers = getAuthHeaders();

        const [resTasks, resLogs] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/priority_tasks?select=*&order=priority_score.desc`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/priority_scores_log?select=*&order=snapshot_at.desc&limit=200`, { headers }),
        ]);

        if (!resTasks.ok) throw new Error(`Failed to load tasks (${resTasks.status}).`);
        if (!resLogs.ok) throw new Error(`Failed to load score history (${resLogs.status}).`);

        setTasks(await resTasks.json());
        setScoreLogs(await resLogs.json());
        setLoading(false);
      } catch (err) {
        console.error("Failed to load priority engine data:", err);
        setFetchError(err instanceof Error ? err.message : "Failed to load priority engine data.");
        setLoading(false);
      }
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const filteredTasks = pendingTasks.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (energyFilter !== 'all' && t.energy_required !== energyFilter) return false;
    return true;
  });

  const next3 = [...filteredTasks].sort((a, b) => b.priority_score - a.priority_score).slice(0, 3);

  // Quadrant grouping
  const quadrants: Record<string, PriorityTask[]> = { do_now: [], schedule: [], delegate: [], eliminate: [], learn: [] };
  filteredTasks.forEach(t => {
    const q = quadrants[t.quadrant] || quadrants.schedule;
    q.push(t);
  });

  // Day plan — group by energy
  const energyBlocks: Record<string, { label: string; timeRange: string; tasks: PriorityTask[] }> = {
    deep:       { label: "Deep Work",  timeRange: "06:00–12:00", tasks: [] },
    analytical: { label: "Analytical", timeRange: "10:00–12:00", tasks: [] },
    shallow:    { label: "Shallow Work", timeRange: "14:00–16:00", tasks: [] },
    admin:      { label: "Admin",      timeRange: "16:00–18:00", tasks: [] },
    creative:   { label: "Creative",   timeRange: "20:00–23:00", tasks: [] },
  };
  filteredTasks.forEach(t => {
    const b = energyBlocks[t.energy_required] || energyBlocks.shallow;
    b.tasks.push(t);
  });

  // Auto-pilot: greedy knapsack
  const autoPilotSelection: PriorityTask[] = [];
  let remaining = autopilotMinutes;
  const sorted = [...filteredTasks].sort((a, b) => b.priority_score - a.priority_score);
  for (const task of sorted) {
    if (task.effort_minutes <= remaining) {
      autoPilotSelection.push(task);
      remaining -= task.effort_minutes;
    }
  }

  const getTaskLog = (taskId: string) => scoreLogs.find(l => l.task_id === taskId);
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalScore = pendingTasks.reduce((s, t) => s + Number(t.priority_score), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0908] flex items-center justify-center font-mono text-xs text-[#B0A89E] animate-pulse">
        {"Initializing Priority Engine..."}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#B8B0A8] p-8 md:p-12 grain overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {fetchError && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ Failed to load priority data — "}{fetchError}
            </span>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#D4A853]/8 pb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B0A89E] block mb-2">{"Decision OS"}</span>
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">{"Priority Command Center"}</h1>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-3 py-1.5 rounded-full bg-[#D4A853]/5">
              {`${pendingTasks.length} Active · ${completedCount} Done`}
            </span>
          </div>
        </header>

        {/* Scorecard */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Pending Tasks", value: pendingTasks.length, detail: "All categories", color: "text-[#F5F0EB]" },
            { label: "Do Now", value: quadrants.do_now.length, detail: "Urgency + importance", color: "text-[#C85C5C]" },
            { label: "Average Priority", value: pendingTasks.length > 0 ? (totalScore / pendingTasks.length).toFixed(1) : "—", detail: "Score /100", color: "text-[#D4A853]" },
            { label: "Revenue at Risk", value: `$${(pendingTasks.reduce((s, task) => s + task.revenue_impact, 0) / 100).toLocaleString()}`, detail: "Pending tasks", color: "text-[#D4A853]" },
            { label: "Today's Effort", value: `${filteredTasks.reduce((s, task) => s + task.effort_minutes, 0)} min`, detail: `${(filteredTasks.reduce((s, task) => s + task.effort_minutes, 0) / 60).toFixed(1)} ${"hours"}`, color: "text-[#B0A89E]" },
          ].map((item, idx) => (
            <AdminStatCard key={idx} label={item.label} value={item.value} detail={item.detail} accentColor={item.color} />
          ))}
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[#D4A853]/8 pb-4">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">{"Category:"}</span>
            {['all', 'beta_project', 'incident', 'finance', 'manual', 'learning'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`font-mono text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${categoryFilter === cat ? 'border-[#D4A853]/40 text-[#D4A853] bg-[#D4A853]/8' : 'border-[#D4A853]/8 text-[#B0A89E] hover:text-[#F5F0EB]'}`}>
                {cat === 'all' ? 'All' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider">{"Energy:"}</span>
            {['all', 'deep', 'shallow', 'creative', 'analytical', 'admin'].map(e => (
              <button key={e} onClick={() => setEnergyFilter(e)} className={`font-mono text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${energyFilter === e ? 'border-[#D4A853]/40 text-[#D4A853] bg-[#D4A853]/8' : 'border-[#D4A853]/8 text-[#B0A89E] hover:text-[#F5F0EB]'}`}>
                {e === 'all' ? 'All' : `${ENERGY_ICONS[e] || ''} ${e}`}
              </button>
            ))}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-[#D4A853]/8 gap-6">
          {[
            { key: "next3", label: "🎯 Your Next 3" },
            { key: "matrix", label: "📐 Priority Matrix" },
            { key: "dayplan", label: "📅 Daily Planner" },
            { key: "autopilot", label: "⚡ Auto Pilot" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as typeof activeView)}
              className={`pb-4 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer ${
                activeView === tab.key ? "border-[#D4A853] text-[#F5F0EB]" : "border-transparent text-[#B0A89E] hover:text-[#F5F0EB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ═══ NEXT 3 VIEW ═══ */}
          {activeView === 'next3' && (
            <motion.div key="next3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springConfig} className="space-y-8">
              {/* Next 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {next3.map((task, idx) => {
                  const log = getTaskLog(task.id);
                  const isFirst = idx === 0;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springConfig, delay: idx * 0.1 }}
                      onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                      className={`relative border p-6 rounded cursor-pointer transition-all duration-300 ${
                        isFirst
                          ? 'border-[#B85C38]/40 bg-[#B85C38]/[0.04] shadow-[0_0_40px_rgba(184,92,56,0.1)] hover:shadow-[0_0_60px_rgba(184,92,56,0.15)]'
                          : 'border-[#D4A853]/8 bg-[#121110]/60 hover:border-white/10'
                      }`}
                    >
                      {isFirst && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#B85C38] to-transparent" />
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-xs uppercase tracking-wider text-[#B0A89E]">
                          {isFirst ? '🔥 Priority #1' : idx === 1 ? '⚡ Priority #2' : '📋 Priority #3'}
                        </span>
                        <span className={`font-mono text-xs px-2 py-0.5 border rounded ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS.manual}`}>
                          {task.category.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg text-[#F5F0EB] tracking-tight mb-3 leading-snug">{task.title}</h3>

                      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                        <div className="bg-black/30 border border-[#D4A853]/8 rounded py-2 px-1">
                          <span className="font-mono text-xs text-[#B0A89E] block uppercase">{"Score"}</span>
                          <span className={`font-serif text-lg font-bold ${task.priority_score >= 60 ? 'text-[#B85C38]' : task.priority_score >= 40 ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                            {Number(task.priority_score).toFixed(0)}
                          </span>
                        </div>
                        <div className="bg-black/30 border border-[#D4A853]/8 rounded py-2 px-1">
                          <span className="font-mono text-xs text-[#B0A89E] block uppercase">{"Effort"}</span>
                          <span className="font-serif text-lg font-bold text-[#F5F0EB]">{task.effort_minutes}m</span>
                        </div>
                        <div className="bg-black/30 border border-[#D4A853]/8 rounded py-2 px-1">
                          <span className="font-mono text-xs text-[#B0A89E] block uppercase">{"Energy"}</span>
                          <span className="font-serif text-lg">{ENERGY_ICONS[task.energy_required]}</span>
                        </div>
                      </div>

                      {task.revenue_impact > 0 && (
                        <div className="text-xs font-mono text-[#5C9A6B] mb-3">
                          {"💰 Revenue at risk:"} ${(task.revenue_impact / 100).toFixed(0)}
                        </div>
                      )}

                      {task.deadline && (
                        <div className="text-xs font-mono text-[#B0A89E] mb-3">
                          {"⏰ Deadline:"} {new Date(task.deadline).toLocaleDateString('es-ES')} {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}

                      {/* Expanded detail panel */}
                      <AnimatePresence>
                        {selectedTask === task.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-[#D4A853]/8 mt-4 pt-4 space-y-3"
                          >
                            {task.description && (
                              <p className="text-sm text-[#B0A89E] font-mono italic leading-relaxed">{task.description}</p>
                            )}
                            {task.status === 'pending' && !isFirst && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startTask(task.id);
                                }}
                                className="mt-2 w-full font-mono text-xs uppercase border border-[#D4A853]/40 hover:bg-[#D4A853]/10 text-[#D4A853] px-2 py-1 rounded transition-all"
                              >
                                {"Start Task"}
                              </button>
                            )}
                            {log && (
                              <div className="space-y-2">
                                <span className="font-mono text-xs text-[#B85C38] uppercase">{"Score Breakdown"}</span>
                                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                  {[
                                    { label: 'Urgency', val: log.urgency_component, weight: 30 },
                                    { label: 'Importance', val: log.importance_component, weight: 25 },
                                    { label: 'Learning', val: log.learning_component, weight: 15 },
                                    { label: 'Effort', val: log.effort_component, weight: 10 },
                                    { label: 'Age', val: log.age_component, weight: 10 },
                                    { label: 'Energy', val: log.energy_component, weight: 10 },
                                  ].map(c => (
                                    <div key={c.label} className="bg-black/30 border border-[#D4A853]/8 rounded p-2">
                                      <span className="text-[#B0A89E] block">{c.label} ({c.weight}%)</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1 bg-black rounded-full overflow-hidden">
                                          <div className="h-full bg-[#B85C38]" style={{ width: `${Number(c.val)}%` }} />
                                        </div>
                                        <span className="text-[#F5F0EB]">{Number(c.val).toFixed(0)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isFirst && task.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTask(task.id);
                          }}
                          className="w-full mt-4 font-mono text-xs uppercase bg-[#B85C38] hover:bg-[#D4764E] text-white px-4 py-3 rounded transition-all duration-300"
                        >
                          {"Start This Task →"}
                        </button>
                      )}
                      {isFirst && task.status === 'in_progress' && (
                        <div className="w-full mt-4 font-mono text-xs uppercase text-center border border-[#5C9A6B]/30 text-[#5C9A6B] px-4 py-3 rounded bg-[#5C9A6B]/5">
                          {"⚡ Task in Progress"}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Remaining tasks table */}
              {filteredTasks.length > 3 && (
                <div className="border border-[#D4A853]/8 p-6 bg-[#121110]/20 rounded space-y-4">
                  <h3 className="font-serif text-lg text-[#F5F0EB]">{"Remaining Queue"} ({filteredTasks.length - 3})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[#B0A89E] text-xs uppercase">
                          <th className="py-3">{"Score"}</th>
                          <th>{"Task"}</th>
                          <th>{"Category"}</th>
                          <th>{"Quadrant"}</th>
                          <th>{"Effort"}</th>
                          <th>{"Energy"}</th>
                          <th className="text-right">{"Deadline"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.slice(3).map(task => (
                          <tr key={task.id} className="border-b border-[#D4A853]/8 hover:bg-white/[0.01]">
                            <td className={`py-3 font-bold ${task.priority_score >= 60 ? 'text-[#B85C38]' : task.priority_score >= 40 ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                              {Number(task.priority_score).toFixed(0)}
                            </td>
                            <td className="text-[#F5F0EB]">{task.title}</td>
                            <td><span className={`px-1.5 py-0.5 border rounded text-xs ${CATEGORY_COLORS[task.category] || ''}`}>{task.category.replace('_', ' ')}</span></td>
                            <td className="text-[#B0A89E]">{QUADRANT_META[task.quadrant]?.emoji} {QUADRANT_LABELS[task.quadrant] ?? ''}</td>
                            <td className="text-[#B0A89E]">{task.effort_minutes}m</td>
                            <td>{ENERGY_ICONS[task.energy_required]} {task.energy_required}</td>
                            <td className="text-right text-[#B0A89E]">{task.deadline ? new Date(task.deadline).toLocaleDateString('es-ES') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ MATRIX VIEW ═══ */}
          {activeView === 'matrix' && (
            <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springConfig}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(quadrants).map(([key, items]) => {
                  const meta = QUADRANT_META[key];
                  return (
                    <div
                      key={key}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        const taskId = e.dataTransfer.getData("text/plain");
                        if (!taskId) return;
                        await updateTaskQuadrant(taskId, key as any);
                      }}
                      className={`border ${meta.border} ${meta.bg} ${meta.glow} p-6 rounded min-h-[280px] space-y-4 transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-3">
                        <h3 className="font-mono text-xs uppercase tracking-widest text-[#F5F0EB]">
                          {meta.emoji} {QUADRANT_LABELS[key] ?? meta.label}
                        </h3>
                        <span className="font-mono text-xs text-[#B0A89E] bg-black/30 px-2 py-0.5 rounded">
                          {items.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {items.length === 0 ? (
                          <div className="text-xs text-[#7A6F65] font-mono text-center py-8 italic">{"Empty"}</div>
                        ) : (
                          items.sort((a, b) => b.priority_score - a.priority_score).map(task => (
                            <motion.div
                              key={task.id}
                              layout
                              draggable
                              onDragStart={(e: any) => {
                                e.dataTransfer.setData("text/plain", task.id);
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border border-[#D4A853]/8 bg-[#0A0908]/60 p-4 rounded hover:border-white/10 transition-all duration-200 cursor-pointer"
                              onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-serif text-sm text-[#F5F0EB] leading-snug flex-1">{task.title}</h4>
                                <span className={`font-mono text-xs font-bold shrink-0 ${task.priority_score >= 60 ? 'text-[#B85C38]' : task.priority_score >= 40 ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                                  {Number(task.priority_score).toFixed(0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[#B0A89E]">
                                <span className={`px-1.5 py-0.5 border rounded ${CATEGORY_COLORS[task.category] || ''}`}>{task.category.replace('_', ' ')}</span>
                                <span>{ENERGY_ICONS[task.energy_required]} {task.effort_minutes}m</span>
                                {task.revenue_impact > 0 && <span className="text-[#5C9A6B]">${(task.revenue_impact / 100).toFixed(0)}</span>}
                              </div>
                              {/* Inline expand + click-to-move */}
                              <AnimatePresence>
                                {selectedTask === task.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="border-t border-[#D4A853]/8 mt-3 pt-3 text-xs font-mono text-[#B0A89E] space-y-2">
                                      {task.description && <p className="italic">{task.description}</p>}
                                      <p>{"Learning:"} {task.learning_multiplier}/10 · {"Deadline:"} {task.deadline ? new Date(task.deadline).toLocaleDateString('es-ES') : 'No date'}</p>
                                      {task.auto_generated && <p className="text-[#7A6F65]">{"🤖 Auto-generated from"} {task.source_table}</p>}
                                      <div className="pt-2 space-y-1">
                                        <span className="text-[#7A6F65] uppercase text-[9px] tracking-wider block">{"Move to quadrant:"}</span>
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(QUADRANT_META)
                                            .filter(([qKey]) => qKey !== task.quadrant)
                                            .map(([qKey, qMeta]) => (
                                              <button
                                                key={qKey}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateTaskQuadrant(task.id, qKey as PriorityTask['quadrant']);
                                                  setSelectedTask(null);
                                                }}
                                                className="px-2 py-0.5 text-[9px] font-mono rounded border border-[#D4A853]/15 text-[#B0A89E] hover:text-[#F5F0EB] hover:border-[#D4A853]/40 transition-all cursor-pointer"
                                              >
                                                {qMeta.emoji} {QUADRANT_LABELS[qKey] ?? qMeta.label}
                                              </button>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ DAY PLANNER VIEW ═══ */}
          {activeView === 'dayplan' && (
            <motion.div key="dayplan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springConfig} className="space-y-6">
              <div className="border border-[#D4A853]/8 p-6 bg-[#121110]/20 rounded">
                <h3 className="font-serif text-xl text-[#F5F0EB] mb-6">
                  {"📅 Optimized Day Plan —"} {new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>

                <div className="space-y-8">
                  {Object.entries(energyBlocks).map(([key, block]) => {
                    if (block.tasks.length === 0) return null;
                    const blockMinutes = block.tasks.reduce((s, t) => s + t.effort_minutes, 0);
                    return (
                      <div key={key} className="relative">
                        {/* Timeline connector */}
                        <div className="absolute left-[52px] top-8 bottom-0 w-px bg-white/5" />

                        <div className="flex gap-6">
                          {/* Time column */}
                          <div className="w-16 shrink-0 text-right">
                            <span className="font-mono text-sm text-[#B85C38] font-bold">{block.timeRange.split('–')[0]}</span>
                            <div className="font-mono text-xs text-[#7A6F65] mt-0.5">{block.timeRange}</div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-lg">{ENERGY_ICONS[key]}</span>
                              <h4 className="font-mono text-xs uppercase tracking-wider text-[#F5F0EB]">{"Block"} {block.label}</h4>
                              <span className="font-mono text-xs text-[#B0A89E] bg-black/30 px-2 py-0.5 rounded">{blockMinutes} min</span>
                            </div>

                            {block.tasks.sort((a, b) => b.priority_score - a.priority_score).map((task, idx) => (
                              <div key={task.id} className="flex items-center gap-4 border border-[#D4A853]/8 bg-[#0A0908]/60 p-4 rounded hover:border-white/10 transition-all">
                                <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-xs font-mono text-[#B0A89E] shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-serif text-sm text-[#F5F0EB] truncate">{task.title}</h5>
                                  <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[#B0A89E]">
                                    <span className={`px-1.5 py-0.5 border rounded ${CATEGORY_COLORS[task.category] || ''}`}>{task.category.replace('_', ' ')}</span>
                                    <span>{task.effort_minutes} min</span>
                                    {task.revenue_impact > 0 && <span className="text-[#5C9A6B]">${(task.revenue_impact / 100).toFixed(0)}</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className={`font-mono text-sm font-bold ${task.priority_score >= 60 ? 'text-[#B85C38]' : 'text-[#B0A89E]'}`}>
                                    {Number(task.priority_score).toFixed(0)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-[#D4A853]/8 mt-8 pt-4 flex justify-between text-xs font-mono text-[#B0A89E]">
                  <span>{"Total planned:"} {filteredTasks.reduce((s, task) => s + task.effort_minutes, 0)} min ({(filteredTasks.reduce((s, task) => s + task.effort_minutes, 0) / 60).toFixed(1)} {"hours"})</span>
                  <span>{filteredTasks.length} {"tasks in"} {Object.values(energyBlocks).filter(b => b.tasks.length > 0).length} {"energy blocks"}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ AUTO-PILOT VIEW ═══ */}
          {activeView === 'autopilot' && (
            <motion.div key="autopilot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springConfig} className="space-y-6">
              {/* Time selector */}
              <div className="border border-[#D4A853]/8 p-6 bg-[#121110]/20 rounded">
                <h3 className="font-serif text-xl text-[#F5F0EB] mb-4">{"⚡ Auto Pilot Mode"}</h3>
                <p className="text-sm text-[#B0A89E] font-mono mb-6">
                  {"Select your available time. The engine will choose the optimal task combination that maximizes total priority value within your time window."}
                </p>

                <div className="flex items-center gap-4 mb-6">
                  <span className="font-mono text-xs text-[#B0A89E] uppercase">{"Available time:"}</span>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120, 180, 240].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setAutopilotMinutes(mins)}
                        className={`font-mono text-xs px-3 py-2 rounded border transition-all ${
                          autopilotMinutes === mins
                            ? 'border-[#B85C38]/40 text-[#B85C38] bg-[#B85C38]/5'
                            : 'border-[#D4A853]/8 text-[#B0A89E] hover:text-[#B8B0A8]'
                        }`}
                      >
                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#B0A89E]">{"Selected:"} {autoPilotSelection.length} {"tasks"} · {autoPilotSelection.reduce((s, task) => s + task.effort_minutes, 0)} {"min used"}</span>
                    <span className="text-[#B85C38]">{"Priority value:"} {autoPilotSelection.reduce((s, task) => s + Number(task.priority_score), 0).toFixed(0)} pts</span>
                  </div>
                  <div className="h-2 bg-black border border-[#D4A853]/8 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#B85C38] to-[#D4764E]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(autoPilotSelection.reduce((s, task) => s + task.effort_minutes, 0) / autopilotMinutes) * 100}%` }}
                      transition={springConfig}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-[#7A6F65]">
                    <span>0 min</span>
                    <span>{remaining} {"min margin"}</span>
                    <span>{autopilotMinutes} min</span>
                  </div>
                </div>
              </div>

              {/* Selected tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoPilotSelection.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springConfig, delay: idx * 0.05 }}
                    className="border border-[#D4A853]/8 bg-[#121110]/40 p-5 rounded hover:border-white/10 transition-all flex items-start gap-4"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-sm font-bold ${idx === 0 ? 'bg-[#B85C38]/20 text-[#B85C38] border border-[#B85C38]/30' : 'bg-white/5 text-[#B0A89E] border border-white/10'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm text-[#F5F0EB] leading-snug">{task.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono text-[#B0A89E]">
                        <span className={`px-1.5 py-0.5 border rounded ${CATEGORY_COLORS[task.category] || ''}`}>{task.category.replace('_', ' ')}</span>
                        <span>{ENERGY_ICONS[task.energy_required]} {task.effort_minutes}m</span>
                        <span className={task.priority_score >= 60 ? 'text-[#B85C38]' : 'text-[#B0A89E]'}>Score: {Number(task.priority_score).toFixed(0)}</span>
                        {task.revenue_impact > 0 && <span className="text-[#5C9A6B]">${(task.revenue_impact / 100).toFixed(0)}</span>}
                      </div>
                      {task.description && <p className="text-sm text-[#B0A89E] font-mono mt-2 italic">{task.description}</p>}
                      <div className="mt-3 flex gap-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => startTask(task.id)}
                            className="font-mono text-xs uppercase border border-[#D4A853]/40 hover:bg-[#D4A853]/10 text-[#D4A853] px-2 py-1 rounded transition-all"
                          >
                            {"Start Task"}
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <span className="font-mono text-xs uppercase text-[#5C9A6B] bg-[#5C9A6B]/5 border border-[#5C9A6B]/20 px-2 py-0.5 rounded">
                            {"In Progress"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {autoPilotSelection.length === 0 && (
                <div className="text-center text-[#B0A89E] font-mono text-xs py-12 border border-[#D4A853]/8 rounded bg-[#121110]/20">
                  {`No task fits in ${autopilotMinutes} minutes. Try a larger time block.`}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
