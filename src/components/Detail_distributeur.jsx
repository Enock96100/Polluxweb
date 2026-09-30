import {
  Plus,
  Minus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Pencil,
  PowerOff,
  Eye,
  Trash2,
  Package,
  Radio,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"

/* ═══════════════════════════════════════════════
  API
═══════════════════════════════════════════════ */

const DIST_DETAIL_API      = (id) => `https://youapi.youneed.app/pollux/prod/api/distributors/${id}`
const DIST_OPERATIONS_API  = (id) => `https://youapi.youneed.app/pollux/prod/api/distributors/${id}/operations`
const DIST_CARDS_API       = (id) => `https://youapi.youneed.app/pollux/prod/api/prepaid-cards/distributors/${id}/cards`
const DIST_SUBPRODUCTS_API = (id) => `https://youapi.youneed.app/pollux/prod/api/products/partners/sub-products/${id}`
const DIST_PARABOLAS_API   = (id) => `https://youapi.youneed.app/pollux/prod/api/formula-canals/parabolas/partners/${id}`
const DIST_COMMISSIONS_API = (id) => `https://youapi.youneed.app/pollux/prod/api/commissions/distributors/${id}/history`
const DIST_STATISTICS_API  = (id) => `https://youapi.youneed.app/pollux/prod/api/distributors/${id}/statistics`

const DIST_CANAL_RATES_API = (id) =>
  `https://youapi.youneed.app/pollux/prod/api/canal-commissions/distributor-assignments?distributorId=${id}`
const DIST_CARD_RATES_API = (id) =>
  `https://youapi.youneed.app/pollux/prod/api/commissions/distributor-assignments?distributorId=${id}`

const CARD_RATE_TRANCHES_API = (serviceId) =>
  `https://youapi.youneed.app/pollux/prod/api/commissions/rates/service/${serviceId}`

const CARD_RATE_ASSIGN_API =
  `https://youapi.youneed.app/pollux/prod/api/commissions/distributor-assignments`

const FORMULA_CANALS_API =
  `https://youapi.youneed.app/pollux/prod/api/formula-canals`

const CANAL_RATE_ASSIGN_API =
  `https://youapi.youneed.app/pollux/prod/api/canal-commissions/distributor-assignments`

// ✅ AJOUT : modification (PATCH) et désactivation (DELETE) d'un taux
// carte prépayée déjà assigné à un distributeur. Même URL de base que
// CARD_RATE_ASSIGN_API, avec l'id de l'assignation en suffixe.
const CARD_RATE_UPDATE_API = (assignmentId) =>
  `https://youapi.youneed.app/pollux/prod/api/commissions/distributor-assignments/${assignmentId}`

// ✅ AJOUT : modification (PUT) et désactivation (DELETE) d'un taux
// Canal+ déjà assigné à un distributeur. Même URL de base que
// CANAL_RATE_ASSIGN_API, avec l'id de l'assignation en suffixe.
const CANAL_RATE_UPDATE_API = (assignmentId) =>
  `https://youapi.youneed.app/pollux/prod/api/canal-commissions/distributor-assignments/${assignmentId}`

/* ═══════════════════════════════════════════════
  RÉAPPROVISIONNEMENT DIRECT / LIBÉRATION DE STOCK / ASSIGNATION PARABOLE
  (déplacés depuis Partenaires.jsx vers la section Stock de cette page,
  et rendus dynamiques par catégorie de produit : Carte / Décodeur / Parabole)
═══════════════════════════════════════════════ */

// CONFIRMÉ : liste des banques (GET /products/banks)
const BANKS_LIST_API = `https://youapi.youneed.app/pollux/prod/api/products/banks`
// CONFIRMÉ : formules carte prépayée d'un service (GET /prepairs-formula/service/:serviceId)
const FORMULAS_BY_SERVICE_API = (serviceId) =>
  `https://youapi.youneed.app/pollux/prod/api/prepairs-formula/service/${serviceId}`

// ✅ CORRIGÉ : un seul endpoint pour la liste des sous-produits disponibles
// d'un service. Le serviceId reste dans le CHEMIN (path param), tandis que
// bankId / prepaidCardFormulaId (pour une carte) ainsi que status / page /
// limit sont passés en QUERY PARAMS, exactement comme dans l'exemple :
// /products/sub-products/product/:serviceId?status=AVAILABLE&page=1&bankId=...&prepaidCardFormulaId=...&limit=20
const SUBPRODUCTS_BY_SERVICE_API = (serviceId) =>
  `https://youapi.youneed.app/pollux/prod/api/products/sub-products/product/${serviceId}`

//  CONFIRMÉ : catalogue des paraboles de l'entreprise
const PARABOLAS_CATALOG_API = `https://youapi.youneed.app/pollux/prod/api/formula-canals/parabolas`

//  CONFIRMÉ (source Flutter fournie) : réapprovisionnement direct d'un distributeur
// POST /products/distributors/direct-restocking
const DIRECT_DISTRIBUTOR_RESTOCKING_API =
  `https://youapi.youneed.app/pollux/prod/api/products/distributors/direct-restocking`

//  CONFIRMÉ (déjà utilisé dans Partenaires.jsx) : libération de stock
const RELEASE_DIST_SUBPRODUCTS_API =
  `https://youapi.youneed.app/pollux/prod/api/products/distributors/sub-products/release`
const RELEASE_DIST_PARABOLAS_API =
  `https://youapi.youneed.app/pollux/prod/api/formula-canals/parabolas/release-from-distributor`

//  CONFIRMÉ (déjà utilisé dans Partenaires.jsx) : assignation de parabole(s)
const PARABOLA_ASSIGN_DISTRIBUTOR_API =
  `https://youapi.youneed.app/pollux/prod/api/formula-canals/parabolas/assign-to-distributor`

/* ═══════════════════════════════════════════════
  HELPERS DE FORMATAGE
═══════════════════════════════════════════════ */

function formatDate(iso) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatMontant(value) {
  const n = Number(value)
  if (isNaN(n)) return "0 FCFA"
  return `${n.toLocaleString("fr-FR")} FCFA`
}

function formatPercent(value) {
  const n = Number(value)
  if (isNaN(n)) return "-"
  return `${(n * 100).toFixed(2)}%`
}

/* ═══════════════════════════════════════════════
  NOTIFICATION
═══════════════════════════════════════════════ */
function useNotification() {
  const [notif, setNotif] = useState(null)
  const timerRef = useRef(null)

  const show = useCallback((type, message) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotif({ type, message })
    timerRef.current = setTimeout(() => setNotif(null), 4000)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotif(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return {
    notif,
    showSuccess: (msg) => show("success", msg),
    showError:   (msg) => show("error",   msg),
    dismiss,
  }
}

function NotificationBanner({ notif, onDismiss }) {
  if (!notif) return null
  const isSuccess = notif.type === "success"
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition-all
        ${isSuccess
          ? "bg-green-50 border border-green-200 text-green-700"
          : "bg-red-50 border border-red-200 text-red-700"
        }`}
    >
      {isSuccess
        ? <CheckCircle size={18} className="shrink-0 text-green-500" />
        : <AlertCircle size={18} className="shrink-0 text-red-500" />
      }
      <span className="flex-1">{notif.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  ✅ AJOUT : DIALOGUE DE CONFIRMATION GÉNÉRIQUE
  Utilisé avant toute désactivation (taux carte / taux Canal+).
═══════════════════════════════════════════════ */
function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              danger ? "bg-red-500 hover:bg-red-600" : "bg-[#1EA4DC] hover:bg-[#178dbf]"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  MAPPING OPERATIONS (API dynamique)
═══════════════════════════════════════════════ */

const OPERATION_TYPE_MAP = {
  PREPAID_CARD_RECHARGE:      { label: "Recharge Carte",               categorie: "recharge-carte" },
  PREPAID_CARD_ACTIVATION:    { label: "Activation Carte",             categorie: "activation-carte" },
  CANAL_SUBSCRIPTION_NEW:     { label: "Nouvel Abonnement Canal",      categorie: "nouvel-abonnement-canal" },
  CANAL_SUBSCRIPTION_RENEWAL: { label: "Renouvellement Canal+",        categorie: "renouvellement-canal" },
  CANAL_FORMULA_CHANGE:       { label: "Changement de formule Canal+", categorie: "changement-formule-canal" },
  CANAL_REACTIVATION:         { label: "Réactivation Canal+",          categorie: "reactivation-canal" },
  WALLET_DEPOSIT:             { label: "Dépôt Wallet",                 categorie: "depot-wallet" },
  COMMISSION_WITHDRAWAL:      { label: "Retrait Commission",           categorie: "retrait-commission" },
  MANUAL_ADJUSTMENT:          { label: "Ajustement Manuel",            categorie: "ajustement-manuel" },
  SUBPRODUCT_RESTOCKING:      { label: "Réapprovisionnement",          categorie: "reapprovisionnement" },
}

const CATEGORIE_TO_OPERATION_TYPE = Object.entries(OPERATION_TYPE_MAP).reduce((acc, [type, cfg]) => {
  acc[cfg.categorie] = type
  return acc
}, {})

const OPERATION_STATUS_MAP = {
  PENDING:   { label: "En attente", variant: "orange" },
  VALIDATED: { label: "Complet",    variant: "green" },
  COMPLETED: { label: "Complet",    variant: "green" },
  CANCELLED: { label: "Annulé",     variant: "red" },
  REJECTED:  { label: "Rejeté",     variant: "red" },
}

const COMMISSION_STATUS_MAP = {
  EARNED:    { label: "Gagné",      variant: "green" },
  BLOCKED:   { label: "Bloqué",     variant: "orange" },
  AVAILABLE: { label: "Disponible", variant: "green" },
  WITHDRAWN: { label: "Retiré",     variant: "red" },
}

function mapOperation(op) {
  const typeCfg = OPERATION_TYPE_MAP[op.operationType] || { label: op.operationType || "-", categorie: "tous" }
  const statusCfg = OPERATION_STATUS_MAP[op.status] || { label: op.status || "-", variant: "orange" }
  const montantRaw = Number(op.effectiveAmount ?? op.amount) || 0
  return {
    id: op.id,
    type: typeCfg.label,
    libelle: typeCfg.label,
    date: formatDate(op.requestedAt || op.createdAt),
    montant: formatMontant(op.effectiveAmount ?? op.amount),
    montantRaw,
    statut: statusCfg.label,
    statutVariant: statusCfg.variant,
    categorie: typeCfg.categorie,
    description: op.description || "",
  }
}

function mapCommission(c) {
  const opType = c.operation?.operationType
  const typeCfg = OPERATION_TYPE_MAP[opType] || { label: opType || "-", categorie: "tous" }
  const statusCfg = COMMISSION_STATUS_MAP[c.status] || { label: c.status || "-", variant: "orange" }
  const sousLibelle =
    c.operation?.subProduct?.name ||
    c.operation?.metadata?.bank?.name ||
    c.operation?.metadata?.prepaidCardFormulaName ||
    c.operation?.description ||
    "-"
  return {
    id: c.id,
    operation: typeCfg.label,
    sousLibelle,
    montant: formatMontant(c.commissionAmount),
    statut: statusCfg.label,
    statutVariant: statusCfg.variant,
    categorie: typeCfg.categorie,
    date: formatDate(c.earnedAt),
  }
}

/* ═══════════════════════════════════════════════
  MAPPING STOCK (Cartes / Décodeurs / Paraboles)
═══════════════════════════════════════════════ */

const CARD_STATUS_MAP = {
  ACTIVE:   { label: "Actif",   variant: "green" },
  INACTIVE: { label: "Inactif", variant: "orange" },
  BLOCKED:  { label: "Bloqué",  variant: "red" },
}

function mapCarte(c) {
  const statusCfg = CARD_STATUS_MAP[c.status] || { label: c.status || "-", variant: "orange" }
  return {
    id: c.id,
    produit: c.subProduct?.name || c.bank?.name || "Carte prépayée",
    code: `N° ${c.cardNumber || c.cardId || "-"}`,
    holder: c.cardHolderName || "-",
    montant: formatMontant(c.balance),
    statut: statusCfg.label,
    statutVariant: statusCfg.variant,
    raw: c,
  }
}

function mapSubProduct(sp) {
  return {
    id: sp.id,
    service: sp.subProduct?.name || sp.subProduct?.service?.name || "-",
    code: sp.subProduct?.code || "-",
    montant: formatMontant(sp.sellingPrice ?? sp.subProduct?.price),
    stock: sp.stock ?? 0,
    statut: sp.isActive ? "Disponible" : "Inactif",
    statutVariant: sp.isActive ? "green" : "orange",
    raw: sp,
  }
}

function mapParabola(p) {
  return {
    id: p.id,
    service: p.parabola?.name || "Parabole",
    code: p.parabola?.code || "-",
    montant: formatMontant(p.parabola?.price),
    stock: p.stock ?? 0,
    statut: p.isActive ? "Disponible" : "Inactif",
    statutVariant: p.isActive ? "green" : "orange",
    raw: p,
  }
}

function getServiceStockStats(subStats, serviceName) {
  const byStatusService = subStats?.stockStatistics?.byStatusService || []
  const entry = byStatusService.find((s) => s.service === serviceName)
  if (!entry) return { total: 0, disponible: 0, activees: 0 }
  return {
    total: entry.total ?? 0,
    disponible: (entry.AVAILABLE ?? 0) + (entry.ASSIGNED ?? 0),
    activees: entry.ACTIVATED ?? 0,
  }
}

/* ═══════════════════════════════════════════════
  MAPPING TAUX (Section Infos)
═══════════════════════════════════════════════ */

function mapCanalRateAssignment(item) {
  const formula = item.formula || {}
  const summary = item.summary || {}
  const isFixed = item.commissionType === "FIXED"
  return {
    id: item.id,
    formule: formula.name || "-",
    code: formula.code || "-",
    prixFormule: formatMontant(formula.price),
    nouvelAbonnement:
      summary.newSubscriptionRate ||
      (isFixed ? formatMontant(item.newSubscriptionRate) : formatPercent(item.newSubscriptionRate)),
    renouvellement:
      summary.renewalRate ||
      (isFixed ? formatMontant(item.renewalRate) : formatPercent(item.renewalRate)),
    statut: item.isActive ? "Actif" : "Inactif",
    raw: item, // ✅ AJOUT : conservé pour modification / désactivation
  }
}

function mapCardRateAssignment(item) {
  const rate = item.serviceCommissionRate || {}
  const summary = item.summary || {}
  const range =
    summary.range ||
    (rate.minAmount != null && rate.maxAmount != null ? `${rate.minAmount} - ${rate.maxAmount}` : "-")
  return {
    id: item.id,
    service: rate.service?.name || "Carte prépayée",
    description: range,
    tauxDistributeur: summary.distributeurRate || formatPercent(item.partnerRate),
    tauxPolluX: summary.companyRate || formatPercent(item.companyRate),
    totalTaux: summary.totalRate || formatPercent(item.totalRate),
    statut: item.isActive ? "Actif" : "Inactif",
    raw: item, // ✅ AJOUT : conservé pour modification / désactivation
  }
}

/* ═══════════════════════════════════════════════
  NORMALISATION — Réapprovisionnement / Libération / Assignation parabole
═══════════════════════════════════════════════ */

function normalizeCompanyService(ds) {
  const s = ds.service || {}
  return { id: s.id, name: s.name || "-", category: s.category || null }
}
function normalizeBank(b) {
  return { id: b.id, name: b.name || "-", code: b.code || null }
}
function normalizeFormula(f) {
  return { id: f.id, name: f.name || "-", code: f.code || null, maxBalance: f.maxBalance ?? null }
}
// Sous-produit disponible au catalogue (à réapprovisionner)
function normalizeAvailableSubProduct(sp) {
  return {
    id: sp.id,
    name: sp.name || "Sous-produit",
    code: sp.code || null,
    description: sp.code ? `Code : ${sp.code}` : null,
    price: Number(sp.price || 0),
  }
}
function normalizeReleasableSubProduct(item) {
  const sp = item.subProduct || {}
  return {
    id: `sp-${item.id}`,
    subProductId: item.subProductId,
    name: sp.name || "Sous-produit",
    code: sp.code || null,
    description: `Code : ${sp.code || "-"} · Stock : ${item.stock ?? 0}`,
    qty: item.stock ?? 0,
    price: Number(item.sellingPrice ?? sp.price ?? 0),
  }
}
function normalizeReleasableParabola(item) {
  const p = item.parabola || {}
  return {
    id: `pb-${item.id}`,
    parabolaId: item.parabolaId,
    name: p.name || p.code || "Parabole",
    code: p.code || null,
    description: `Code : ${p.code || "-"} · Stock : ${item.stock ?? 0}`,
    qty: item.stock ?? 0,
    price: Number(p.price ?? 0),
  }
}
function normalizeAssignableParabola(p) {
  return {
    id: p.id,
    name: p.name || p.code || "Parabole",
    code: p.code || null,
    description: [p.brand, p.model].filter(Boolean).join(" ") || null,
    price: Number(p.price || 0),
  }
}

/* ═══════════════════════════════════════════════
  COMPOSANT GÉNÉRIQUE : LISTE À COCHER
  Réutilisé pour "Libérer le stock" (Carte / Décodeur / Parabole) et
  pour "Assigner parabole".
═══════════════════════════════════════════════ */
function CheckableListModal({
  title,
  label,
  items,
  loading = false,
  confirmLabel = "Confirmer",
  confirmingLabel = "Traitement...",
  emptyMessage = "Aucun élément disponible",
  confirmButtonClass = "bg-[#1EA4DC] hover:bg-[#178dbf]",
  showObservation = true,
  onClose,
  onConfirm,
}) {
  const [selected,    setSelected]    = useState({})
  const [observation, setObservation] = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [localError,  setLocalError]  = useState(null)

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((it) => it.id))
      const next = {}
      Object.entries(prev).forEach(([id, val]) => { if (ids.has(id)) next[id] = val })
      return next
    })
  }, [items])

  const allSelected = items.length > 0 && items.every((it) => selected[it.id])

  const toggleAll = () => {
    if (allSelected) setSelected({})
    else {
      const next = {}
      items.forEach((it) => { next[it.id] = it })
      setSelected(next)
    }
  }

  const toggleItem = (item) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })
  }

  const selectedItems = Object.values(selected)
  const count = selectedItems.length

  const handleConfirm = async () => {
    if (count === 0) return
    setLocalError(null)
    setSubmitting(true)
    try {
      await onConfirm({ selectedItems, observation })
    } catch (err) {
      setLocalError(err?.message || "Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        {label && <p className="text-sm text-gray-400 mb-4">{label}</p>}

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 mb-3 cursor-pointer w-fit">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#1EA4DC] w-4 h-4" />
            <span className="text-sm font-medium text-gray-700">Tout sélectionner</span>
          </label>
        )}

        <div className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
              <Loader2 size={18} className="animate-spin text-[#1EA4DC]" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : items.length > 0 ? (
            items.map((it) => (
              <div
                key={it.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors
                  ${selected[it.id] ? "border-[#1EA4DC] bg-blue-50/60" : "border-gray-200 bg-white"}`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!selected[it.id]}
                    onChange={() => toggleItem(it)}
                    className="accent-[#1EA4DC] w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{it.name}</p>
                    {it.description && <p className="text-xs text-gray-400 truncate">{it.description}</p>}
                    {typeof it.price === "number" && it.price > 0 && (
                      <p className="text-xs text-gray-400">{formatMontant(it.price)}</p>
                    )}
                  </div>
                </label>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
          )}
        </div>

        {!loading && items.length > 0 && (
          <>
            {showObservation && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Observation (optionnel)</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ajouter une observation..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                  rows="2"
                />
              </div>
            )}

            <div className="sticky bottom-0 bg-white pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">{count} élément{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}</span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={count === 0 || submitting}
                className={`w-full text-white py-3.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmButtonClass}`}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? confirmingLabel : confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  MODALE : ASSIGNER PARABOLE
═══════════════════════════════════════════════ */
function AssignParaboleModal({ onClose, onAssigned }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${PARABOLAS_CATALOG_API}?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      const disponibles = list
        .filter((p) => p.isActive && p.status !== "ASSIGNED")
        .map(normalizeAssignableParabola)
      setItems(disponibles)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCatalog() }, [fetchCatalog])

  return (
    <CheckableListModal
      title="Assigner parabole"
      label="Sélectionner une ou plusieurs paraboles à assigner"
      items={items}
      loading={loading}
      confirmLabel="Assigner"
      confirmingLabel="Assignation..."
      emptyMessage="Aucune parabole disponible"
      onClose={onClose}
      onConfirm={onAssigned}
    />
  )
}

