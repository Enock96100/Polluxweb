import {
  ArrowLeft,
  Lock,
  Copy,
  CreditCard,
  Percent,
  Info,
  Hash,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { useEffect, useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios"
import { getAuthData } from "./auth"

/* ═══════════════════════════════════════════════
  API
  ✅ Endpoint confirmé (curl fourni par l'utilisateur) : n'accepte QUE
  "page" et "limit". Aucun paramètre pour cibler directement une
  commission par id -> on parcourt les pages jusqu'à trouver l'entrée
  demandée, exactement comme fetchOperation() dans Detail_ope_distrib.jsx.
═══════════════════════════════════════════════ */

const DIST_COMMISSIONS_API = (distributorId) =>
  `https://youapi.youneed.app/pollux/prod/api/commissions/distributors/${distributorId}/history`

/* ═══════════════════════════════════════════════
  MAPPINGS (libellés / couleurs)
═══════════════════════════════════════════════ */

const OPERATION_TYPE_LABELS = {
  PREPAID_CARD_RECHARGE:      "Recharge Carte",
  PREPAID_CARD_ACTIVATION:    "Activation Carte",
  CANAL_SUBSCRIPTION_NEW:     "Nouvel Abonnement Canal",
  CANAL_SUBSCRIPTION_RENEWAL: "Renouvellement Canal+",
  CANAL_FORMULA_CHANGE:       "Changement de formule Canal+",
  CANAL_REACTIVATION:         "Réactivation Canal+",
  WALLET_DEPOSIT:             "Dépôt Wallet",
  COMMISSION_WITHDRAWAL:      "Retrait Commission",
  MANUAL_ADJUSTMENT:          "Ajustement Manuel",
  SUBPRODUCT_RESTOCKING:      "Réapprovisionnement",
}

const OPERATION_STATUS_MAP = {
  PENDING:   { label: "En attente", color: "bg-orange-100 text-orange-600" },
  VALIDATED: { label: "Complétée",  color: "bg-green-100 text-green-600" },
  COMPLETED: { label: "Complétée",  color: "bg-green-100 text-green-600" },
  CANCELLED: { label: "Annulée",    color: "bg-red-100 text-red-600" },
  REJECTED:  { label: "Rejetée",    color: "bg-red-100 text-red-600" },
}

// Statut propre à la commission (distinct du statut de l'opération)
const COMMISSION_STATUS_MAP = {
  EARNED:    { label: "Gagné",      color: "bg-green-100 text-green-600" },
  BLOCKED:   { label: "Bloquée",    color: "bg-orange-100 text-orange-600" },
  AVAILABLE: { label: "Disponible", color: "bg-green-100 text-green-600" },
  WITHDRAWN: { label: "Retiré",     color: "bg-red-100 text-red-600" },
}

const OPERATOR_TYPE_LABELS = {
  DISTRIBUTOR: "Distributeur",
  MERCHANT:    "Marchand",
}

const COMMISSION_TYPE_LABELS = {
  PERCENTAGE: "Taux en %",
  FIXED:      "Montant fixe",
}

/* ===================== HELPERS ===================== */

function formatMontant(value) {
  if (value === null || value === undefined || value === "") return "—"
  const n = Number(value)
  if (isNaN(n)) return "—"
  return `${n.toLocaleString("fr-FR")} FCFA`
}

function formatDateTime(dateString) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleString("fr-FR")
}

// Convertit un taux fraction (0.05) en pourcentage lisible ("5%")
function formatRatePercent(rate) {
  if (rate === null || rate === undefined || rate === "") return "—"
  const n = Number(rate) * 100
  if (isNaN(n)) return "—"
  return `${Number(n.toFixed(2))}%`
}

function copyToClipboard(text) {
  if (text && navigator?.clipboard) {
    navigator.clipboard.writeText(String(text))
  }
}

// Tronque un identifiant long pour l'affichage (ex: "b1a9a7b1-xxxx..." -> "b1a9a7b1...")
function shortId(id) {
  if (!id) return "—"
  const str = String(id)
  return str.length > 12 ? `${str.slice(0, 8)}...` : str
}

/* ===================== MAIN COMPONENT ===================== */

export default function Detail_com_distrib() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // La route est /detail_com_distrib/:id -> "id" = ID de la commission.
  // Le distributorId est transmis via navigate(..., { state: { distributorId } })
  // depuis DetailDistributeur.jsx, avec un repli sur le localStorage pour
  // survivre à un rafraîchissement de page (même logique que Detail_ope_distrib.jsx).
  const resolvedCommissionId =
    params?.id ||
    location.state?.commissionId ||
    localStorage.getItem("lastCommissionId")

  const resolvedDistributorId =
    location.state?.distributorId ||
    localStorage.getItem("lastCommissionDistributorId")

  const [commission,   setCommission]   = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  useEffect(() => {
    if (resolvedCommissionId)   localStorage.setItem("lastCommissionId", resolvedCommissionId)
    if (resolvedDistributorId)  localStorage.setItem("lastCommissionDistributorId", resolvedDistributorId)
  }, [resolvedCommissionId, resolvedDistributorId])

  useEffect(() => {
    if (resolvedCommissionId && resolvedDistributorId) {
      fetchCommission()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCommissionId, resolvedDistributorId])

  /* ================= FETCH COMMISSION ================= */
  // On parcourt les pages de /commissions/distributors/:id/history jusqu'à
  // trouver la commission demandée (id), ou jusqu'à épuisement des pages.
  const fetchCommission = async () => {
    if (!resolvedDistributorId || !resolvedCommissionId) return
    try {
      setLoading(true)
      setLoadError(null)

      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const limit = 20
      let page = 1
      let totalPages = 1
      let found = null

      do {
        const response = await axios.get(DIST_COMMISSIONS_API(resolvedDistributorId), {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          params: { page, limit },
        })

        const payload = response.data
        const list = payload?.data || []
        const meta = payload?.meta || payload?.pagination || {}
        totalPages = meta.totalPages ?? meta.lastPage ?? 1

        found = list.find((c) => c.id === resolvedCommissionId) || null
        page += 1
      } while (!found && page <= totalPages)

      setCommission(found)
      if (!found) {
        setLoadError("Cette commission est introuvable pour ce distributeur.")
      }
    } catch (error) {
      console.error("Erreur détail commission :", error)
      setLoadError(
        error?.response?.data?.description || error.message || "Impossible de charger le détail de la commission."
      )
    } finally {
      setLoading(false)
    }
  }

  /* ================= LOADING / GUARDS ================= */

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-screen bg-[#F5F7FA]">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="animate-spin w-5 h-5 text-[#1EA4DC]" />
          <span className="text-sm">Chargement de la commission…</span>
        </div>
      </div>
    )
  }

  if (!resolvedCommissionId || !resolvedDistributorId) {
    return (
      <div className="p-4 sm:p-8 bg-[#F5F7FA] min-h-screen space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black text-sm sm:text-base">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          Identifiant de commission ou de distributeur manquant.
        </div>
      </div>
    )
  }

  if (loadError || !commission) {
    return (
      <div className="p-4 sm:p-8 bg-[#F5F7FA] min-h-screen space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black text-sm sm:text-base">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <div className="flex items-start sm:items-center gap-3 flex-1">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{loadError || "Aucune donnée de commission trouvée."}</span>
          </div>
          <button
            onClick={fetchCommission}
            className="w-full sm:w-auto bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors shrink-0"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  /* ================= DÉRIVÉES À PARTIR DU PAYLOAD RÉEL ================= */

  const operation = commission.operation || {}
  const metadata = operation.metadata || {}
  const commissionDetails = metadata.commissionDetails || {}
  const bank = metadata.bank || null
  const card = operation.cardRecharge?.card || null
  const subProduct = operation.subProduct || null

  // Statut de la commission (badge du haut)
  const commissionStatusCfg =
    COMMISSION_STATUS_MAP[commission.status] || { label: commission.status || "—", color: "bg-gray-100 text-gray-600" }
  const isBloquee = commission.status === "BLOCKED"

  // Statut de l'opération liée
  const operationStatusCfg =
    OPERATION_STATUS_MAP[operation.status] || { label: operation.status || "—", color: "bg-gray-100 text-gray-600" }

  // Type d'opération (libellé affiché à côté du badge de statut)
  const typeOperationLabel = OPERATION_TYPE_LABELS[operation.operationType] || operation.operationType || "—"

  // Stat cards du haut : Rechargé / Net effectif / Commission
  const rechargeValue = operation.amount ?? metadata.rechargeAmount ?? commission.rechargeAmount
  const netEffectifValue = operation.effectiveAmount ?? metadata.effectiveRechargeAmount
  const commissionValue = commission.commissionAmount

  // Répartition des commissions (Pollux = part société, Distributeur = part partenaire)
  const polluxRateFraction = commissionDetails.companyRate
  const polluxMontant = commissionDetails.companyCommission ?? operation.companyCommissionAmount
  const distributeurRateFraction = commissionDetails.partnerRate
  const distributeurMontant =
    commissionDetails.partnerCommission ?? operation.distributorCommissionAmount ?? commission.commissionAmount
  const totalRateFraction = commissionDetails.totalRate
  const totalMontant =
    commissionDetails.totalCommission ??
    (Number(polluxMontant || 0) + Number(distributeurMontant || 0))

  const pctPollux = totalMontant ? (Number(polluxMontant || 0) / Number(totalMontant)) * 100 : 0
  const pctDistributeur = totalMontant ? (Number(distributeurMontant || 0) / Number(totalMontant)) * 100 : 0

  // Carte prépayée : n'affichée que si des données de carte/banque sont présentes
  const hasCarteInfo = !!(bank || card || metadata.cardId || metadata.prepaidCardFormulaName)

  const carteBanque = bank?.name || "—"
  const carteNumero = metadata.cardNumber
    ? `•••• ${metadata.cardNumber}`
    : card?.cardNumber
    ? `•••• ${card.cardNumber}`
    : "—"
  const carteId = metadata.cardId || card?.cardId || "—"
  const carteTitulaire = card?.cardHolderName || "—"
  const carteFormule = metadata.prepaidCardFormulaName || "—"
  const cartePlafond = metadata.prepaidCardFormulaMaxBalance

  // Statut de l'opération (bloc détaillé)
  const typeCommissionLabel = COMMISSION_TYPE_LABELS[commission.commissionType] || commission.commissionType || "—"
  const operateurLabel = OPERATOR_TYPE_LABELS[operation.operatorType] || operation.operatorType || "—"

  // Identifiants techniques
  const commissionIdFull = commission.id
  const operationIdFull = commission.operationId || operation.id
  const rateIdFull = commissionDetails.commissionRateId || operation.appliedCommissionRateId
  const assignmentIdFull = commissionDetails.assignmentId

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F5F7FA] min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-black shrink-0">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl sm:text-3xl font-semibold text-gray-800 truncate">Détail commission</h1>
        </div>

        <button
          onClick={() => copyToClipboard(commissionIdFull)}
          className="text-gray-400 hover:text-gray-600 shrink-0"
          title="Copier l'ID de la commission"
        >
          <Copy size={20} />
        </button>
      </div>

      {/* BADGES STATUT + TYPE OPÉRATION */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${commissionStatusCfg.color}`}
        >
          {isBloquee && <Lock size={14} />}
          {commissionStatusCfg.label}
        </span>
        <span className="text-gray-500 text-base sm:text-lg">{typeOperationLabel}</span>
      </div>

      {/* STAT CARDS : Rechargé / Net effectif / Commission */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="RECHARGÉ" value={formatMontant(rechargeValue)} />
        <StatCard title="NET EFFECTIF" value={formatMontant(netEffectifValue)} />
        <StatCard title="COMMISSION" value={formatMontant(commissionValue)} />
      </div>

      {/* CARTE PRÉPAYÉE (uniquement si des données de carte sont présentes sur cette commission) */}
      {hasCarteInfo && (
        <InfoCard title="Carte prépayée" icon={<CreditCard size={18} />}>
          <InfoRow label="Banque" value={carteBanque} />
          <InfoRow label="N° carte" value={carteNumero} />
          <InfoRow label="ID carte" value={carteId} />
          <InfoRow label="Titulaire" value={carteTitulaire} />
          <InfoRow label="Formule" value={carteFormule} />
          <InfoRow label="Plafond" value={formatMontant(cartePlafond)} />
        </InfoCard>
      )}

      {/* SOUS-PRODUIT (fallback générique quand ce n'est pas une carte, ex : décodeur, abonnement) */}
      {!hasCarteInfo && subProduct && (
        <InfoCard title="Produit" icon={<CreditCard size={18} />}>
          <InfoRow label="Nom" value={subProduct.name} />
          <InfoRow label="Code" value={subProduct.code} />
          <InfoRow label="Service" value={subProduct.service?.name} />
          <InfoRow label="Prix" value={formatMontant(subProduct.price)} />
        </InfoCard>
      )}

      {/* RÉPARTITION DES COMMISSIONS */}
      <InfoCard title="Répartition des commissions" icon={<Percent size={18} />}>
        <CommissionBar
          label="Pollux"
          taux={formatRatePercent(polluxRateFraction)}
          montant={polluxMontant}
          percent={pctPollux}
          color="bg-[#1EA4DC]"
          badgeColor="bg-[#1EA4DC]/10 text-[#1EA4DC]"
        />
        <CommissionBar
          label="Distributeur / Commercial"
          taux={formatRatePercent(distributeurRateFraction)}
          montant={distributeurMontant}
          percent={pctDistributeur}
          color="bg-green-500"
          badgeColor="bg-green-100 text-green-600"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-4 mt-2 border-t border-gray-100">
          <span className="self-start bg-[#1EA4DC]/10 text-[#1EA4DC] px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold">
            Taux global {formatRatePercent(totalRateFraction)}
          </span>
          <span className="text-green-600 font-bold text-base sm:text-lg">
            {formatMontant(totalMontant)}
          </span>
        </div>
      </InfoCard>

      {/* STATUT DE L'OPÉRATION */}
      <InfoCard title="Statut de l'opération" icon={<Info size={18} />}>
        <InfoRow label="Type d'opération" value={typeOperationLabel} />
        <InfoRow
          label="Statut opération"
          value={operationStatusCfg.label}
          isStatus
          statusColor={operationStatusCfg.color}
        />
        <InfoRow
          label="Statut commission"
          value={
            <span className="flex items-center gap-1">
              {isBloquee && <Lock size={12} />}
              {commissionStatusCfg.label}
            </span>
          }
          isStatus
          statusColor={commissionStatusCfg.color}
        />
        <InfoRow label="Type commission" value={typeCommissionLabel} />
        <InfoRow label="Opérateur" value={operateurLabel} />
        <InfoRow label="Validé le" value={formatDateTime(operation.validatedAt)} />
        <InfoRow label="Commission gagnée le" value={formatDateTime(commission.earnedAt)} />
        {commission.availableAt && (
          <InfoRow label="Disponible le" value={formatDateTime(commission.availableAt)} />
        )}
        {commission.withdrawnAt && (
          <InfoRow label="Retirée le" value={formatDateTime(commission.withdrawnAt)} />
        )}
      </InfoCard>

      {/* IDENTIFIANTS TECHNIQUES */}
      <InfoCard title="Identifiants techniques" icon={<Hash size={18} />}>
        <IdentifiantRow label="Commission ID" full={commissionIdFull} display={shortId(commissionIdFull)} />
        <IdentifiantRow label="Opération ID" full={operationIdFull} display={shortId(operationIdFull)} />
        <IdentifiantRow label="Rate ID" full={rateIdFull} display={shortId(rateIdFull)} />
        <IdentifiantRow label="Assignment ID" full={assignmentIdFull} display={shortId(assignmentIdFull)} />
      </InfoCard>

    </div>
  )
}

/* ================= COMPOSANTS ================= */

function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-xs sm:text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, isStatus, statusColor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2 text-xs sm:text-sm border-b border-gray-50 py-2">
      <span className="text-gray-500">{label}</span>
      {isStatus ? (
        <span className={`self-start sm:self-auto ${statusColor} px-3 py-1 rounded-full text-xs font-semibold`}>
          {value}
        </span>
      ) : (
        <span className="text-gray-800 font-semibold text-left sm:text-right break-words">
          {value || "—"}
        </span>
      )}
    </div>
  )
}

function IdentifiantRow({ label, full, display }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2 text-xs sm:text-sm border-b border-gray-50 py-2">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-gray-800 font-semibold break-all">
        {display}
        <button
          onClick={() => copyToClipboard(full)}
          className="text-gray-400 hover:text-gray-600 shrink-0"
          title={`Copier ${label}`}
        >
          <Copy size={14} />
        </button>
      </span>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-5 sm:px-8 py-4 sm:py-6 flex flex-col space-y-1.5 sm:space-y-2 border border-blue-50/50">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-xl sm:text-3xl font-extrabold text-[#1EA4DC]">{value}</p>
    </div>
  )
}

function CommissionBar({ label, taux, montant, percent, color, badgeColor }) {
  return (
    <div className="mb-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-800 font-medium text-sm">{label}</span>
          <span className={`${badgeColor} px-2 py-0.5 rounded-full text-xs font-semibold`}>
            {taux}
          </span>
        </div>
        <span className="text-gray-800 font-semibold text-sm">{formatMontant(montant)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${Math.min(percent || 0, 100)}%` }}
        />
      </div>
    </div>
  )
}