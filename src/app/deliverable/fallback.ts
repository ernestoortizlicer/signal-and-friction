export interface Decision {
  type: string;
  label: string;
  action: string;
  reasoning: string;
  tradeoff: string;
}

// The six Signal & Friction friction mechanisms — the fixed taxonomy the
// whole method is built on. Duplicated (not imported) in
// supabase/functions/learning-socratic-tutor/index.ts, the same
// cross-boundary pattern already used for other shared types in this repo
// (e.g. Presence between functions/api/_scan.ts and the prospecting page) —
// Deno edge functions can't import from src/.
export type FrictionMechanism =
  | 'cognitive_load'
  | 'trust_deficit'
  | 'commitment_anxiety'
  | 'ordering_error'
  | 'identity_friction'
  | 'value_uncertainty';

// ── Epistemics — the evidence-tier system ──────────────────────────────────
// Every figure in a deliverable must be honestly tagged. We can only ever
// observe a prospect's PUBLIC surface (PageSpeed measurements, raw HTML) —
// never their real funnel data, unless they grant access. Presenting a
// modeled estimate as if it were measured is the exact failure mode this
// system exists to prevent.
export type EvidenceTier = 'measured' | 'modeled' | 'pending';

export interface EvidenceItem {
  tier: EvidenceTier;
  label: string;
  value: string;
  source: string; // "Google PageSpeed Insights, mobile, scanned {date}" / "Industry benchmark: {name}" / "Requires your funnel data"
}

export interface ImpactRange {
  low: number;
  high: number;
  unit: '%' | '$';
  step: string; // the named funnel step this range applies to
  modeledFrom: string; // the benchmark/coefficient this range is derived from
  narrowsWith: string; // what specific data would narrow this range
}

export interface AvoidItem {
  action: string; // what not to do
  reason: string; // why it backfires
}

// Phase 4.0 — the DFY execution/monitoring/handoff axis, restored from
// src/lib/dosing.ts's DfyDeliveryFields (mapDosedScaffoldToDelivery()).
// Each sub-field is either real delivered content or the literal string
// NOT_YET_DELIVERED ("Not yet delivered.") from dosing.ts — an honest
// label, not an omission, so a DFY client sees a stated absence rather
// than a missing section that reads as broken. Optional/nullable here
// only so DWY deliveries and historical JSON without this key keep
// working unchanged — nothing renders from this yet (see Phase 4.3).
export interface DfyDeliveryData {
  execution_summary: string;
  monitoring_findings: string;
  handoff_documentation: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  content: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  done: boolean;
  tip: string;
}

export interface BeforeAfterData {
  beforeTitle: string;
  beforeIssue: string;
  beforeFields: string[];
  // Optional so demos not yet migrated to per-client copy degrade to
  // omitting the line rather than showing a wrong hardcoded one.
  beforeWarning?: string; // e.g. "Credit card required for validation."
  beforeBounce: string;
  afterTitle: string;
  afterDomain: string;
  afterConfirmation?: string; // e.g. "No credit card required."
  afterDescription?: string; // the "what changed" paragraph
  afterGain: string;
  // Phase 4.3 — "before/after claims must distinguish expected, observed,
  // and measured states." Defaults to "expected" when absent (the safe
  // default — never silently implies something was measured without an
  // explicit, deliberate label saying so). Every deliverable published
  // before this field existed is a pre-Phase-4.3 legacy record rendered
  // by the untouched old template anyway, so this only ever matters for
  // the new policy-composed view.
  afterStatus?: "expected" | "measured";
}