/* ═══════════════════════════════════════════════
  MODALE : ASSISTANT DE RÉAPPROVISIONNEMENT DIRECT
═══════════════════════════════════════════════ */
function RestockWizardModal({ distributorId, category, servicesList, onClose, onConfirmed }) {
  const isCarte = category === "carte"

  const [step, setStep] = useState("service") // service | bank | formule | products
  const [selectedService, setSelectedService] = useState(null)
  const [selectedBank,    setSelectedBank]    = useState(null)
  const [selectedFormule, setSelectedFormule] = useState(null)

  const [banks,    setBanks]    = useState([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [formules, setFormules] = useState([])
  const [formulesLoading, setFormulesLoading] = useState(false)

  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState(null)

  const [selected, setSelected] = useState({}) // { [id]: product }
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)

  const steps = isCarte
    ? [
        { key: "service",  label: "Service" },
        { key: "bank",     label: "Banque" },
        { key: "formule",  label: "Formule" },
        { key: "products", label: "Produits" },
      ]
    : [
        { key: "service",  label: "Service" },
        { key: "products", label: "Produits" },
      ]

  const currentIndex = Math.max(0, steps.findIndex((s) => s.key === step))

  const fetchBanks = useCallback(async () => {
    setBanksLoading(true)
    try {
      const { token } = getAuthData()
      const res = await axios.get(BANKS_LIST_API, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setBanks(Array.isArray(res.data?.data) ? res.data.data.map(normalizeBank) : [])
    } catch {
      setBanks([])
    } finally {
      setBanksLoading(false)
    }
  }, [])

  const fetchFormules = useCallback(async (serviceId) => {
    setFormulesLoading(true)
    try {
      const { token } = getAuthData()
      const res = await axios.get(FORMULAS_BY_SERVICE_API(serviceId), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setFormules(Array.isArray(res.data?.data) ? res.data.data.map(normalizeFormula) : [])
    } catch {
      setFormules([])
    } finally {
      setFormulesLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    if (!selectedService) return
    setProductsLoading(true)
    setProductsError(null)
    setProducts([])
    setSelected({})
    try {
      const { token } = getAuthData()

      const params = { status: "AVAILABLE", page: 1, limit: 20 }

      if (isCarte) {
        if (!selectedBank?.id || !selectedFormule?.id) {
          setProducts([])
          setProductsLoading(false)
          return
        }
        params.bankId = selectedBank.id
        params.prepaidCardFormulaId = selectedFormule.id
      }

      const res = await axios.get(SUBPRODUCTS_BY_SERVICE_API(selectedService.id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params,
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      setProducts(list.map(normalizeAvailableSubProduct))
    } catch (err) {
      setProductsError(err?.response?.data?.description || err.message || "Impossible de charger les produits disponibles")
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [selectedService, selectedBank, selectedFormule, isCarte])

  useEffect(() => {
    if (step === "bank" && selectedService) fetchBanks()
  }, [step, selectedService, fetchBanks])

  useEffect(() => {
    if (step === "formule" && selectedService) fetchFormules(selectedService.id)
  }, [step, selectedService, fetchFormules])

  useEffect(() => {
    if (step === "products") fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedService, selectedBank, selectedFormule])

  const handleSelectService = (service) => {
    setSelectedService(service)
    setSelectedBank(null)
    setSelectedFormule(null)
    setSelected({})
    setStep(isCarte ? "bank" : "products")
  }

  const handleSelectBank = (bank) => {
    setSelectedBank(bank)
    setSelectedFormule(null)
    setSelected({})
    setStep("formule")
  }

  const handleSelectFormule = (formule) => {
    setSelectedFormule(formule)
    setSelected({})
    setStep("products")
  }

  const goToStep = (index) => {
    const key = steps[index]?.key
    setLocalError(null)
    if (key === "service") { setSelectedService(null); setSelectedBank(null); setSelectedFormule(null); setSelected({}) }
    else if (key === "bank")    { setSelectedBank(null); setSelectedFormule(null); setSelected({}) }
    else if (key === "formule") { setSelectedFormule(null); setSelected({}) }
    setStep(key)
  }

  const goBack = () => {
    setLocalError(null)
    if (step === "bank")     { setSelectedService(null); setStep("service") }
    else if (step === "formule") { setSelectedBank(null); setStep("bank") }
    else if (step === "products") {
      if (isCarte) { setSelectedFormule(null); setStep("formule") }
      else         { setSelectedService(null); setStep("service") }
    }
  }

  const allSelected = products.length > 0 && products.every((p) => selected[p.id])

  const toggleAll = () => {
    if (allSelected) setSelected({})
    else {
      const next = {}
      products.forEach((p) => { next[p.id] = p })
      setSelected(next)
    }
  }

  const toggleProduct = (product) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[product.id]) delete next[product.id]
      else next[product.id] = product
      return next
    })
  }

  const selectedItems = Object.values(selected)
  const totalCount = selectedItems.length
  const totalPrice = selectedItems.reduce((sum, p) => sum + (p.price || 0), 0)

  const handleSubmit = async () => {
    if (totalCount === 0) { setLocalError("Sélectionnez au moins un produit"); return }
    setLocalError(null)
    setSubmitting(true)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const payload = {
        distributorId,
        serviceId: selectedService.id,
        ...(isCarte && selectedFormule?.id ? { prepaidCardFormulaId: selectedFormule.id } : {}),
        ...(isCarte && selectedBank?.id    ? { bankId: selectedBank.id } : {}),
        selectedSubProductIds: selectedItems.map((p) => p.id),
      }

      await axios.post(DIRECT_DISTRIBUTOR_RESTOCKING_API, payload, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      })

      onConfirmed(
        `${totalCount} produit${totalCount > 1 ? "s" : ""} réapprovisionné${totalCount > 1 ? "s" : ""} avec succès — Total : ${formatMontant(totalPrice)}`,
        category
      )
      onClose()
    } catch (err) {
      setLocalError(err?.response?.data?.description || err.message || "Erreur lors du réapprovisionnement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-1">Réapprovisionner</h2>
        <p className="text-sm text-gray-400 mb-4">
          {isCarte ? "Carte prépayée" : "Abonnement Canal+"}
        </p>

        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={i > currentIndex}
                onClick={() => i < currentIndex && goToStep(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${i === currentIndex
                    ? "bg-[#1EA4DC] text-white"
                    : i < currentIndex
                    ? "bg-blue-50 text-[#1EA4DC] hover:bg-blue-100 cursor-pointer"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
              >
                {s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>

        {step !== "service" && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1EA4DC] mb-4 -mt-1 transition-colors w-fit"
          >
            <ArrowLeft size={14} /> Retour
          </button>
        )}

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {step === "service" && (
          <div className="space-y-3">
            {servicesList.length > 0 ? servicesList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectService(s)}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 hover:border-[#1EA4DC] hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            )) : (
              <p className="text-sm text-gray-400 text-center py-6">
                Aucun service {isCarte ? "carte prépayée" : "Canal+"} assigné à ce distributeur
              </p>
            )}
          </div>
        )}

        {step === "bank" && (
          <div className="space-y-3">
            {banksLoading ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                <Loader2 size={18} className="animate-spin text-[#1EA4DC]" />
                <span className="text-sm">Chargement des banques...</span>
              </div>
            ) : banks.length > 0 ? banks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBank(b)}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 hover:border-[#1EA4DC] hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-800">{b.name}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            )) : (
              <p className="text-sm text-gray-400 text-center py-6">Aucune banque disponible</p>
            )}
          </div>
        )}

        {step === "formule" && (
          <div className="space-y-3">
            {formulesLoading ? (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                <Loader2 size={18} className="animate-spin text-[#1EA4DC]" />
                <span className="text-sm">Chargement des formules...</span>
              </div>
            ) : formules.length > 0 ? formules.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFormule(f)}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 hover:border-[#1EA4DC] hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-800">{f.name}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            )) : (
              <p className="text-sm text-gray-400 text-center py-6">Aucune formule disponible pour ce service</p>
            )}
          </div>
        )}

        {step === "products" && (
          <>
            {isCarte && (
              <p className="text-xs text-gray-400 mb-3">
                {selectedBank?.name} · {selectedFormule?.name}
              </p>
            )}

            {productsLoading && (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                <Loader2 size={18} className="animate-spin text-[#1EA4DC]" />
                <span className="text-sm">Chargement des produits disponibles...</span>
              </div>
            )}

            {!productsLoading && productsError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-3">
                <AlertCircle size={16} className="shrink-0" />
                <span className="flex-1">{productsError}</span>
                <button onClick={fetchProducts} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors">
                  Réessayer
                </button>
              </div>
            )}

            {!productsLoading && !productsError && (
              <>
                {products.length > 0 && (
                  <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 mb-3 cursor-pointer w-fit">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#1EA4DC] w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">Tout sélectionner</span>
                  </label>
                )}

                <div className="space-y-2.5">
                  {products.length > 0 ? products.map((p) => {
                    const checked = !!selected[p.id]
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors
                          ${checked ? "border-[#1EA4DC] bg-blue-50/60" : "border-gray-200 bg-white"}`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(p)}
                            className="accent-[#1EA4DC] w-4 h-4 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                            {p.description && <p className="text-xs text-gray-400 truncate">{p.description}</p>}
                            <p className="text-xs text-gray-400">{formatMontant(p.price)}</p>
                          </div>
                        </label>
                      </div>
                    )
                  }) : (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Aucun produit disponible pour cette sélection
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="sticky bottom-0 bg-white pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">
                  {totalCount} produit{totalCount > 1 ? "s" : ""} sélectionné{totalCount > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gray-800">{formatMontant(totalPrice)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={totalCount === 0 || submitting}
                className="w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#178dbf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Réapprovisionnement..." : "Réapprovisionner"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  MODALE : ASSIGNER / MODIFIER UN TAUX CARTE PRÉPAYÉE
  ✅ MODIFIÉ : accepte désormais une prop `editItem` (l'objet brut de
  l'assignation renvoyé par l'API). Si présent, la modale s'ouvre
  directement sur le formulaire (pas de sélection de grille tarifaire,
  celle-ci n'étant pas modifiable), pré-remplie avec les valeurs
  existantes, et soumet via PATCH sur l'assignation au lieu de POST.
═══════════════════════════════════════════════ */
function AssignCardRateModal({ distributorId, distributeurNom, distributorServices, editItem, onClose, onAssigned }) {
  const isEdit = !!editItem

  const [step, setStep] = useState(isEdit ? "form" : "grid") // "grid" | "form"

  const [tranches,        setTranches]        = useState([])
  const [tranchesLoading, setTranchesLoading] = useState(false)
  const [tranchesError,   setTranchesError]   = useState(null)
  const [selectedTranche, setSelectedTranche] = useState(isEdit ? (editItem.serviceCommissionRate || null) : null)

  const [commissionType,   setCommissionType]   = useState(isEdit ? (editItem.commissionType || "") : "")
  const [tauxDistributeur, setTauxDistributeur] = useState(
    isEdit ? String(Number(editItem.partnerRate || 0) * 100) : ""
  )
  const [tauxPollux,       setTauxPollux]       = useState(
    isEdit ? String(Number(editItem.companyRate || 0) * 100) : ""
  )
  const [submitting,       setSubmitting]       = useState(false)
  const [localError,       setLocalError]       = useState(null)

  const fetchTranches = useCallback(async () => {
    setTranchesLoading(true)
    setTranchesError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const cardService = (distributorServices || [])
        .map((ds) => ds.service)
        .find((s) => s?.category === "PREPAID_CARD" || /carte/i.test(s?.name || ""))

      if (!cardService?.id) {
        throw new Error("Aucun service carte prépayée n'est assigné à ce distributeur")
      }

      const res = await axios.get(CARD_RATE_TRANCHES_API(cardService.id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { isActive: true },
      })

      const list = res.data?.data || []
      setTranches(list)
    } catch (err) {
      setTranchesError(err?.response?.data?.description || err.message || "Impossible de charger la grille tarifaire")
      setTranches([])
    } finally {
      setTranchesLoading(false)
    }
  }, [distributorServices])

  // ✅ En mode édition, la grille tarifaire n'est pas rechargeable/éditable :
  // on garde simplement celle déjà assignée (item.serviceCommissionRate).
  useEffect(() => {
    if (!isEdit) fetchTranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTranches, isEdit])

  const handleSelectTranche = (tranche) => {
    setSelectedTranche(tranche)
    setStep("form")
  }

  const handleBackToGrid = () => {
    if (isEdit) { onClose(); return }
    setStep("grid")
    setLocalError(null)
  }

  const totalTaux = (
    (parseFloat(tauxDistributeur) || 0) + (parseFloat(tauxPollux) || 0)
  ).toFixed(2)

  const handleSubmit = async () => {
    setLocalError(null)
    if (!isEdit && !selectedTranche?.id) { setLocalError("Veuillez sélectionner une grille tarifaire"); return }
    if (!commissionType)   { setLocalError("Le type de commission est requis"); return }
    if (!tauxDistributeur) { setLocalError("Le taux distributeur est requis"); return }
    if (!tauxPollux)       { setLocalError("Le taux pollux est requis"); return }

    try {
      setSubmitting(true)
      const { token, userId: storedUserId } = getAuthData()
      if (!token) throw new Error("Token manquant")

      let assignedBy = storedUserId
      if (!assignedBy) {
        const profile = await fetchProfile()
        assignedBy = profile?.id || profile?.userId || undefined
      }

      if (isEdit) {
        // ✅ MODIFICATION d'une assignation existante
        await axios.patch(
          CARD_RATE_UPDATE_API(editItem.id),
          {
            commissionType,
            partnerRate: Number(tauxDistributeur) / 100,
            companyRate: Number(tauxPollux) / 100,
            ...(assignedBy ? { assignedBy } : {}),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        )
        onAssigned("Taux carte prépayée modifié avec succès")
      } else {
        await axios.post(
          CARD_RATE_ASSIGN_API,
          {
            distributorId,
            serviceCommissionRateId: selectedTranche?.id,
            commissionType,
            partnerRate: Number(tauxDistributeur) / 100,
            companyRate: Number(tauxPollux) / 100,
            ...(assignedBy ? { assignedBy } : {}),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        )
        onAssigned("Taux carte prépayée assigné avec succès")
      }

      onClose()
    } catch (err) {
      setLocalError(err?.response?.data?.description || err.message || "Erreur lors de l'enregistrement du taux")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        {step === "grid" && !isEdit && (
          <>
            <h2 className="text-xl font-semibold mb-5">Sélectionner une grille tarifaire</h2>

            {tranchesLoading && (
              <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                <span className="text-sm">Chargement de la grille tarifaire...</span>
              </div>
            )}

            {!tranchesLoading && tranchesError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                <span className="flex-1">{tranchesError}</span>
                <button
                  onClick={fetchTranches}
                  className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!tranchesLoading && !tranchesError && (
              <div className="space-y-3">
                {tranches.length > 0 ? tranches.map((tranche, index) => (
                  <button
                    key={tranche.id}
                    type="button"
                    onClick={() => handleSelectTranche(tranche)}
                    className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl border text-left transition-colors
                      ${selectedTranche?.id === tranche.id
                        ? "border-[#1EA4DC] bg-blue-50"
                        : "border-gray-100 bg-gray-50 hover:border-[#1EA4DC]/50"
                      }`}
                  >
                    <span className="font-medium text-gray-800">{tranche.name || `Commission ${index + 1}`}</span>
                    <span className="font-semibold text-gray-800">
                      {Number(tranche.minAmount).toLocaleString("fr-FR")} - {Number(tranche.maxAmount).toLocaleString("fr-FR")}F
                    </span>
                  </button>
                )) : (
                  <p className="text-center text-gray-400 py-8">Aucune grille tarifaire disponible</p>
                )}
              </div>
            )}
          </>
        )}

        {step === "form" && (
          <>
            <h2 className="text-xl font-semibold mb-5">
              {isEdit ? "Modifier le taux carte prépayée" : "Assigner un taux carte prépayer"}
            </h2>

            {localError && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span className="flex-1">{localError}</span>
                <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="space-y-4">
              {!isEdit && (
                <div className="bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">Distributeur sélectionner</p>
                  <p className="font-semibold text-gray-800">{distributeurNom}</p>
                </div>
              )}

              {selectedTranche && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">Grille tarifaire {isEdit ? "assignée" : "sélectionnée"}</p>
                  <p className="font-semibold text-gray-800">
                    {selectedTranche.name || "Tranche"}
                    {selectedTranche.minAmount != null && selectedTranche.maxAmount != null
                      ? ` · ${Number(selectedTranche.minAmount).toLocaleString("fr-FR")} - ${Number(selectedTranche.maxAmount).toLocaleString("fr-FR")}F`
                      : ""}
                  </p>
                  {isEdit && (
                    <p className="text-xs text-gray-400 mt-1">La grille tarifaire ne peut pas être modifiée ici.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de commission</label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700"
                >
                  <option value="">Sélectionner le type de commission</option>
                  <option value="PERCENTAGE">Pourcentage</option>
                  <option value="FIXED">Montant fixe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Taux distributeur (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={tauxDistributeur}
                  onChange={(e) => setTauxDistributeur(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Taux pollux (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={tauxPollux}
                  onChange={(e) => setTauxPollux(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Total en commission (%)</label>
                <div className="w-full px-4 py-3 rounded-xl bg-green-100 border border-green-200 text-sm text-gray-800 font-semibold">
                  {totalTaux}%
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleBackToGrid}
                disabled={submitting}
                className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#178dbf] transition-colors disabled:opacity-50"
              >
                {submitting ? "Enregistrement..." : isEdit ? "Modifier" : "Assigner"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  MODALE : ASSIGNER / MODIFIER UN TAUX CANAL+
  ✅ MODIFIÉ : accepte désormais une prop `editItem`. En mode édition, la
  formule n'est pas modifiable (pas de champ formulaId côté API pour la
  mise à jour) : elle est affichée en lecture seule. L'endpoint de mise à
  jour n'acceptant qu'un seul taux (`partnerRate`) associé à un
  `usageType`, on envoie un appel PUT distinct pour chaque champ
  renseigné (nouvelle souscription / renouvellement) afin de conserver le
  même formulaire à deux champs qu'à la création.
═══════════════════════════════════════════════ */
function AssignCanalRateModal({ distributorId, editItem, onClose, onAssigned }) {
  const isEdit = !!editItem

  const [formulas,        setFormulas]        = useState([])
  const [formulasLoading, setFormulasLoading] = useState(false)
  const [formulasError,   setFormulasError]   = useState(null)
  const [selectedFormulaId, setSelectedFormulaId] = useState(
    isEdit ? (editItem.formulaId || editItem.formula?.id || "") : ""
  )

  const [commissionType,      setCommissionType]      = useState(isEdit ? (editItem.commissionType || "FIXED") : "FIXED")
  const [newSubscriptionRate, setNewSubscriptionRate] = useState(
    isEdit
      ? (editItem.commissionType === "PERCENTAGE"
          ? String(Number(editItem.newSubscriptionRate || 0) * 100)
          : String(editItem.newSubscriptionRate ?? ""))
      : ""
  )
  const [renewalRate, setRenewalRate] = useState(
    isEdit
      ? (editItem.commissionType === "PERCENTAGE"
          ? String(Number(editItem.renewalRate || 0) * 100)
          : String(editItem.renewalRate ?? ""))
      : ""
  )
  const [submitting,          setSubmitting]          = useState(false)
  const [localError,          setLocalError]          = useState(null)

  const fetchFormulas = useCallback(async () => {
    setFormulasLoading(true)
    setFormulasError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(FORMULA_CANALS_API, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: 1, limit: 100 },
      })
      const list = res.data?.data || []
      setFormulas(list)
    } catch (err) {
      setFormulasError(err?.response?.data?.description || err.message || "Impossible de charger les formules")
      setFormulas([])
    } finally {
      setFormulasLoading(false)
    }
  }, [])

  // ✅ En mode édition, pas besoin de charger la liste des formules
  // puisqu'elle n'est pas modifiable via cet endpoint.
  useEffect(() => {
    if (!isEdit) fetchFormulas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFormulas, isEdit])

  const uniteTaux = commissionType === "PERCENTAGE" ? "%" : "FCFA"

  const handleSubmit = async () => {
    setLocalError(null)

    if (isEdit) {
      if (!newSubscriptionRate && !renewalRate) {
        setLocalError("Veuillez renseigner au moins un taux (nouvelle souscription ou renouvellement)")
        return
      }

      try {
        setSubmitting(true)
        const { token, userId: storedUserId } = getAuthData()
        if (!token) throw new Error("Token manquant")

        let assignedBy = storedUserId
        if (!assignedBy) {
          const profile = await fetchProfile()
          assignedBy = profile?.id || profile?.userId || undefined
        }

        const toRateValue = (raw) =>
          commissionType === "PERCENTAGE" ? Number(raw) / 100 : Number(raw)

        const calls = []
        if (newSubscriptionRate !== "") {
          calls.push(
            axios.put(
              CANAL_RATE_UPDATE_API(editItem.id),
              {
                commissionType,
                partnerRate: toRateValue(newSubscriptionRate),
                usageType: "NEW_SUBSCRIPTION_ONLY",
                ...(assignedBy ? { assignedBy } : {}),
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              }
            )
          )
        }
        if (renewalRate !== "") {
          calls.push(
            axios.put(
              CANAL_RATE_UPDATE_API(editItem.id),
              {
                commissionType,
                partnerRate: toRateValue(renewalRate),
                usageType: "RENEWAL_ONLY",
                ...(assignedBy ? { assignedBy } : {}),
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
              }
            )
          )
        }

        await Promise.all(calls)

        onAssigned("Taux Canal+ modifié avec succès")
        onClose()
      } catch (err) {
        setLocalError(err?.response?.data?.description || err.message || "Erreur lors de la modification du taux")
      } finally {
        setSubmitting(false)
      }
      return
    }

    // ── Création (comportement existant inchangé) ──
    if (!selectedFormulaId)     { setLocalError("La formule est requise"); return }
    if (!newSubscriptionRate)   { setLocalError("Le taux nouvelle souscription est requis"); return }
    if (!renewalRate)           { setLocalError("Le taux renouvellement est requis"); return }

    try {
      setSubmitting(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const newSubscriptionRateValue =
        commissionType === "PERCENTAGE"
          ? Number(newSubscriptionRate) / 100
          : Number(newSubscriptionRate)
      const renewalRateValue =
        commissionType === "PERCENTAGE"
          ? Number(renewalRate) / 100
          : Number(renewalRate)

      await axios.post(
        CANAL_RATE_ASSIGN_API,
        {
          formulaId: selectedFormulaId,
          commissionType,
          newSubscriptionRate: newSubscriptionRateValue,
          renewalRate: renewalRateValue,
          distributorId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )

      onAssigned("Taux Canal+ assigné avec succès")
      onClose()
    } catch (err) {
      setLocalError(err?.response?.data?.description || err.message || "Erreur lors de l'assignation du taux")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6">
          {isEdit ? "Modifier le taux Canal+" : "Assigner un taux Canal+"}
        </h2>

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">Formule</label>
            {isEdit ? (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="font-medium text-gray-800">
                  {editItem.formula?.name || "-"} {editItem.formula?.code ? `(${editItem.formula.code})` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-1">La formule ne peut pas être modifiée ici.</p>
              </div>
            ) : formulasLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#1EA4DC]" />
                Chargement des formules...
              </div>
            ) : formulasError ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span className="flex-1">{formulasError}</span>
                <button onClick={fetchFormulas} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors">
                  Réessayer
                </button>
              </div>
            ) : (
              <select
                value={selectedFormulaId}
                onChange={(e) => setSelectedFormulaId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700"
              >
                <option value="">Sélectionner la formule</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.code ? `(${f.code})` : ""} — {formatMontant(f.price)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">Type commission</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="radio"
                  name="canalCommissionType"
                  checked={commissionType === "FIXED"}
                  onChange={() => setCommissionType("FIXED")}
                  className="w-5 h-5 accent-[#1EA4DC]"
                />
                Montant fixe
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="radio"
                  name="canalCommissionType"
                  checked={commissionType === "PERCENTAGE"}
                  onChange={() => setCommissionType("PERCENTAGE")}
                  className="w-5 h-5 accent-[#1EA4DC]"
                />
                Taux en %
              </label>
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">
              Taux nouvelle souscription ({uniteTaux})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newSubscriptionRate}
              onChange={(e) => setNewSubscriptionRate(e.target.value)}
              placeholder={commissionType === "PERCENTAGE" ? "Ex: 2 ou 5" : "Ex: 100 ou 500"}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-2">
              Taux renouvellement ({uniteTaux})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={renewalRate}
              onChange={(e) => setRenewalRate(e.target.value)}
              placeholder={commissionType === "PERCENTAGE" ? "Ex: 1 ou 3" : "Ex: 50 ou 300"}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700 placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl font-semibold hover:bg-[#178dbf] transition-colors disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : isEdit ? "Modifier" : "Assigner"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
  COMPOSANT PRINCIPAL
═══════════════════════════════════════════════ */

export default function DetailDistributeur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [activeTab, setActiveTab] = useState("infos")
  const [activeStockTab, setActiveStockTab] = useState("carte")
  const [activeOperationFilter, setActiveOperationFilter] = useState("tous")
  const [activeCommissionTab, setActiveCommissionTab] = useState("tous")
  const [activeCommissionFilter, setActiveCommissionFilter] = useState("tous")

  const [detailModal, setDetailModal] = useState({ open: false, type: null, item: null })
  const openDetailModal = (type, item) => setDetailModal({ open: true, type, item })
  const closeDetailModal = () => setDetailModal({ open: false, type: null, item: null })

  const [cardRateModalOpen, setCardRateModalOpen] = useState(false)
  const [canalRateModalOpen, setCanalRateModalOpen] = useState(false)

  // ✅ AJOUT : item en cours d'édition pour chacune des deux modales de taux
  const [editingCardRate,  setEditingCardRate]  = useState(null)
  const [editingCanalRate, setEditingCanalRate] = useState(null)

  // ✅ AJOUT : confirmation de désactivation (taux carte / taux Canal+)
  const [confirmDisable, setConfirmDisable] = useState({ open: false, type: null, item: null })
  const [disabling,      setDisabling]      = useState(false)

  /* ── Réapprovisionnement / Libération / Assignation parabole (Stock) ── */
  const [restockModal, setRestockModal] = useState({ open: false, category: null }) // "carte" | "decodeur"
  const [releaseModal, setReleaseModal] = useState({ open: false, category: null }) // "carte" | "decodeur" | "parabole"
  const [assignParaboleModal, setAssignParaboleModal] = useState(false)
  const [releasableItems,   setReleasableItems]   = useState([])
  const [releasableLoading, setReleasableLoading] = useState(false)

  /* ── Données réelles du distributeur (API) ── */
  const [distributeur, setDistributeur] = useState(null)
  const [loading,       setLoading]     = useState(false)
  const [error,         setError]       = useState(null)

  const fetchDistributeur = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_DETAIL_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })

      setDistributeur(res.data?.data || null)
    } catch (err) {
      setError(err?.response?.data?.description || err.message || "Impossible de charger le distributeur")
      setDistributeur(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDistributeur()
  }, [fetchDistributeur])

  /* ── Opérations réelles du distributeur ── */
  const [operations,           setOperations]           = useState([])
  const [operationsLoading,    setOperationsLoading]     = useState(false)
  const [operationsError,      setOperationsError]       = useState(null)
  const [operationsPage,       setOperationsPage]        = useState(1)
  const [operationsLimit]                                = useState(20)
  const [operationsTotal,      setOperationsTotal]       = useState(0)
  const [operationsTotalPages, setOperationsTotalPages]  = useState(1)

  const fetchOperations = useCallback(async () => {
    if (!id) return
    setOperationsLoading(true)
    setOperationsError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const params = { page: operationsPage, limit: operationsLimit }
      if (activeOperationFilter !== "tous" && CATEGORIE_TO_OPERATION_TYPE[activeOperationFilter]) {
        params.type = CATEGORIE_TO_OPERATION_TYPE[activeOperationFilter]
      }

      const res = await axios.get(DIST_OPERATIONS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params,
      })

      const payload = res.data
      const list = payload?.data || []
      const meta = payload?.meta || payload?.pagination || {}

      setOperations(list.map(mapOperation))
      setOperationsTotal(meta.total ?? list.length)
      setOperationsTotalPages(meta.totalPages ?? meta.lastPage ?? 1)
    } catch (err) {
      setOperationsError(err?.response?.data?.description || err.message || "Impossible de charger les opérations")
      setOperations([])
    } finally {
      setOperationsLoading(false)
    }
  }, [id, operationsPage, operationsLimit, activeOperationFilter])

  useEffect(() => {
    if (activeTab === "operation") {
      fetchOperations()
    }
  }, [activeTab, fetchOperations])

  useEffect(() => {
    setOperationsPage(1)
  }, [activeOperationFilter])

  /* ── STATISTIQUES DES OPÉRATIONS ── */
  const [operationsStats,        setOperationsStats]        = useState(null)
  const [operationsStatsLoading, setOperationsStatsLoading] = useState(false)
  const [operationsStatsError,   setOperationsStatsError]   = useState(null)

  const fetchOperationsStats = useCallback(async () => {
    if (!id) return
    setOperationsStatsLoading(true)
    setOperationsStatsError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const params = {}
      if (activeOperationFilter !== "tous" && CATEGORIE_TO_OPERATION_TYPE[activeOperationFilter]) {
        params.operationType = CATEGORIE_TO_OPERATION_TYPE[activeOperationFilter]
      }

      const res = await axios.get(DIST_STATISTICS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params,
      })

      const data = res.data?.data || null
      setOperationsStats(data)
    } catch (err) {
      setOperationsStatsError(err?.response?.data?.description || err.message || "Impossible de charger les statistiques")
      setOperationsStats(null)
    } finally {
      setOperationsStatsLoading(false)
    }
  }, [id, activeOperationFilter])

  useEffect(() => {
    if (activeTab === "operation") {
      fetchOperationsStats()
    }
  }, [activeTab, fetchOperationsStats])

  /* ── STOCK : Cartes ── */
  const [cartes,           setCartes]           = useState([])
  const [cartesLoading,    setCartesLoading]    = useState(false)
  const [cartesError,      setCartesError]      = useState(null)
  const [cartesPage,       setCartesPage]       = useState(1)
  const [cartesLimit]                           = useState(20)
  const [cartesTotal,      setCartesTotal]      = useState(0)
  const [cartesTotalPages, setCartesTotalPages] = useState(1)

  const fetchCards = useCallback(async () => {
    if (!id) return
    setCartesLoading(true)
    setCartesError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_CARDS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: cartesPage, limit: cartesLimit },
      })

      const payload = res.data
      const list = payload?.data || []
      const pag = payload?.pagination || payload?.meta || {}

      setCartes(list.map(mapCarte))
      setCartesTotal(pag.total ?? list.length)
      setCartesTotalPages(pag.totalPages ?? 1)
    } catch (err) {
      setCartesError(err?.response?.data?.description || err.message || "Impossible de charger les cartes")
      setCartes([])
    } finally {
      setCartesLoading(false)
    }
  }, [id, cartesPage, cartesLimit])

  useEffect(() => {
    if (activeTab === "stock" && activeStockTab === "carte") {
      fetchCards()
    }
  }, [activeTab, activeStockTab, fetchCards])

  /* ── STOCK : Sous-produits (Décodeurs) + subStats ── */
  const [decodeurs,           setDecodeurs]           = useState([])
  const [decodeursLoading,    setDecodeursLoading]    = useState(false)
  const [decodeursError,      setDecodeursError]      = useState(null)
  const [decodeursPage,       setDecodeursPage]       = useState(1)
  const [decodeursLimit]                              = useState(20)
  const [decodeursTotal,      setDecodeursTotal]      = useState(0)
  const [decodeursTotalPages, setDecodeursTotalPages] = useState(1)
  const [subStats,            setSubStats]            = useState(null)

  const fetchSubProducts = useCallback(async () => {
    if (!id) return
    setDecodeursLoading(true)
    setDecodeursError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_SUBPRODUCTS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { isMerchant: false, page: decodeursPage, limit: decodeursLimit },
      })

      const payload = res.data
      const list = payload?.data || []
      const pag = payload?.pagination || {}

      const decodeurItems = list.filter(
        (sp) => sp.subProduct?.service?.category === "CANAL_PLUS_SUBSCRIPTION"
      )

      setDecodeurs(decodeurItems.map(mapSubProduct))
      setDecodeursTotal(pag.total ?? decodeurItems.length)
      setDecodeursTotalPages(pag.totalPages ?? 1)
      setSubStats(payload?.subStats || null)
    } catch (err) {
      setDecodeursError(err?.response?.data?.description || err.message || "Impossible de charger les décodeurs")
      setDecodeurs([])
    } finally {
      setDecodeursLoading(false)
    }
  }, [id, decodeursPage, decodeursLimit])

  useEffect(() => {
    if (activeTab === "stock") {
      fetchSubProducts()
    }
  }, [activeTab, fetchSubProducts])

  /* ── STOCK : Paraboles ── */
  const [paraboles,           setParaboles]           = useState([])
  const [parabolesLoading,    setParabolesLoading]    = useState(false)
  const [parabolesError,      setParabolesError]      = useState(null)
  const [parabolesPage,       setParabolesPage]       = useState(1)
  const [parabolesLimit]                              = useState(20)
  const [parabolesTotal,      setParabolesTotal]      = useState(0)
  const [parabolesTotalPages, setParabolesTotalPages] = useState(1)

  const fetchParabolas = useCallback(async () => {
    if (!id) return
    setParabolesLoading(true)
    setParabolesError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_PARABOLAS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { isMerchant: false, page: parabolesPage, limit: parabolesLimit },
      })

      const payload = res.data
      const list = payload?.data || []
      const pag = payload?.pagination || {}

      setParaboles(list.map(mapParabola))
      setParabolesTotal(pag.total ?? list.length)
      setParabolesTotalPages(pag.totalPages ?? 1)
    } catch (err) {
      setParabolesError(err?.response?.data?.description || err.message || "Impossible de charger les paraboles")
      setParaboles([])
    } finally {
      setParabolesLoading(false)
    }
  }, [id, parabolesPage, parabolesLimit])

  useEffect(() => {
    if (activeTab === "stock" && activeStockTab === "paraboles") {
      fetchParabolas()
    }
  }, [activeTab, activeStockTab, fetchParabolas])

  /* ── SUPPRESSION D'UN ÉLÉMENT DE STOCK ── */
  const handleDeleteStockItem = useCallback(async (type, item) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cet élément du stock ? Cette action est irréversible."
    )
    if (!confirmed) return

    try {
      if (type === "carte") {
        setCartes((prev) => prev.filter((c) => c.id !== item.id))
      } else if (type === "decodeur") {
        setDecodeurs((prev) => prev.filter((d) => d.id !== item.id))
      } else if (type === "parabole") {
        setParaboles((prev) => prev.filter((p) => p.id !== item.id))
      }
    } catch (err) {
      window.alert(err?.response?.data?.description || err.message || "Impossible de supprimer cet élément")
    }
  }, [])

  /* ── COMMISSION : Historique ── */
  const [commissions,           setCommissions]           = useState([])
  const [commissionsLoading,    setCommissionsLoading]    = useState(false)
  const [commissionsError,      setCommissionsError]      = useState(null)
  const [commissionsPage,       setCommissionsPage]       = useState(1)
  const [commissionsLimit]                                = useState(20)
  const [commissionsTotal,      setCommissionsTotal]      = useState(0)
  const [commissionsTotalPages, setCommissionsTotalPages] = useState(1)

  const fetchCommissions = useCallback(async () => {
    if (!id) return
    setCommissionsLoading(true)
    setCommissionsError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_COMMISSIONS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: commissionsPage, limit: commissionsLimit },
      })

      const payload = res.data
      const list = payload?.data || []
      const meta = payload?.meta || payload?.pagination || {}

      setCommissions(list.map(mapCommission))
      setCommissionsTotal(meta.total ?? list.length)
      setCommissionsTotalPages(meta.totalPages ?? meta.lastPage ?? 1)
    } catch (err) {
      setCommissionsError(err?.response?.data?.description || err.message || "Impossible de charger les commissions")
      setCommissions([])
    } finally {
      setCommissionsLoading(false)
    }
  }, [id, commissionsPage, commissionsLimit])

  useEffect(() => {
    if (activeTab === "commission") {
      fetchCommissions()
    }
  }, [activeTab, fetchCommissions])

  useEffect(() => {
    setCommissionsPage(1)
  }, [activeCommissionTab, activeCommissionFilter])

  /* ── TAUX CANAL+ ── */
  const [tauxCanal,           setTauxCanal]           = useState([])
  const [tauxCanalLoading,    setTauxCanalLoading]    = useState(false)
  const [tauxCanalError,      setTauxCanalError]      = useState(null)
  const [tauxCanalPage,       setTauxCanalPage]       = useState(1)
  const [tauxCanalLimit]                              = useState(20)
  const [tauxCanalTotal,      setTauxCanalTotal]      = useState(0)
  const [tauxCanalTotalPages, setTauxCanalTotalPages] = useState(1)

  const fetchTauxCanal = useCallback(async () => {
    if (!id) return
    setTauxCanalLoading(true)
    setTauxCanalError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_CANAL_RATES_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: tauxCanalPage, limit: tauxCanalLimit },
      })
      console.log("fetchTauxCanal res:", res)
      const payload = res.data
      const list = payload?.data || []
      const pag = payload?.pagination || payload?.meta || {}

      setTauxCanal(list.map(mapCanalRateAssignment))
      setTauxCanalTotal(pag.total ?? list.length)
      setTauxCanalTotalPages(pag.totalPages ?? 1)
    } catch (err) {
      setTauxCanalError(err?.response?.data?.description || err.message || "Impossible de charger les taux Canal+")
      setTauxCanal([])
    } finally {
      setTauxCanalLoading(false)
    }
  }, [id, tauxCanalPage, tauxCanalLimit])

  useEffect(() => {
    if (activeTab === "infos") {
      fetchTauxCanal()
    }
  }, [activeTab, fetchTauxCanal])

  /* ── TAUX CARTE PRÉPAYÉE ── */
  const [tauxCarte,           setTauxCarte]           = useState([])
  const [tauxCarteLoading,    setTauxCarteLoading]    = useState(false)
  const [tauxCarteError,      setTauxCarteError]      = useState(null)
  const [tauxCartePage,       setTauxCartePage]       = useState(1)
  const [tauxCarteLimit]                              = useState(20)
  const [tauxCarteTotal,      setTauxCarteTotal]      = useState(0)
  const [tauxCarteTotalPages, setTauxCarteTotalPages] = useState(1)

  const fetchTauxCarte = useCallback(async () => {
    if (!id) return
    setTauxCarteLoading(true)
    setTauxCarteError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const res = await axios.get(DIST_CARD_RATES_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: tauxCartePage, limit: tauxCarteLimit },
      })
       console.log("fetchTauxCarte res:", res)
      const payload = res.data
      const list = payload?.data || []
      const pag = payload?.pagination || payload?.meta || {}

      setTauxCarte(list.map(mapCardRateAssignment))
      setTauxCarteTotal(pag.total ?? list.length)
      setTauxCarteTotalPages(pag.totalPages ?? 1)
    } catch (err) {
      setTauxCarteError(err?.response?.data?.description || err.message || "Impossible de charger les taux carte prépayée")
      setTauxCarte([])
    } finally {
      setTauxCarteLoading(false)
    }
  }, [id, tauxCartePage, tauxCarteLimit])

  useEffect(() => {
    if (activeTab === "infos") {
      fetchTauxCarte()
    }
  }, [activeTab, fetchTauxCarte])

  const handleCardRateAssigned = useCallback((message) => {
    showSuccess(message)
    fetchTauxCarte()
  }, [showSuccess, fetchTauxCarte])

  const handleCanalRateAssigned = useCallback((message) => {
    showSuccess(message)
    fetchTauxCanal()
  }, [showSuccess, fetchTauxCanal])

  // ✅ AJOUT : ouverture / fermeture des modales taux en mode création ou édition
  const openCreateCardRate = () => { setEditingCardRate(null); setCardRateModalOpen(true) }
  const openEditCardRate   = (rawItem) => { setEditingCardRate(rawItem); setCardRateModalOpen(true) }
  const closeCardRateModal = () => { setCardRateModalOpen(false); setEditingCardRate(null) }

  const openCreateCanalRate = () => { setEditingCanalRate(null); setCanalRateModalOpen(true) }
  const openEditCanalRate   = (rawItem) => { setEditingCanalRate(rawItem); setCanalRateModalOpen(true) }
  const closeCanalRateModal = () => { setCanalRateModalOpen(false); setEditingCanalRate(null) }

  // ✅ AJOUT : confirmation puis désactivation d'un taux (carte ou Canal+)
  const openDisableConfirm = (type, rawItem) => setConfirmDisable({ open: true, type, item: rawItem })
  const closeDisableConfirm = () => setConfirmDisable({ open: false, type: null, item: null })

  const handleConfirmDisable = useCallback(async () => {
    const { type, item } = confirmDisable
    if (!item?.id) return
    setDisabling(true)
    try {
      const { token, userId: storedUserId } = getAuthData()
      if (!token) throw new Error("Token manquant")

      let unassignedBy = storedUserId
      if (!unassignedBy) {
        const profile = await fetchProfile()
        unassignedBy = profile?.id || profile?.userId || undefined
      }

      const url = type === "carte" ? CARD_RATE_UPDATE_API(item.id) : CANAL_RATE_UPDATE_API(item.id)

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        data: { unassignedBy },
      })

      showSuccess(type === "carte" ? "Taux carte prépayée désactivé avec succès" : "Taux Canal+ désactivé avec succès")
      closeDisableConfirm()

      if (type === "carte") fetchTauxCarte()
      else fetchTauxCanal()
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de désactiver ce taux")
    } finally {
      setDisabling(false)
    }
  }, [confirmDisable, showSuccess, showError, fetchTauxCarte, fetchTauxCanal])

  /* ── Handlers Réapprovisionnement / Libération / Assignation parabole ── */

  const handleRestockConfirmed = useCallback((message, category) => {
    showSuccess(message)
    if (category === "carte") { fetchSubProducts(); fetchCards() }
    else fetchSubProducts()
  }, [showSuccess, fetchSubProducts, fetchCards])

  const fetchReleasableStock = useCallback(async (categoryFilter) => {
    if (!id) return
    setReleasableLoading(true)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const res = await axios.get(DIST_SUBPRODUCTS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { isMerchant: false, page: 1, limit: 200 },
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      const filtered = list
        .filter((sp) => sp.isActive !== false)
        .filter((sp) => {
          const cat = sp.subProduct?.service?.category
          return categoryFilter === "CANAL_PLUS_SUBSCRIPTION"
            ? cat === "CANAL_PLUS_SUBSCRIPTION"
            : cat !== "CANAL_PLUS_SUBSCRIPTION"
        })
      setReleasableItems(filtered.map(normalizeReleasableSubProduct))
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de charger le stock à libérer")
      setReleasableItems([])
    } finally {
      setReleasableLoading(false)
    }
  }, [id, showError])

  const fetchReleasableParaboles = useCallback(async () => {
    if (!id) return
    setReleasableLoading(true)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const res = await axios.get(DIST_PARABOLAS_API(id), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { isMerchant: false, page: 1, limit: 200 },
      })
      const list = Array.isArray(res.data?.data) ? res.data.data : []
      setReleasableItems(list.filter((p) => p.isActive !== false).map(normalizeReleasableParabola))
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de charger les paraboles à libérer")
      setReleasableItems([])
    } finally {
      setReleasableLoading(false)
    }
  }, [id, showError])

  const handleOpenRelease = (category) => {
    setReleaseModal({ open: true, category })
    if (category === "parabole") fetchReleasableParaboles()
    else fetchReleasableStock(category === "carte" ? "PREPAID_CARD" : "CANAL_PLUS_SUBSCRIPTION")
  }

  const handleConfirmRelease = useCallback(async ({ selectedItems, observation }) => {
    const category = releaseModal.category
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      if (category === "parabole") {
        const parabolaIds = selectedItems.map((it) => it.parabolaId)
        await axios.post(
          RELEASE_DIST_PARABOLAS_API,
          { parabolaIds, distributorId: id },
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" } }
        )
      } else {
        const subProductIds = selectedItems.map((it) => it.subProductId)
        await axios.post(
          RELEASE_DIST_SUBPRODUCTS_API,
          {
            distributorId: id,
            ...(observation?.trim() ? { reason: observation.trim() } : {}),
            subProductIds,
          },
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" } }
        )
      }

      showSuccess(`${selectedItems.length} élément${selectedItems.length > 1 ? "s" : ""} libéré${selectedItems.length > 1 ? "s" : ""} avec succès`)
      setReleaseModal({ open: false, category: null })
      setReleasableItems([])

      if (category === "parabole") fetchParabolas()
      else { fetchSubProducts(); if (category === "carte") fetchCards() }
    } catch (err) {
      const message = err?.response?.data?.description || err.message || "Impossible de libérer le stock"
      showError(message)
      throw new Error(message)
    }
  }, [releaseModal, id, showSuccess, showError, fetchParabolas, fetchSubProducts, fetchCards])

  const handleConfirmAssignParabole = useCallback(async ({ selectedItems }) => {
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      await axios.post(
        PARABOLA_ASSIGN_DISTRIBUTOR_API,
        { parabolaIds: selectedItems.map((it) => it.id), distributorId: id },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" } }
      )
      showSuccess(`${selectedItems.length} parabole${selectedItems.length > 1 ? "s" : ""} assignée${selectedItems.length > 1 ? "s" : ""} avec succès`)
      setAssignParaboleModal(false)
      fetchParabolas()
    } catch (err) {
      const message = err?.response?.data?.description || err.message || "Impossible d'assigner la/les parabole(s)"
      showError(message)
      throw new Error(message)
    } 
  }, [id, showSuccess, showError, fetchParabolas])

  const carteStats = getServiceStockStats(subStats, "Carte prépayée")
  const decodeurStats = getServiceStockStats(subStats, "Abonnement canal+")

  const paraboleStats = {
    total: parabolesTotal,
    disponible: paraboles.filter((p) => p.stock > 0).length,
    activees: paraboles.filter((p) => p.stock === 0).length,
  }

  const nomComplet = `${distributeur?.user?.firstName || ""} ${distributeur?.user?.lastName || ""}`.trim() || "-"

  const infos = {
    businessName:          distributeur?.businessName || "-",
    nom:                   nomComplet,
    email:                 distributeur?.user?.email || "-",
    telephone:             distributeur?.user?.phone || "-",
    numeroEnregistrement:  distributeur?.registrationNumber || "-",
    adresse:               distributeur?.address || "-",
    ville:                 distributeur?.city || "-",
    pays:                  distributeur?.country || "-",
    dateReception:         formatDate(distributeur?.createdAt),
    membreDes:             formatDate(distributeur?.createdAt),
    rccm:                  distributeur?.rccm || null,
    ifu:                   distributeur?.ifu || null,
    isActive:              !!distributeur?.isActive,
  }

  const wallet = distributeur?.wallet || {}
  const portefeuille = {
    solde:        formatMontant(wallet.balance),
    totalGagne:   formatMontant(wallet.totalEarned),
    bloque:       formatMontant(wallet.blockedCommission),
    totalDepense: formatMontant(wallet.totalSpent),
  }

  const servicesAssignes = (distributeur?.distributorServices || []).map((ds) => ({
    id: ds.id,
    service: ds.service?.name || "-",
    description: ds.service?.description || ds.service?.code || "-",
    statut: ds.status === "ACTIVE" ? "Actif" : "Inactif",
  }))

  const restockServicesCarte = (distributeur?.distributorServices || [])
    .filter((ds) => ds.status === "ACTIVE")
    .map(normalizeCompanyService)
    .filter((s) => /PREPAID|CARD/i.test(s.category || ""))

  const restockServicesCanal = (distributeur?.distributorServices || [])
    .filter((ds) => ds.status === "ACTIVE")
    .map(normalizeCompanyService)
    .filter((s) => /CANAL/i.test(s.category || ""))

  const tabs = [
    { key: "infos", label: "Infos" },
    { key: "stock", label: "Stock" },
    { key: "operation", label: "Operation" },
    { key: "commission", label: "Commission" },
  ]

  const operationFilters = [
    { key: "tous", label: "Tous" },
    { key: "reapprovisionnement", label: "Réapprovisionnement" },
    { key: "activation-carte", label: "Activation Carte" },
    { key: "recharge-carte", label: "Recharge Carte" },
    { key: "nouvel-abonnement-canal", label: "Nouvel Abonnement Canal" },
    { key: "renouvellement-canal", label: "Renouvellement Canal+" },
    { key: "changement-formule-canal", label: "Changement de formule Canal+" },
    { key: "reactivation-canal", label: "Réactivation Canal+" },
    { key: "depot-wallet", label: "Dépôt Wallet" },
    { key: "retrait-commission", label: "Retrait Commission" },
    { key: "ajustement-manuel", label: "Ajustement Manuel" },
  ]

  const operationsFiltrees =
    activeOperationFilter === "tous"
      ? operations
      : operations.filter((op) => op.categorie === activeOperationFilter)

  const operationsStatsAmountDisplay =
    operationsStats?.totalAmount != null
      ? formatMontant(operationsStats.totalAmount)
      : operationsStatsLoading
      ? "…"
      : formatMontant(0)

  const operationsStatsCountDisplay =
    operationsStats?.totalOperations != null
      ? operationsStats.totalOperations
      : operationsStatsLoading
      ? "…"
      : 0

  const operationsWalletBalanceDisplay =
    operationsStats?.wallet?.balance != null ? formatMontant(operationsStats.wallet.balance) : portefeuille.solde

  const commissionTabs = [
    { key: "tous", label: "Tous" },
    { key: "activation-carte", label: "Activation carte" },
    { key: "recharge-carte", label: "Recharge carte" },
    { key: "nouvel-abonnement-canal", label: "Nouvel abonnement canal" },
    { key: "renouvellement-canal", label: "Renouvellement canal" },
  ]

  const commissionFilters = [
    { key: "tous", label: "Tous" },
    { key: "gagne", label: "Gagné" },
    { key: "bloque", label: "Bloqué" },
    { key: "disponible", label: "Disponible" },
    { key: "retire", label: "Retiré" },
  ]

  const commissionsFiltrees = commissions.filter((c) => {
    const categorieOk = activeCommissionTab === "tous" || c.categorie === activeCommissionTab
    const statutLabel = commissionFilters.find((f) => f.key === activeCommissionFilter)?.label
    const statutOk = activeCommissionFilter === "tous" || c.statut === statutLabel
    return categorieOk && statutOk
  })

  if (loading) {
    return (
      <div className="p-4 sm:p-8 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#1EA4DC]" />
          <span className="text-sm">Chargement du distributeur...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 min-h-screen space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchDistributeur}
            className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Détail du distributeur</h1>
          <p className="text-gray-500">
            {infos.nom !== "-" ? infos.nom : ""}
            {infos.nom !== "-" && infos.businessName !== "-" ? " / " : ""}
            {infos.businessName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Badge green={infos.isActive} orange={!infos.isActive}>
            {infos.isActive ? "Actif" : "Inactif"}
          </Badge>

          <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 sm:px-5 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-[#1EA4DC] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "infos" && (
        <>
          <div>
            <h2 className="text-lg font-medium mb-5">Portefeuille</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <StatCard title="Solde" value={portefeuille.solde} />
              <StatCard title="Total Gagné" value={portefeuille.totalGagne} />
              <StatCard title="Bloqué" value={portefeuille.bloque} />
              <StatCard title="Total Dépensé" value={portefeuille.totalDepense} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#1EA4DC] text-white px-5 py-3 font-medium">
                Information Générales
              </div>
              <div className="p-6">
                <InfoRow label="Nom commercial" value={infos.businessName} />
                <InfoRow label="Nom distributeur" value={infos.nom} />
                <InfoRow label="Email" value={infos.email} />
                <InfoRow label="Téléphone" value={infos.telephone} />
                <InfoRow label="N° d'enregistrement" value={infos.numeroEnregistrement} />
                <InfoRow label="Adresse" value={infos.adresse} />
                <InfoRow label="Ville" value={infos.ville} />
                <InfoRow label="Pays" value={infos.pays} />
                <InfoRow label="Date de réception" value={infos.dateReception} />
                <InfoRow label="Membre dès" value={infos.membreDes} />
                <InfoRow
                  label="Ifu"
                  value={
                    infos.ifu ? (
                      <a href={infos.ifu} target="_blank" rel="noopener noreferrer" className="text-[#1EA4DC] cursor-pointer hover:underline">
                        voir document
                      </a>
                    ) : "-"
                  }
                />
                <InfoRow
                  label="Rccm"
                  value={
                    infos.rccm ? (
                      <a href={infos.rccm} target="_blank" rel="noopener noreferrer" className="text-[#1EA4DC] cursor-pointer hover:underline">
                        voir document
                      </a>
                    ) : "-"
                  }
                />
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-lg font-medium">Liste taux carte prépayée</h3>
                <button
                  onClick={openCreateCardRate}
                  className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-[#178dbf] transition-colors"
                >
                  <Plus size={16} />
                  Assigner taux carte
                </button>
              </div>

              {tauxCarteLoading && (
                <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                  <span className="text-sm">Chargement des taux carte prépayée...</span>
                </div>
              )}

              {!tauxCarteLoading && tauxCarteError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="flex-1">{tauxCarteError}</span>
                  <button onClick={fetchTauxCarte} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors">
                    Réessayer
                  </button>
                </div>
              )}

              {!tauxCarteLoading && !tauxCarteError && (
                <>
                  <div className="rounded-xl border border-gray-100 overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-[#1EA4DC] text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">N°</th>
                          <th className="px-4 py-3 text-left">Produits</th>
                          <th className="px-4 py-3 text-left">Taux distributeur (%)</th>
                          <th className="px-4 py-3 text-left">Taux polluX (%)</th>
                          <th className="px-4 py-3 text-left">Total taux (%)</th>
                          <th className="px-4 py-3 text-left">Statut</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tauxCarte.length > 0 ? tauxCarte.map((item, index) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4">{(tauxCartePage - 1) * tauxCarteLimit + index + 1}</td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium">{item.service}</p>
                                <p className="text-xs text-gray-500">{item.description}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">{item.tauxDistributeur}</td>
                            <td className="px-4 py-4">{item.tauxPolluX}</td>
                            <td className="px-4 py-4">
                              <Badge blue>{item.totalTaux}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge green={item.statut === "Actif"} orange={item.statut !== "Actif"}>{item.statut}</Badge>
                            </td>
                            {/* ✅ MODIFIÉ : icônes Modifier / Désactiver avec texte */}
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-4">
                                <button
                                  onClick={() => openEditCardRate(item.raw)}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-[#1EA4DC] transition-colors text-xs font-medium"
                                >
                                  <Pencil size={15} />
                                  Modifier
                                </button>
                                <button
                                  onClick={() => openDisableConfirm("carte", item.raw)}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors text-xs font-medium"
                                >
                                  <PowerOff size={15} />
                                  Désactiver
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="text-center py-8 text-gray-400">Aucun taux carte prépayée trouvé</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                    <span>
                      Affichage de {tauxCarte.length === 0 ? 0 : (tauxCartePage - 1) * tauxCarteLimit + 1} à{" "}
                      {(tauxCartePage - 1) * tauxCarteLimit + tauxCarte.length} sur {tauxCarteTotal} entrées
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>Lignes par page : {tauxCarteLimit}</span>
                      <button onClick={() => setTauxCartePage(1)} disabled={tauxCartePage <= 1} className="disabled:opacity-30">
                        <ChevronsLeft size={18} />
                      </button>
                      <button onClick={() => setTauxCartePage((p) => Math.max(1, p - 1))} disabled={tauxCartePage <= 1} className="disabled:opacity-30">
                        <ChevronLeft size={18} />
                      </button>
                      <span>Page {tauxCartePage} sur {tauxCarteTotalPages}</span>
                      <button onClick={() => setTauxCartePage((p) => Math.min(tauxCarteTotalPages, p + 1))} disabled={tauxCartePage >= tauxCarteTotalPages} className="disabled:opacity-30">
                        <ChevronRight size={18} />
                      </button>
                      <button onClick={() => setTauxCartePage(tauxCarteTotalPages)} disabled={tauxCartePage >= tauxCarteTotalPages} className="disabled:opacity-30">
                        <ChevronsRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-16 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-lg font-medium">Liste taux Abonnement canal+</h3>
                <button
                  onClick={openCreateCanalRate}
                  className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-[#178dbf] transition-colors"
                >
                  <Plus size={16} />
                  Assigner taux canal
                </button>
              </div>

              {tauxCanalLoading && (
                <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                  <span className="text-sm">Chargement des taux Canal+...</span>
                </div>
              )}

              {!tauxCanalLoading && tauxCanalError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="flex-1">{tauxCanalError}</span>
                  <button onClick={fetchTauxCanal} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors">
                    Réessayer
                  </button>
                </div>
              )}

              {!tauxCanalLoading && !tauxCanalError && (
                <>
                  <div className="rounded-xl border border-gray-100 overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-[#1EA4DC] text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">N°</th>
                          <th className="px-4 py-3 text-left">Formule</th>
                          <th className="px-4 py-3 text-left">Nouvel abonnement</th>
                          <th className="px-4 py-3 text-left">Renouvellement</th>
                          <th className="px-4 py-3 text-left">Prix formule</th>
                          <th className="px-4 py-3 text-left">Statut</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tauxCanal.length > 0 ? tauxCanal.map((item, index) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4">{(tauxCanalPage - 1) * tauxCanalLimit + index + 1}</td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium">{item.formule}</p>
                                <p className="text-xs text-gray-500">{item.code}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm">{item.nouvelAbonnement}</td>
                            <td className="px-4 py-4 text-sm">{item.renouvellement}</td>
                            <td className="px-4 py-4">
                              <Badge blue>{item.prixFormule}</Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge green={item.statut === "Actif"} orange={item.statut !== "Actif"}>{item.statut}</Badge>
                            </td>
                            {/* ✅ MODIFIÉ : icônes Modifier / Désactiver avec texte */}
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-4">
                                <button
                                  onClick={() => openEditCanalRate(item.raw)}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-[#1EA4DC] transition-colors text-xs font-medium"
                                >
                                  <Pencil size={15} />
                                  Modifier
                                </button>
                                <button
                                  onClick={() => openDisableConfirm("canal", item.raw)}
                                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors text-xs font-medium"
                                >
                                  <PowerOff size={15} />
                                  Désactiver
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="text-center py-8 text-gray-400">Aucun taux Canal+ trouvé</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                    <span>
                      Affichage de {tauxCanal.length === 0 ? 0 : (tauxCanalPage - 1) * tauxCanalLimit + 1} à{" "}
                      {(tauxCanalPage - 1) * tauxCanalLimit + tauxCanal.length} sur {tauxCanalTotal} entrées
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>Lignes par page : {tauxCanalLimit}</span>
                      <button onClick={() => setTauxCanalPage(1)} disabled={tauxCanalPage <= 1} className="disabled:opacity-30">
                        <ChevronsLeft size={18} />
                      </button>
                      <button onClick={() => setTauxCanalPage((p) => Math.max(1, p - 1))} disabled={tauxCanalPage <= 1} className="disabled:opacity-30">
                        <ChevronLeft size={18} />
                      </button>
                      <span>Page {tauxCanalPage} sur {tauxCanalTotalPages}</span>
                      <button onClick={() => setTauxCanalPage((p) => Math.min(tauxCanalTotalPages, p + 1))} disabled={tauxCanalPage >= tauxCanalTotalPages} className="disabled:opacity-30">
                        <ChevronRight size={18} />
                      </button>
                      <button onClick={() => setTauxCanalPage(tauxCanalTotalPages)} disabled={tauxCanalPage >= tauxCanalTotalPages} className="disabled:opacity-30">
                        <ChevronsRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-16 space-y-4">
              <h3 className="text-lg font-medium">Services Assignés</h3>
              <div className="rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[#1EA4DC] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">N°</th>
                      <th className="px-4 py-3 text-left">Produits</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesAssignes.length > 0 ? servicesAssignes.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium">{item.service}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge green={item.statut === "Actif"} orange={item.statut !== "Actif"}>{item.statut}</Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="text-center py-8 text-gray-400">Aucun service assigné</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                <span>Affichage de {servicesAssignes.length === 0 ? 0 : 1} à {servicesAssignes.length} sur {servicesAssignes.length} entrées</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span>Lignes par page :</span>
                  <select className="border rounded px-2 py-1">
                    <option>10</option>
                  </select>
                  <button>
                    <ChevronsLeft size={18} />
                  </button>
                  <button>
                    <ChevronLeft size={18} />
                  </button>
                  <span>Page 1 sur 1</span>
                  <button>
                    <ChevronRight size={18} />
                  </button>
                  <button>
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "stock" && (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[
                { key: "carte", label: "Carte" },
                { key: "decodeurs", label: "Décodeurs Canal" },
                { key: "paraboles", label: "Paraboles" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveStockTab(tab.key)}
                  className={`px-5 py-2 rounded-xl text-sm transition-colors ${
                    activeStockTab === tab.key
                      ? "bg-[#1EA4DC] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeStockTab === "carte" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <StatCard title="Total carte" value={carteStats.total} />
                  <StatCard title="Carte disponible" value={carteStats.disponible} />
                  <StatCard title="Carte activées" value={carteStats.activees} />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-lg font-medium">Liste des cartes disponible</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setRestockModal({ open: true, category: "carte" })}
                      className="bg-[#1EA4DC] hover:bg-[#178dbf] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Package size={16} />
                      Réapprovisionner
                    </button>
                    <button
                      onClick={() => handleOpenRelease("carte")}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Minus size={16} />
                      Libérer le stock
                    </button>
                  </div>
                </div>

                {cartesLoading && (
                  <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                    <span className="text-sm">Chargement des cartes...</span>
                  </div>
                )}

                {!cartesLoading && cartesError && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="flex-1">{cartesError}</span>
                    <button onClick={fetchCards} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors">
                      Réessayer
                    </button>
                  </div>
                )}

                {!cartesLoading && !cartesError && (
                  <>
                    <div className="rounded-xl border border-gray-100 overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead className="bg-[#1EA4DC] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">N°</th>
                            <th className="px-4 py-3 text-left">Produits</th>
                            <th className="px-4 py-3 text-left">Montant</th>
                            <th className="px-4 py-3 text-left">Statut</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartes.length > 0 ? cartes.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-4">{(cartesPage - 1) * cartesLimit + index + 1}</td>
                              <td className="px-4 py-4">
                                <div>
                                  <p className="text-sm font-medium">{item.produit}</p>
                                  <p className="text-xs text-gray-500">{item.code} · {item.holder}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge blue>{item.montant}</Badge>
                              </td>
                              <td className="px-4 py-4">
                                {item.statutVariant === "green" ? (
                                  <Badge green>{item.statut}</Badge>
                                ) : item.statutVariant === "red" ? (
                                  <Badge>{item.statut}</Badge>
                                ) : (
                                  <Badge orange>{item.statut}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => openDetailModal("carte", item.raw)}
                                    title="Détail"
                                    className="text-gray-400 hover:text-[#1EA4DC] transition-colors"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStockItem("carte", item)}
                                    title="Supprimer"
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-gray-400">Aucune carte trouvée</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                      <span>
                        Affichage de {cartes.length === 0 ? 0 : (cartesPage - 1) * cartesLimit + 1} à{" "}
                        {(cartesPage - 1) * cartesLimit + cartes.length} sur {cartesTotal} entrées
                      </span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>Lignes par page : {cartesLimit}</span>
                        <button onClick={() => setCartesPage(1)} disabled={cartesPage <= 1} className="disabled:opacity-30">
                          <ChevronsLeft size={18} />
                        </button>
                        <button onClick={() => setCartesPage((p) => Math.max(1, p - 1))} disabled={cartesPage <= 1} className="disabled:opacity-30">
                          <ChevronLeft size={18} />
                        </button>
                        <span>Page {cartesPage} sur {cartesTotalPages}</span>
                        <button onClick={() => setCartesPage((p) => Math.min(cartesTotalPages, p + 1))} disabled={cartesPage >= cartesTotalPages} className="disabled:opacity-30">
                          <ChevronRight size={18} />
                        </button>
                        <button onClick={() => setCartesPage(cartesTotalPages)} disabled={cartesPage >= cartesTotalPages} className="disabled:opacity-30">
                          <ChevronsRight size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeStockTab === "decodeurs" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <StatCard title="Total décodeur canal" value={decodeurStats.total} />
                  <StatCard title="Décodeur canal disponible" value={decodeurStats.disponible} />
                  <StatCard title="Décodeur canal activés" value={decodeurStats.activees} />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-lg font-medium">Liste des décodeurs canal disponible</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setRestockModal({ open: true, category: "decodeur" })}
                      className="bg-[#1EA4DC] hover:bg-[#178dbf] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Package size={16} />
                      Réapprovisionner
                    </button>
                    <button
                      onClick={() => handleOpenRelease("decodeur")}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Minus size={16} />
                      Libérer le stock
                    </button>
                  </div>
                </div>

                {decodeursLoading && (
                  <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                    <span className="text-sm">Chargement des décodeurs...</span>
                  </div>
                )}

                {!decodeursLoading && decodeursError && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="flex-1">{decodeursError}</span>
                    <button onClick={fetchSubProducts} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors">
                      Réessayer
                    </button>
                  </div>
                )}

                {!decodeursLoading && !decodeursError && (
                  <>
                    <div className="rounded-xl border border-gray-100 overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead className="bg-[#1EA4DC] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">N°</th>
                            <th className="px-4 py-3 text-left">Produits</th>
                            <th className="px-4 py-3 text-left">Montant</th>
                            <th className="px-4 py-3 text-left">Statut</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decodeurs.length > 0 ? decodeurs.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-4">{(decodeursPage - 1) * decodeursLimit + index + 1}</td>
                              <td className="px-4 py-4">
                                <div>
                                  <p className="text-sm font-medium">{item.service}</p>
                                  <p className="text-xs text-gray-500">{item.code} · stock: {item.stock}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge blue>{item.montant}</Badge>
                              </td>
                              <td className="px-4 py-4">
                                {item.statutVariant === "green" ? (
                                  <Badge green>{item.statut}</Badge>
                                ) : (
                                  <Badge orange>{item.statut}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => openDetailModal("decodeur", item.raw)}
                                    title="Détail"
                                    className="text-gray-400 hover:text-[#1EA4DC] transition-colors"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStockItem("decodeur", item)}
                                    title="Supprimer"
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-gray-400">Aucun décodeur trouvé</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                      <span>
                        Affichage de {decodeurs.length === 0 ? 0 : (decodeursPage - 1) * decodeursLimit + 1} à{" "}
                        {(decodeursPage - 1) * decodeursLimit + decodeurs.length} sur {decodeursTotal} entrées
                      </span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>Lignes par page : {decodeursLimit}</span>
                        <button onClick={() => setDecodeursPage(1)} disabled={decodeursPage <= 1} className="disabled:opacity-30">
                          <ChevronsLeft size={18} />
                        </button>
                        <button onClick={() => setDecodeursPage((p) => Math.max(1, p - 1))} disabled={decodeursPage <= 1} className="disabled:opacity-30">
                          <ChevronLeft size={18} />
                        </button>
                        <span>Page {decodeursPage} sur {decodeursTotalPages}</span>
                        <button onClick={() => setDecodeursPage((p) => Math.min(decodeursTotalPages, p + 1))} disabled={decodeursPage >= decodeursTotalPages} className="disabled:opacity-30">
                          <ChevronRight size={18} />
                        </button>
                        <button onClick={() => setDecodeursPage(decodeursTotalPages)} disabled={decodeursPage >= decodeursTotalPages} className="disabled:opacity-30">
                          <ChevronsRight size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeStockTab === "paraboles" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <StatCard title="Total parabole" value={paraboleStats.total} />
                  <StatCard title="Parabole disponible" value={paraboleStats.disponible} />
                  <StatCard title="Parabole activées" value={paraboleStats.activees} />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h3 className="text-lg font-medium">Liste des paraboles disponible</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setAssignParaboleModal(true)}
                      className="bg-[#1EA4DC] hover:bg-[#178dbf] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Radio size={16} />
                      Assigner parabole
                    </button>
                    <button
                      onClick={() => handleOpenRelease("parabole")}
                      className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                    >
                      <Minus size={16} />
                      Libérer le stock
                    </button>
                  </div>
                </div>

                {parabolesLoading && (
                  <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                    <span className="text-sm">Chargement des paraboles...</span>
                  </div>
                )}

                {!parabolesLoading && parabolesError && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="flex-1">{parabolesError}</span>
                    <button onClick={fetchParabolas} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors">
                      Réessayer
                    </button>
                  </div>
                )}

                {!parabolesLoading && !parabolesError && (
                  <>
                    <div className="rounded-xl border border-gray-100 overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead className="bg-[#1EA4DC] text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">N°</th>
                            <th className="px-4 py-3 text-left">Produits</th>
                            <th className="px-4 py-3 text-left">Montant</th>
                            <th className="px-4 py-3 text-left">Statut</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paraboles.length > 0 ? paraboles.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-4">{(parabolesPage - 1) * parabolesLimit + index + 1}</td>
                              <td className="px-4 py-4">
                                <div>
                                  <p className="text-sm font-medium">{item.service}</p>
                                  <p className="text-xs text-gray-500">{item.code} · stock: {item.stock}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge blue>{item.montant}</Badge>
                              </td>
                              <td className="px-4 py-4">
                                {item.statutVariant === "green" ? (
                                  <Badge green>{item.statut}</Badge>
                                ) : (
                                  <Badge orange>{item.statut}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => openDetailModal("parabole", item.raw)}
                                    title="Détail"
                                    className="text-gray-400 hover:text-[#1EA4DC] transition-colors"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStockItem("parabole", item)}
                                    title="Supprimer"
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-gray-400">Aucune parabole trouvée</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                      <span>
                        Affichage de {paraboles.length === 0 ? 0 : (parabolesPage - 1) * parabolesLimit + 1} à{" "}
                        {(parabolesPage - 1) * parabolesLimit + paraboles.length} sur {parabolesTotal} entrées
                      </span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>Lignes par page : {parabolesLimit}</span>
                        <button onClick={() => setParabolesPage(1)} disabled={parabolesPage <= 1} className="disabled:opacity-30">
                          <ChevronsLeft size={18} />
                        </button>
                        <button onClick={() => setParabolesPage((p) => Math.max(1, p - 1))} disabled={parabolesPage <= 1} className="disabled:opacity-30">
                          <ChevronLeft size={18} />
                        </button>
                        <span>Page {parabolesPage} sur {parabolesTotalPages}</span>
                        <button onClick={() => setParabolesPage((p) => Math.min(parabolesTotalPages, p + 1))} disabled={parabolesPage >= parabolesTotalPages} className="disabled:opacity-30">
                          <ChevronRight size={18} />
                        </button>
                        <button onClick={() => setParabolesPage(parabolesTotalPages)} disabled={parabolesPage >= parabolesTotalPages} className="disabled:opacity-30">
                          <ChevronsRight size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "operation" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <div
            className="rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-white"
            style={{
              background: "linear-gradient(90deg, #1EA4DC 0%, #5BC8F2 100%)",
            }}
          >
            <div className="space-y-2">
              <p className="text-base font-medium opacity-95">
                {operationFilters.find((f) => f.key === activeOperationFilter)?.label}
              </p>
              <p className="font-semibold">
                {activeOperationFilter === "tous"
                  ? `Solde : ${operationsStatsAmountDisplay}`
                  : `Montant total : ${operationsStatsAmountDisplay}`}
              </p>
            </div>
            <div className="space-y-2 sm:text-right">
              <p className="text-base font-medium opacity-95">
                {operationsStatsCountDisplay} opérations
              </p>
              {activeOperationFilter === "tous" && (
                <p className="font-semibold">Portefeuille : {operationsWalletBalanceDisplay}</p>
              )}
            </div>
          </div>

          {activeOperationFilter === "tous" && (operationsStats || operationsStatsLoading) && (
            <div className="flex flex-wrap gap-3">
              <MiniStat label="En attente" value={operationsStats?.pendingOperations} variant="orange" loading={operationsStatsLoading} />
              <MiniStat label="Validées" value={operationsStats?.validatedOperations} variant="blue" loading={operationsStatsLoading} />
              <MiniStat label="Rejetées" value={operationsStats?.rejectedOperations} variant="red" loading={operationsStatsLoading} />
              <MiniStat label="Complétées" value={operationsStats?.completedOperations} variant="green" loading={operationsStatsLoading} />
            </div>
          )}

          {!operationsStatsLoading && operationsStatsError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1">{operationsStatsError}</span>
              <button
                onClick={fetchOperationsStats}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Liste des opérations</h3>
            <div className="flex flex-wrap gap-3">
              {operationFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveOperationFilter(filter.key)}
                  className={`px-5 py-2 rounded-xl text-sm transition-colors whitespace-nowrap ${
                    activeOperationFilter === filter.key
                      ? "bg-[#1EA4DC] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {operationsLoading && (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
              <span className="text-sm">Chargement des opérations...</span>
            </div>
          )}

          {!operationsLoading && operationsError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1">{operationsError}</span>
              <button
                onClick={fetchOperations}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {!operationsLoading && !operationsError && (
            <>
              <div className="rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[#1EA4DC] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">N°</th>
                      <th className="px-4 py-3 text-left">Opérations</th>
                      <th className="px-4 py-3 text-left">Montant</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-center">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationsFiltrees.length > 0 ? operationsFiltrees.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium">{item.libelle}</p>
                            <p className="text-xs text-gray-400">{item.date}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge blue>{item.montant}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          {item.statutVariant === "green" ? (
                            <Badge green>{item.statut}</Badge>
                          ) : item.statutVariant === "red" ? (
                            <Badge>{item.statut}</Badge>
                          ) : (
                            <Badge orange>{item.statut}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() =>
                              navigate(`/detail_ope_distrib/${item.id}`, {
                                state: { distributorId: id, operationId: item.id },
                              })
                            }
                            title="Détail"
                            className="hover:text-[#1EA4DC] transition-colors text-gray-400"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">Aucune opération trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                <span>
                  Affichage de {operationsFiltrees.length === 0 ? 0 : (operationsPage - 1) * operationsLimit + 1} à{" "}
                  {(operationsPage - 1) * operationsLimit + operationsFiltrees.length} sur {operationsTotal} entrées
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span>Lignes par page : {operationsLimit}</span>
                  <button onClick={() => setOperationsPage(1)} disabled={operationsPage <= 1} className="disabled:opacity-30">
                    <ChevronsLeft size={18} />
                  </button>
                  <button onClick={() => setOperationsPage((p) => Math.max(1, p - 1))} disabled={operationsPage <= 1} className="disabled:opacity-30">
                    <ChevronLeft size={18} />
                  </button>
                  <span>Page {operationsPage} sur {operationsTotalPages}</span>
                  <button onClick={() => setOperationsPage((p) => Math.min(operationsTotalPages, p + 1))} disabled={operationsPage >= operationsTotalPages} className="disabled:opacity-30">
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setOperationsPage(operationsTotalPages)} disabled={operationsPage >= operationsTotalPages} className="disabled:opacity-30">
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "commission" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {commissionTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCommissionTab(tab.key)}
                className={`px-5 py-2 rounded-xl text-sm transition-colors ${
                  activeCommissionTab === tab.key
                    ? "bg-[#1EA4DC] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-lg font-medium">Liste des commissions</h3>
            <select
              value={activeCommissionFilter}
              onChange={(e) => setActiveCommissionFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1EA4DC]"
            >
              {commissionFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {commissionsLoading && (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
              <span className="text-sm">Chargement des commissions...</span>
            </div>
          )}

          {!commissionsLoading && commissionsError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1">{commissionsError}</span>
              <button
                onClick={fetchCommissions}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {!commissionsLoading && !commissionsError && (
            <>
              <div className="rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[#1EA4DC] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">N°</th>
                      <th className="px-4 py-3 text-left">Opérations</th>
                      <th className="px-4 py-3 text-left">Commission gagné</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-center">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionsFiltrees.length > 0 ? commissionsFiltrees.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium">{item.operation}</p>
                            <p className="text-xs text-gray-400">{item.sousLibelle}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge blue>{item.montant}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          {item.statutVariant === "green" ? (
                            <Badge green>{item.statut}</Badge>
                          ) : item.statutVariant === "red" ? (
                            <Badge>{item.statut}</Badge>
                          ) : (
                            <Badge orange>{item.statut}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() =>
                              navigate(`/detail_com_distrib/${item.id}`, {
                                state: { distributorId: id, commissionId: item.id },
                              })
                            }
                            title="Détail"
                            className="hover:text-[#1EA4DC] transition-colors text-gray-400"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">Aucune commission trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
                <span>
                  Affichage de {commissionsFiltrees.length === 0 ? 0 : 1} à {commissionsFiltrees.length} sur{" "}
                  {commissionsFiltrees.length} entrées{" "}
                  {activeCommissionTab !== "tous" || activeCommissionFilter !== "tous"
                    ? `(filtrées sur la page ${commissionsPage} de ${commissionsTotal} au total)`
                    : ""}
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span>Lignes par page : {commissionsLimit}</span>
                  <button onClick={() => setCommissionsPage(1)} disabled={commissionsPage <= 1} className="disabled:opacity-30">
                    <ChevronsLeft size={18} />
                  </button>
                  <button onClick={() => setCommissionsPage((p) => Math.max(1, p - 1))} disabled={commissionsPage <= 1} className="disabled:opacity-30">
                    <ChevronLeft size={18} />
                  </button>
                  <span>Page {commissionsPage} sur {commissionsTotalPages}</span>
                  <button onClick={() => setCommissionsPage((p) => Math.min(commissionsTotalPages, p + 1))} disabled={commissionsPage >= commissionsTotalPages} className="disabled:opacity-30">
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setCommissionsPage(commissionsTotalPages)} disabled={commissionsPage >= commissionsTotalPages} className="disabled:opacity-30">
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {detailModal.open && (
        <ProductDetailModal
          type={detailModal.type}
          item={detailModal.item}
          onClose={closeDetailModal}
        />
      )}

      {cardRateModalOpen && (
        <AssignCardRateModal
          distributorId={id}
          distributeurNom={infos.nom !== "-" ? infos.nom : infos.businessName}
          distributorServices={distributeur?.distributorServices || []}
          editItem={editingCardRate}
          onClose={closeCardRateModal}
          onAssigned={handleCardRateAssigned}
        />
      )}

      {canalRateModalOpen && (
        <AssignCanalRateModal
          distributorId={id}
          editItem={editingCanalRate}
          onClose={closeCanalRateModal}
          onAssigned={handleCanalRateAssigned}
        />
      )}

      {restockModal.open && (
        <RestockWizardModal
          distributorId={id}
          category={restockModal.category}
          servicesList={restockModal.category === "carte" ? restockServicesCarte : restockServicesCanal}
          onClose={() => setRestockModal({ open: false, category: null })}
          onConfirmed={handleRestockConfirmed}
        />
      )}

      {releaseModal.open && (
        <CheckableListModal
          title="Libérer le stock"
          label={
            releaseModal.category === "carte" ? "Cartes en stock" :
            releaseModal.category === "decodeur" ? "Décodeurs en stock" :
            "Paraboles en stock"
          }
          items={releasableItems}
          loading={releasableLoading}
          confirmLabel="Libérer"
          confirmingLabel="Libération..."
          emptyMessage="Aucun élément en stock à libérer"
          confirmButtonClass="bg-red-500 hover:bg-red-600"
          onClose={() => { setReleaseModal({ open: false, category: null }); setReleasableItems([]) }}
          onConfirm={handleConfirmRelease}
        />
      )}

      {assignParaboleModal && (
        <AssignParaboleModal
          onClose={() => setAssignParaboleModal(false)}
          onAssigned={handleConfirmAssignParabole}
        />
      )}

      {/* ✅ AJOUT : confirmation avant désactivation d'un taux (carte ou Canal+) */}
      {confirmDisable.open && (
        <ConfirmDialog
          title={confirmDisable.type === "carte" ? "Désactiver ce taux carte prépayée ?" : "Désactiver ce taux Canal+ ?"}
          message="Cette action désactivera l'assignation de ce taux au distributeur. Vous pourrez le réassigner plus tard si nécessaire."
          confirmLabel="Désactiver"
          cancelLabel="Annuler"
          danger
          loading={disabling}
          onConfirm={handleConfirmDisable}
          onCancel={closeDisableConfirm}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
  COMPOSANTS COMMUNS
═══════════════════════════════════════════════ */

function StatCard({ title, value }) {
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-8 py-6 flex flex-col space-y-2 border border-blue-50/50">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-extrabold text-[#1EA4DC]">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, variant = "blue", loading }) {
  const variantClasses = {
    blue:   "bg-blue-50 text-[#1EA4DC]",
    green:  "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-600",
    red:    "bg-red-50 text-red-600",
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      <span>{label}</span>
      <span className="font-bold">{loading ? "…" : value ?? 0}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-0 py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className="text-left sm:text-right">{value}</div>
    </div>
  )
}

function Badge({ children, green, blue, orange }) {
  return (
    <span
      className={`px-4 py-1 rounded-full text-sm ${
        green
          ? "bg-green-100 text-green-700"
          : blue
          ? "bg-blue-100 text-[#1EA4DC]"
          : orange
          ? "bg-orange-100 text-orange-600"
          : "bg-red-100 text-red-600"
      }`}
    >
      {children}
    </span>
  )
}

/* ═══════════════════════════════════════════════
  MODALE "DÉTAILS DU PRODUIT" (Stock)
═══════════════════════════════════════════════ */
function ProductDetailModal({ type, item, onClose }) {
  if (!item) return null

  const isParabole = type === "parabole"
  const sub = item.subProduct || {}
  const parabola = item.parabola || {}

  const nom = isParabole ? (parabola.name || "-") : (sub.name || "-")
  const code = isParabole ? (parabola.code || "-") : (sub.code || "-")
  const prixValue = isParabole ? parabola.price : (sub.price ?? item.sellingPrice)
  const currency = isParabole ? "FCFA" : (sub.currency || "FCFA")
  const statutBrut = isParabole
    ? (parabola.status || (item.isActive ? "ACTIVE" : "INACTIVE"))
    : (sub.status || (item.isActive ? "ACTIVE" : "INACTIVE"))

  const description = isParabole ? (parabola.description || "-") : (sub.description || "-")
  const dateCreation = isParabole ? parabola.createdAt : sub.createdAt
  const dateMaj = isParabole ? parabola.updatedAt : sub.updatedAt

  const service = sub.service || {}

  const banque = sub.bank || null
  const formulePrepayee = sub.prepaidCardFormula || null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold">Détails du produit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">

          <div className="bg-blue-50 rounded-xl p-4 flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-base">{nom}</p>
              <p className="text-sm text-gray-500 mt-0.5">Code : {code}</p>
              {prixValue !== null && prixValue !== undefined && prixValue !== "" && (
                <p className="text-sm font-semibold text-[#1EA4DC] mt-1">
                  {Number(prixValue).toLocaleString("fr-FR")} {currency}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              statutBrut === "ACTIVATED" || statutBrut === "ACTIVE" ? "bg-green-100 text-green-600" :
              statutBrut === "ASSIGNED"  ? "bg-blue-100 text-blue-600"  :
              statutBrut === "AVAILABLE" ? "bg-gray-100 text-gray-600"  :
              "bg-gray-100 text-gray-600"
            }`}>
              {statutBrut || "-"}
            </span>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
              <div>
                <p className="text-xs text-gray-400">Description</p>
                <p className="font-semibold text-gray-800 text-sm">{description}</p>
              </div>

              {!isParabole && (
                <>
                  <div>
                    <p className="text-xs text-gray-400">Durée (jours)</p>
                    <p className="font-semibold text-gray-800 text-sm">{sub.durationInDays ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Renouvelable</p>
                    <p className="font-semibold text-gray-800 text-sm">{sub.renewable ? "Oui" : "Non"}</p>
                  </div>
                </>
              )}

              {isParabole && (
                <>
                  <div>
                    <p className="text-xs text-gray-400">Marque</p>
                    <p className="font-semibold text-gray-800 text-sm">{parabola.brand || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Modèle</p>
                    <p className="font-semibold text-gray-800 text-sm">{parabola.model || "-"}</p>
                  </div>
                </>
              )}

              <div>
                <p className="text-xs text-gray-400">Date de création</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {dateCreation ? new Date(dateCreation).toLocaleDateString("fr-FR") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Dernière mise à jour</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {dateMaj ? new Date(dateMaj).toLocaleDateString("fr-FR") : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {isParabole ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Attribution</p>
                  <div>
                    <p className="text-xs text-gray-400">Stock</p>
                    <p className="font-semibold text-gray-800 text-sm">{item.stock ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Assigné le</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString("fr-FR") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Actif</p>
                    <p className="font-semibold text-gray-800 text-sm">{item.isActive ? "Oui" : "Non"}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service</p>
                  <div>
                    <p className="text-xs text-gray-400">Nom</p>
                    <p className="font-semibold text-gray-800 text-sm">{service.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Code</p>
                    <p className="font-semibold text-gray-800 text-sm">{service.code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Catégorie</p>
                    <p className="font-semibold text-gray-800 text-sm">{service.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Entreprise</p>
                    <p className="font-semibold text-gray-800 text-sm">Pollux</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isParabole && (banque || formulePrepayee) && (
            <>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Banque</p>
                  <div>
                    <p className="text-xs text-gray-400">Nom</p>
                    <p className="font-semibold text-gray-800 text-sm">{banque?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Code</p>
                    <p className="font-semibold text-gray-800 text-sm">{banque?.code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Description</p>
                    <p className="font-semibold text-gray-800 text-sm">{banque?.description || "-"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Formule prépayée</p>
                  <div>
                    <p className="text-xs text-gray-400">Nom</p>
                    <p className="font-semibold text-gray-800 text-sm">{formulePrepayee?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Code</p>
                    <p className="font-semibold text-gray-800 text-sm">{formulePrepayee?.code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Solde max</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {formulePrepayee?.maxBalance
                        ? `${Number(formulePrepayee.maxBalance).toLocaleString("fr-FR")} FCFA`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Active</p>
                    <p className="font-semibold text-gray-800 text-sm">
                      {formulePrepayee?.isActive ? "Oui" : "Non"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}