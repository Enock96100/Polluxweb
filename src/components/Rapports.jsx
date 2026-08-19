import {
  Download,
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowLeft,
  Share2,
  CreditCard,
  Landmark,
  Store,
  Building2,
  Users,
  Star,
  CheckCircle,
  RotateCcw,
  Settings,
  Wallet,
  FileText,
  TrendingUp,
  DollarSign,
  Archive,
  SlidersHorizontal,
  Calendar,
  Tv,
  Banknote,
  MousePointerClick,
  Infinity as InfinityIcon,
  Briefcase,
  IdCard,
  MapPin,
  CalendarDays,
  UserCog,
  AlertTriangle,
  Boxes,
  Ban,
  AlarmClockOff,
  Loader2,
} from "lucide-react"
import { useEffect, useState, useRef, Component } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import useAuth from "../context/auth/utils"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const BASE_URL = "https://youapi.youneed.app/pollux/dev/api"

const dashboardUrl = (companyId) => `${BASE_URL}/reports/company/dashboard/${companyId}`
const financialUrl = (companyId) => `${BASE_URL}/reports/company/financial/${companyId}`
const metricsUrl = (companyId) => `${BASE_URL}/reports/company/metrics/${companyId}`
const operationTypeDetailUrl = (companyId) => `${BASE_URL}/reports/company/operation-type/${companyId}`
const exportReportUrl = (companyId) => `${BASE_URL}/reports/company/export/${companyId}`

const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, Accept: "application/json" })

const getCompanyId = (userCompany) => userCompany?.id || localStorage.getItem("companyId")

const handleAuthError = (err) => {
  if (err?.response?.status === 401) {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("company")
    localStorage.removeItem("companyId")
  }
}

const OPERATION_TYPES = {
  SUBPRODUCT_RESTOCKING: { label: "Réapprovisionnement", icon: Archive, color: "#38BDF8" },
  PREPAID_CARD_ACTIVATION: { label: "Activation Carte", icon: CreditCard, color: "#312E81" },
  PREPAID_CARD_RECHARGE: { label: "Recharge Carte", icon: CreditCard, color: "#10B981" },
  CANAL_SUBSCRIPTION_NEW: { label: "Nouvel Abonnement Canal+", icon: Tv, color: "#F59E0B" },
  CANAL_SUBSCRIPTION_RENEWAL: { label: "Renouvellement Canal+", icon: RotateCcw, color: "#F59E0B" },
  CANAL_SUBSCRIPTION_FORMULA_CHANGE: { label: "Changement de formule Canal+", icon: RotateCcw, color: "#F59E0B" },
  CANAL_SUBSCRIPTION_REACTIVATION: { label: "Réactivation Canal+", icon: RotateCcw, color: "#F59E0B" },
  WALLET_DEPOSIT: { label: "Dépôt Wallet", icon: Wallet, color: "#3B82F6" },
  COMMISSION_WITHDRAWAL: { label: "Retrait Commission", icon: Banknote, color: "#EF4444" },
  MANUAL_ADJUSTMENT: { label: "Ajustement Manuel", icon: Settings, color: "#6B7280" },
}

const SERVICE_CATEGORY_BY_TYPE = {
  PREPAID_CARD_ACTIVATION: "PREPAID_CARD",
  PREPAID_CARD_RECHARGE: "PREPAID_CARD",
  CANAL_SUBSCRIPTION_NEW: "CANAL_PLUS_SUBSCRIPTION",
  CANAL_SUBSCRIPTION_RENEWAL: "CANAL_PLUS_SUBSCRIPTION",
  CANAL_SUBSCRIPTION_FORMULA_CHANGE: "CANAL_PLUS_SUBSCRIPTION",
  CANAL_SUBSCRIPTION_REACTIVATION: "CANAL_PLUS_SUBSCRIPTION",
}

const STATUS_CONFIG = {
  completed: { label: "Complétées", color: "#10B981" },
  validated: { label: "Validées", color: "#1EA4DC" },
  pending: { label: "En attente", color: "#F59E0B" },
  rejected: { label: "Rejetées", color: "#EF4444" },
  cancelled: { label: "Annulées", color: "#9CA3AF" },
}

const ACTOR_TYPES = [
  { key: "all", label: "Tous", icon: Briefcase },
  { key: "distributor", label: "Distrib.", icon: Store },
  { key: "merchant", label: "Commerçant", icon: Building2 },
  { key: "agent", label: "Agent", icon: IdCard },
]

const ACTOR_TYPE_TO_OPERATOR_TYPE = {
  distributor: "DISTRIBUTOR",
  merchant: "MERCHANT",
  agent: "ADMIN_AGENT",
}

const PERIOD_QUICK_OPTIONS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Une semaine" },
  { key: "30days", label: "30 derniers jours" },
  { key: "month", label: "Mois en cours" },
  { key: "year", label: "Cette année" },
]

const REPORT_CATEGORIES = [
  { key: "all", label: "Tous", icon: SlidersHorizontal },
  { key: "financier", label: "Financier", icon: DollarSign },
  { key: "operations", label: "Opérations", icon: FileText },
]

const REPORTS_CATALOG = [
  {
    id: "top-distributors",
    title: "Top 10 Distributeurs",
    description: "Classement par chiffre d'affaires",
    icon: TrendingUp,
    bg: "bg-blue-50",
    color: "text-[#1EA4DC]",
    category: "operations",
    path: "/rapports/top-distributeurs",
  },
  {
    id: "top-merchants",
    title: "Top 10 Commerçants",
    description: "Classement par volume d'opérations",
    icon: Store,
    bg: "bg-green-50",
    color: "text-green-600",
    category: "operations",
    path: "/rapports/top-commercants",
  },
  {
    id: "operations-by-city",
    title: "Opérations par ville",
    description: "Répartition géographique",
    icon: MapPin,
    bg: "bg-sky-50",
    color: "text-sky-600",
    category: "operations",
    path: "/rapports/operations-ville",
  },
  {
    id: "monthly-performance",
    title: "Performance mensuelle",
    description: "Comparaison sur 12 mois",
    icon: CalendarDays,
    bg: "bg-amber-50",
    color: "text-amber-500",
    category: "financier",
    path: "/rapports/performance-mensuelle",
  },
  {
    id: "commissions-detail",
    title: "Détail des commissions",
    description: "Répartition par type d'acteur",
    icon: Landmark,
    bg: "bg-purple-50",
    color: "text-purple-600",
    category: "financier",
    path: "/rapports/commissions",
  },
  {
    id: "revenue-evolution",
    title: "Évolution du CA",
    description: "Tendance sur la période",
    icon: TrendingUp,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    category: "financier",
    path: "/rapports/evolution-ca",
  },
]