export interface DeliverableData {
  clientKey?: string;
  clientName: string;
  date: string;
  consultant: string;
  loomUrl: string;
  segment?: 'high_ticket' | 'microdosing';
  // Phase 4.3 — the exact offer-catalog.ts priceId this delivery was
  // dosed for (e.g. "price_dfy_intervention"). Drives the service-aware
  // policy-composed view (src/lib/delivery-policy.ts) when present and
  // resolvable; absent on every deliverable published before Phase 4.3
  // and on any non-dosed/manual delivery, both of which fall through to
  // the original segment-based rendering unchanged — this field is the
  // entire routing switch for the new architecture, and its absence is
  // what backward compatibility depends on.
  offerPriceId?: string;
  currentPhase?: 'diagnostic' | 'intervention' | 'monitoring' | 'expansion' | 'autonomy';
  progressPercent?: number;
  // Previously hardcoded — now dynamic per client
  founderFocusScore?: number;
  daysRemaining?: number;
  guaranteeStatus?: string;
  telemetryStatus?: string;
  beforeAfter?: BeforeAfterData;
  learningModules?: LearningModule[];
  checklist?: ChecklistItem[];
  // Evidence-tiered claims shown to the client — the honesty layer.
  evidence?: EvidenceItem[];
  // The single grounded, modeled projection range. Never a fixed number.
  projectedImpact?: ImpactRange;
  // Dosed deliveries carry the scaffold's free-text projected_impact as a
  // note (see dosing.ts's DosedDeliveryFields) rather than a structured
  // low/high range — the 7-field scaffold model has no equivalent range
  // concept. Already sent by buildDeliveryPayload(); adding it to the
  // type here just makes that existing runtime shape honest.
  projectedImpactNote?: string;
  // 0–100. Rendered visibly with confidenceReason — elite consultancies
  // state their own uncertainty. green >=65 / amber >=40 / red <40.
  confidenceLevel?: number;
  confidenceReason?: string;
  // Structured "what NOT to do" — required going forward, not optional prose.
  avoid?: AvoidItem[];
  // Phase 4.2 — the client-safe translation of at most one dominant
  // registry hypothesis and at most one ruled-out alternative, produced
  // ONLY by src/lib/hypothesis-translation.ts. Never contains a mechanism
  // id, analyst rationale, evidence-strength badge, diagnostic question,
  // or any other internal reasoning_links field — see that file's own
  // header for the structural (not just conventional) guarantee. Absent
  // whenever there's no unambiguous dominant match, which is the common
  // case — most deliverables simply won't have this key.
  behavioralInterpretation?: {
    dominant: { label: string; sentence: string } | null;
    ruledOutAlternative: { label: string; sentence: string } | null;
  };
  // Phase 4.1 — analyst-authored only (diagnostic_scaffolds.unknowns),
  // never generated or inferred here or anywhere upstream. Exposed in
  // every service tier by product policy — uncertainty is trust
  // architecture, not something a higher tier unlocks. Undefined (not an
  // empty string) for every deliverable published before this field
  // existed, and for any tier where the analyst hasn't written anything —
  // both render as "no section", never a blank one.
  unknowns?: string;
  // The real, structured answer to "which of the six mechanisms is this" —
  // distinct from diagnosis.friction.mechanism below, which is free-form
  // narrative text ("Cognitive Overload — Choice Paralysis...") meant for a
  // client to read, not a value a training rubric can validate a learner's
  // answer against. Added 2026-08-01 for the diagnostic-craft training
  // module: this field is the ground truth a real case is graded against,
  // so it's only ever set by hand after actually reading the deliverable's
  // own diagnosis — never inferred from the narrative string. A deliverable
  // without this field is automatically excluded from the training case
  // bank (see admin/learning/page.tsx) rather than guessed at.
  groundTruthMechanism?: FrictionMechanism;
  // Phase 4.0 — see DfyDeliveryData above. null/undefined for DWY and for
  // every deliverable published before this field existed; not rendered
  // anywhere yet (Phase 4.3 adds the actual client-facing module).
  dfyDelivery?: DfyDeliveryData | null;
  // Phase 6.3 — Monitoring launch-state fix. Real RawTechnicalSignals
  // JSON from functions/api/_scan.ts, passed through loosely typed (same
  // convention as technical_signals elsewhere in this app) since this
  // file has no dependency on that Cloudflare-Function-only type.
  // technicalSignalsBaseline undefined/null means "no baseline captured
  // yet" — a real, honest state the client-facing module must render
  // distinctly, never silently as if nothing changed.
  technicalSignalsCurrent?: Record<string, unknown> | null;
  technicalSignalsBaseline?: Record<string, unknown> | null;
  baselineCapturedAt?: string | null;
  diagnosis: {
    signal: string;
    friction: {
      mechanism: string;
      rootCause: string;
    };
    // The ONE synthesized recommendation shown to the client. This is what
    // renders. If absent, the view falls back to rendering `decisions`
    // (legacy 3-option grid) for demos not yet migrated to the new format.
    finalDecision?: Decision;
    // Internal exploration variants (Conservative/Aggressive/Lateral) — the
    // process Ernesto uses to arrive at finalDecision. Never rendered on
    // the client-facing page once finalDecision is present; kept here only
    // as the admin's own working record.
    decisions: Decision[];
  };
}

