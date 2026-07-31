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
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [scoreLogs, setScoreLogs] = useState<PriorityScoreLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [completeTaskError, setCompleteTaskError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<PriorityTask | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);
  const [deleteTaskError, setDeleteTaskError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase.supabase.co";

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual tasks aren't touched by any of the auto-scoring triggers (those
  // only fire from the beta_projects/ai_incidents sync paths), so a fresh
  // manual task would sit at the priority_score column default forever
  // unless something explicitly calls the real scoring function on it.
  const scoreTask = async (taskId: string) => {
    const headers = getAuthHeaders();
    await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_priority_score`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_task_id: taskId }),
    });
  };

  const createTask = async (input: {
    title: string;
    description: string;
    effort_minutes: number;
    energy_required: PriorityTask['energy_required'];
    deadline: string;
    revenue_impact_usd: number;
    learning_multiplier: number;
  }) => {
    setAddTaskError(null);
    if (!input.title.trim()) {
      setAddTaskError("Title is required.");
      return false;
    }
    setAddingTask(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({
          title: input.title.trim(),
          description: input.description.trim() || null,
          category: "manual",
          effort_minutes: input.effort_minutes,
          energy_required: input.energy_required,
          deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
          revenue_impact: Math.round(input.revenue_impact_usd * 100),
          learning_multiplier: input.learning_multiplier,
          status: "pending",
          source_table: "manual",
          auto_generated: false,
        }),
      });
      if (!res.ok) throw new Error(`Failed to create task (${res.status}).`);
      const [created] = await res.json();
      if (created?.id) {
        await scoreTask(created.id);
      }
      await fetchData();
      return true;
    } catch (err) {
      console.error("Failed to create task:", err);
      setAddTaskError(err instanceof Error ? err.message : "Failed to create task.");
      return false;
    } finally {
      setAddingTask(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setCompleteTaskError(null);
    const prevTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks?id=eq.${taskId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'done' }),
      });
      if (!res.ok) throw new Error(`Failed to complete task (${res.status}).`);
    } catch (err) {
      console.error("Error completing task:", err);
      setTasks(prevTasks);
      setCompleteTaskError(err instanceof Error ? err.message : "Failed to complete task.");
    }
  };

  // Edits can touch any of the scoring inputs (deadline, revenue, effort,
  // energy, learning multiplier), so every edit re-runs calculate_priority_score
  // rather than trying to detect which fields actually changed — a title-only
  // edit re-scoring to the same value is harmless, but silently skipping a
  // real scoring change is not.
  const editTask = async (
    taskId: string,
    input: {
      title: string;
      description: string;
      category: PriorityTask['category'];
      effort_minutes: number;
      energy_required: PriorityTask['energy_required'];
      deadline: string;
      revenue_impact_usd: number;
      learning_multiplier: number;
    }
  ) => {
    setEditTaskError(null);
    if (!input.title.trim()) {
      setEditTaskError("Title is required.");
      return false;
    }
    setSavingEdit(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks?id=eq.${taskId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title.trim(),
          description: input.description.trim() || null,
          category: input.category,
          effort_minutes: input.effort_minutes,
          energy_required: input.energy_required,
          deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
          revenue_impact: Math.round(input.revenue_impact_usd * 100),
          learning_multiplier: input.learning_multiplier,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Failed to update task (${res.status}).`);
      await scoreTask(taskId);
      await fetchData();
      return true;
    } catch (err) {
      console.error("Failed to edit task:", err);
      setEditTaskError(err instanceof Error ? err.message : "Failed to update task.");
      return false;
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteTask = async (taskId: string, label: string) => {
    if (!window.confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;
    setDeleteTaskError(null);
    setDeletingTaskId(taskId);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/priority_tasks?id=eq.${taskId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`Failed to delete task (${res.status}).`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setScoreLogs(prev => prev.filter(l => l.task_id !== taskId));
      if (expandedTask === taskId) setExpandedTask(null);
    } catch (err) {
      console.error("Error deleting task:", err);
      setDeleteTaskError(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const sortedTasks = [...pendingTasks].sort((a, b) => b.priority_score - a.priority_score);
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
            <h1 className="text-4xl font-serif text-[#F5F0EB] tracking-tight">{"Priorities"}</h1>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-wider text-[#D4A853] border border-[#D4A853]/20 px-3 py-1.5 rounded-full bg-[#D4A853]/5">
              {`${pendingTasks.length} Active · ${completedCount} Done`}
            </span>
            <button
              type="button"
              onClick={() => { setAddTaskError(null); setShowAddModal(true); }}
              className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0A0908] bg-[#D4A853] hover:bg-[#E8C97A] transition-all px-4 py-1.5 rounded-full cursor-pointer"
            >
              {"+ Add Task"}
            </button>
          </div>
        </header>

        {completeTaskError && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ "}{completeTaskError}
            </span>
          </div>
        )}

        {deleteTaskError && (
          <div className="border-2 border-[#C85C5C]/50 bg-[#C85C5C]/10 px-4 py-2.5 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85C5C] animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C85C5C]">
              {"⚠ "}{deleteTaskError}
            </span>
          </div>
        )}

        {/* Scorecard */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminStatCard label="Pending Tasks" value={pendingTasks.length} detail="All categories" accentColor="text-[#F5F0EB]" />
          <AdminStatCard
            label="Average Priority"
            value={pendingTasks.length > 0 ? (totalScore / pendingTasks.length).toFixed(1) : "—"}
            detail="Score /100"
            accentColor="text-[#D4A853]"
          />
          <AdminStatCard
            label="Revenue at Risk"
            value={`$${(pendingTasks.reduce((s, task) => s + task.revenue_impact, 0) / 100).toLocaleString()}`}
            detail="Pending tasks"
            accentColor="text-[#D4A853]"
          />
        </section>

        {/* Priority Queue — the real, sorted list */}
        <section className="border border-[#D4A853]/8 bg-[#121110]/20 rounded">
          {sortedTasks.length === 0 ? (
            <div className="text-center text-[#B0A89E] font-mono text-xs py-16">
              {"No tasks yet — add your first real task above."}
            </div>
          ) : (
            <div className="divide-y divide-[#D4A853]/8">
              {sortedTasks.map((task, idx) => {
                const log = getTaskLog(task.id);
                const isExpanded = expandedTask === task.id;
                const isTop = idx === 0;
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={isTop ? "bg-[#B85C38]/[0.03]" : ""}
                  >
                    <div
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="flex items-center gap-4 p-4 md:p-5 cursor-pointer hover:bg-white/[0.015] transition-all"
                    >
                      <div className={`shrink-0 w-12 text-center font-serif text-lg font-bold ${task.priority_score >= 60 ? 'text-[#B85C38]' : task.priority_score >= 40 ? 'text-amber-400' : 'text-[#B0A89E]'}`}>
                        {Number(task.priority_score).toFixed(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isTop && <span className="font-mono text-[10px] uppercase tracking-wider text-[#B85C38]">{"🔥 Top"}</span>}
                          <h3 className="font-serif text-base text-[#F5F0EB] leading-snug">{task.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs font-mono text-[#B0A89E]">
                          <span className={`px-1.5 py-0.5 border rounded ${CATEGORY_COLORS[task.category] || ''}`}>{task.category.replace('_', ' ')}</span>
                          <span>{ENERGY_ICONS[task.energy_required]} {task.effort_minutes}m</span>
                          {task.revenue_impact > 0 && <span className="text-[#5C9A6B]">${(task.revenue_impact / 100).toFixed(0)}</span>}
                          {task.deadline && <span>{"⏰"} {new Date(task.deadline).toLocaleDateString('es-ES')}</span>}
                          {task.status === 'in_progress' && <span className="text-[#D4A853]">{"● In progress"}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                          className="px-2.5 py-1.5 rounded bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-[10px] font-mono uppercase tracking-wide hover:bg-[#5C9A6B]/15 cursor-pointer"
                        >
                          {"✓ Complete"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditTaskError(null); setEditingTask(task); }}
                          className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[#B0A89E] text-[10px] font-mono uppercase tracking-wide hover:bg-white/10 cursor-pointer"
                        >
                          {"Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id, task.title); }}
                          disabled={deletingTaskId === task.id}
                          className="px-2.5 py-1.5 rounded bg-[#C85C5C]/10 border border-[#C85C5C]/25 text-[#C85C5C] text-[10px] font-mono uppercase tracking-wide hover:bg-[#C85C5C]/15 disabled:opacity-40 cursor-pointer"
                        >
                          {deletingTaskId === task.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-3">
                            {task.description && (
                              <p className="text-sm text-[#B0A89E] font-mono italic leading-relaxed">{task.description}</p>
                            )}
                            {task.auto_generated && (
                              <p className="text-xs font-mono text-[#7A6F65]">{"🤖 Auto-generated from"} {task.source_table}</p>
                            )}
                            {log && (
                              <div className="space-y-2">
                                <span className="font-mono text-xs text-[#B85C38] uppercase">{"Score Breakdown"}</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal
            onClose={() => setShowAddModal(false)}
            onCreate={createTask}
            adding={addingTask}
            error={addTaskError}
          />
        )}
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => { setEditingTask(null); setEditTaskError(null); }}
            onSave={async (input) => {
              const ok = await editTask(editingTask.id, input);
              return ok;
            }}
            saving={savingEdit}
            error={editTaskError}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function AddTaskModal({
  onClose,
  onCreate,
  adding,
  error,
}: {
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    effort_minutes: number;
    energy_required: PriorityTask['energy_required'];
    deadline: string;
    revenue_impact_usd: number;
    learning_multiplier: number;
  }) => Promise<boolean>;
  adding: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effortMinutes, setEffortMinutes] = useState(30);
  const [energyRequired, setEnergyRequired] = useState<PriorityTask['energy_required']>('shallow');
  const [deadline, setDeadline] = useState("");
  const [revenueImpactUsd, setRevenueImpactUsd] = useState(0);
  const [learningMultiplier, setLearningMultiplier] = useState(1);

  const handleSubmit = async () => {
    const ok = await onCreate({
      title, description, effort_minutes: effortMinutes, energy_required: energyRequired,
      deadline, revenue_impact_usd: revenueImpactUsd, learning_multiplier: learningMultiplier,
    });
    if (ok) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0A0908] border border-[#D4A853]/20 rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-3">
          <h3 className="font-serif text-lg text-[#F5F0EB]">{"Add Task"}</h3>
          <button onClick={onClose} className="font-mono text-xs text-[#7A6F65] hover:text-white uppercase cursor-pointer">{"✕"}</button>
        </div>

        {error && (
          <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">
            {"⚠ "}{error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Title *"}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              placeholder="What needs doing?"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Description"}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40 resize-none"
              placeholder="Optional detail"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Effort (min)"}</label>
              <input
                type="number"
                min={5}
                value={effortMinutes}
                onChange={(e) => setEffortMinutes(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Energy"}</label>
              <select
                value={energyRequired}
                onChange={(e) => setEnergyRequired(e.target.value as PriorityTask['energy_required'])}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                {(['deep', 'shallow', 'creative', 'analytical', 'admin'] as const).map((e) => (
                  <option key={e} value={e}>{ENERGY_ICONS[e]} {e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Deadline"}</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Revenue Impact ($)"}</label>
              <input
                type="number"
                min={0}
                value={revenueImpactUsd}
                onChange={(e) => setRevenueImpactUsd(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Learning Multiplier (1–10)"}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={learningMultiplier}
              onChange={(e) => setLearningMultiplier(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono"
          >
            {"Cancel"}
          </button>
          <button
            type="button"
            disabled={adding || !title.trim()}
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? "Adding…" : "Add Task"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditTaskInput {
  title: string;
  description: string;
  category: PriorityTask['category'];
  effort_minutes: number;
  energy_required: PriorityTask['energy_required'];
  deadline: string;
  revenue_impact_usd: number;
  learning_multiplier: number;
}

function EditTaskModal({
  task,
  onClose,
  onSave,
  saving,
  error,
}: {
  task: PriorityTask;
  onClose: () => void;
  onSave: (input: EditTaskInput) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [category, setCategory] = useState<PriorityTask['category']>(task.category);
  const [effortMinutes, setEffortMinutes] = useState(task.effort_minutes);
  const [energyRequired, setEnergyRequired] = useState<PriorityTask['energy_required']>(task.energy_required);
  const [deadline, setDeadline] = useState(toDatetimeLocal(task.deadline));
  const [revenueImpactUsd, setRevenueImpactUsd] = useState(task.revenue_impact / 100);
  const [learningMultiplier, setLearningMultiplier] = useState(task.learning_multiplier);

  const handleSubmit = async () => {
    const ok = await onSave({
      title, description, category, effort_minutes: effortMinutes, energy_required: energyRequired,
      deadline, revenue_impact_usd: revenueImpactUsd, learning_multiplier: learningMultiplier,
    });
    if (ok) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0A0908] border border-[#D4A853]/20 rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#D4A853]/8 pb-3">
          <h3 className="font-serif text-lg text-[#F5F0EB]">{"Edit Task"}</h3>
          <button onClick={onClose} className="font-mono text-xs text-[#7A6F65] hover:text-white uppercase cursor-pointer">{"✕"}</button>
        </div>

        {error && (
          <div className="border border-[#C85C5C]/40 bg-[#C85C5C]/10 rounded px-3 py-2 font-mono text-xs text-[#C85C5C]">
            {"⚠ "}{error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Title *"}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              placeholder="What needs doing?"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Description"}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40 resize-none"
              placeholder="Optional detail"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Category"}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PriorityTask['category'])}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                {(['manual', 'beta_project', 'incident', 'finance', 'learning'] as const).map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Energy"}</label>
              <select
                value={energyRequired}
                onChange={(e) => setEnergyRequired(e.target.value as PriorityTask['energy_required'])}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              >
                {(['deep', 'shallow', 'creative', 'analytical', 'admin'] as const).map((e) => (
                  <option key={e} value={e}>{ENERGY_ICONS[e]} {e}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Effort (min)"}</label>
              <input
                type="number"
                min={5}
                value={effortMinutes}
                onChange={(e) => setEffortMinutes(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Deadline"}</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Revenue Impact ($)"}</label>
              <input
                type="number"
                min={0}
                value={revenueImpactUsd}
                onChange={(e) => setRevenueImpactUsd(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-[#7A6F65] uppercase tracking-wider block mb-1">{"Learning Multiplier (1–10)"}</label>
              <input
                type="number"
                min={1}
                max={10}
                value={learningMultiplier}
                onChange={(e) => setLearningMultiplier(Math.min(10, Math.max(1, Number(e.target.value))))}
                className="w-full bg-black/40 border border-[#D4A853]/15 rounded px-3 py-2 text-sm font-mono text-[#F5F0EB] focus:outline-none focus:border-[#D4A853]/40"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#D4A853]/8 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/10 hover:text-white uppercase tracking-wider rounded cursor-pointer text-xs font-mono"
          >
            {"Cancel"}
          </button>
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={handleSubmit}
            className="px-5 py-2 bg-[#D4A853] text-[#0A0908] font-bold uppercase tracking-wider hover:bg-[#E8C97A] transition-all rounded cursor-pointer text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