const formatFCFA = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} FCFA`

const displayName = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (typeof value === "object") return value.name || value.label || value.code || fallback
  return String(value)
}

const normalizePartner = (item, kind) => {
  if (!item) return null
  const nested = item.distributor || item.merchant || item.adminAgent || item.agent
  const source = nested || item
  const id = source.id ?? item.id
  let name = source.name
  if (!name && kind === "agent") {
    name = `${source.user?.firstName || source.firstName || ""} ${source.user?.lastName || source.lastName || ""}`.trim()
  }
  name = name || displayName(source, "—")
  const sub =
    source.businessName ||
    source.shopAddress ||
    [source.employeeCode, source.department, source.position].filter(Boolean).join(" · ") ||
    source.city ||
    "-"
  return { id, name, sub }
}

const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDateFR = (iso) => {
  if (!iso) return "-"
  const [y, m, d] = String(iso).slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

const formatDateShort = (iso) => {
  if (!iso) return "-"
  const [y, m, d] = String(iso).slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
  const monthIndex = Number(m) - 1
  return `${Number(d)} ${months[monthIndex] ?? m}`
}

const getRevenueGranularity = (period) => {
  if (!period?.startDate || !period?.endDate) return "day"
  const start = new Date(period.startDate)
  const end = new Date(period.endDate)
  if (isNaN(start) || isNaN(end)) return "day"
  const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1)
  if (diffDays <= 31) return "day"
  if (diffDays <= 92) return "week"
  return "month"
}

const getWeekBucketKey = (date) => {
  const day = date.getDay() || 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - day + 1)
  return toISODate(monday)
}

const getMonthBucketKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

const aggregateRevenueEvolution = (rawPoints, granularity) => {
  if (granularity === "day" || !Array.isArray(rawPoints) || rawPoints.length === 0) {
    return rawPoints || []
  }

  const buckets = new Map()

  for (const point of rawPoints) {
    if (!point?.date) continue
    const d = new Date(point.date)
    if (isNaN(d)) continue

    const key = granularity === "week" ? getWeekBucketKey(d) : getMonthBucketKey(d)
    const existing = buckets.get(key) || { date: key, amount: 0 }
    existing.amount += Number(point.amount || 0)
    buckets.set(key, existing)
  }

  return Array.from(buckets.values()).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
}

const formatEvolutionLabel = (value, granularity) => {
  if (granularity === "month") {
    const [y, m] = String(value).split("-")
    const months = ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sep.", "Oct.", "Nov.", "Déc."]
    const idx = Number(m) - 1
    return `${months[idx] ?? m} ${y}`
  }
  return formatDateFR(value)
}

const GRANULARITY_LABEL = { day: "par jour", week: "par semaine", month: "par mois" }

const PERIOD_PRESETS = {
  today: () => {
    const now = new Date()
    return { key: "today", label: "Aujourd'hui", preset: "TODAY", startDate: toISODate(now), endDate: toISODate(now) }
  },
  week: () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    return { key: "week", label: "Une semaine", preset: "LAST_7_DAYS", startDate: toISODate(start), endDate: toISODate(now) }
  },
  "30days": () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 30)
    return { key: "30days", label: "30 derniers jours", preset: "LAST_30_DAYS", startDate: toISODate(start), endDate: toISODate(now) }
  },
  month: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { key: "month", label: "Mois en cours", preset: "CURRENT_MONTH", startDate: toISODate(start), endDate: toISODate(now) }
  },
  year: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    return { key: "year", label: "Cette année", preset: "THIS_YEAR", startDate: toISODate(start), endDate: toISODate(now) }
  },
}

const buildCustomPeriod = (startDate, endDate) => ({
  key: "custom",
  label: `${formatDateFR(startDate)} - ${formatDateFR(endDate)}`,
  preset: null,
  startDate,
  endDate,
})

const buildFilterParams = (period, filters) => {
  const params = {}

  if (period?.preset) {
    params.preset = period.preset
  } else {
    if (period?.startDate) params.startDate = period.startDate
    if (period?.endDate) params.endDate = period.endDate
  }

  if (filters?.operationType && filters.operationType !== "all") {
    params.operationType = filters.operationType
  }

  if (filters?.actorType && filters.actorType !== "all") {
    const operatorType = ACTOR_TYPE_TO_OPERATOR_TYPE[filters.actorType]
    if (operatorType) params.operatorType = operatorType

    if (filters.actorId) {
      if (filters.actorType === "distributor") params.distributorId = filters.actorId
      else if (filters.actorType === "merchant") params.merchantId = filters.actorId
      else if (filters.actorType === "agent") params.adminAgentId = filters.actorId
    }
  }

  return params
}

// ═══════════════════════ CONSTRUCTION DES PARAMÈTRES API (détail d'un type d'opération) ═══════════════════════
// 🔧 CORRECTIF : la doc de l'endpoint précise que `operatorType` n'est pris
// en compte par le backend QUE pour DISTRIBUTOR et MERCHANT ("DISTRIBUTOR
// ou MERCHANT uniquement pris en compte pour le filtrage des opérations").
// On n'envoie donc plus `operatorType=ADMIN_AGENT` — seul `adminAgentId`
// est transmis dans ce cas, ce qui évite un éventuel rejet backend (400/500)
// sur certains types d'opération quand un agent est sélectionné comme filtre.
const buildOperationTypeDetailParams = (type, period, actorFilters = {}) => {
  const params = { operationType: type }

  if (period?.preset) {
    params.preset = period.preset
  } else {
    if (period?.startDate) params.startDate = period.startDate
    if (period?.endDate) params.endDate = period.endDate
  }

  const serviceCategory = SERVICE_CATEGORY_BY_TYPE[type]
  if (serviceCategory) params.serviceCategory = serviceCategory

  if (actorFilters?.actorType && actorFilters.actorType !== "all") {
    if (actorFilters.actorType === "distributor") {
      params.operatorType = "DISTRIBUTOR"
      if (actorFilters.actorId) params.distributorId = actorFilters.actorId
    } else if (actorFilters.actorType === "merchant") {
      params.operatorType = "MERCHANT"
      if (actorFilters.actorId) params.merchantId = actorFilters.actorId
    } else if (actorFilters.actorType === "agent") {
      // Ne pas envoyer operatorType=ADMIN_AGENT : non pris en compte pour le
      // filtrage côté backend d'après la doc — adminAgentId suffit.
      if (actorFilters.actorId) params.adminAgentId = actorFilters.actorId
    }
  }

  return params
}

// ═══════════════════════ CONSTRUCTION DES PARAMÈTRES API (export PDF du rapport) ═══════════════════════
// Reprend exactement les paramètres documentés par l'endpoint
// GET /reports/company/export/{companyId} : preset|startDate/endDate,
// operationType, serviceCategory (déduit automatiquement du type
// d'opération), operatorType + distributorId/merchantId/adminAgentId selon
// l'acteur sélectionné dans les filtres, et userLabel (libellé affiché
// dans les métadonnées du PDF généré côté backend / utilisé côté front
// pour le rendu de l'aperçu et du PDF client).
const buildExportParams = (period, filters, userLabel) => {
  const params = {}

  if (period?.preset) {
    params.preset = period.preset
  } else {
    if (period?.startDate) params.startDate = period.startDate
    if (period?.endDate) params.endDate = period.endDate
  }

  if (filters?.operationType && filters.operationType !== "all") {
    params.operationType = filters.operationType
    const serviceCategory = SERVICE_CATEGORY_BY_TYPE[filters.operationType]
    if (serviceCategory) params.serviceCategory = serviceCategory
  }

  if (filters?.actorType && filters.actorType !== "all") {
    if (filters.actorType === "distributor") {
      params.operatorType = "DISTRIBUTOR"
      if (filters.actorId) params.distributorId = filters.actorId
    } else if (filters.actorType === "merchant") {
      params.operatorType = "MERCHANT"
      if (filters.actorId) params.merchantId = filters.actorId
    } else if (filters.actorType === "agent") {
      if (filters.actorId) params.adminAgentId = filters.actorId
    }
  }

  params.userLabel = userLabel || "Tous"

  return params
}

// Formatage identique au `NumberFormat('#,##0', 'fr_FR')` utilisé côté
// Flutter pour les montants du rapport (entier, séparateur de milliers, "FCFA").
const fmtAmount = (value) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value) || 0
  return `${Math.round(num).toLocaleString("fr-FR")} FCFA`
}

// Équivalent JS de `_countFor` (Dart) : retrouve le nombre d'opérations
// d'un type donné dans `operationsByType` renvoyé par l'endpoint d'export.
const countForOperationType = (operationsByType, type) => {
  const match = (operationsByType || []).find((o) => o.operationType === type)
  return match?.count ?? 0
}

const formatExportPeriodLabel = (meta, fallbackPeriod) => {
  const start = meta?.period?.startDate || fallbackPeriod?.startDate
  const end = meta?.period?.endDate || fallbackPeriod?.endDate
  return `${formatDateFR(start)} – ${formatDateFR(end)}`
}

// ═══════════════════════ GÉNÉRATION DU PDF (équivalent de _buildPdfBytes en Dart) ═══════════════════════
// Reproduit fidèlement la structure du PDF Flutter : en-tête (société,
// méta), Statistiques Globales, Activité Commerciale, Statut des
// Opérations, Top Performers, pied de page. Utilisé à la fois pour le
// téléchargement (doc.save) et pour l'impression (doc.autoPrint) afin que
// l'aperçu, le fichier téléchargé et l'impression soient rigoureusement
// identiques.
function buildReportPdfDoc({ data, companyName, userLabel, periodLabel }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 28
  const marginRight = 28
  const tableWidth = pageWidth - marginLeft - marginRight
  let cursorY = 40

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(20)
  doc.text(companyName || "Entreprise", marginLeft, cursorY)
  cursorY += 22

  const metaRows = [
    ["Date génération :", formatDateFR(data?.meta?.generatedAt || new Date().toISOString())],
    ["Période :", periodLabel],
    ["Utilisateur :", userLabel || "Tous"],
  ]
  doc.setFontSize(9)
  metaRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(90)
    doc.text(label, marginLeft, cursorY)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(20)
    doc.text(String(value ?? "-"), marginLeft + 100, cursorY)
    cursorY += 14
  })

  cursorY += 4
  doc.setDrawColor(200)
  doc.setLineWidth(0.8)
  doc.line(marginLeft, cursorY, pageWidth - marginRight, cursorY)
  cursorY += 18

  const sectionTitle = (title) => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(title, marginLeft, cursorY)
    cursorY += 8
  }

  const twoColTable = (body) => {
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      margin: { left: marginLeft, right: marginRight },
      styles: { fontSize: 9, cellPadding: 5, textColor: 20, lineColor: [211, 211, 211], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.55 },
        1: { cellWidth: tableWidth * 0.45 },
      },
      body,
    })
    cursorY = doc.lastAutoTable.finalY + 18
  }

  const s = data?.globalStats || {}
  sectionTitle("Statistiques Globales")
  twoColTable([
    ["Total opérations", String(s.totalOperations ?? 0)],
    ["Montant recharges cartes", fmtAmount(s.cardRechargeAmount)],
    ["Montant réabonnements", fmtAmount(s.renewalAmount)],
    ["Dépôts wallet approuvés", fmtAmount(s.approvedWalletDeposits)],
    ["Total commissions générées", fmtAmount(s.totalCommissionsGenerated)],
    [
      { content: "Chiffre d'affaire net", styles: { fontStyle: "bold" } },
      { content: fmtAmount(s.netRevenue), styles: { fontStyle: "bold" } },
    ],
  ])

  const ca = data?.commercialActivity || {}
  const activatedCards = countForOperationType(data?.operationsByType, "PREPAID_CARD_ACTIVATION")
  sectionTitle("Activité Commerciale")
  twoColTable([
    ["Réapprovisionnement cartes", fmtAmount(ca.cardRestockingAmount)],
    ["Réapprovisionnement décodeurs", fmtAmount(ca.decoderRestockingAmount)],
    ["Décodeurs activés", String(ca.activatedDecoders ?? 0)],
    ["Cartes activées", String(activatedCards)],
    [
      { content: "Taux de succès", styles: { fontStyle: "bold" } },
      { content: `${Number(ca.successRate ?? 0).toFixed(1)}%`, styles: { fontStyle: "bold" } },
    ],
  ])

  const sys = data?.systemStatus || {}
  sectionTitle("Statut des Opérations")
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 9, cellPadding: 6, textColor: 20, lineColor: [211, 211, 211], lineWidth: 0.5 },
    columnStyles: { 0: { cellWidth: tableWidth / 2 }, 1: { cellWidth: tableWidth / 2 } },
    body: [
      [
        `Distributeurs actifs\n${sys.distributors?.active ?? 0}/${sys.distributors?.total ?? 0}`,
        `Commerçants actifs\n${sys.merchants?.active ?? 0}/${sys.merchants?.total ?? 0}`,
      ],
      [
        `Commerçants actifs\n${sys.merchants?.active ?? 0}/${sys.merchants?.total ?? 0}`,
        `Agents actifs\n${sys.agents?.active ?? 0}/${sys.agents?.total ?? 0}`,
      ],
      [`Total clients\n${sys.totalClients ?? 0}`, `Op. en attente\n${sys.pendingOps ?? 0}`],
    ],
  })
  cursorY = doc.lastAutoTable.finalY + 18

  const top = data?.topPerformers || []
  if (top.length > 0) {
    sectionTitle("Top Performers")
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      margin: { left: marginLeft, right: marginRight },
      styles: { fontSize: 9, cellPadding: 5, textColor: 20, lineColor: [211, 211, 211], lineWidth: 0.5 },
      head: [["Top Performers", "Type", "Montant Total"]],
      headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.42 },
        1: { cellWidth: tableWidth * 0.26 },
        2: { cellWidth: tableWidth * 0.32 },
      },
      body: top.slice(0, 10).map((p) => [
        p.name || "-",
        p.type === "DISTRIBUTOR" ? "DISTRIBUTEUR" : "MERCHANT",
        fmtAmount(p.totalAmount),
      ]),
    })
    cursorY = doc.lastAutoTable.finalY + 10
  }

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const footerLineY = doc.internal.pageSize.getHeight() - 34
    doc.setDrawColor(220)
    doc.setLineWidth(0.5)
    doc.line(marginLeft, footerLineY, pageWidth - marginRight, footerLineY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      `Généré le ${new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      marginLeft,
      footerLineY + 14,
    )
  }

  return doc
}

const buildReportPdfFilename = () =>
  `rapport_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.pdf`