export const COMMAND_CENTER_GUIDE: DeliverableData = {
  clientKey: "command-center-guide",
  clientName: "Command Center — Manual Operativo",
  date: "22 de junio de 2026",
  consultant: "Signal & Friction",
  loomUrl: "",
  segment: "microdosing",
  currentPhase: "autonomy",
  progressPercent: 0,
  founderFocusScore: 100,
  daysRemaining: 365,
  guaranteeStatus: "V2.0 Soberano — Totalmente Operativo",
  telemetryStatus: "Vault Activo · Cloudflare Edge Desplegado · claude-opus-4-8",
  beforeAfter: {
    beforeTitle: "Operando Sin el Sistema",
    beforeIssue: "Fragmentación Operacional — 5 herramientas desconectadas, sin capa de diagnóstico unificada",
    beforeFields: ["CRM manual (Notion)", "Finanzas en hojas de cálculo", "Leads gestionados por DMs", "Sin motor de diagnóstico IA", "Estimaciones fiscales por jurisdicción: manuales", "Entrega de diagnósticos: adjuntos por email"],
    beforeBounce: "Carga Cognitiva: ~3h/día en coordinación",
    afterTitle: "Command Center Operativo",
    afterDomain: "signal-and-friction.com/admin",
    afterGain: "Reducción de Carga Operacional: ~2,5h/día recuperadas",
  },
  learningModules: [
    {
      id: "m-1",
      title: "El Protocolo Diario de 10 Minutos",
      description: "La secuencia exacta para ejecutar cada mañana antes de tocar cualquier otra cosa. Mantiene el control del pipeline, la tesorería y los clientes en menos de 10 minutos.",
      completed: false,
      content: "1. Estadísticas del sidebar primero — Leads Activos, Patrimonio, Pendientes. Si Pendientes > 0, ve a Prioridades antes que Pipeline.\n\n2. Pipeline → ARR Tracker. Un número, una barra de progreso. Si no se ha movido desde ayer, algo en la cola de conversión está bloqueado.\n\n3. Cola de Conversión — ordena por urgencia. Los leads calientes (< 2h) se contactan hoy. Los leads fríos (> 24h) se posponen salvo que sean DFY.\n\n4. Revisa el panel de clientes garantizados. Cualquier puerta roja (✗) cercana a vencimiento va a Prioridades de inmediato.\n\n5. Finanzas → Resumen. Cuatro celdas: ARR, Buffer Líquido, Buffer/ARR%, Runway. Si Runway < 6 meses, la prioridad del día es cerrar un cliente — no contenido, no optimización.",
    },
    {
      id: "m-2",
      title: "Pipeline — Estados, Modal y el Kanban",
      description: "Cómo mover clientes por el pipeline sin saltarse estados, y qué activa cada transición en el sistema.",
      completed: false,
      content: "Los 5 estados del pipeline en orden: prospecting → outreach_sent → diagnostic_in_progress → delivered → closed_completed. Cada estado desbloquea un botón específico en el modal del cliente. Nunca saltes estados — el sistema está diseñado para que cada transición active la siguiente acción correcta.\n\nEl modal del cliente tiene dos columnas. Izquierda: parámetros, acciones de pipeline, Motor de Diagnóstico IA, protocolo de garantía. Derecha: registro de actividad, historial de interacciones, datos del proyecto.\n\nEl Cajón de Lead (haz clic en cualquier tarjeta de lead) muestra segmento, valor estimado, respuestas del formulario y web. El botón 'Copiar Borrador de Acción' genera la frase de contacto correcta para ese segmento y la copia al portapapeles. Pégala directamente en LinkedIn.\n\nRegla clave: para cualquier lead DFY con página web, ejecuta el Motor de Diagnóstico IA antes del primer contacto. Llegas a la conversación con datos, no con preguntas.",
    },
    {
      id: "m-3",
      title: "Motor de Diagnóstico IA — Uso Correcto",
      description: "El Motor de Diagnóstico IA se ejecuta dentro del modal de cada cliente. Este módulo cubre cómo maximizar la calidad del output antes de pulsar el botón.",
      completed: false,
      content: "El motor construye su prompt a partir de todo lo que hay en el modal del cliente en el momento en que pulsas el botón. Más contexto = mayor índice de confianza.\n\nAntes de pulsar 'Generar diagnóstico': rellena el campo Psicología del Founder / Notas Privadas con las restricciones conocidas, objeciones y segmento de mercado. Ajusta el slider de Fatiga Cognitiva al nivel real — un founder en modo supervivencia a 75+ recibe una hipótesis más sencilla que uno a 30.\n\nEl resultado tiene 5 zonas. Índice de Confianza (barra con código de color): verde ≥ 65 es utilizable, ámbar ≥ 40 necesita validación manual, rojo < 40 significa añadir contexto y regenerar. Señal: cópialo literalmente en tu diagnóstico escrito. Mecanismo de Fricción: úsalo como tipo de campo del formulario. Hipótesis Causal: la frase de apertura del entregable, ya en el tono correcto. Decisión A/B/C: presenta las tres al cliente — hacerles elegir es parte del protocolo zero-call.\n\nRegla: nunca copies el output directamente al entregable. Úsalo como esqueleto estructural y añade las métricas específicas del cliente que el motor no tiene (números exactos de PostHog, contexto del sector).",
    },
    {
      id: "m-4",
      title: "Centro Financiero — Las 6 Subvistas",
      description: "Qué subvista de Finanzas abrir y cuándo. La vista Resumen es el instrumento diario. Las demás son herramientas semanales o mensuales.",
      completed: false,
      content: "Resumen (diario): El widget ARR/Buffer Líquido tiene 4 celdas — ARR (MRR × 12), Buffer Líquido (total de activos en efectivo), Buffer/ARR%, Runway con múltiplo de quema. Debajo: dashboard de Stripe con las últimas 4 transacciones en tiempo real. Si ves una entrada Refunded, ve a Pipeline de inmediato para revisar ese cliente.\n\nContabilidad (mensual): Libro contable de doble entrada. Balance y cuenta de resultados se calculan automáticamente desde las transacciones. Revisa al cierre de mes — sin entrada manual requerida.\n\nROI y Capitalización (antes de cualquier compra > 500€): La comparativa de Coste de Oportunidad ejecuta tres escenarios — fondo indexado vs hardware vs créditos IA. Cambia los inputs y la respuesta es inmediata. La Calculadora de Jubilación muestra el patrimonio proyectado a cualquier tasa de ahorro y horizonte temporal.\n\nAsesor IA: Acepta cualquier pregunta de coste de oportunidad. Los mejores prompts incluyen un número específico.\n\nOptimizador Fiscal: Actualiza el slider de ingresos de consultoría con tu proyección anual real. La tabla de 7 jurisdicciones se recalcula al instante. La fila Uruguay muestra 0% IRNR sobre ingresos extranjeros bajo la exención fiscal de 10 años — esta es tu estructura confirmada.",
    },
    {
      id: "m-5",
      title: "Prioridades + Learning OS",
      description: "Cómo usar la cola de Prioridades para trabajar siempre en la tarea de mayor impacto económico, y cómo el Learning OS hace que tus diagnósticos mejoren con el tiempo.",
      completed: false,
      content: "Prioridades: al inicio de cada día, la cola muestra tareas ordenadas por impacto en ingresos. Ejecuta la tarea superior antes de abrir LinkedIn, email o cualquier otra herramienta. Regla: un diagnóstico de lead DFY siempre supera en prioridad a una actualización de landing page, independientemente de los plazos. Ingresos directos > Ingresos indirectos.\n\nLearning OS (Incidencias IA): cada vez que algo sale mal — un diagnóstico erróneo, un rechazo de cliente, una automatización fallida — regístralo aquí con severidad, causa raíz y lección. El campo 'Mejora Aplicada' debe ser específico: no 'mejorar el diagnóstico' sino 'añadir pregunta sobre número de empleados en el formulario Tally para segmentar DFY vs DWY antes del primer contacto.'\n\nVersiones de Prompt: cada iteración de prompt se versiona aquí. Si el Motor de Diagnóstico empieza a producir outputs de menor calidad que una versión anterior, revisa este registro primero — algo en el prompt del sistema ha cambiado. Puedes identificar la versión exacta y revertir.\n\nCadencia semanal: el viernes es el día del Learning OS. Registra cada incidencia de la semana y actualiza cualquier prompt que haya producido resultados subóptimos. Esta revisión de 20 minutos semanales genera diagnósticos mediblemente mejores en 90 días.",
    },
    {
      id: "m-6",
      title: "Atajos Avanzados — Funciones que la Mayoría No Usa",
      description: "Cinco capacidades no obvias del Command Center que ahorran 45+ minutos por cliente cuando se usan correctamente.",
      completed: false,
      content: "1. Botón MCP en el modal del cliente: cuando ejecutas una acción de pipeline (enviar contacto, solicitar testimonial), el botón MCP copia el comando exacto al portapapeles. Ese comando va directamente a Claude en otra ventana — es la instrucción de automatización para el siguiente paso, no una etiqueta decorativa.\n\n2. Links de Entregable y SLA en el formulario de diagnóstico: cuando rellenas el formulario de entrega, el sistema genera al instante dos URLs activas — /deliverable/[clientKey] y /sla/[clientKey]. Ambas están activas sin necesidad de rebuild.\n\n3. Link de web del lead en el Cajón: si el lead dejó su web en el formulario Tally, aparece en el Cajón como enlace directo. Ábrelo, ejecuta /api/scan-url con su dominio y ten su LCP, TBT y delta de abandono listos antes del primer mensaje.\n\n4. El Slider de Fatiga Cognitiva es dato estratégico: un founder con puntuación > 70 necesita un pitch más sencillo y menos variables de decisión en el entregable. Uno con < 30 puede recibir el diagnóstico técnico completo.\n\n5. Los inputs del Optimizador Fiscal son editables: el slider de ingresos acepta tu proyección anual real. Si estás evaluando un contrato importante que te mueve de 30.000€ a 60.000€ anuales, actualiza el slider y observa cómo cambia la tabla de 7 jurisdicciones antes de decidir si aceptarlo.",
    },
  ],
  checklist: [
    { id: "c-1", task: "Revisar estadísticas del sidebar: Leads Activos, Patrimonio, Pendientes", done: false, tip: "Si Pendientes > 0, ve a Prioridades antes que Pipeline. Sin excepciones." },
    { id: "c-2", task: "Pipeline → ARR Tracker: ¿ha subido el número desde ayer?", done: false, tip: "ARR plano dos días seguidos = algo bloqueado en la cola de conversión." },
    { id: "c-3", task: "Cola de Conversión: procesar primero los leads calientes (< 2h de urgencia)", done: false, tip: "Para leads DFY con página web, ejecutar Motor de Diagnóstico IA antes del primer contacto." },
    { id: "c-4", task: "Clientes garantizados: revisar puertas rojas cercanas a vencimiento", done: false, tip: "Cualquier puerta roja (✗) próxima a expirar va a Prioridades de inmediato." },
    { id: "c-5", task: "Finanzas → Resumen: revisar métrica de Runway", done: false, tip: "Runway < 6 meses significa que la prioridad del día es cerrar un cliente — no contenido ni optimización." },
    { id: "c-6", task: "[Semanal — Viernes] Registrar incidencias IA en Learning OS", done: false, tip: "El campo Mejora Aplicada debe ser específico y accionable. Las lecciones vagas no generan interés compuesto." },
    { id: "c-7", task: "[Semanal — Viernes] Revisar y versionar los prompts actualizados", done: false, tip: "Si la calidad del diagnóstico bajó esta semana, revisa Versiones de Prompt antes de tocar nada más." },
    { id: "c-8", task: "[Mensual] Cerrar contabilidad en Finanzas → Contabilidad", done: false, tip: "Revisar P&L y Balance. Las transacciones se sincronizan automáticamente — sin entrada manual." },
    { id: "c-9", task: "[Trimestral] Actualizar slider del Optimizador Fiscal con proyección real YTD", done: false, tip: "Uruguay 0% IRNR sobre ingresos extranjeros durante la exención fiscal de 10 años. Estructura confirmada — verificar anualmente." },
    { id: "c-10", task: "[Por cliente] Ejecutar Motor de Diagnóstico IA antes de cada contacto DFY", done: false, tip: "Añadir notas de Psicología del Founder + ajustar Fatiga Cognitiva antes de pulsar el botón. El contexto determina la confianza." },
  ],
  diagnosis: {
    signal: "El Command Center está totalmente operativo en 5 módulos funcionales — Pipeline, Finanzas, Prioridades, Learning y Certified — con un Motor de Diagnóstico IA securizado por Vault ejecutándose en claude-opus-4-8 en el edge de Cloudflare. El sistema está diseñado para operación unipersonal desde cualquier dispositivo, sin llamadas.",
    friction: {
      mechanism: "Complejidad Operacional",
      rootCause: "Gestionar un pipeline de consultoría high-ticket, seguimiento de ingresos en tiempo real, diagnósticos asistidos por IA y aprendizaje continuo desde herramientas desconectadas genera más de 3 horas de sobrecarga de coordinación al día. El Command Center elimina esto unificando todas las capas operativas en una sola interfaz autenticada.",
    },
    decisions: [
      {
        type: "A — Conservadora",
        label: "Ejecutar el protocolo diario de 10 minutos cada mañana",
        action: "Abre Pipeline primero. Revisa ARR Tracker, luego Cola de Conversión, luego clientes garantizados. Cierra en Finanzas con la métrica de Runway. Total: 10 minutos. No se abre nada más hasta que esta secuencia se complete.",
        reasoning: "El protocolo diario es la interacción mínima viable con el sistema. Expone cada señal crítica — leads bloqueados, puertas de garantía en riesgo, runway comprometido — antes de que se conviertan en emergencias.",
        tradeoff: "Requiere disciplina para ejecutar la secuencia en orden. Saltarse Finanzas un día en que Stripe muestra un reembolso significa perder una señal de riesgo de cliente durante 24 horas.",
      },
      {
        type: "B — Agresiva",
        label: "Usar el Motor de Diagnóstico IA antes de cada contacto DFY",
        action: "Antes de enviar el primer mensaje de LinkedIn a cualquier lead DFY, abre su modal, rellena Notas Privadas con el contexto conocido, ajusta el slider de Fatiga Cognitiva y pulsa Generar diagnóstico. Usa los campos Señal e Hipótesis como apertura del contacto.",
        reasoning: "Llegar con datos específicos convierte un contacto en frío en una observación clínica. La tasa de conversión del contacto basado en datos es estructuralmente superior al basado en preguntas.",
        tradeoff: "Añade 5 minutos por contacto. Válido únicamente para leads DFY (2.800€) — el ROI de un diagnóstico de 5 minutos antes de una conversación de 2.800€ es matemáticamente indiscutible.",
      },
      {
        type: "C — Lateral",
        label: "Tratar el Learning OS como el mecanismo de interés compuesto",
        action: "Cada viernes, dedica 20 minutos a la pestaña Learning. Registra cada incidencia de la semana con una Mejora Aplicada específica. Revisa Versiones de Prompt. Si el Motor de Diagnóstico IA produjo un resultado de baja confianza, traza el motivo y actualiza el contexto del prompt del sistema.",
        reasoning: "La calidad diagnóstica del motor IA se compone con cada iteración de prompt. Un operador que revisa y actualiza semanalmente produce hipótesis mediblemente mejores en la semana 12 que en la semana 1.",
        tradeoff: "El efecto compuesto es invisible en los primeros 30 días. Se vuelve medible entre los días 60 y 90. Requiere paciencia para confiar en el proceso antes de que la señal sea visible.",
      },
    ],
  },
};

