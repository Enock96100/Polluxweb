import { useState, useEffect, useCallback, useRef } from "react"
import {
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { getAuthData, fetchProfile } from "./auth"

/* ═══════════════════════════════════════════════
  API
═══════════════════════════════════════════════ */

const API_BASE = "https://youapi.youneed.app/pollux/prod/api"

//  CONFIRMÉ : historique des commissions de l'entreprise connectée
// GET /commissions/companies/:companyId/history?page=&limit=
const COMPANY_COMMISSIONS_HISTORY_API = (companyId) =>
  `${API_BASE}/commissions/companies/${companyId}/history`

// ⚠️ À CONFIRMER : historique des commissions de l'agent connecté
// GET /commissions/agents/:agentId/history?page=&limit=
// Si ta route est différente (ex: /commissions/users/:id/history ou
// /commissions/me/history), modifie uniquement cette ligne.
const AGENT_COMMISSIONS_HISTORY_API = (agentId) =>
  `${API_BASE}/commissions/agents/${agentId}/history`

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

/* ═══════════════════════════════════════════════
  RÉSOLUTION DE L'OPÉRATEUR CONNECTÉ (Agent ou Compagnie)
═══════════════════════════════════════════════ */
// Retourne { kind: "agent" | "company", id, name }
//  - ADMIN_AGENT  -> commissions de l'agent connecté
//  - sinon        -> commissions de la compagnie connectée
async function resolveOperator() {
  const auth = getAuthData() || {}
  const profile = await fetchProfile()
  if (!profile && !auth.companyId) throw new Error("Impossible de récupérer le profil")

  const userType = profile?.userType || profile?.user?.userType || auth.userType

  // ── Agent connecté ──
  if (userType === "ADMIN_AGENT") {
    const agentId = profile?.id || profile?.user?.id || auth.userId // ⚠️ À CONFIRMER
    if (!agentId) throw new Error("Identifiant de l'agent manquant")

    const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ")
    return { kind: "agent", id: agentId, name: fullName || "-" }
  }

  // ── Compagnie connectée ──
  const companyId = auth.companyId || profile?.company?.id || profile?.companyId // ⚠️ À CONFIRMER
  if (!companyId) throw new Error("CompanyId manquant")

  return { kind: "company", id: companyId, name: profile?.company?.name || "-" }
}

/* ═══════════════════════════════════════════════
  MAPPING OPERATIONS / COMMISSIONS (API dynamique)
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

const COMMISSION_STATUS_MAP = {
  EARNED:    { label: "Gagné",      variant: "green" },
  BLOCKED:   { label: "Bloqué",     variant: "orange" },
  AVAILABLE: { label: "Disponible", variant: "green" },
  WITHDRAWN: { label: "Retiré",     variant: "red" },
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
    operationId: c.operation?.id || c.operationId || null,
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
  COMPOSANT COMMUN : BADGE
═══════════════════════════════════════════════ */

function Badge({ children, green, blue, orange }) {
  return (
    <span
      className={`px-4 py-1 rounded-full text-sm whitespace-nowrap ${
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
  COMPOSANT PRINCIPAL
═══════════════════════════════════════════════ */

export default function CommissionAd() {
  const navigate = useNavigate()
  const [activeCommissionTab, setActiveCommissionTab] = useState("tous")
  const [activeCommissionFilter, setActiveCommissionFilter] = useState("tous")

  // ✅ Opérateur connecté (agent ou compagnie), résolu une seule fois
  const operatorRef = useRef(null)
  // Nom affiché sous le titre : nom de l'agent ou de la compagnie
  const [operatorName, setOperatorName] = useState("")

  const [commissions,           setCommissions]           = useState([])
  const [commissionsLoading,    setCommissionsLoading]    = useState(false)
  const [commissionsError,      setCommissionsError]      = useState(null)
  const [commissionsPage,       setCommissionsPage]       = useState(1)
  const [commissionsLimit]                                = useState(20)
  const [commissionsTotal,      setCommissionsTotal]      = useState(0)
  const [commissionsTotalPages, setCommissionsTotalPages] = useState(1)

  const fetchCommissions = useCallback(async () => {
    setCommissionsLoading(true)
    setCommissionsError(null)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      // Résout l'opérateur connecté une seule fois (agent ou compagnie)
      let operator = operatorRef.current
      if (!operator) {
        operator = await resolveOperator()
        operatorRef.current = operator
        setOperatorName(operator.name)
      }

      const url =
        operator.kind === "agent"
          ? AGENT_COMMISSIONS_HISTORY_API(operator.id)
          : COMPANY_COMMISSIONS_HISTORY_API(operator.id)

      const res = await axios.get(url, {
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
      // 404 = l'API n'a trouvé aucune commission pour cet opérateur :
      // ce n'est pas une erreur, on affiche simplement "aucune commission".
      if (err?.response?.status === 404) {
        setCommissions([])
        setCommissionsTotal(0)
        setCommissionsTotalPages(1)
      } else {
        setCommissionsError(err?.response?.data?.description || err.message || "Impossible de charger les commissions")
        setCommissions([])
      }
    } finally {
      setCommissionsLoading(false)
    }
  }, [commissionsPage, commissionsLimit])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  useEffect(() => {
    setCommissionsPage(1)
  }, [activeCommissionTab, activeCommissionFilter])

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

  const handleViewDetail = (item) => {
    if (!item.operationId) return
    navigate(`/detail_com_ad/${item.operationId}`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Vos commissions</h1>
        <p className="text-gray-500 text-sm sm:text-base">{operatorName}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1 sm:pb-0">
          {commissionTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCommissionTab(tab.key)}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${
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
          <h3 className="text-base sm:text-lg font-medium">Liste des commissions</h3>
          <select
            value={activeCommissionFilter}
            onChange={(e) => setActiveCommissionFilter(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1EA4DC]"
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <div className="flex items-start sm:items-center gap-3 flex-1">
              <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
              <span className="flex-1 break-words">{commissionsError}</span>
            </div>
            <button
              onClick={fetchCommissions}
              className="w-full sm:w-auto bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {!commissionsLoading && !commissionsError && (
          <>
            <div className="rounded-xl overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[640px]">
                <thead className="bg-[#1EA4DC] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">N°</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Opérations</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Commission gagné</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionsFiltrees.length > 0 ? commissionsFiltrees.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">{(commissionsPage - 1) * commissionsLimit + index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium">{item.operation}</p>
                          <p className="text-xs text-gray-400">{item.sousLibelle}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge blue>{item.montant}</Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.statutVariant === "green" ? (
                          <Badge green>{item.statut}</Badge>
                        ) : item.statutVariant === "red" ? (
                          <Badge>{item.statut}</Badge>
                        ) : (
                          <Badge orange>{item.statut}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          title={item.operationId ? "Détail" : "Aucune opération liée"}
                          onClick={() => handleViewDetail(item)}
                          disabled={!item.operationId}
                          className="hover:text-[#1EA4DC] transition-colors text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-400">
                        {commissions.length === 0
                          ? "Aucune commission pour le moment"
                          : "Aucune commission ne correspond à ce filtre"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 sm:hidden">
              Faites glisser le tableau horizontalement pour voir plus de colonnes.
            </p>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-2 sm:p-4 text-sm text-gray-600">
              <span className="text-center sm:text-left">
                Affichage de {commissionsFiltrees.length === 0 ? 0 : (commissionsPage - 1) * commissionsLimit + 1} à{" "}
                {(commissionsPage - 1) * commissionsLimit + commissionsFiltrees.length} sur {commissionsTotal} entrées
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="whitespace-nowrap">Lignes par page : {commissionsLimit}</span>
                <button onClick={() => setCommissionsPage(1)} disabled={commissionsPage <= 1} className="disabled:opacity-30">
                  <ChevronsLeft size={18} />
                </button>
                <button onClick={() => setCommissionsPage((p) => Math.max(1, p - 1))} disabled={commissionsPage <= 1} className="disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <span className="whitespace-nowrap">Page {commissionsPage} sur {commissionsTotalPages}</span>
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
    </div>
  )
}