/* ═══════════════════════ PAGINATION ═══════════════════════ */
function Pagination({ page, setPage, limit, setLimit, total, limitOptions = [5, 10, 25, 50] }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const goFirst = () => setPage(1)
  const goPrev = () => setPage((p) => Math.max(1, p - 1))
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1))
  const goLast = () => setPage(totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
      <p>
        Affichage de {start} à {end} sur {total} entrée{total > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-4">
        {setLimit && (
          <div className="relative">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-sm text-gray-700 focus:outline-none"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={goFirst} disabled={page <= 1} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
            <ChevronsLeft size={16} />
          </button>
          <button onClick={goPrev} disabled={page <= 1} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-gray-700 font-medium">
            {page} / {totalPages}
          </span>
          <button onClick={goNext} disabled={page >= totalPages} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
            <ChevronRight size={16} />
          </button>
          <button onClick={goLast} disabled={page >= totalPages} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════ EN-TÊTES ═══════════════════════ */
function IconActionButton({ icon, onClick, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-11 h-11 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:hover:bg-white"
    >
      {icon}
    </button>
  )
}

function PageHeader({ title, subtitle, onBack, actions }) {
  return (
    <div className="flex justify-between items-start px-5 pt-6 pb-2">
      <div className="flex items-start gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-11 h-11 shrink-0 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition shadow-sm"
          >
            <ArrowLeft size={19} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[#111827] truncate">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {actions && actions.length > 0 && (
        <div className="flex gap-2 shrink-0">
          {actions.map((action, idx) => (
            <IconActionButton key={idx} icon={action.icon} onClick={action.onClick} label={action.label} disabled={action.disabled} />
          ))}
        </div>
      )}
    </div>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

/* ═══════════════════════ APERÇU / EXPORT / IMPRESSION DU RAPPORT PDF ═══════════════════════ */
// Équivalent React de `ReportPreviewScreen` (Dart) : récupère les données
// dynamiques via GET /reports/company/export/{companyId} en tenant compte
// de la période et des filtres actifs (opération, acteur), affiche un
// aperçu fidèle à la mise en page du PDF, et permet de télécharger
// (icône Download) ou d'imprimer (icône Printer) le PDF généré côté client
// avec jsPDF — strictement identique entre aperçu, téléchargement et
// impression puisque les trois s'appuient sur `buildReportPdfDoc`.
function MetaRow({ label, value }) {
  return (
    <div className="flex items-start text-[11px] text-[#333333] mb-1">
      <span className="w-[115px] shrink-0 font-bold">{label}</span>
      <span>{value || "-"}</span>
    </div>
  )
}

function SectionTitle({ children, className = "" }) {
  return <h3 className={`text-[13px] font-bold text-[#111111] mb-2 ${className}`}>{children}</h3>
}

function PreviewTable({ rows, boldRow }) {
  return (
    <table className="w-full text-[11.5px] border-collapse">
      <tbody>
        {rows.map(([label, value], idx) => (
          <tr key={idx}>
            <td className="border border-[#CCCCCC] px-2 py-1.5 text-[#444444] w-[55%]">{label}</td>
            <td className="border border-[#CCCCCC] px-2 py-1.5 text-[#111111]">{value}</td>
          </tr>
        ))}
        {boldRow && (
          <tr>
            <td className="border border-[#CCCCCC] px-2 py-1.5 font-bold text-[#111111]">{boldRow[0]}</td>
            <td className="border border-[#CCCCCC] px-2 py-1.5 font-bold text-[#111111]">{boldRow[1]}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function StatusPreviewGrid({ systemStatus }) {
  const s = systemStatus || {}
  const rows = [
    ["Distributeurs actifs", `${s.distributors?.active ?? 0} / ${s.distributors?.total ?? 0}`, "Commerçants actifs", `${s.merchants?.active ?? 0} / ${s.merchants?.total ?? 0}`],
    ["Commerçants actifs", `${s.merchants?.active ?? 0} / ${s.merchants?.total ?? 0}`, "Agents actifs", `${s.agents?.active ?? 0} / ${s.agents?.total ?? 0}`],
    ["Total clients", `${s.totalClients ?? 0}`, "Op. en attente", `${s.pendingOps ?? 0}`],
  ]
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(([l1, v1, l2, v2], idx) => (
          <tr key={idx}>
            <td className="border border-[#CCCCCC] px-2 py-1.5 w-1/2 align-top">
              <p className="text-[10px] text-[#666666]">{l1}</p>
              <p className="text-[13px] font-bold text-[#111111] mt-0.5">{v1}</p>
            </td>
            <td className="border border-[#CCCCCC] px-2 py-1.5 w-1/2 align-top">
              <p className="text-[10px] text-[#666666]">{l2}</p>
              <p className="text-[13px] font-bold text-[#111111] mt-0.5">{v2}</p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TopPerformersPreviewTable({ list }) {
  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr>
          <th className="border border-[#CCCCCC] bg-gray-100 px-2 py-1.5 text-left font-bold">Top Performers</th>
          <th className="border border-[#CCCCCC] bg-gray-100 px-2 py-1.5 text-left font-bold">Type</th>
          <th className="border border-[#CCCCCC] bg-gray-100 px-2 py-1.5 text-left font-bold">Montant Total</th>
        </tr>
      </thead>
      <tbody>
        {list.slice(0, 10).map((p, idx) => (
          <tr key={p.id ?? idx}>
            <td className="border border-[#CCCCCC] px-2 py-1.5 text-[#111111]">{p.name}</td>
            <td className="border border-[#CCCCCC] px-2 py-1.5 text-[#888888]">{p.type === "DISTRIBUTOR" ? "DISTRIBUTEUR" : "MERCHANT"}</td>
            <td className="border border-[#CCCCCC] px-2 py-1.5 text-[#1B5E20] font-semibold">{fmtAmount(p.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SuccessRateBlock({ ca }) {
  const validated = ca.validatedOperations || 0
  const rejected = ca.rejectedOperations || 0
  const total = validated + rejected
  const rate = Math.min(100, Math.max(0, ca.successRate || 0))
  const donutData = total > 0 ? [
    { name: "Validées", value: validated, color: "#2E7D32" },
    { name: "Rejetées", value: rejected, color: "#C62828" },
  ] : [{ name: "Aucune", value: 1, color: "#E5E7EB" }]

  return (
    <div className="border border-[#CCCCCC] p-3 mt-2">
      <div className="flex items-center gap-3">
        <div className="w-[70px] h-[70px] shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={20} outerRadius={35} startAngle={90} endAngle={-270} stroke="none">
                {donutData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-black/80 pointer-events-none">
            {total}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] text-[#444444] flex items-center gap-1">
            <span className="text-[17px] font-bold text-[#1B5E20]">{validated}</span> Opérations validées
          </p>
          <p className="text-[10.5px] text-[#444444] flex items-center gap-1 mt-1.5">
            <span className="text-[12px] font-bold text-[#C62828]">× {rejected}</span> Opérations rejetées
          </p>
        </div>
      </div>
      <div className="w-full h-[7px] bg-[#FFCDD2] rounded-full overflow-hidden mt-2.5">
        <div className="h-full bg-[#2E7D32] rounded-full" style={{ width: `${rate}%` }} />
      </div>
      <p className="text-[12px] font-bold text-[#1B5E20] mt-1">{Number(ca.successRate ?? 0).toFixed(1)}%</p>
    </div>
  )
}

function ReportPreviewModal({ mode = "export", period, filters, onClose }) {
  const { userCompany } = useAuth()
  const companyId = getCompanyId(userCompany)
  const companyName = userCompany?.name || userCompany?.businessName || userCompany?.companyName || "Entreprise"
  const userLabel = filters?.actorLabel || "Tous"

  const [data, setData] = useState(null)
  const [periodLabel, setPeriodLabel] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const autoTriggered = useRef(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Session invalide")
      if (!companyId) throw new Error("CompanyId manquant")

      const response = await axios.get(exportReportUrl(companyId), {
        headers: authHeaders(token),
        params: buildExportParams(period, filters, userLabel),
      })

      const result = response?.data?.data || null
      setData(result)
      setPeriodLabel(formatExportPeriodLabel(result?.meta, period))
    } catch (err) {
      console.error("EXPORT REPORT FETCH ERROR:", err?.response?.data || err.message)
      handleAuthError(err)
      setError(err?.response?.data?.message || err.message || "Impossible de charger le rapport")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownload = () => {
    if (!data) return
    setProcessing(true)
    try {
      const doc = buildReportPdfDoc({ data, companyName, userLabel, periodLabel })
      doc.save(buildReportPdfFilename())
    } catch (err) {
      console.error("EXPORT PDF ERROR:", err)
      setError("Erreur lors de la génération du PDF")
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    if (!data) return
    setProcessing(true)
    try {
      const doc = buildReportPdfDoc({ data, companyName, userLabel, periodLabel })
      doc.autoPrint()
      const blobUrl = doc.output("bloburl")
      const printWindow = window.open(blobUrl, "_blank")
      if (!printWindow) {
        // Popup bloquée par le navigateur : on retombe sur un téléchargement.
        doc.save(buildReportPdfFilename())
      }
    } catch (err) {
      console.error("PRINT PDF ERROR:", err)
      setError("Erreur lors de l'impression")
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (mode === "print" && !loading && data && !autoTriggered.current) {
      autoTriggered.current = true
      handlePrint()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loading, data])

  const ca = data?.commercialActivity || {}
  const activatedCards = countForOperationType(data?.operationsByType, "PREPAID_CARD_ACTIVATION")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-[#DDDDDD] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-gray-200 rounded-t-2xl shrink-0">
          <h2 className="font-semibold text-gray-800">Aperçu du rapport</h2>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              disabled={processing || loading || !data}
              aria-label="Exporter PDF"
              title="Exporter PDF"
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
            >
              {processing ? <Loader2 size={19} className="animate-spin" /> : <Download size={19} />}
            </button>
            <button
              onClick={handlePrint}
              disabled={processing || loading || !data}
              aria-label="Imprimer"
              title="Imprimer"
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
            >
              {processing ? <Loader2 size={19} className="animate-spin" /> : <Printer size={19} />}
            </button>
            <button
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          {loading ? (
            <p className="text-center text-gray-400 py-16">Chargement du rapport...</p>
          ) : error ? (
            <div className="p-3">
              <ErrorBanner message={error} />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-md">
              <MetaRow label="Date génération :" value={formatDateFR(data?.meta?.generatedAt)} />
              <MetaRow label="Période :" value={periodLabel} />
              <MetaRow label="Utilisateur :" value={userLabel} />

              <div className="border-t border-[#888888] my-4" />

              <SectionTitle>Statistiques Globales</SectionTitle>
              <PreviewTable
                rows={[
                  ["Total opérations", String(data?.globalStats?.totalOperations ?? 0)],
                  ["Montant recharges cartes", fmtAmount(data?.globalStats?.cardRechargeAmount)],
                  ["Montant réabonnements", fmtAmount(data?.globalStats?.renewalAmount)],
                  ["Dépôts wallet approuvés", fmtAmount(data?.globalStats?.approvedWalletDeposits)],
                  ["Total commissions générées", fmtAmount(data?.globalStats?.totalCommissionsGenerated)],
                ]}
                boldRow={["Chiffre d'affaire net", fmtAmount(data?.globalStats?.netRevenue)]}
              />

              <SectionTitle className="mt-5">Activité Commerciale</SectionTitle>
              <PreviewTable
                rows={[
                  ["Réapprovisionnement cartes", fmtAmount(ca.cardRestockingAmount)],
                  ["Réapprovisionnement décodeurs", fmtAmount(ca.decoderRestockingAmount)],
                  ["Décodeurs activés", String(ca.activatedDecoders ?? 0)],
                  ["Cartes activées", String(activatedCards)],
                ]}
              />
              <SuccessRateBlock ca={ca} />

              <SectionTitle className="mt-5">Statut des Opérations</SectionTitle>
              <StatusPreviewGrid systemStatus={data?.systemStatus} />

              {(data?.topPerformers || []).length > 0 && (
                <>
                  <SectionTitle className="mt-5">Top Performers</SectionTitle>
                  <TopPerformersPreviewTable list={data.topPerformers} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════ HOOK : récupération des 3 rapports (dynamique) ═══════════════════════ */
function useCompanyReports(period, filters) {
  const { userCompany, loading: authLoading } = useAuth()

  const [dashboard, setDashboard] = useState(null)
  const [financial, setFinancial] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const paramsKey = JSON.stringify(buildFilterParams(period, filters))

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    const fetchAll = async () => {
      try {
        setLoading(true)
        setError("")

        const token = localStorage.getItem("token")
        if (!token) throw new Error("Token manquant")

        const companyId = getCompanyId(userCompany)
        if (!companyId) throw new Error("CompanyId manquant")

        const headers = authHeaders(token)
        const queryParams = buildFilterParams(period, filters)

        const [dashboardRes, financialRes, metricsRes] = await Promise.all([
          axios.get(dashboardUrl(companyId), { headers, params: queryParams }),
          axios.get(financialUrl(companyId), { headers, params: queryParams }),
          axios.get(metricsUrl(companyId), { headers, params: queryParams }),
        ])

        if (cancelled) return

        setDashboard(dashboardRes?.data?.data || null)
        setFinancial(financialRes?.data?.data || null)
        setMetrics(metricsRes?.data?.data || null)
      } catch (err) {
        if (cancelled) return
        console.error("REPORTS FETCH ERROR:", err?.response?.data || err.message)
        handleAuthError(err)
        setError(err?.response?.data?.message || err.message || "Impossible de charger les rapports")
        setDashboard(null)
        setFinancial(null)
        setMetrics(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userCompany, paramsKey])

  return { dashboard, financial, metrics, loading, error }
}

/* ================= ERROR BOUNDARY ================= */
class RapportsErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error("[RapportsAnalyses] Crash pendant le rendu:", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 space-y-3">
            <p className="flex items-center gap-2 text-red-600 font-semibold">
              <AlertTriangle size={18} />
              Une erreur est survenue pendant l'affichage
            </p>
            <p className="text-sm text-gray-600 break-words">{String(this.state.error?.message || this.state.error)}</p>
            <p className="text-xs text-gray-400">
              Ouvre la console (F12) pour la trace complète — ceci arrive généralement quand les données renvoyées par
              l'API pour cette période n'ont pas la forme attendue.
            </p>
            <button onClick={() => this.setState({ error: null })} className="text-sm font-medium text-[#1EA4DC]">
              Réessayer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ================= MAIN COMPONENT ================= */
function RapportsAnalysesInner() {
  const navigate = useNavigate()

  const [period, setPeriod] = useState(PERIOD_PRESETS.month())
  const [filters, setFilters] = useState({ operationType: "all", actorType: "all", actorId: null, actorLabel: "" })
  const [showFilters, setShowFilters] = useState(false)
  const [topPerformersOpen, setTopPerformersOpen] = useState(false)
  const [reportPreviewMode, setReportPreviewMode] = useState(null) // null | 'export' | 'print'

  const { dashboard, financial, metrics, loading, error } = useCompanyReports(period, filters)

  const stats = {
    totalOperations: financial?.financial?.totalOperations ?? 0,
    totalRevenue: financial?.financial?.totalRevenue ?? 0,
    totalCommissions: financial?.financial?.totalCommissions?.total ?? 0,
    netRevenue: financial?.financial?.netRevenue ?? 0,
  }

  const revenueGranularity = getRevenueGranularity(period)
  const revenueEvolution = aggregateRevenueEvolution(dashboard?.revenueEvolution || [], revenueGranularity)

  const operationsByType = (financial?.operations?.byType || []).map((row) => ({
    type: row.type || row.operationType,
    count: row.count ?? row.total ?? 0,
    amount: row.amount ?? row.totalAmount ?? 0,
  }))

  const commissionsBreakdown = {
    distributors: financial?.commissions?.distributors || { total: 0, available: 0, blocked: 0, withdrawn: 0 },
    merchants: financial?.commissions?.merchants || { total: 0, available: 0, blocked: 0, withdrawn: 0 },
    company: financial?.commissions?.company?.total ?? 0,
  }

  const topPerformersRaw = dashboard?.topPerformers || []
  const topPerformers = {
    distributors: topPerformersRaw
      .filter((p) => p.type === "DISTRIBUTOR")
      .map((p) => ({ id: p.id, name: p.name, operationsCount: p.operationsCount, amount: p.totalAmount })),
    merchants: topPerformersRaw
      .filter((p) => p.type === "MERCHANT")
      .map((p) => ({ id: p.id, name: p.name, operationsCount: p.operationsCount, amount: p.totalAmount })),
  }

  const topProducts = (metrics?.topProducts || []).map((p, idx) => ({
    id: p.id || idx,
    name: displayName(p.name || p.subProduct, "Produit"),
    category: displayName(p.category || p.service, ""),
    salesCount: p.salesCount ?? p.count ?? 0,
    amount: p.amount ?? p.totalAmount ?? 0,
  }))

  const clients = {
    total: metrics?.clients?.overview?.totalClients ?? dashboard?.system?.clients ?? 0,
    activeCards: metrics?.clients?.overview?.activeCards ?? dashboard?.system?.cards?.active ?? 0,
    subscriptions: metrics?.clients?.overview?.activeSubscriptions ?? dashboard?.system?.subscriptions?.active ?? 0,
    top: metrics?.clients?.topClients || [],
  }

  const actorsData = {
    distributors: (metrics?.distributors || []).map((d) => ({
      id: d.distributor?.id,
      name: d.distributor?.name,
      sub: d.distributor?.businessName || "-",
      city: d.distributor?.businessName || "-",
    })),
    merchants: (metrics?.merchants || []).map((m) => ({
      id: m.merchant?.id,
      name: m.merchant?.name,
      sub: m.merchant?.shopAddress || "-",
      city: m.merchant?.shopAddress || "-",
    })),
    agents: (metrics?.agents || []).map((a) => ({
      id: a.id,
      name: `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim(),
      sub: [a.employeeCode, a.department, a.position].filter(Boolean).join(" · "),
      city: a.department || "-",
    })),
  }

  const inventory = financial?.inventory || null

  const activeFiltersCount =
    (period.key === "custom" ? 1 : 0) +
    (filters.operationType !== "all" ? 1 : 0) +
    (filters.actorType !== "all" ? 1 : 0)

  const operationTypeLabel =
    filters.operationType !== "all" ? OPERATION_TYPES[filters.operationType]?.label || filters.operationType : null

  const actorFilterLabel =
    filters.actorType !== "all"
      ? filters.actorLabel || ACTOR_TYPES.find((a) => a.key === filters.actorType)?.label
      : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <PageHeader
        title="Rapports & Analyses"
        subtitle="Résumé global de la performance"
        actions={[
          {
            icon: <Download size={18} className="text-[#1EA4DC]" />,
            onClick: () => setReportPreviewMode("export"),
            label: "Exporter",
          },
          {
            icon: <Printer size={18} className="text-[#1EA4DC]" />,
            onClick: () => setReportPreviewMode("print"),
            label: "Imprimer",
          },
        ]}
      />

      <div className="px-5 space-y-6 mt-2">
        {error && <ErrorBanner message={error} />}

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#1EA4DC] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            <Calendar size={16} />
            {period.label}
            <button onClick={() => setPeriod(PERIOD_PRESETS.month())}>
              <X size={14} />
            </button>
          </span>

          {operationTypeLabel && (
            <span className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
              <RotateCcw size={16} />
              {operationTypeLabel}
              <button onClick={() => setFilters((f) => ({ ...f, operationType: "all" }))}>
                <X size={14} />
              </button>
            </span>
          )}

          {actorFilterLabel && (
            <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
              <Users size={16} />
              {actorFilterLabel}
              <button onClick={() => setFilters((f) => ({ ...f, actorType: "all", actorId: null, actorLabel: "" }))}>
                <X size={14} />
              </button>
            </span>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900">Statistiques globales</h2>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "today", label: "Aujourd'hui" },
            { key: "month", label: "Ce mois" },
            { key: "year", label: "Cette année" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(PERIOD_PRESETS[opt.key]())}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border whitespace-nowrap transition ${
                period.key === opt.key ? "border-[#1EA4DC] text-[#1EA4DC] bg-blue-50" : "border-gray-200 text-gray-600"
              }`}
            >
              <Calendar size={15} />
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Chargement des rapports...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ReportStatCard icon={<FileText size={20} />} label="Opérations" value={stats.totalOperations} color="blue" />
              <ReportStatCard icon={<DollarSign size={20} />} label="Chiffre d'affaires" value={formatFCFA(stats.totalRevenue)} color="green" />
              <ReportStatCard icon={<TrendingUp size={20} />} label="Commissions" value={formatFCFA(stats.totalCommissions)} color="orange" />
              <ReportStatCard icon={<Wallet size={20} />} label="Revenu net" value={formatFCFA(stats.netRevenue)} color="blue" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Évolution du chiffre d'affaires</h2>
                {revenueEvolution.length > 0 && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                    {GRANULARITY_LABEL[revenueGranularity]}
                  </span>
                )}
              </div>
              {revenueEvolution.length === 0 ? (
                <p className="text-center text-gray-400 py-10">Aucune donnée sur la période</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueEvolution}>
                    <defs>
                      <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => formatEvolutionLabel(value, revenueGranularity)}
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => formatFCFA(value)}
                      labelFormatter={(label) => formatEvolutionLabel(label, revenueGranularity)}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} fill="url(#caGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <OperationsTypeTable rows={operationsByType} period={period} filters={filters} />

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Résumé financier</h2>
              <SummaryRow label="Chiffre d'affaires total" value={formatFCFA(stats.totalRevenue)} color="text-green-600" bold />
              <SummaryRow label="Commissions (total)" value={formatFCFA(stats.totalCommissions)} color="text-amber-500" bold />
              <SummaryRow label="• Distributeur" value={formatFCFA(commissionsBreakdown?.distributors?.total)} color="text-amber-500" indent />
              <SummaryRow label="• Marchand" value={formatFCFA(commissionsBreakdown?.merchants?.total)} color="text-amber-500" indent />
              <SummaryRow label="• Société" value={formatFCFA(commissionsBreakdown?.company)} color="text-amber-500" indent />
              <SummaryRow label="Revenu net" value={formatFCFA(stats.netRevenue)} color="text-[#1EA4DC]" bold />
              <SummaryRow label="Total opérations" value={stats.totalOperations} color="text-[#1EA4DC]" bold />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Commissions</h2>
              <CommissionActorCard
                icon={<Store size={18} />}
                label="Distributeurs"
                total={commissionsBreakdown?.distributors?.total}
                available={commissionsBreakdown?.distributors?.available}
                blocked={commissionsBreakdown?.distributors?.blocked}
                withdrawn={commissionsBreakdown?.distributors?.withdrawn}
                bg="bg-blue-50"
              />
              <CommissionActorCard
                icon={<Building2 size={18} />}
                label="Commerçants"
                total={commissionsBreakdown?.merchants?.total}
                available={commissionsBreakdown?.merchants?.available}
                blocked={commissionsBreakdown?.merchants?.blocked}
                withdrawn={commissionsBreakdown?.merchants?.withdrawn}
                bg="bg-green-50"
              />
              <div className="flex items-center justify-between px-1">
                <span className="flex items-center gap-2 font-medium text-gray-800">
                  <Landmark size={18} className="text-[#1EA4DC]" />
                  Société
                </span>
                <span className="font-semibold text-[#1EA4DC]">{formatFCFA(commissionsBreakdown?.company)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200">
              <button onClick={() => setTopPerformersOpen((v) => !v)} className="w-full flex items-center justify-between p-6">
                <span className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1EA4DC]">
                    <TrendingUp size={20} />
                  </span>
                  <span className="text-left">
                    <p className="font-semibold">Top Performers</p>
                    <p className="text-sm text-gray-500">
                      {(topPerformers.distributors?.length || 0) + (topPerformers.merchants?.length || 0)} meilleurs partenaires
                    </p>
                  </span>
                </span>
                {topPerformersOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>

              {topPerformersOpen && (
                <div className="px-6 pb-6 space-y-6">
                  <TopPerformersList title="Distributeurs" items={topPerformers.distributors} iconBg="bg-blue-50" iconColor="text-[#1EA4DC]" Icon={Store} />
                  <TopPerformersList title="Commerçants" items={topPerformers.merchants} iconBg="bg-green-50" iconColor="text-green-600" Icon={Building2} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-semibold text-gray-900">
                  <Star size={18} className="text-amber-400" fill="#FBBF24" />
                  Top Produits
                </span>
                <button className="text-[#1EA4DC] text-sm font-medium" onClick={() => navigate("/rapports/produits")}>
                  Voir tout
                </button>
              </div>

              {topProducts.length === 0 ? (
                <p className="text-center text-gray-400 py-6">Aucun produit sur la période</p>
              ) : (
                topProducts.slice(0, 5).map((product, idx) => (
                  <div key={product.id} className={`flex items-center gap-4 py-4 ${idx > 0 ? "border-t border-gray-100" : ""}`}>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      {String(product.category).toLowerCase().includes("canal") ? (
                        <Tv size={20} className="text-[#1EA4DC]" />
                      ) : (
                        <CreditCard size={20} className="text-[#1EA4DC]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-gray-400">{product.salesCount} ventes</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-green-600">{formatFCFA(product.amount)}</p>
                      <p className="text-xs text-gray-400">{product.category}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold">Clients</h2>

              <div className="grid grid-cols-3 gap-3">
                <ClientMiniStat value={clients.total} label="Total" bg="bg-blue-50" color="text-[#1EA4DC]" />
                <ClientMiniStat value={clients.activeCards} label="Cartes actives" bg="bg-green-50" color="text-green-600" />
                <ClientMiniStat value={clients.subscriptions} label="Abonnements" bg="bg-amber-50" color="text-amber-500" />
              </div>

              <div>
                <p className="text-gray-500 font-medium mb-2">Top clients</p>
                <div className="divide-y divide-gray-100">
                  {(clients.top || []).slice(0, 5).map((client, idx) => (
                    <div key={client.id || idx} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-800">{client.name}</p>
                        <p className="text-sm text-gray-400">{client.operationsCount} opérations</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatFCFA(client.amount)}</p>
                    </div>
                  ))}
                  {(clients.top || []).length === 0 && <p className="text-center text-gray-400 py-6">Aucun client sur la période</p>}
                </div>
              </div>
            </div>

            {inventory && <PartnerStockSection inventory={inventory} />}

            <button
              onClick={() => navigate("/rapports/tous", { state: { period } })}
              className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-5 text-left"
            >
              <span className="font-semibold text-gray-900">Rapports détaillés</span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => setShowFilters(true)}
        className="fixed bottom-24 right-5 flex items-center gap-2 bg-[#1EA4DC] text-white px-5 py-3.5 rounded-full shadow-lg z-30"
      >
        <SlidersHorizontal size={18} />
        Filtrer
        {activeFiltersCount > 0 && (
          <span className="bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {showFilters && (
        <FilterSheet
          period={period}
          setPeriod={setPeriod}
          filters={filters}
          setFilters={setFilters}
          actorsData={actorsData}
          onClose={() => setShowFilters(false)}
        />
      )}

      {reportPreviewMode && (
        <ReportPreviewModal
          mode={reportPreviewMode}
          period={period}
          filters={filters}
          onClose={() => setReportPreviewMode(null)}
        />
      )}
    </div>
  )
}

export default function RapportsAnalyses() {
  return (
    <RapportsErrorBoundary>
      <RapportsAnalysesInner />
    </RapportsErrorBoundary>
  )
}

function ReportStatCard({ icon, label, value, color = "blue" }) {
  const colors = {
    blue: { text: "text-[#1EA4DC]", bg: "bg-blue-50" },
    green: { text: "text-green-600", bg: "bg-green-50" },
    orange: { text: "text-amber-500", bg: "bg-amber-50" },
  }
  const c = colors[color] || colors.blue

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.bg} ${c.text}`}>{icon}</div>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  )
}

function SummaryRow({ label, value, color, bold, indent }) {
  return (
    <div className={`flex items-center justify-between ${indent ? "pl-3" : ""}`}>
      <span className={`text-gray-600 ${bold ? "font-medium" : ""}`}>{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}

function CommissionActorCard({ icon, label, total, available, blocked, withdrawn, bg }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 font-semibold text-gray-800">
          {icon}
          {label}
        </span>
        <span className="font-bold text-gray-900">{formatFCFA(total)}</span>
      </div>
      <div className="grid grid-cols-3 text-sm">
        <div>
          <p className="text-gray-500">Disponible</p>
          <p className="font-semibold text-green-600">{formatFCFA(available)}</p>
        </div>
        <div>
          <p className="text-gray-500">Retiré</p>
          <p className="font-semibold text-gray-600">{formatFCFA(withdrawn)}</p>
        </div>
        <div>
          <p className="text-gray-500">Bloqué</p>
          <p className="font-semibold text-amber-500">{formatFCFA(blocked)}</p>
        </div>
      </div>
    </div>
  )
}

function TopPerformersList({ title, items = [], iconBg, iconColor, Icon }) {
  return (
    <div>
      <p className="text-gray-500 font-medium mb-2">{title}</p>
      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center gap-3 py-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={16} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-sm text-gray-400">{item.operationsCount} opérations</p>
            </div>
            <p className="font-semibold text-green-600 shrink-0">{formatFCFA(item.amount)}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-4">Aucune donnée</p>}
      </div>
    </div>
  )
}

function ClientMiniStat({ value, label, bg, color }) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </div>
  )
}

function CardStatusMiniStat({ icon, value, label, bg, color }) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg}`}>
      <div className={`flex items-center justify-center mb-1.5 ${color}`}>{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{label}</p>
    </div>
  )
}

function PartnerStockSection({ inventory }) {
  const distributorStock = inventory?.distributorStock || []
  const merchantStock = inventory?.merchantStock || []
  const summary = inventory?.summary || {}

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Boxes size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Stock partenaires</h2>
          <p className="text-xs text-gray-400">
            {summary?.distributors?.totalItems ?? 0} articles distributeurs · {summary?.merchants?.totalItems ?? 0} articles commerçants
          </p>
        </div>
      </div>

      <StockGroup title="Distributeurs" rows={distributorStock} nameKey="distributor" />
      <StockGroup title="Commerçants" rows={merchantStock} nameKey="merchant" />
    </div>
  )
}

function StockGroup({ title, rows, nameKey }) {
  if (!rows || rows.length === 0) return null
  return (
    <div>
      <p className="text-gray-500 font-medium mb-2">{title}</p>
      <div className="divide-y divide-gray-100">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between py-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 truncate">{displayName(row.subProduct, "Produit")}</p>
              <p className="text-xs text-gray-400 truncate">
                {displayName(row[nameKey])} · {displayName(row.service)}
                {row.bank ? ` · ${displayName(row.bank)}` : ""}
              </p>
            </div>
            <div className="text-right shrink-0 pl-3">
              <p className={`font-semibold ${row.stock > 0 ? "text-green-600" : "text-red-500"}`}>{row.stock} en stock</p>
              <p className="text-xs text-gray-400">{formatFCFA(row.sellingPrice)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= RÉPARTITION PAR TYPE D'OPÉRATION (TABLEAU PAGINÉ) ================= */
function OperationsTypeTable({ rows = [], period, filters }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [activeDetail, setActiveDetail] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [period.startDate, period.endDate, period.preset, rows.length])

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedRows = rows.slice((page - 1) * limit, page * limit)
  const totalCount = rows.reduce((sum, r) => sum + (r.count || 0), 0)

  const handleOpenDetail = (row) => {
    setActiveDetail({ type: row.type, row })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Répartition par type d'opération</h2>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
          <MousePointerClick size={13} />
          Tap pour détails
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-[#1EA4DC] text-white">
            <tr>
              <th className="px-4 py-3 text-left">Type d'opération</th>
              <th className="px-4 py-3 text-left">Volume</th>
              <th className="px-4 py-3 text-left">Montant</th>
              <th className="px-4 py-3 text-center">Détail</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.map((row) => {
              const config = OPERATION_TYPES[row.type] || { label: row.type, icon: FileText, color: "#6B7280" }
              const Icon = config.icon
              const pct = totalCount ? ((row.count / totalCount) * 100).toFixed(1) : "0.0"

              return (
                <tr key={row.type} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenDetail(row)}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${config.color}1A` }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <p className="font-medium">{config.label}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="min-w-[130px]">
                      <p className="text-gray-700">
                        {row.count} <span className="text-gray-400">({pct}%)</span>
                      </p>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: config.color }} />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{formatFCFA(row.amount)}</td>

                  <td className="px-4 py-4 text-center">
                    <ChevronRight size={18} className="text-gray-400 mx-auto" />
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-8">
                  Aucune opération sur la période
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <Pagination page={page} setPage={setPage} limit={limit} setLimit={setLimit} total={total} limitOptions={[5, 10, 25]} />
      )}

      {activeDetail && (
        <OperationDetailModal
          type={activeDetail.type}
          row={activeDetail.row}
          period={period}
          filters={filters}
          onClose={() => setActiveDetail(null)}
        />
      )}
    </div>
  )
}

/* ================= BOTTOM SHEET FILTRES (recherche d'acteurs réels de /metrics) ================= */
function FilterSheet({ period, setPeriod, filters, setFilters, actorsData, onClose }) {
  const [draftPeriod, setDraftPeriod] = useState(period)
  const [draftFilters, setDraftFilters] = useState(filters)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [actorSearch, setActorSearch] = useState("")

  const actorPool =
    draftFilters.actorType === "distributor"
      ? actorsData?.distributors || []
      : draftFilters.actorType === "merchant"
      ? actorsData?.merchants || []
      : draftFilters.actorType === "agent"
      ? actorsData?.agents || []
      : []

  const filteredActors = actorPool.filter((actor) =>
    (actor.name || "").toLowerCase().includes(actorSearch.trim().toLowerCase())
  )

  const applyQuickPeriod = (key) => {
    if (PERIOD_PRESETS[key]) {
      setDraftPeriod(PERIOD_PRESETS[key]())
    }
  }

  const draftActiveCount =
    (draftPeriod.key === "custom" ? 1 : 0) +
    (draftFilters.operationType !== "all" ? 1 : 0) +
    (draftFilters.actorType !== "all" ? 1 : 0)

  const handleReset = () => {
    setDraftPeriod(PERIOD_PRESETS.month())
    setDraftFilters({ operationType: "all", actorType: "all", actorId: null, actorLabel: "" })
  }

  const handleApply = () => {
    setPeriod(draftPeriod)
    setFilters(draftFilters)
    onClose()
  }

  const selectedTypeLabel =
    draftFilters.operationType === "all" ? "Tous" : OPERATION_TYPES[draftFilters.operationType]?.label || draftFilters.operationType

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white w-full rounded-t-3xl max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Filtres</h2>
            {draftActiveCount > 0 && (
              <span className="bg-blue-50 text-[#1EA4DC] text-xs font-medium px-2.5 py-1 rounded-full">
                {draftActiveCount} actif{draftActiveCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button onClick={handleReset} className="text-red-500 text-sm font-medium">
            Réinitialiser
          </button>
        </div>

        <div className="border-t border-gray-100" />

        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
          <div>
            <p className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Calendar size={18} />
              Période
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {PERIOD_QUICK_OPTIONS.map((opt) => {
                const active = draftPeriod.key === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => applyQuickPeriod(opt.key)}
                    className={`px-4 py-2.5 rounded-full border text-sm font-medium whitespace-nowrap transition ${
                      active ? "border-[#1EA4DC] text-[#1EA4DC] bg-blue-50" : "border-gray-200 text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <button onClick={() => setShowDateModal(true)} className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 mt-3">
              <span className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-left">
                  <p className="text-gray-400 text-sm">Période personnalisée</p>
                  <p className="font-medium text-gray-800">
                    {formatDateFR(draftPeriod.startDate)} – {formatDateFR(draftPeriod.endDate)}
                  </p>
                </span>
              </span>
              <span className="text-gray-400">✎</span>
            </button>
          </div>

          <div>
            <p className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <RotateCcw size={18} />
              Type d'opération
            </p>

            <button onClick={() => setShowTypeDropdown((v) => !v)} className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5">
              <span className="flex items-center gap-2 text-gray-800">
                <InfinityIcon size={18} className="text-gray-400" />
                {selectedTypeLabel}
              </span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${showTypeDropdown ? "rotate-180" : ""}`} />
            </button>

            {showTypeDropdown && (
              <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <button
                  onClick={() => {
                    setDraftFilters((f) => ({ ...f, operationType: "all" }))
                    setShowTypeDropdown(false)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left ${draftFilters.operationType === "all" ? "bg-gray-100" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <InfinityIcon size={18} className="text-gray-500" />
                    Tous
                  </span>
                  {draftFilters.operationType === "all" && <CheckCircle size={16} className="text-gray-500" />}
                </button>

                {Object.entries(OPERATION_TYPES).map(([key, config]) => {
                  const Icon = config.icon
                  const active = draftFilters.operationType === key
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setDraftFilters((f) => ({ ...f, operationType: key }))
                        setShowTypeDropdown(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-t border-gray-100 ${active ? "bg-gray-100" : ""}`}
                    >
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}1A` }}>
                        <Icon size={16} style={{ color: config.color }} />
                      </span>
                      {config.label}
                      {active && <CheckCircle size={16} className="ml-auto text-gray-500" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Users size={18} />
              Acteur
            </p>

            <div className="grid grid-cols-4 gap-2">
              {ACTOR_TYPES.map((opt) => {
                const Icon = opt.icon
                const active = draftFilters.actorType === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setDraftFilters((f) => ({ ...f, actorType: opt.key, actorId: null, actorLabel: "" }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium ${
                      active ? "border-[#1EA4DC] text-[#1EA4DC] bg-blue-50" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    <Icon size={20} />
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {draftFilters.actorType !== "all" && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={actorSearch}
                    onChange={(e) => setActorSearch(e.target.value)}
                    placeholder={`Rechercher un ${(ACTOR_TYPES.find((a) => a.key === draftFilters.actorType)?.label || "").toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 text-sm focus:outline-none"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2">
                  {filteredActors.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">Aucun résultat</p>
                  ) : (
                    filteredActors.map((actor) => (
                      <button
                        key={actor.id}
                        onClick={() => setDraftFilters((f) => ({ ...f, actorId: actor.id, actorLabel: actor.name }))}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${
                          draftFilters.actorId === actor.id ? "border-[#1EA4DC] bg-blue-50" : "border-gray-100"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {(actor.name || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-left">
                            <p className="font-medium text-gray-800">{actor.name}</p>
                            <p className="text-xs text-gray-400">{actor.city || "-"}</p>
                          </span>
                        </span>
                        <Store size={16} className="text-gray-300" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={handleApply} className="w-full bg-[#1EA4DC] text-white py-3.5 rounded-full font-semibold">
            Appliquer {draftActiveCount > 0 ? `(${draftActiveCount} filtre${draftActiveCount > 1 ? "s" : ""} actif${draftActiveCount > 1 ? "s" : ""})` : ""}
          </button>
        </div>
      </div>

      {showDateModal && (
        <DateRangeModal
          startDate={draftPeriod.startDate}
          endDate={draftPeriod.endDate}
          onClose={() => setShowDateModal(false)}
          onSave={(start, end) => {
            setDraftPeriod(buildCustomPeriod(start, end))
            setShowDateModal(false)
          }}
        />
      )}
    </div>
  )
}

/* ================= SÉLECTEUR DE PLAGE DE DATES ================= */
function DateRangeModal({ startDate, endDate, onClose, onSave }) {
  const [start, setStart] = useState(startDate)
  const [end, setEnd] = useState(endDate)

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <button onClick={onClose}>
          <X size={24} />
        </button>
        <button onClick={() => onSave(start, end)} disabled={!start || !end || start > end} className="font-semibold text-gray-900 disabled:text-gray-300">
          Enregistrer
        </button>
      </div>

      <div className="px-6 pb-6">
        <p className="text-gray-500 mb-1">Sélectionner une plage</p>
        <p className="text-2xl font-semibold">
          {formatDateShort(start)} – {formatDateShort(end)}
        </p>
      </div>

      <div className="px-6 space-y-4">
        <label className="block">
          <span className="text-sm text-gray-500">Date de début</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-500">Date de fin</span>
          <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm" />
        </label>
      </div>
    </div>
  )
}

/* ================= ÉCRAN "TOUS LES RAPPORTS" ================= */
export function TousLesRapports() {
  const navigate = useNavigate()
  const [category, setCategory] = useState("all")

  const filtered = REPORTS_CATALOG.filter((r) => category === "all" || r.category === category)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Tous les rapports" onBack={() => navigate(-1)} actions={[{ icon: <SlidersHorizontal size={18} className="text-[#1EA4DC]" />, onClick: () => {}, label: "Filtrer" }]} />

      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto py-4">
          {REPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = category === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border whitespace-nowrap ${
                  active ? "bg-[#1EA4DC] text-white border-[#1EA4DC]" : "border-gray-300 text-gray-700"
                }`}
              >
                {active && <CheckCircle size={14} />}
                <Icon size={15} />
                {cat.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-4">
          {filtered.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.id}
                onClick={() => navigate(report.path)}
                className="w-full flex items-start gap-4 bg-white rounded-2xl border border-gray-200 p-5 text-left"
              >
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${report.bg}`}>
                  <Icon size={24} className={report.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900">{report.title}</span>
                  <span className="block text-gray-500 text-sm mt-0.5">{report.description}</span>
                </span>
                <ChevronRight size={20} className="text-gray-400 mt-4 shrink-0" />
              </button>
            )
          })}

          {filtered.length === 0 && <p className="text-center text-gray-400 py-10">Aucun rapport dans cette catégorie</p>}
        </div>
      </div>
    </div>
  )
}

/* ================= ÉCRAN "DÉTAIL DES COMMISSIONS" (données réelles /financial) ================= */
export function DetailCommissions() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userCompany, loading: authLoading } = useAuth()
  const period = location.state?.period || PERIOD_PRESETS.month()

  const [data, setData] = useState({ distributors: {}, merchants: {}, company: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userCompany])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("token")
      const companyId = getCompanyId(userCompany)
      if (!token || !companyId) throw new Error("Session invalide")

      const response = await axios.get(financialUrl(companyId), {
        params: buildFilterParams(period, null),
        headers: authHeaders(token),
      })
      setData(response?.data?.data?.commissions || { distributors: {}, merchants: {}, company: {} })
    } catch (err) {
      console.error("DETAIL COMMISSIONS ERROR:", err?.response?.data || err.message)
      handleAuthError(err)
      setError("Impossible de charger le détail des commissions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader
        title="Détail des commissions"
        onBack={() => navigate(-1)}
        actions={[
          { icon: <Share2 size={18} className="text-[#1EA4DC]" />, onClick: () => {}, label: "Partager" },
          { icon: <Download size={18} className="text-[#1EA4DC]" />, onClick: () => {}, label: "Télécharger" },
        ]}
      />

      <div className="px-5 space-y-6 mt-2">
        {error && <ErrorBanner message={error} />}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Landmark size={24} className="text-[#1EA4DC]" />
          </span>
          <div>
            <p className="font-semibold text-lg">Détail des commissions</p>
            <p className="text-gray-500 text-sm">
              Du {formatDateFR(period.startDate)} au {formatDateFR(period.endDate)}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-bold">Répartition des commissions</h2>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement...</p>
        ) : (
          <>
            <CommissionDetailCard icon={<Users size={20} className="text-[#1EA4DC]" />} bg="bg-blue-50" label="Distributeurs" data={data.distributors} amountColor="text-[#1EA4DC]" />
            <CommissionDetailCard icon={<Store size={20} className="text-green-600" />} bg="bg-green-50" label="Commerçants" data={data.merchants} amountColor="text-green-600" />

            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Landmark size={22} className="text-amber-500" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Entreprise</p>
                <p className="text-gray-400 text-sm">{data.company?.count ?? 0} opérations</p>
              </div>
              <p className="font-bold text-amber-500 text-lg">{formatFCFA(data.company?.total)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CommissionDetailCard({ icon, bg, label, data = {}, amountColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 font-semibold text-gray-900">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>{icon}</span>
          {label}
        </span>
        <span className={`font-bold ${amountColor}`}>{formatFCFA(data.total)}</span>
      </div>
      <div className="grid grid-cols-3 text-sm text-center">
        <div>
          <p className="text-gray-400">Disponible</p>
          <p className="font-semibold text-green-600 mt-1">{formatFCFA(data.available)}</p>
        </div>
        <div>
          <p className="text-gray-400">Bloqué</p>
          <p className="font-semibold text-red-500 mt-1">{formatFCFA(data.blocked)}</p>
        </div>
        <div>
          <p className="text-gray-400">Retiré</p>
          <p className="font-semibold text-gray-500 mt-1">{formatFCFA(data.withdrawn)}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= PARTENAIRES IMPLIQUÉS (issus de involvedPartners) ================= */
function PartnersInvolvedSection({ partners }) {
  const distributors = partners?.distributors || []
  const merchants = partners?.merchants || []
  const agents = partners?.agents || []

  if (distributors.length === 0 && merchants.length === 0 && agents.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold">Partenaires impliqués</h2>

      <PartnerGroup title="Distributeurs" icon={Store} iconColor="text-[#1EA4DC]" iconBg="bg-blue-50" items={distributors} />
      <PartnerGroup title="Commerciaux" icon={Building2} iconColor="text-green-600" iconBg="bg-green-50" items={merchants} />
      <PartnerGroup title="Agents" icon={UserCog} iconColor="text-amber-600" iconBg="bg-amber-50" items={agents} />
    </div>
  )
}

function PartnerGroup({ title, icon: Icon, iconColor, iconBg, items }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className={`flex items-center gap-2 font-semibold mb-3 ${iconColor}`}>
        <Icon size={16} />
        {title}
        <span className={`${iconBg} ${iconColor} text-xs font-bold px-2 py-0.5 rounded-full`}>{items.length}</span>
      </p>
      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center gap-3 py-3">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={16} className={iconColor} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-400 truncate">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildFallbackDetail(row) {
  return {
    operationType: row?.type || null,
    totals: {
      count: row?.count || 0,
      amount: row?.amount || 0,
      effectiveAmount: row?.amount || 0,
      completedAmount: 0,
      completedEffectiveAmount: 0,
    },
    byStatus: {
      pending: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      validated: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    },
    commissions: { distributor: 0, merchant: 0, company: 0, total: 0 },
    successRate: null,
    byService: { services: [] },
    typeSpecificStats: {},
    involvedPartners: { distributors: [], merchants: [], adminAgents: [] },
  }
}

/* ================= HOOK PARTAGÉ : détail d'un type d'opération ================= */
// 🔧 CORRECTIF : on capture désormais le message d'erreur réel renvoyé par
// le backend (fallbackReason), loggé en entier dans la console (status +
// body complet) au lieu de se contenter d'un texte générique qui masquait
// la vraie cause de l'échec (401 token expiré, 400 paramètre invalide,
// 500 erreur serveur, etc.).
function useOperationTypeDetail(type, period, fallbackRow, actorFilters) {
  const { userCompany, loading: authLoading } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [usedFallback, setUsedFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState("")

  const periodKey = `${period?.preset || ""}|${period?.startDate || ""}|${period?.endDate || ""}`
  const actorKey = `${actorFilters?.actorType || ""}|${actorFilters?.actorId || ""}`

  useEffect(() => {
    if (authLoading || !type) return
    let cancelled = false

    const fetchDetail = async () => {
      try {
        setLoading(true)
        setError("")
        setUsedFallback(false)
        setFallbackReason("")

        const token = localStorage.getItem("token")
        const companyId = getCompanyId(userCompany)
        if (!token || !companyId) throw new Error("Session invalide")

        const requestParams = buildOperationTypeDetailParams(type, period, actorFilters)

        const response = await axios.get(operationTypeDetailUrl(companyId), {
          params: requestParams,
          headers: authHeaders(token),
        })
        if (cancelled) return
        setData(response?.data?.data || null)
      } catch (err) {
        if (cancelled) return

        console.error(
          "OPERATION TYPE DETAIL — échec de l'appel",
          {
            type,
            status: err?.response?.status,
            data: err?.response?.data,
            message: err.message,
          }
        )
        handleAuthError(err)

        const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (err?.response?.status ? `Erreur ${err.response.status}` : err.message)

        if (fallbackRow) {
          setData(buildFallbackDetail(fallbackRow))
          setUsedFallback(true)
          setFallbackReason(backendMessage)
        } else {
          setError(backendMessage || "Impossible de charger le détail de ce type d'opération")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userCompany, type, periodKey, actorKey])

  return { data, loading, error, usedFallback, fallbackReason }
}

/* ================= STATISTIQUES SPÉCIFIQUES AU TYPE D'OPÉRATION ================= */
function TypeSpecificStatsSection({ stats }) {
  if (!stats || typeof stats !== "object" || Object.keys(stats).length === 0) return null

  const { totalMovements, totalUnitsAdded, cardsStatus, byBank, byFormula, byService, ...rest } = stats

  const hasCounters = totalMovements !== undefined || totalUnitsAdded !== undefined
  const hasCards = cardsStatus && typeof cardsStatus === "object"
  const hasBanks = Array.isArray(byBank) && byBank.length > 0
  const hasFormulas = Array.isArray(byFormula) && byFormula.length > 0
  const hasServiceBreakdown = Array.isArray(byService) && byService.length > 0
  const extraScalarEntries = Object.entries(rest).filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")

  if (!hasCounters && !hasCards && !hasBanks && !hasFormulas && !hasServiceBreakdown && extraScalarEntries.length === 0) {
    return null
  }

  const humanizeKey = (key) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()

  return (
    <>
      {(hasCounters || extraScalarEntries.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Statistiques spécifiques</h2>
          <div className="grid grid-cols-2 gap-3">
            {totalMovements !== undefined && (
              <ClientMiniStat value={totalMovements} label="Mouvements" bg="bg-indigo-50" color="text-indigo-600" />
            )}
            {totalUnitsAdded !== undefined && (
              <ClientMiniStat value={totalUnitsAdded} label="Unités ajoutées" bg="bg-blue-50" color="text-[#1EA4DC]" />
            )}
            {extraScalarEntries.map(([key, value]) => (
              <ClientMiniStat key={key} value={String(value)} label={humanizeKey(key)} bg="bg-gray-50" color="text-gray-700" />
            ))}
          </div>
        </div>
      )}

      {hasCards && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">État des cartes</h2>
          <div className="grid grid-cols-3 gap-3">
            <CardStatusMiniStat icon={<CreditCard size={20} />} value={cardsStatus.active ?? 0} label="Actives" bg="bg-green-50" color="text-green-600" />
            <CardStatusMiniStat icon={<Ban size={20} />} value={cardsStatus.blocked ?? 0} label="Bloquées" bg="bg-red-50" color="text-red-500" />
            <CardStatusMiniStat icon={<AlarmClockOff size={20} />} value={cardsStatus.expired ?? 0} label="Expirées" bg="bg-gray-100" color="text-gray-500" />
          </div>
        </div>
      )}

      {hasBanks && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Par banque</h2>
          {byBank.map((bank, idx) => (
            <div key={bank.name || bank.bank || idx} className="flex items-center justify-between">
              <span className="flex items-center gap-3 text-gray-700">
                <Landmark size={18} className="text-gray-400" />
                {displayName(bank.name || bank.bank, "Banque")}
              </span>
              <span className="font-semibold">{bank.count ?? bank.total ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {hasFormulas && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Par formule</h2>
          {(() => {
            const totalFormulas = byFormula.reduce((s, f) => s + (f.count || 0), 0)
            return byFormula.map((formula, idx) => {
              const pct = totalFormulas ? (((formula.count || 0) / totalFormulas) * 100).toFixed(1) : "0.0"
              return (
                <div key={formula.name || formula.formula || idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-700">{displayName(formula.name || formula.formula, "Formule")}</span>
                    <span className="font-semibold">
                      {formula.count ?? 0} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-900 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}

      {hasServiceBreakdown && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Détail par service</h2>
          {byService.map((service, idx) => (
            <div key={service.name || service.service || idx} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-t-0 first:pt-0">
              <span className="text-gray-700">{displayName(service.name || service.service, "Service")}</span>
              <span className="font-semibold">{service.count ?? service.units ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ================= CONTENU PARTAGÉ DU DÉTAIL (page ET pop-up) ================= */
// 🔧 CORRECTIF : accepte désormais `fallbackReason` et l'affiche dans le
// bandeau d'avertissement au lieu du texte générique fixe.
function OperationDetailBody({ type, period, data, loading, error, usedFallback, fallbackReason }) {
  const config = OPERATION_TYPES[type] || { label: type, icon: FileText, color: "#6B7280" }
  const Icon = config.icon

  const totals = data?.totals || {}

  const statusEntries = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: data?.byStatus?.[key]?.count ?? 0,
    amount: data?.byStatus?.[key]?.amount ?? 0,
  }))
  const totalStatusCount = statusEntries.reduce((s, e) => s + e.count, 0)

  const services = (data?.byService?.services || []).map((service, idx) => ({
    id: service.id ?? idx,
    name: displayName(service.name || service.service || service.subProduct, "Service"),
    operationsCount: service.operationsCount ?? service.count ?? 0,
    completedCount: service.completedCount ?? service.completed ?? 0,
    amount: service.amount ?? service.totalAmount ?? 0,
    commission: service.commission ?? service.totalCommission ?? 0,
  }))

  const partners = {
    distributors: (data?.involvedPartners?.distributors || []).map((d) => normalizePartner(d, "distributor")).filter(Boolean),
    merchants: (data?.involvedPartners?.merchants || []).map((m) => normalizePartner(m, "merchant")).filter(Boolean),
    agents: (data?.involvedPartners?.adminAgents || []).map((a) => normalizePartner(a, "agent")).filter(Boolean),
  }

  const hasCompletedTotals = totals.completedAmount !== undefined || totals.completedEffectiveAmount !== undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#1EA4DC] px-4 py-2 rounded-full text-sm font-medium">
          <Calendar size={15} />
          {period.label}
        </span>
        <span className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
          <Icon size={15} />
          {config.label}
        </span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-10">Chargement...</p>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          {usedFallback && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">
                Le détail complet de ce type d'opération n'a pas pu être chargé depuis l'API
                {fallbackReason ? ` (${fallbackReason})` : ""} : les chiffres ci-dessous proviennent du tableau
                récapitulatif (volume et montant uniquement).
              </p>
            </div>
          )}

          {/* Volume total */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}1A` }}>
                  <Icon size={22} style={{ color: config.color }} />
                </span>
                <div>
                  <p className="text-2xl font-bold">{formatFCFA(totals.amount)}</p>
                  <p className="text-gray-400 text-sm">Volume total</p>
                </div>
              </div>
              {data?.successRate !== null && data?.successRate !== undefined && (
                <span className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-semibold shrink-0">
                  <CheckCircle size={14} />
                  {Number(data.successRate).toFixed(1)}%
                </span>
              )}
            </div>

            <p className="text-gray-400 text-sm">
              {formatDateFR(period.startDate)} – {formatDateFR(period.endDate)}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="flex items-center gap-2 text-gray-700">
                <FileText size={16} />
                <span>
                  <span className="font-semibold">{totals.count ?? 0}</span>
                  <span className="block text-xs text-gray-400">Opérations</span>
                </span>
              </span>
              <span className="flex items-center gap-2 text-gray-700">
                <DollarSign size={16} className="text-green-600" />
                <span>
                  <span className="font-semibold">{formatFCFA(totals.effectiveAmount)}</span>
                  <span className="block text-xs text-gray-400">Montant effectif</span>
                </span>
              </span>
            </div>

            {hasCompletedTotals && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>
                    <span className="font-semibold">{formatFCFA(totals.completedAmount)}</span>
                    <span className="block text-xs text-gray-400">Montant complété</span>
                  </span>
                </span>
                <span className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} className="text-green-600" />
                  <span>
                    <span className="font-semibold">{formatFCFA(totals.completedEffectiveAmount)}</span>
                    <span className="block text-xs text-gray-400">Effectif complété</span>
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Statut des opérations */}
          {!usedFallback && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Statut des opérations</h2>
              <div className="flex items-center gap-6">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusEntries} dataKey="count" nameKey="label" innerRadius={50} outerRadius={75} paddingAngle={2}>
                        {statusEntries.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-3">
                  {statusEntries.map((entry) => {
                    const pct = totalStatusCount ? ((entry.count / totalStatusCount) * 100).toFixed(1) : "0.0"
                    return (
                      <div key={entry.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.label}
                          </span>
                          <span className="font-semibold">
                            {entry.count} <span className="text-gray-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 pl-4 mt-0.5">{formatFCFA(entry.amount)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Commissions générées */}
          {!usedFallback && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              <h2 className="text-lg font-semibold">Commissions générées</h2>
              <SummaryRow label="Total" value={formatFCFA(data?.commissions?.total)} color="text-amber-500" bold />
              <SummaryRow label="Distributeur" value={formatFCFA(data?.commissions?.distributor)} color="text-[#1EA4DC]" />
              <SummaryRow label="Commercial" value={formatFCFA(data?.commissions?.merchant)} color="text-green-600" />
              <SummaryRow label="Pollux" value={formatFCFA(data?.commissions?.company)} color="text-[#1EA4DC]" />
            </div>
          )}

          {/* Par service (volume + commission par produit rattaché à l'opération) */}
          {services.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Par service</h2>
              {services.map((service) => (
                <div key={service.id} className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}1A` }}>
                    <Icon size={20} style={{ color: config.color }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{service.name}</p>
                    <p className="text-sm text-gray-400">
                      {service.operationsCount} op. ·{" "}
                      <span className="text-green-600 font-medium">{service.completedCount} complétées</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600">{formatFCFA(service.amount)}</p>
                    <p className="text-xs text-gray-400">comm. {formatFCFA(service.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <TypeSpecificStatsSection stats={data?.typeSpecificStats} />

          <PartnersInvolvedSection partners={partners} />
        </>
      )}
    </div>
  )
}

/* ================= POP-UP WEB : DÉTAIL D'UN TYPE D'OPÉRATION ================= */
// 🔧 CORRECTIF : récupère et transmet `fallbackReason` à OperationDetailBody.
function OperationDetailModal({ type, period, row, filters, onClose }) {
  const config = OPERATION_TYPES[type] || { label: type, icon: FileText, color: "#6B7280" }
  const Icon = config.icon
  const { data, loading, error, usedFallback, fallbackReason } = useOperationTypeDetail(type, period, row, filters)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh]"
        role="dialog"
        aria-modal="true"
        aria-label={config.label}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${config.color}1A` }}
            >
              <Icon size={20} style={{ color: config.color }} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{config.label}</h2>
              <p className="text-xs text-gray-400 truncate">
                {formatDateFR(period.startDate)} – {formatDateFR(period.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              aria-label="Télécharger"
              title="Télécharger"
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#1EA4DC] hover:bg-blue-50 transition"
            >
              <Download size={17} />
            </button>
            <button
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <OperationDetailBody
            type={type}
            period={period}
            data={data}
            loading={loading}
            error={error}
            usedFallback={usedFallback}
            fallbackReason={fallbackReason}
          />
        </div>
      </div>
    </div>
  )
}

/* ================= APERÇU REACT DU POP-UP (données statiques, tout-en-un) ================= */
const MOCK_DETAIL_PERIOD = { key: "year", label: "Cette année", preset: "THIS_YEAR", startDate: "2026-01-01", endDate: "2026-08-03" }

const MOCK_OPERATION_DETAIL = {
  operationType: "PREPAID_CARD_ACTIVATION",
  totals: {
    count: 44,
    amount: 688500,
    effectiveAmount: 682364,
    completedAmount: 688500,
    completedEffectiveAmount: 682364,
  },
  byStatus: {
    completed: { count: 30, amount: 688500 },
    validated: { count: 0, amount: 0 },
    pending: { count: 1, amount: 0 },
    rejected: { count: 8, amount: 49500 },
    cancelled: { count: 5, amount: 0 },
  },
  commissions: { total: 6136, distributor: 3330, merchant: 604, company: 2202 },
  successRate: 68.2,
  byService: {
    services: [
      {
        name: "Carte prépayée",
        operationsCount: 44,
        completedCount: 30,
        amount: 738000,
        commission: 6876,
      },
    ],
  },
  typeSpecificStats: {
    cardsStatus: { active: 32, blocked: 0, expired: 0 },
    byBank: [
      { name: "UNITED BANK AFRICA", count: 18 },
      { name: "Ecobank", count: 16 },
      { name: "BSIC BENIN", count: 9 },
      { name: "BOA BANQUE", count: 1 },
    ],
    byFormula: [
      { name: "Middle", count: 33 },
      { name: "LOW", count: 8 },
      { name: "High", count: 3 },
    ],
  },
  involvedPartners: {
    distributors: [
      { id: 1, name: "freddy AD", businessName: "Freddy · Cotonou" },
      { id: 2, name: "Harold Merk", businessName: "LA MERKURE · AZOVE" },
      { id: 3, name: "nano maflon", businessName: "kpeminado · uryyyrydy" },
      { id: 4, name: "maelyse Zoé", businessName: "Pollux srl · calavi" },
      { id: 5, name: "alan galon", businessName: "ala &fils · Cotonou" },
    ],
    merchants: [
      { id: 1, name: "Thérésa da Silva", shopAddress: "Calavi" },
      { id: 2, name: "NANETTE MAFLON", shopAddress: "ABOMEY-CALAVI" },
    ],
    adminAgents: [
      { id: 1, name: "Gregory Charles", employeeCode: "CHAR2000", department: "VALIDATION", position: "AGENT" },
      { id: 2, name: "Godfried Massenon", employeeCode: "PBC001", department: "SUPPORT", position: "AGENT" },
    ],
  },
}

export function OperationDetailModalPreview({ onClose = () => {} }) {
  const type = "PREPAID_CARD_ACTIVATION"
  const config = OPERATION_TYPES[type]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh]"
        role="dialog"
        aria-modal="true"
        aria-label={config.label}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${config.color}1A` }}
            >
              <Icon size={20} style={{ color: config.color }} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{config.label}</h2>
              <p className="text-xs text-gray-400 truncate">
                {formatDateFR(MOCK_DETAIL_PERIOD.startDate)} – {formatDateFR(MOCK_DETAIL_PERIOD.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              aria-label="Télécharger"
              title="Télécharger"
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#1EA4DC] hover:bg-blue-50 transition"
            >
              <Download size={17} />
            </button>
            <button
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <OperationDetailBody
            type={type}
            period={MOCK_DETAIL_PERIOD}
            data={MOCK_OPERATION_DETAIL}
            loading={false}
            error=""
            usedFallback={false}
            fallbackReason=""
          />
        </div>
      </div>
    </div>
  )
}

export function OperationDetailPreviewPage() {
  const [open, setOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-[#1EA4DC] text-white px-5 py-3.5 rounded-full font-semibold shadow-lg"
        >
          Ouvrir l'aperçu du pop-up
        </button>
      )}
      {open && <OperationDetailModalPreview onClose={() => setOpen(false)} />}
    </div>
  )
}

/* ================= ÉCRAN "DÉTAIL D'UN TYPE D'OPÉRATION" (route dédiée) ================= */
// 🔧 CORRECTIF : récupère et transmet `fallbackReason` à OperationDetailBody.
export function OperationTypeDetail() {
  const navigate = useNavigate()
  const { type } = useParams()
  const location = useLocation()
  const period = location.state?.period || PERIOD_PRESETS.year()
  const row = location.state?.row
  const filters = location.state?.filters

  const config = OPERATION_TYPES[type] || { label: type, icon: FileText, color: "#6B7280" }
  const { data, loading, error, usedFallback, fallbackReason } = useOperationTypeDetail(type, period, row, filters)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <PageHeader
        title={config.label}
        onBack={() => navigate(-1)}
        actions={[{ icon: <Download size={18} className="text-[#1EA4DC]" />, onClick: () => {}, label: "Télécharger" }]}
      />

      <div className="px-5 mt-2">
        <OperationDetailBody
          type={type}
          period={period}
          data={data}
          loading={loading}
          error={error}
          usedFallback={usedFallback}
          fallbackReason={fallbackReason}
        />
      </div>
    </div>
  )
}