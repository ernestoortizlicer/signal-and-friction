"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthHeaders } from "@/lib/supabase";

interface Draft {
  id: string;
  article_slug: string;
  draft_number: number;
  content: string;
  rating?: number;
  feedback?: string;
  selected_arguments?: string[];
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  read_time_mins: number;
}

const DOMAINS = [
  { name: "Economía Conductual", score: 85, color: "#D4A853" },
  { name: "Arquitectura Conversión", score: 90, color: "#5C9A6B" },
  { name: "Psicología del Copy", score: 75, color: "#3B82F6" },
  { name: "Sistemas Técnicos", score: 80, color: "#A855F7" },
  { name: "Lógica de Precios", score: 95, color: "#F59E0B" },
  { name: "Fiscalidad & Compliance", score: 70, color: "#C85C5C" },
];

interface CaseStudy {
  id: string;
  title: string;
  metrics: string;
  context: string;
  frictionOptions: string[];
  concepts: Array<{ title: string; description: string }>;
  quizQuestion: string;
  quizAnswers: string[];
  quizExplanation: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "tiktok",
    title: "Colapso de Onboarding Localizado — TikTok India",
    metrics: "La conversión de instalación a registro cayó un 45%. Tiempo promedio en el formulario de registro: 4.8 minutos antes de abandonar.",
    context: "Los usuarios operan en redes 3G con dispositivos Android económicos. El flujo de registro utiliza verificación OTP vía SMS localizado.",
    frictionOptions: [
      "Técnico: Peso del payload en ancho de banda reducido",
      "Cognitivo: Carga de secuencia OTP vía SMS",
      "Déficit de Confianza: Desconexión lingüística en la localización"
    ],
    concepts: [
      { title: "Concepto 1: Tolerancia de Latencia en Bajo Ancho de Banda (Sistemas Técnicos)", description: "Los entornos de red 3G en India tienen alta tasa de pérdida de paquetes. El pesado paquete de inicialización al arranque causaba cierres de la app." },
      { title: "Concepto 2: Barreras de Verificación OTP vía SMS (Ciencia del Comportamiento)", description: "Los retrasos en el gateway SMS llevaban a reenvíos repetidos. El Modelo de Comportamiento de Fogg predice que el alto esfuerzo combinado con baja motivación destruye la activación." },
      { title: "Concepto 3: Subculturas de Confianza Localizadas (Arquitectura Lingüística)", description: "Las traducciones literales se sentían automatizadas y de bajo estatus. La verdadera localización requiere fraseología regional subcultural para mitigar la ansiedad de registro." }
    ],
    quizQuestion: "Las métricas SaaS muestran un 9.2% de tasa de selección de plan de precios, pero solo un 0.4% de confirmación de facturación. Los usuarios permanecen en la página de tarjeta 2.2 minutos. Aísla el mecanismo de fricción.",
    quizAnswers: [
      "Carga Cognitiva: Las opciones de precios son demasiado complejas",
      "Déficit de Confianza: El paywall carece de SSL claro / parámetros de validación",
      "Orden de Secuencia: El paso de facturación ocurre antes de la activación del producto"
    ],
    quizExplanation: "Se aísla el Déficit de Confianza. Los usuarios pasan 2.2 minutos en el campo de entrada de tarjeta — quieren pagar pero carecen de confianza de seguridad. Es un Déficit de Confianza."
  },
  {
    id: "figma",
    title: "Ansiedad en el Paywall Enterprise de Figma",
    metrics: "Usuarios enterprise navegan a la página de pago pero abandonan en 15 segundos. Alto CTR en el trigger de upgrade, pero cero compras.",
    context: "Admins de equipo en autoservicio intentando actualizar más de 10 puestos de diseñador. Los campos de Stripe solicitan claves de identificación fiscal corporativa.",
    frictionOptions: [
      "Cognitivo: Densidad masiva de campos multi-paso",
      "Déficit de Confianza: Parámetros de aislamiento de datos corporativos poco claros",
      "Déficit de Valor: Mapeo de incrementos de precios por puesto poco claro"
    ],
    concepts: [
      { title: "Concepto 1: Checkout B2B con Fiscalidad Diferida (Lógica de Precios)", description: "Forzar datos VAT/NIF a mitad del checkout en SaaS B2B de alto ticket aumenta el abandono de formularios un 40%. La configuración de facturación post-compra convierte un 22% mejor." },
      { title: "Concepto 2: Ansiedad por Precios por Puesto (Economía Conductual)", description: "El escalado ambiguo de coste por puesto obliga a los compradores a calcular el riesgo en tiempo real. Los simuladores de factura interactivos reducen el abandono un 35%." }
    ],
    quizQuestion: "Una herramienta para developers muestra que el 78% de los usuarios enterprise llegan a la página de precios pero solo el 2.1% convierten. Tiempo de sesión promedio: 8 minutos. ¿Cuál es la fricción principal?",
    quizAnswers: [
      "Déficit de Confianza: Preocupaciones sobre privacidad en el aislamiento del código fuente",
      "Déficit de Valor: Cero beneficios inmediatos por optar",
      "Cognitivo: Demasiados botones en pantalla"
    ],
    quizExplanation: "Se aísla el Déficit de Confianza. Los usuarios pasan 8 minutos investigando, no decidiendo — quieren el producto pero temen el riesgo de seguridad institucional. Es un Déficit de Confianza."
  },
  {
    id: "vercel",
    title: "Colapso del Opt-In de Telemetría — Vercel",
    metrics: "El opt-in de telemetría de developers cae un 60% tras la actualización del banner GDPR. La telemetría es esencial para mejoras de velocidad.",
    context: "Los developers técnicos rechazan los popups de opt-in. Añadir un dashboard de velocidad que renderiza un 10% más rápido con telemetría aumenta el opt-in un 35%.",
    frictionOptions: [
      "Déficit de Confianza: Preocupaciones sobre privacidad en el aislamiento del código fuente",
      "Déficit de Valor: Cero beneficios inmediatos por optar",
      "Cognitivo: Demasiados botones en pantalla"
    ],
    concepts: [
      { title: "Concepto 1: Compensación por Déficit de Valor (Economía Conductual)", description: "Solicitar telemetría sin ofrecer un beneficio recíproco inmediato viola la economía de reciprocidad. Los usuarios exigen una compensación de valor." },
      { title: "Concepto 2: Transparencia en Aislamiento de Privacidad (Déficit de Confianza)", description: "Asegurar a los usuarios que todos los tokens de telemetría están hasheados y ningún repositorio de código es indexado elimina las ansiedades de seguridad." }
    ],
    quizQuestion: "Los developers rechazan los popups de opt-in. Añadir 'El dashboard de velocidad renderiza un 10% más rápido con telemetría en caché' aumenta el opt-in un 35%. ¿Por qué?",
    quizAnswers: [
      "Se resuelve el Déficit de Confianza",
      "Se establece una Compensación de Valor Recíproco",
      "Se reduce la carga cognitiva"
    ],
    quizExplanation: "Compensación de Valor Recíproco. El usuario recibe un beneficio directo de rendimiento a cambio de consentir compartir datos de uso."
  },
  {
    id: "saas_asia",
    title: "Colapso de Expansión SaaS en Asia — $50M",
    metrics: "La conversión cae un 60% en los checkouts locales de Singapur/Japón. El abandono ocurre en la confirmación del plan de precios (latencia promedio 4.2 minutos).",
    context: "Plataforma CRM con sede en EE.UU. Localizaron idiomas pero los pagos se liquidan en USD con estructuras estándar de validación de tarjetas de EE.UU.",
    frictionOptions: [
      "Técnico: Latencia del gateway de pago (enrutamiento EE.UU.)",
      "Cognitivo: Discrepancia de facturación por tipo de cambio (FX)",
      "Déficit de Confianza: Ausencia de símbolos de pago locales de confianza (PayNow / JCB)"
    ],
    concepts: [
      { title: "Concepto 1: Latencia en Liquidación Cross-Border", description: "Enrutar el procesamiento de tarjetas local a través de gateways de EE.UU. lleva a una tasa de rechazo de transacciones del 15%. El enrutamiento a través de adquirentes locales lo resuelve." },
      { title: "Concepto 2: Brechas de Confianza en Pagos Locales (Déficit de Confianza)", description: "En Singapur, PayNow tiene una cuota de mercado del 65%. Entrar en SE Asia sin integrar los paradigmas de pago locales aumenta el abandono un 40%." },
      { title: "Concepto 3: Transparencia en Tipo de Cambio (Cognitivo)", description: "Mostrar precios en USD en lugar de SGD/JPY localizado obliga a los usuarios a calcular tipos de cambio manualmente, generando fatiga de checkout." }
    ],
    quizQuestion: "Una plataforma CRM se expande a Japón. La conversión en checkout cae un 40%. Solo aceptan Visa/Mastercard en USD, ignorando JCB y precios en Yen. Identifica la fricción principal.",
    quizAnswers: [
      "Déficit de Valor: Los usuarios japoneses no ven el valor del CRM",
      "Confianza y Cognitivo: Ausencia de precios en Yen local y canales de pago JCB",
      "Técnico: Carga lenta de páginas desde servidores en EE.UU."
    ],
    quizExplanation: "Confianza y Cognitivo. Los compradores B2B japoneses requieren opciones de pago locales (JCB) y total claridad en precios (JPY) para autorizar gasto corporativo."
  }
];