export const ACME_FALLBACK: DeliverableData = {
  clientKey: "acme-corp",
  clientName: "Acme Corp",
  date: "June 19, 2026",
  consultant: "Signal & Friction",
  loomUrl: "https://www.loom.com/embed/placeholder",
  segment: "microdosing",
  currentPhase: "diagnostic",
  progressPercent: 25,
  founderFocusScore: 85,
  daysRemaining: 23,
  guaranteeStatus: "Specificity Guarantee Active",
  telemetryStatus: "✓ Traffic & Baseline Confirmed",
  beforeAfter: {
    beforeTitle: "Verify Billing & Setup Server",
    beforeIssue: "Cognitive Load — 6 decision variables before dashboard access",
    beforeFields: ["Phone Number", "Company Size", "Industry Type", "CRM Version", "AWS Region", "Billing Email"],
    beforeWarning: "Credit card details required for validation.",
    beforeBounce: "Bounce Probability: ~88%",
    afterTitle: "Access Your Workspace",
    afterDomain: "acme.signal-and-friction.app",
    afterConfirmation: "No credit card required. Config deferred to dashboard.",
    afterDescription: "Subtracted all secondary inputs. User lands on simulated workspace with dummy data immediately. Habit builds, conversion scales.",
    afterGain: "Calculated Conversion Gain: +350%",
  },
  learningModules: [
    {
      id: "m-1",
      title: "Module 1: Funnel Diagnostics Briefing",
      description: "Understand the isolated cognitive load friction bottleneck on your pricing selector page.",
      completed: true,
      content: "Identify plan options complexity (Hick's Law). The current interface exposes 4 complex plans with 12+ features, stalling conversion."
    },
    {
      id: "m-2",
      title: "Module 2: Progressive Interaction Design",
      description: "Replace the static grid with a usage-based cost calculator to defer pricing anxiety.",
      completed: false,
      content: "Build a single slider representing scale. Show value clearly before requesting financial commitment."
    },
    {
      id: "m-3",
      title: "Module 3: PostHog Conversion Telemetry",
      description: "Deploy targeted PostHog tracking events to monitor checkout drop-offs.",
      completed: false,
      content: "Track price_card_hover, pricing_slider_change, and paywall_trigger events to isolate future friction."
    },
    {
      id: "m-4",
      title: "Module 4: Autonomy Checklist",
      description: "Formulate your team's routine checklists to ensure conversion optimization ownership.",
      completed: false,
      content: "Establish weekly telemetry scans, bi-weekly copy iterations, and monthly speed audit checks."
    }
  ],
  checklist: [
    { id: "c-1", task: "Isolate plans on pricing page from 4 down to 2 visible cards", done: true, tip: "Put the Enterprise plan behind a contact sales trigger." },
    { id: "c-2", task: "Simplify bullet points: display maximum of 5 comparison items", done: false, tip: "Hide secondary features under a collapsible section." },
    { id: "c-3", task: "Implement a usage slider calculator in local branch", done: false, tip: "Default the slider to the most profitable average user tier." },
    { id: "c-4", task: "Deploy PostHog tracking snippet on billing checkout button", done: false, tip: "Send custom events containing selected plan parameters." }
  ],
  diagnosis: {
    signal:
      "85% of high-intent trial signups land on the pricing selector page. Only 12% proceed to billing checkout. Drop-off is localized at the pricing tier selection step, where users spend an average of 3.8 minutes before bouncing, indicating extreme choice anxiety rather than price rejection.",
    friction: {
      mechanism: "Cognitive Load",
      rootCause:
        "The pricing interface exposes 4 complex plans with 12+ feature bullet points each. Users must mathematically model their own server usage before selecting a plan. The cognitive overhead required to guess the correct tier exceeds their current motivation.",
    },
    decisions: [
      {
        type: "A — Conservative",
        label: "Collapse pricing options from 4 to 2 visible tiers",
        action:
          "Redesign the selector to display only 'Starter' and 'Growth' plans. Gate 'Enterprise' behind a clear, high-contrast contact sales trigger.",
        reasoning:
          "Reducing options immediately reduces decision latency. Hick's Law mathematically predicts that minimizing active variables prevents choice paralysis.",
        tradeoff:
          "Power buyers might feel the self-serve options are constrained. Mitigate by adding a subtle progressive comparison toggle.",
      },
      {
        type: "B — Aggressive",
        label: "Replace static tiers with a single usage calculator",
        action:
          "Eliminate grid cards entirely. Build a clean, single-slider calculator where the founder inputs their user count and the system outputs one number.",
        reasoning:
          "Removes 100% of the cognitive estimation burden. Instantly converts value uncertainty into cost certainty in under 5 seconds.",
        tradeoff:
          "Requires custom engineering effort. Slide pricing must be meticulously modeled to prevent contract size drop-offs.",
      },
      {
        type: "C — Lateral",
        label: "Defer monetization — start with a zero-barrier free trial",
        action:
          "Remove pricing from the onboarding loop entirely. Let users experience the dashboard first. Prompt upgrade options on day 7 once utility is verified.",
        reasoning:
          "Corrects the Ordering Error. Demanding credit card details or financial commitments before demonstrating core utility violates PLG activation logic.",
        tradeoff:
          "Slightly delays short-term subscription revenue, but trial-to-paid conversion rates typically scale by up to 25%.",
      },
    ],
  },
};