const CHALLENGE_ELEVATIONS: Record<string, {
  gaps: Array<{ label: string; current: number; target: number; colorClass: string; barColor: string }>;
  studyPlan: Array<{ step: string; title: string; desc: string }>;
  articles: Array<{ num: number; category: string; categoryColor: string; title: string; summary: string; body: string }>;
}> = {
  tiktok: {
    gaps: [
      { label: "Brecha de Carga Cognitiva", current: 40, target: 85, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Brecha de Ciencia del Comportamiento", current: 45, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Reducción de Peso del Payload Móvil", desc: "Dividir bundle y lazy-load de assets pesados para garantizar que el chunk JS inicial sea inferior a 150KB para conexiones 3G lentas." },
      { step: "02", title: "Mitigación de Retrasos en Gateway SMS", desc: "Optimizar el enrutamiento del proveedor SMS e integrar una cuenta regresiva de 60s antes de reenvíos, siguiendo los protocolos de reducción de esfuerzo de Fogg." },
      { step: "03", title: "Alineación de Confianza Lingüística", desc: "Reescribir las instrucciones de onboarding usando coloquialismos regionales en Hindi/lenguas locales en lugar de inglés frío y traducido automáticamente." }
    ],
    articles: [
      { num: 1, category: "Carga Cognitiva", categoryColor: "text-[#C85C5C]", title: "Fricción en Formularios Móviles y Optimización Conductual de Fogg", summary: "Reducción del esfuerzo de tareas en páginas de onboarding para entornos móviles de alta fricción.", body: "Cuando se opera en entornos móviles con alta latencia (ej. red 3G), cualquier incremento menor de tarea (como cambiar pantallas o esperar códigos SMS) provoca abandono. Al optimizar campos de formulario, reducir requisitos de entrada y diseñar instrucciones en línea simples, las plataformas SaaS pueden aumentar sus tasas de completitud de registro móvil hasta un 45%." },
      { num: 2, category: "Comportamiento", categoryColor: "text-[#D4A853]", title: "Protocolos de Resiliencia de Gateway SMS en Mercados Emergentes", summary: "Gestión de códigos OTP retrasados usando rutas SMS transaccionales locales.", body: "Los códigos OTP retrasados llevan a los usuarios a hacer clic en 'Reenviar' repetidamente, acumulando colas en el gateway. Implementar contadores regresivos inteligentes del lado del cliente y elegir agregadores SMS regionales de primer nivel (ej. rutas locales de Twilio) previene el fallo de activación." },
      { num: 3, category: "Confianza", categoryColor: "text-[#D4A853]", title: "Señales de Confianza Lingüística y Copywriting Hiper-Localizado", summary: "Cómo los matices de traducción impactan la seguridad percibida y el estatus en apps localizadas.", body: "Las traducciones literales carecen de autoridad local y generan déficits de confianza. Colaborar con copywriters locales para usar modismos regionales en acciones clave de generación de confianza (como permisos de facturación) mejora drásticamente la conversión." }
    ]
  },
  figma: {
    gaps: [
      { label: "Brecha de Carga Cognitiva", current: 55, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" },
      { label: "Brecha de Lógica de Precios", current: 60, target: 95, colorClass: "text-[#5C9A6B]", barColor: "from-[#5C9A6B] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Flujo de Ingesta Fiscal Diferida", desc: "Permitir a los admins de equipo pagar primero, e ingerir identificadores VAT/NIF corporativos post-compra dentro del portal de facturación." },
      { step: "02", title: "Simulador Interactivo de Expansión de Factura", desc: "Construir un slider interactivo en línea que muestre el coste mensual preciso por cambio de puesto de diseñador antes de hacer clic en 'Actualizar'." },
      { step: "03", title: "Simplificación del Formulario de Pago B2B", desc: "Eliminar campos de Dirección de Facturación innecesarios, utilizando la verificación de solo código postal de Stripe donde sea posible." }
    ],
    articles: [
      { num: 1, category: "Carga Cognitiva", categoryColor: "text-[#D4A853]", title: "Optimización de Checkout B2B y Diferimiento de Fricción Fiscal", summary: "Por qué exigir números de identificación fiscal corporativa durante el checkout aumenta el abandono.", body: "Exigir números VAT/NIF a mitad del checkout obliga a los compradores corporativos a buscar documentos internos, aumentando el tiempo y las tasas de salida. Mover la verificación del perfil fiscal a la configuración post-compra aumenta la conversión inmediata un 22%." },
      { num: 2, category: "Precios", categoryColor: "text-[#5C9A6B]", title: "Modelos de Precios por Puesto y Widgets de Simulador de Factura", summary: "Uso de widgets interactivos para eliminar ambigüedad en la expansión de precios SaaS de alto ticket.", body: "La ansiedad de expansión de precios ocurre cuando los compradores corporativos temen cargos ocultos. Las representaciones de cálculos claros en tiempo real que muestran cambios de precio por adición de puesto generan confianza y llevan a tamaños de pedido promedio un 30% mayores." },
      { num: 3, category: "Confianza", categoryColor: "text-[#D4A853]", title: "Señales de Confianza Enterprise y Tasas de Autorización de Tarjeta Corporativa", summary: "Minimizando rechazos bancarios y errores de autorización en transacciones B2B de alto valor.", body: "Las transacciones con tarjetas corporativas de alto valor enfrentan verificaciones agresivas de fraude. Usar Stripe Radar, 3D Secure y códigos de categoría de comerciante claros previene rechazos falsos y proporciona un camino de fallback elegante." }
    ]
  },
  vercel: {
    gaps: [
      { label: "Brecha de Déficit de Valor", current: 30, target: 85, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Brecha de Déficit de Confianza", current: 50, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Diseño de Compensación de Valor Recíproco", desc: "Recompensar explícitamente el opt-in de telemetría desbloqueando una función premium del dashboard (ej. caché de carga un 10% más rápido)." },
      { step: "02", title: "Verificación de Hash Anonimizado", desc: "Publicar código open source detallando cómo el código cliente es hasheado localmente, probando que ningún repositorio en bruto es transmitido." },
      { step: "03", title: "Rediseño de Micro-Copy de Consentimiento", desc: "Cambiar el estándar 'Permitir seguimiento' a 'Acelerar el renderizado de UI con métricas de análisis en caché en la nube'." }
    ],
    articles: [
      { num: 1, category: "Déficit de Valor", categoryColor: "text-[#C85C5C]", title: "Principio de Reciprocidad y Compensaciones de Valor en Flujos de Opt-in", summary: "Diseñando intercambios de beneficio mutuo para superar los muros de privacidad de datos de usuarios.", body: "Solicitar telemetría de usuario sin un beneficio recíproco inmediato lleva al opt-out automático. Ofrecer ventajas claras (como mejoras de rendimiento o caché localizado) aumenta las tasas de consentimiento hasta un 35%." },
      { num: 2, category: "Déficit de Confianza", categoryColor: "text-[#D4A853]", title: "Telemetría de Analítica Privacy-First y Soberanía de Datos", summary: "Ganando confianza de developers técnicos a través de transparencia criptográfica.", body: "Los developers son altamente suspicaces de los rastreadores de telemetría. Demostrar que todos los puntos de datos ingeridos están salteados y hasheados del lado del cliente, con plena adherencia al GDPR, elimina los miedos de responsabilidad corporativa." },
      { num: 3, category: "Copywriting", categoryColor: "text-[#D4A853]", title: "Análisis de Micro-Copy: Diseñando Elementos de Consentimiento sin Fricción", summary: "Cómo los ajustes de micro-copy cambian la percepción del usuario de 'espionaje' a 'optimización'.", body: "Las palabras importan. Cambiar el texto del banner de consentimiento de jerga de seguimiento pasiva a mejoras de rendimiento activas del usuario altera el marco cognitivo de defensa a cooperación." }
    ]
  },
  saas_asia: {
    gaps: [
      { label: "Brecha de Fiscalidad & Compliance", current: 50, target: 95, colorClass: "text-[#C85C5C]", barColor: "from-[#C85C5C] to-[#D4A853]" },
      { label: "Brecha de Sistemas Técnicos", current: 40, target: 90, colorClass: "text-[#D4A853]", barColor: "from-[#B8900A] to-[#D4A853]" }
    ],
    studyPlan: [
      { step: "01", title: "Configuración de Enrutamiento de Adquirente Soberano", desc: "Establecer raíles de adquisición locales en Singapur (ej. procesadores DBS/UOB) para evitar retrasos de liquidación internacional y tasas de rechazo >15%." },
      { step: "02", title: "Auditoría de Localización Lingüística y de Moneda", desc: "Asegurar que los planes de precios se resuelvan en moneda nativa (SGD o JPY) con tipos impositivos locales (GST) automáticamente incluidos o diferidos post-checkout." },
      { step: "03", title: "Integración de Wallet Local y Transferencia Bancaria", desc: "Configurar endpoints de PayNow (Singapur) y JCB (Japón). Verificar aprovisionamiento automático basado en webhook para capturar la cuota >60% de compradores sin tarjeta." }
    ],
    articles: [
      { num: 1, category: "Fiscal", categoryColor: "text-[#C85C5C]", title: "Reinversión Libre de Impuestos y LLC Pass-Through en SE Asia", summary: "Estructurando holdings bajo la exención FSI-S de Singapur y el marco del Art. 13(1)(a) para reinvertir beneficios SaaS.", body: "Al establecer una estructura holding Singapore Private Limited (Pte. Ltd.), los fundadores acceden a un sistema territorial de nivel único. Bajo el Art. 13(1)(a) de la Ley del Impuesto sobre la Renta, los ingresos de servicios de origen extranjero recibidos en Singapur están completamente exentos si el tipo del impuesto corporativo del país de origen es al menos del 15%." },
      { num: 2, category: "Legal", categoryColor: "text-[#D4A853]", title: "Protocolos de Compliance SaaS bajo Directrices MAS de Singapur", summary: "Dominando la gestión del riesgo tecnológico (TRM) y las directivas de outsourcing definidas por la Autoridad Monetaria de Singapur.", body: "Las arquitecturas SaaS que operan en Singapur y sirven a fintechs, consultorías financieras o gestionan raíles de pago de alta frecuencia caen dentro del ámbito consultivo de las Directrices de Outsourcing y Gestión de Riesgos Tecnológicos (TRM) de la Autoridad Monetaria de Singapur (MAS)." },
      { num: 3, category: "Checkout", categoryColor: "text-[#D4A853]", title: "Fricción de Pago Cross-Border: Optimizando Tasas de Checkout Local", summary: "Resolviendo latencia de gateways regionales, discrepancias de moneda y códigos de rechazo usando endpoints de adquisición local.", body: "La liquidación de tarjetas de crédito cross-border es una de las causas más comunes de fuga silenciosa de conversión. Enrutar transacciones a través de bancos adquirentes mercantiles locales (ej. DBS/UOB en Singapur, Sumitomo Mitsui en Japón) logra una tasa de autorización del 98%+." }
    ]
  }
};

function parseInlineMd(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIdx = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) result.push(<span key={key++}>{text.slice(lastIdx, match.index)}</span>);
    if (match[0].startsWith("**")) {
      result.push(<strong key={key++} className="text-[#F5F0EB] font-semibold">{match[2]}</strong>);
    } else {
      result.push(<em key={key++} className="text-[#D4A853] not-italic">{match[3]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) result.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  return result;
}

function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <span className={className}>
      {lines.map((line, li) => {
        const hMatch = line.match(/^#{1,3}\s+(.+)/);
        if (hMatch) {
          return <span key={li} className="block text-[#F5F0EB] font-bold text-xs uppercase tracking-wider mt-1.5">{hMatch[1]}</span>;
        }
        return <span key={li} className="block">{parseInlineMd(line)}</span>;
      })}
    </span>
  );
}

export default function LearningDashboard() {
  const [activeTab, setActiveTab] = useState<'socratic' | 'hyper_leap'>('hyper_leap');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string>("socratic-funnel-diagnostics");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const [selectedChallengeId, setSelectedChallengeId] = useState<string>("tiktok");
  const [hlActive, setHlActive] = useState(false);
  const [hlInput, setHlInput] = useState("");
  const [hlSelectedOptions, setHlSelectedOptions] = useState<number[]>([]);
  const [radarDomains, setRadarDomains] = useState(DOMAINS);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [conceptsMastered, setConceptsMastered] = useState(14);

  // Telemetría Cognitiva
  const [typingStartedAt, setTypingStartedAt] = useState<number | null>(null);
  const [diagnosticVelocity, setDiagnosticVelocity] = useState<number | null>(null);
  const [coverageScore, setCoverageScore] = useState<number | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState<number | null>(null);

  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tsaarsuuclvkjsgjcmoj.supabase.co";

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = getAuthHeaders();
        const [resArticles, resDrafts] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/education_content?select=*`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/education_drafts?select=*`, { headers }),
        ]);
        const dataArticles = resArticles.ok ? await resArticles.json() : [];
        const dataDrafts = resDrafts.ok ? await resDrafts.json() : [];
        setArticles(dataArticles);
        setDrafts(dataDrafts);
        const initialRatings: Record<string, number> = {};
        dataDrafts.forEach((d: Draft) => { if (d.rating) initialRatings[d.id] = d.rating; });
        setRatings(initialRatings);
        if (dataArticles.length > 0 && !selectedArticleSlug) setSelectedArticleSlug(dataArticles[0].slug);
      } catch (err) {
        console.error("Error loading learning data", err);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticleSlug]);

  const activeArticle = articles.find(a => a.slug === selectedArticleSlug) || articles[0];
  const activeDrafts = drafts.filter(d => d.article_slug === selectedArticleSlug);
  const activeChallenge = CASE_STUDIES.find(c => c.id === selectedChallengeId) || CASE_STUDIES[0];

  const handleSelectDraft = (draftNumber: number) => setSelectedDraftId(draftNumber);

  const handleRating = async (draftId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [draftId]: rating }));
    try {
      const headers = getAuthHeaders();
      await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${draftId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
      });
    } catch (err) { console.error("Error saving draft rating:", err); }
  };

  const submitSocraticPreference = async () => {
    if (!selectedDraftId) return;
    const targetDraft = activeDrafts.find(d => d.draft_number === selectedDraftId);
    if (!targetDraft) return;
    try {
      const headers = getAuthHeaders();
      await fetch(`${supabaseUrl}/rest/v1/education_drafts?id=eq.${targetDraft.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText })
      });
      alert(`✓ Selección Confirmada: Borrador ${selectedDraftId} pesos reforzados.`);
      setFeedbackText("");
      setSelectedDraftId(null);
    } catch (err) { console.error("Error saving draft feedback:", err); }
  };

  const checkQuiz = (answerIdx: number) => {
    setSelectedAnswer(answerIdx);
    setQuizScore(answerIdx === 1 ? 100 : 0);
  };

  const resetChallenge = () => {
    setHlActive(false);
    setHlInput("");
    setHlSelectedOptions([]);
    setExpandedArticle(null);
    setTypingStartedAt(null);
    setDiagnosticVelocity(null);
    setCoverageScore(null);
    setSessionElapsed(null);
  };

  // Radar math
  const radarW = 240;
  const radarH = 240;
  const cx = radarW / 2;
  const cy = radarH / 2;
  const r = 76;

  const getCoords = (index: number, score: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const val = score / 100;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };

  const getWebCoords = (index: number, level: number) => {
    const angle = (index * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
    const val = level / 4;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };

  const scorePoints = radarDomains.map((d, i) => {
    const c = getCoords(i, d.score);
    return `${c.x},${c.y}`;
  }).join(" ");

  const elev = CHALLENGE_ELEVATIONS[activeChallenge.id] || CHALLENGE_ELEVATIONS.saas_asia;

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0EB] p-4 md:p-6 space-y-5 font-mono relative overflow-x-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(212,168,83,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[#D4A853]/15 pb-4 relative z-10">
        <div>
          <span className="font-mono text-xs text-[#D4A853]/70 tracking-[0.4em] uppercase block">
            Eminence System
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            Combat <span className="text-[#D4A853]">Learning Lab</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-[#5C9A6B] border border-[#5C9A6B]/25 px-3 py-1 rounded-full bg-[#5C9A6B]/5">
            {conceptsMastered} Conceptos Dominados
          </span>
          <span className="font-mono text-xs text-[#D4A853] border border-[#D4A853]/25 px-3 py-1 rounded-full bg-[#D4A853]/5">
            IP Factory Activo
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4A853]/10 gap-6 relative z-10">
        {([
          { key: 'hyper_leap', label: 'Modo Combate' },
          { key: 'socratic',   label: 'IP Lab' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-all duration-300 cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#D4A853] text-[#D4A853]"
                : "border-transparent text-[#7A6F65] hover:text-[#B0A89E]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── COMBAT MODE (Hyper-Leap) ─────────────────────────────── */}
        {activeTab === 'hyper_leap' && (
          <motion.div
            key="combat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10"
          >
            {/* LEFT: Challenge engine */}
            <div className="xl:col-span-8 space-y-4">

              {/* Scenario Selector */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                    01 — Selección de Escenario
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#C85C5C] border border-[#C85C5C]/20 px-2 py-0.5 rounded-full bg-[#C85C5C]/5">
                    Modo Divergente
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CASE_STUDIES.map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        setSelectedChallengeId(cs.id);
                        resetChallenge();
                        setQuizScore(null);
                        setSelectedAnswer(null);
                      }}
                      className={`p-3 border rounded-xl text-left transition-all cursor-pointer ${
                        selectedChallengeId === cs.id
                          ? "border-[#D4A853] bg-[#D4A853]/5 text-white"
                          : "border-[#D4A853]/8 text-[#B0A89E] hover:border-[#D4A853]/20 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold leading-snug line-clamp-2">{cs.title}</div>
                      {selectedChallengeId === cs.id && (
                        <span className="text-[10px] text-[#D4A853] block mt-1 uppercase tracking-wider">Activo</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Challenge Card */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                  02 — Escenario Crisis
                </span>
                <h3 className="text-base font-bold text-white font-serif leading-snug">{activeChallenge.title}</h3>

                <div className="border border-[#D4A853]/10 bg-[#0A0908] p-4 rounded-xl text-xs space-y-3">
                  <div>
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">Cuello de Botella — Métricas</span>
                    <p className="text-[#B0A89E] leading-relaxed">{activeChallenge.metrics}</p>
                  </div>
                  <div className="border-t border-[#D4A853]/8 pt-3">
                    <span className="text-[#D4A853] font-semibold block uppercase text-[10px] tracking-wider mb-1">Contexto Ambiental</span>
                    <p className="text-[#B0A89E] leading-relaxed">{activeChallenge.context}</p>
                  </div>
                </div>

                {!hlActive ? (
                  <div className="space-y-4">
                    {/* Friction options — 2 cols max */}
                    <div>
                      <label className="text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">
                        Aislar mecanismos de fricción (selecciona todos los que aplican):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeChallenge.frictionOptions.map((option, idx) => {
                          const isSel = hlSelectedOptions.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  setHlSelectedOptions(prev => prev.filter(i => i !== idx));
                                } else {
                                  setHlSelectedOptions(prev => [...prev, idx]);
                                }
                              }}
                              className={`p-3 text-xs text-left border rounded-xl transition-all cursor-pointer leading-relaxed ${
                                isSel
                                  ? "border-[#D4A853] bg-[#D4A853]/5 text-[#F5F0EB]"
                                  : "border-[#D4A853]/8 text-[#B0A89E] hover:border-white/10"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hypothesis */}
                    <div>
                      <label className="text-xs text-[#B0A89E] uppercase tracking-wider block mb-2">
                        Hipótesis diagnóstica clínica:
                      </label>
                      <textarea
                        value={hlInput}
                        onChange={(e) => {
                          setHlInput(e.target.value);
                          if (!typingStartedAt && e.target.value.length > 0) {
                            setTypingStartedAt(Date.now());
                          }
                        }}
                        placeholder="Write your diagnostic strategy. Focus on how technical constraints interact with behavioral friction..."
                        className="w-full bg-[#0A0908] border border-[#D4A853]/8 focus:border-[#D4A853] focus:outline-none p-3 text-xs rounded-xl h-24 text-[#F5F0EB] font-mono resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (typingStartedAt) {
                            const elapsedSecs = (Date.now() - typingStartedAt) / 1000;
                            const wordCount = hlInput.trim().split(/\s+/).filter(Boolean).length;
                            const wpm = wordCount > 0 && elapsedSecs > 0 ? Math.round((wordCount / elapsedSecs) * 60) : 0;
                            setDiagnosticVelocity(wpm);
                            setSessionElapsed(Math.round(elapsedSecs));
                          }
                          setCoverageScore(Math.round((hlSelectedOptions.length / activeChallenge.frictionOptions.length) * 100));
                          setHlActive(true);
                        }}
                        disabled={!hlInput.trim() || hlSelectedOptions.length === 0}
                        className="px-5 py-2.5 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider transition-all hover:bg-[#E8C97A] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-xl"
                      >
                        Ejecutar Reverse-Reveal Socrático →
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5 border-t border-[#D4A853]/15 pt-4"
                  >
                    {/* Hypothesis recap */}
                    <div>
                      <h4 className="text-xs text-[#5C9A6B] uppercase tracking-widest font-semibold mb-1">
                        ✓ Reverse-Reveal Socrático Completado
                      </h4>
                      <p className="text-xs text-[#B0A89E] leading-relaxed">
                        Hipótesis: <span className="text-white italic">&ldquo;{hlInput}&rdquo;</span>
                      </p>
                    </div>

                    {/* Telemetría Cognitiva */}
                    {coverageScore !== null && (
                      <div className="border border-[#D4A853]/15 bg-[#0A0908]/60 p-4 rounded-xl">
                        <span className="font-mono text-[10px] text-[#D4A853]/70 uppercase tracking-widest block mb-3">
                          Telemetría Cognitiva
                        </span>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">Velocity</span>
                            <span className="font-serif text-xl font-bold text-[#D4A853]">{diagnosticVelocity ?? "—"}</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">WPM</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">Coverage</span>
                            <span className={`font-serif text-xl font-bold ${
                              coverageScore === 100 ? "text-[#5C9A6B]" :
                              coverageScore >= 67 ? "text-[#D4A853]" :
                              "text-[#C85C5C]"
                            }`}>{coverageScore}%</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">Mechanisms</span>
                          </div>
                          <div>
                            <span className="font-mono text-[10px] text-[#B0A89E] uppercase block mb-1">Session</span>
                            <span className="font-serif text-xl font-bold text-[#F5F0EB]">{sessionElapsed ?? "—"}s</span>
                            <span className="font-mono text-[10px] text-[#7A6F65] block">Elapsed</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Concept reveal */}
                    <div className="space-y-3 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                      {activeChallenge.concepts.map((concept, idx) => (
                        <div key={idx}>
                          <div className="text-xs text-[#D4A853] uppercase font-bold">{concept.title}</div>
                          <p className="text-xs text-[#B0A89E] leading-relaxed mt-0.5">{concept.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Elevation Report */}
                    <div className="border border-[#D4A853]/25 bg-[#110F0D]/30 p-5 rounded-2xl space-y-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4A853]/5 rounded-full filter blur-xl pointer-events-none" />

                      <div>
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-1">
                          Informe de Elevación — Mapa de Brechas Cognitivas
                        </span>
                        <div className="space-y-3">
                          {elev.gaps.map((g, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-xs mb-1 flex-wrap gap-1">
                                <span className="text-[#B0A89E]">{g.label}</span>
                                <span className={`${g.colorClass} font-bold`}>{g.target - g.current}% Gap</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded overflow-hidden">
                                <div className={`bg-gradient-to-r ${g.barColor} h-full`} style={{ width: `${g.current}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#D4A853]/15 pt-4">
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-3">
                          Plan de Estudio Hyper-Leap
                        </span>
                        <div className="space-y-2">
                          {elev.studyPlan.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white/5 rounded-xl border border-[#D4A853]/8">
                              <span className="text-[#D4A853] font-bold text-xs flex-shrink-0">{s.step}</span>
                              <div>
                                <span className="text-white block font-bold text-xs">{s.title}</span>
                                <span className="text-xs text-[#B0A89E] leading-relaxed block mt-0.5">{s.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#D4A853]/15 pt-4">
                        <span className="font-mono text-[10px] text-[#D4A853] tracking-widest uppercase block mb-3">
                          Artículos Prioritarios (Cierre de Brechas)
                        </span>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {elev.articles.map((art) => (
                            <div
                              key={art.num}
                              className={`p-3 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                                expandedArticle === art.num
                                  ? "border-[#D4A853] bg-[#D4A853]/10"
                                  : "border-[#D4A853]/8 bg-[#0A0908] hover:border-[#D4A853]/25"
                              }`}
                              onClick={() => setExpandedArticle(expandedArticle === art.num ? null : art.num)}
                            >
                              <div>
                                <span className={`font-mono text-[10px] ${art.categoryColor} uppercase block mb-1`}>
                                  {art.category}
                                </span>
                                <h5 className="text-xs font-bold text-white leading-snug">{art.title}</h5>
                                {expandedArticle === art.num ? (
                                  <p className="text-xs text-[#F5F0EB] mt-2 leading-relaxed">{art.body}</p>
                                ) : (
                                  <p className="text-xs text-[#B0A89E] mt-1 line-clamp-2">{art.summary}</p>
                                )}
                              </div>
                              <span className="text-xs text-[#D4A853] font-bold mt-2">
                                {expandedArticle === art.num ? "Cerrar ↑" : "Leer →"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={resetChallenge}
                        className="px-4 py-2 border border-white/10 text-xs text-[#B0A89E] hover:text-white cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const node = {
                            schema: "sf-ip-node-v1",
                            generated_at: new Date().toISOString(),
                            challenge: {
                              id: activeChallenge.id,
                              title: activeChallenge.title,
                              metrics: activeChallenge.metrics,
                              context: activeChallenge.context,
                            },
                            diagnostic_session: {
                              hypothesis: hlInput,
                              selected_friction_mechanisms: hlSelectedOptions.map(i => activeChallenge.frictionOptions[i]),
                              coverage_score_pct: coverageScore,
                              diagnostic_velocity_wpm: diagnosticVelocity,
                              time_to_submit_seconds: sessionElapsed,
                            },
                            elevation_report: {
                              gaps: elev.gaps.map(g => ({ label: g.label, current: g.current, target: g.target })),
                              study_plan: elev.studyPlan,
                            },
                            cognitive_radar_snapshot: radarDomains.map(d => ({ domain: d.name, score: d.score })),
                          };
                          const blob = new Blob([JSON.stringify(node, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `sf-ip-node-${activeChallenge.id}-${Date.now()}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 border border-[#D4A853]/25 text-xs text-[#D4A853] hover:bg-[#D4A853]/5 cursor-pointer uppercase font-mono rounded-xl transition-colors"
                      >
                        Exportar Nodo IP ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRadarDomains(prev =>
                            prev.map(d => {
                              if (d.name === "Economía Conductual") return { ...d, score: Math.min(d.score + 10, 100) };
                              if (d.name === "Sistemas Técnicos") return { ...d, score: Math.min(d.score + 12, 100) };
                              if (d.name === "Fiscalidad & Compliance") return { ...d, score: Math.min(d.score + 8, 100) };
                              return d;
                            })
                          );
                          setConceptsMastered(prev => prev + 3);
                          alert("✓ Conceptos absorbidos. Radar actualizado.");
                        }}
                        className="px-4 py-2 bg-[#5C9A6B]/10 border border-[#5C9A6B]/30 text-[#5C9A6B] text-xs font-bold uppercase tracking-wider cursor-pointer font-mono rounded-xl transition-colors hover:bg-[#5C9A6B]/20 ml-auto"
                      >
                        Absorber Conceptos
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* RIGHT: Radar + Quiz */}
            <div className="xl:col-span-4 space-y-4">

              {/* Cognitive Radar */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-4">
                  03 — Radar Cognitivo
                </span>
                <div className="flex justify-center">
                  <svg width={radarW} height={radarH} className="overflow-visible">
                    <defs>
                      <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#D4A853" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#D4A853" stopOpacity={0.28} />
                      </radialGradient>
                    </defs>
                    {[1, 2, 3, 4].map((level) => {
                      const pts = radarDomains.map((_, idx) => {
                        const c = getWebCoords(idx, level);
                        return `${c.x},${c.y}`;
                      }).join(" ");
                      return <polygon key={level} points={pts} fill="none" stroke="#D4A853" strokeOpacity={0.06} strokeWidth={1} />;
                    })}
                    {radarDomains.map((_, idx) => {
                      const end = getWebCoords(idx, 4);
                      return <line key={idx} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#D4A853" strokeOpacity={0.1} strokeWidth={1} />;
                    })}
                    <polygon
                      points={scorePoints}
                      fill="url(#radarFill)"
                      stroke="#D4A853"
                      strokeWidth={2}
                      style={{ filter: "drop-shadow(0 0 4px rgba(212,168,83,0.3))" }}
                    />
                    {radarDomains.map((d, i) => {
                      const labelR = r + 22;
                      const angle = (i * 2 * Math.PI) / radarDomains.length - Math.PI / 2;
                      const lx = cx + labelR * Math.cos(angle);
                      const ly = cy + labelR * Math.sin(angle);
                      const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
                      return (
                        <text key={d.name} x={lx} y={ly + 4} fill="#B0A89E" fontSize="8" fontFamily="monospace" textAnchor={anchor}>
                          {d.name.split(" ")[0]}
                        </text>
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 space-y-1.5 border-t border-[#D4A853]/8 pt-3">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[#D4A853] uppercase tracking-wider font-bold text-[10px]">Conceptos Dominados</span>
                    <span className="text-white font-bold bg-[#D4A853]/10 px-2 py-0.5 rounded-full border border-[#D4A853]/20 text-[10px]">{conceptsMastered}</span>
                  </div>
                  {radarDomains.map(d => (
                    <div key={d.name} className="flex justify-between items-center text-xs">
                      <span className="text-[#B0A89E] truncate mr-2">{d.name}</span>
                      <span className="text-[#D4A853] flex-shrink-0 font-mono">{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Diagnostic Quiz */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">
                  04 — Diagnóstico Rápido
                </span>
                <div className="border border-[#D4A853]/8 bg-[#0A0908] p-3 rounded-xl">
                  <span className="text-[10px] text-[#D4A853] uppercase block mb-1">Escenario Activo</span>
                  <p className="text-xs text-[#B0A89E] leading-relaxed">{activeChallenge.quizQuestion}</p>
                </div>
                <div className="space-y-1.5">
                  {activeChallenge.quizAnswers.map((ans, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => checkQuiz(idx)}
                      disabled={selectedAnswer !== null}
                      className={`w-full text-left p-2.5 text-xs border rounded-xl transition-all cursor-pointer ${
                        selectedAnswer === idx
                          ? idx === 1
                            ? "bg-[#5C9A6B]/10 border-[#5C9A6B]/30 text-[#5C9A6B]"
                            : "bg-[#C85C5C]/10 border-[#C85C5C]/30 text-[#C85C5C]"
                          : "border-[#D4A853]/8 text-[#B0A89E] hover:border-[#D4A853]/25 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      {ans}
                    </button>
                  ))}
                </div>
                {quizScore !== null && (
                  <div className={`p-2.5 border text-xs leading-relaxed rounded-xl ${
                    quizScore === 100
                      ? "bg-[#5C9A6B]/5 border-[#5C9A6B]/20 text-[#5C9A6B]"
                      : "bg-[#C85C5C]/5 border-[#C85C5C]/20 text-[#C85C5C]"
                  }`}>
                    {quizScore === 100 ? "✓ CORRECTO. " : "✗ INCORRECTO. "}
                    {activeChallenge.quizExplanation}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── IP LAB (Socratic Drafts) ──────────────────────────────── */}
        {activeTab === 'socratic' && (
          <motion.div
            key="lab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-5 relative z-10"
          >
            {/* LEFT: Draft Engine */}
            <div className="xl:col-span-8 space-y-4">
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block mb-4">
                  01 — Motor de Borradores Socrático
                </span>

                {/* Article selector chips — always scrollable, never grid */}
                <div className="flex gap-2 pb-2 overflow-x-auto flex-nowrap scrollbar-thin">
                  {articles.length === 0 ? (
                    <button className="px-4 py-2 text-xs font-mono border border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853] rounded-xl flex-shrink-0 cursor-pointer">
                      Socratic Funnel Diagnostics
                    </button>
                  ) : (
                    articles.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => { setSelectedArticleSlug(article.slug); setSelectedDraftId(null); }}
                        className={`px-4 py-2 text-xs font-mono border rounded-xl transition-all flex-shrink-0 cursor-pointer ${
                          selectedArticleSlug === article.slug
                            ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                            : "border-[#2A2218] text-[#7A6F65] hover:text-[#B0A89E]"
                        }`}
                      >
                        {article.title}
                      </button>
                    ))
                  )}
                </div>

                {/* Article brief */}
                <div className="mt-4 mb-5 border-l-2 border-[#D4A853]/30 pl-4 py-1">
                  <h2 className="text-base font-bold font-mono text-white">
                    {activeArticle?.title || "Socratic Funnel Diagnostics"}
                  </h2>
                  <p className="text-xs text-[#B0A89E] leading-relaxed mt-1">
                    {activeArticle?.summary || "How to construct medical-grade landing page teardowns that demand high-ticket consulting responses."}
                  </p>
                </div>

                {/* 3 Drafts — lg:grid-cols-3 (safe: only activates at 1024px+ where sidebar+col is wide enough) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {activeDrafts.length > 0 ? (
                    activeDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => handleSelectDraft(draft.draft_number)}
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[180px] overflow-hidden ${
                          selectedDraftId === draft.draft_number
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase">
                              Draft 0{draft.draft_number}
                            </span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span
                                  key={star}
                                  onClick={(e) => { e.stopPropagation(); handleRating(draft.id, star); }}
                                  className={`text-xs cursor-pointer ${star <= (ratings[draft.id] || 0) ? "text-[#D4A853]" : "text-[#7A6F65]"}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <InlineMarkdown text={draft.content} className="text-xs text-[#B0A89E] leading-relaxed font-mono" />
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#B0A89E] uppercase truncate mr-2">
                            {draft.draft_number === 1 ? "Product Strategist" : draft.draft_number === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${
                            selectedDraftId === draft.draft_number ? "bg-[#D4A853] border-[#D4A853]" : "border-[#7A6F65]"
                          }`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    [1, 2, 3].map((num) => (
                      <div
                        key={num}
                        onClick={() => handleSelectDraft(num)}
                        className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col justify-between min-h-[180px] overflow-hidden ${
                          selectedDraftId === num
                            ? "bg-[#D4A853]/5 border-[#D4A853]/40"
                            : "bg-[#110F0D]/20 border-[#2A2218] hover:border-[#D4A853]/25"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-[#D4A853] tracking-wider uppercase block mb-2">Draft 0{num}</span>
                          <p className="text-xs text-[#B0A89E] leading-relaxed font-mono">
                            {num === 1
                              ? "Focalizarse en fricción de conversión high-ticket. Destacar déficits visuales adyacentes a los triggers de clic clave."
                              : num === 2
                              ? "Analizar restricciones de carga cognitiva usando el Modelo de Comportamiento de Fogg. Detallar umbrales de latencia."
                              : "Utilizar fraseología de alto contraste y estatus, evitando clichés de consultoría para establecer autoridad inmediata."
                            }
                          </p>
                        </div>
                        <div className="pt-3 border-t border-[#2A2218] flex justify-between items-center mt-3">
                          <span className="text-xs font-mono text-[#B0A89E] uppercase truncate mr-2">
                            {num === 1 ? "Product Strategist" : num === 2 ? "Behavioral Scientist" : "Linguistic Architect"}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${
                            selectedDraftId === num ? "bg-[#D4A853] border-[#D4A853]" : "border-[#7A6F65]"
                          }`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Socratic Feedback */}
                <AnimatePresence>
                  {selectedDraftId && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="space-y-3 border-t border-[#D4A853]/15 pt-4 mt-4"
                    >
                      <label className="font-mono text-xs text-[#D4A853]/70 tracking-wider uppercase block">
                        Notas de Refinamiento Socrático
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Specify why these arguments align with your divergence model..."
                        className="w-full bg-[#0A0908] border border-[#2A2218] focus:border-[#D4A853] focus:outline-none p-3 text-xs font-mono rounded-xl h-20 text-[#F5F0EB] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDraftId(null)}
                          className="px-4 py-2 border border-[#2A2218] text-xs font-mono text-[#7A6F65] hover:text-[#B0A89E] cursor-pointer rounded-xl"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={submitSocraticPreference}
                          className="px-4 py-2 bg-[#D4A853] text-[#0A0908] text-xs font-mono font-bold uppercase tracking-wider cursor-pointer rounded-xl"
                        >
                          Reforzar Pesos
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: Debate Flow + Engine Config */}
            <div className="xl:col-span-4 space-y-4">

              {/* Dialectic Chain — spine-based, zero flex-row */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl overflow-hidden">
                <span className="font-mono text-[10px] text-[#D4A853]/70 tracking-[0.3em] uppercase block mb-5">
                  02 — Cadena Dialéctica
                </span>
                <div className="relative">
                  {/* Spine */}
                  <div className="absolute left-[6px] top-3 bottom-3 w-px bg-gradient-to-b from-[#D4A853]/40 via-[#D4A853]/10 to-[#5C9A6B]/40" />

                  {/* Node: Thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#D4A853] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#D4A853] uppercase mb-0.5">Product Strategist</div>
                    <div className="font-mono text-[10px] text-[#D4A853]/70 mb-1.5">Arg 01</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      El funnel requiere reducción de opciones para minimizar la fatiga de decisión en checkout.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#7A6F65]">↓</div>
                    <span className="font-mono text-[9px] text-[#7A6F65] uppercase">contradice</span>
                  </div>

                  {/* Node: Anti-thesis */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#C85C5C] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#C85C5C] uppercase mb-0.5">Behavioral Scientist</div>
                    <div className="font-mono text-[10px] text-[#C85C5C]/40 mb-1.5">Pivot 02</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      La reducción de opciones falla si el valor es indefinido. El slider calculador construye el habit loop primero.
                    </p>
                  </div>

                  {/* Relation label */}
                  <div className="relative pl-7 mb-2">
                    <div className="absolute left-[2px] top-0.5 font-mono text-[9px] text-[#5C9A6B]">↓</div>
                    <span className="font-mono text-[9px] text-[#5C9A6B] uppercase">sintetiza</span>
                  </div>

                  {/* Node: Synthesis */}
                  <div className="relative pl-7">
                    <div className="absolute left-0 top-1 w-[13px] h-[13px] rounded-full border-2 border-[#5C9A6B] bg-[#110F0D]" />
                    <div className="font-mono text-[10px] text-[#5C9A6B] uppercase mb-0.5">Linguistic Architect</div>
                    <div className="font-mono text-[10px] text-[#5C9A6B]/40 mb-1.5">Synthesis 03</div>
                    <p className="text-xs text-[#B0A89E] leading-relaxed">
                      Encuadrar la calculadora como herramienta interactiva: el usuario aísla el valor, eliminando la ansiedad de facturación.
                    </p>
                  </div>
                </div>
              </div>

              {/* Engine Config */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-4">
                <h3 className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase">Config Motor Socrático</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Agentes Activos", value: "3 (Strategist, Scientist, Architect)" },
                    { label: "Versión KB", value: "v3.4.0" },
                    { label: "Índice Socrático", value: "96.8 / 100" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span className="text-[#B0A89E] flex-shrink-0">{row.label}:</span>
                      <span className="text-white text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#B0A89E] leading-relaxed pt-2 border-t border-[#D4A853]/8">
                  El Motor de Borradores Socrático sintetiza múltiples perspectivas expertas para construir documentos de análisis de conversión de alto estatus.
                </p>
              </div>

              {/* Índice de Maestría */}
              <div className="border border-[#D4A853]/15 bg-[#110F0D] p-5 rounded-2xl space-y-3">
                <span className="font-mono text-xs text-[#D4A853]/70 tracking-widest uppercase block">Índice de Maestría</span>
                {DOMAINS.map((d) => (
                  <div key={d.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#B0A89E] truncate mr-2">{d.name}</span>
                      <span className="text-[#D4A853] flex-shrink-0">{d.score}%</span>
                    </div>
                    <div className="h-1 bg-[#1A1815] rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4A853] rounded-full" style={{ width: `${d.score}%`, opacity: 0.6 + d.score / 500 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
