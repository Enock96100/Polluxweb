import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  CircleCheck,
  CircleX,
  BarChart3,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import useAuth from "../context/auth/utils"

const API_BASE = "https://youapi.youneed.app/pollux/prod/api"
const PAGE_LIMIT = 10

/* ---------- Fonctions utilitaires ---------- */
const formatCurrency = (value) => {
  if (!value) return "0 FCFA"
  const num = Number(value)
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + " FCFA"
}

const formatDate = (isoString) => {
  if (!isoString) return "-"
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const formatFullDate = (isoString) => {
  if (!isoString) return "-"
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Même mapping que OPERATION_TYPE_LABELS dans Header.jsx — à garder
// synchronisé si de nouveaux types d'opération apparaissent côté backend.
const OPERATION_TYPE_LABELS = {
  CANAL_SUBSCRIPTION_NEW: "Nouvel abonnement Canal+",
  CANAL_SUBSCRIPTION_RENEWAL: "Renouvellement Canal+",
  CANAL_SUBSCRIPTION_FORMULA_CHANGE: "Changement de formule",
  CANAL_SUBSCRIPTION_REACTIVATION: "Réactivation Canal+",
  PREPAID_CARD_ACTIVATION: "Activation carte",
  PREPAID_CARD_RECHARGE: "Recharge carte",
  SUBPRODUCT_RESTOCKING: "Approvisionnement",
  RESTOCKING: "Approvisionnement",
  COMMISSION_WITHDRAWAL: "Retrait de commission",
  WALLET_DEPOSIT: "Dépôt portefeuille",
}

const OPERATOR_TYPE_LABELS = {
  MERCHANT: "Commerçant",
  DISTRIBUTOR: "Distributeur",
}

const STATUS_CONFIG = {
  PENDING: { label: "En attente", classes: "bg-amber-100 text-amber-700" },
  VALIDATED: { label: "Validée", classes: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejetée", classes: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Complétée", classes: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Annulée", classes: "bg-gray-100 text-gray-600" },
}

const getOperationLabel = (op) =>
  OPERATION_TYPE_LABELS[op?.operationType] || op?.operationType || "Opération"

// L'acteur ayant soumis l'opération : le commerçant ou le distributeur
// concerné, selon operatorType.
const getActorName = (op) => {
  const actor = op?.operatorType === "MERCHANT" ? op?.merchant : op?.distributor
  const user = actor?.user
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  return name || OPERATOR_TYPE_LABELS[op?.operatorType] || "-"
}

export default function Dashboard_agent() {
  const { agentId, loading: authLoading } = useAuth()

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState("")

  const [operations, setOperations] = useState([])
  const [opsLoading, setOpsLoading] = useState(true)
  const [opsError, setOpsError] = useState("")

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  // Recherche texte : l'API n'expose pas de paramètre de recherche libre
  // (seulement status/startDate/endDate), donc ce filtre s'applique
  // uniquement sur la page actuellement chargée en mémoire, pas sur
  // l'ensemble des opérations côté serveur.
  const [search, setSearch] = useState("")

  const [selectedOperation, setSelectedOperation] = useState(null)

  const getToken = () => localStorage.getItem("token")

  /* ---------------- Statistiques ---------------- */
  useEffect(() => {
    if (authLoading || !agentId) return

    const fetchStats = async () => {
      setStatsLoading(true)
      setStatsError("")
      try {
        const token = getToken()
        const response = await axios.get(
          `${API_BASE}/admin-agents/${agentId}/statistics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        )
        setStats(response?.data?.data || null)
      } catch (error) {
        console.error(
          "Erreur fetch statistiques agent:",
          error?.response?.data || error.message
        )
        setStatsError(
          error?.response?.data?.message ||
            "Impossible de charger les statistiques"
        )
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [authLoading, agentId])

  /* ---------------- Liste des opérations ---------------- */
  useEffect(() => {
    if (authLoading || !agentId) return

    const fetchOperations = async () => {
      setOpsLoading(true)
      setOpsError("")
      try {
        const token = getToken()
        const response = await axios.get(
          `${API_BASE}/admin-agents/${agentId}/operations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            params: {
              page,
              limit: PAGE_LIMIT,
              ...(statusFilter ? { status: statusFilter } : {}),
            },
          }
        )

        setOperations(response?.data?.data || [])

        // ⚠️ À CONFIRMER : forme exacte de la pagination renvoyée par cet
        // endpoint (même pattern que /notifications/user -> pagination.totalPages
        // supposé ici ; à ajuster si le backend renvoie un autre format).
        const pagination = response?.data?.pagination
        setTotalPages(pagination?.totalPages || 1)
      } catch (error) {
        console.error(
          "Erreur fetch opérations agent:",
          error?.response?.data || error.message
        )
        setOpsError(
          error?.response?.data?.message ||
            "Impossible de charger les opérations"
        )
        setOperations([])
      } finally {
        setOpsLoading(false)
      }
    }

    fetchOperations()
  }, [authLoading, agentId, page, statusFilter])

  // Filtre texte appliqué uniquement sur la page déjà chargée (limite
  // expliquée plus haut, faute de paramètre de recherche côté API).
  const visibleOperations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return operations

    return operations.filter((op) =>
      [getOperationLabel(op), getActorName(op), op.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
  }, [operations, search])

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const totalValidations = stats?.totalValidations || 0
  const validatedOperations = stats?.validatedOperations || 0
  const rejectedOperations = stats?.rejectedOperations || 0
  const approvalRate = stats?.approvalRate || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 lg:space-y-8">

        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1 sm:mt-2">
            Vue d'ensemble de vos validations et opérations
          </p>
        </div>

        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{statsError}</p>
          </div>
        )}

        {/* KPIs — Validations / Validées / Rejetées / Taux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <AgentKPICard
            title="Validations"
            subtitle="Total"
            value={statsLoading ? "…" : totalValidations}
            icon={<CircleCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            variant="success"
          />
          <AgentKPICard
            title="Validées"
            subtitle="Opérations"
            value={statsLoading ? "…" : validatedOperations}
            icon={<CircleCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            variant="info"
          />
          <AgentKPICard
            title="Rejetées"
            subtitle="Opérations"
            value={statsLoading ? "…" : rejectedOperations}
            icon={<CircleX className="w-5 h-5 sm:w-6 sm:h-6" />}
            variant="danger"
          />
          <AgentKPICard
            title="Taux"
            subtitle="Approbation"
            value={statsLoading ? "…" : `${Number(approvalRate).toFixed(1)}%`}
            icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />}
            variant="warning"
          />
        </div>

        {/* Opérations récentes — tableau (desktop), filtre statut + recherche + pagination */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Validations récentes
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Vos dernières actions
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Filtre par statut — backend (paramètre "status") */}
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="text-sm rounded-lg bg-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/40"
              >
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="VALIDATED">Validée</option>
                <option value="REJECTED">Rejetée</option>
                <option value="COMPLETED">Complétée</option>
                <option value="CANCELLED">Annulée</option>
              </select>

              {/* Recherche — filtre la page actuellement chargée */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans cette page..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/40"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] sm:min-w-0">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Opération
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">
                    Montant
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                    Statut
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {opsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-4 py-10 text-center text-sm text-gray-400">
                      Chargement des opérations…
                    </td>
                  </tr>
                ) : opsError ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-4 py-10 text-center text-sm text-red-500">
                      {opsError}
                    </td>
                  </tr>
                ) : visibleOperations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-4 py-10 text-center text-sm text-gray-400">
                      Aucune opération ne correspond à votre recherche
                    </td>
                  </tr>
                ) : (
                  visibleOperations.map((op, index) => {
                    const statusInfo =
                      STATUS_CONFIG[op.status] || {
                        label: op.status,
                        classes: "bg-gray-100 text-gray-600",
                      }

                    return (
                      <tr
                        key={op.id}
                        className={`${
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        } border-b border-gray-100 hover:bg-gray-100 transition-colors`}
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {getOperationLabel(op)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                              {getActorName(op)}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                            {OPERATOR_TYPE_LABELS[op.operatorType] || op.operatorType}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(op.amount)}
                          </p>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(op.requestedAt || op.createdAt)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span
                            className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${statusInfo.classes}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOperation(op)}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1EA4DC] hover:bg-[#1EA4DC]/10 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Eye size={14} />
                            Voir détail
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (backend) */}
          {!opsLoading && !opsError && operations.length > 0 && (
            <div className="flex items-center justify-between mt-4 sm:mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-[#1EA4DC] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modale de détail d'une opération */}
      {selectedOperation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4"
          onClick={() => setSelectedOperation(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1EA4DC] to-[#0B2A6B] px-5 sm:px-6 py-4 sm:py-5">
              <p className="text-[11px] font-medium text-white/80">
                {OPERATOR_TYPE_LABELS[selectedOperation.operatorType] ||
                  selectedOperation.operatorType}
              </p>
              <p className="text-base sm:text-lg font-semibold text-white">
                {getOperationLabel(selectedOperation)}
              </p>
            </div>

            <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-3">
              <p className="text-sm text-gray-700">
                {selectedOperation.description}
              </p>

              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                  Montant
                </p>
                <p className="text-lg font-bold text-[#1EA4DC]">
                  {formatCurrency(selectedOperation.amount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Soumis par
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {getActorName(selectedOperation)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Statut
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {STATUS_CONFIG[selectedOperation.status]?.label ||
                      selectedOperation.status}
                  </p>
                </div>
              </div>

              {selectedOperation.status === "REJECTED" &&
                selectedOperation.rejectionReason && (
                  <div className="bg-red-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-red-400">
                      Motif du rejet
                    </p>
                    <p className="text-sm text-red-700 mt-0.5">
                      {selectedOperation.rejectionReason}
                    </p>
                  </div>
                )}

              <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                Demandée le{" "}
                {formatFullDate(
                  selectedOperation.requestedAt || selectedOperation.createdAt
                )}
              </div>
            </div>

            <div className="px-5 sm:px-6 pb-4 sm:pb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOperation(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-[#1EA4DC] hover:bg-[#1EA4DC]/10 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- COMPONENTS ---------- */

function AgentKPICard({ title, subtitle, value, icon, variant = "default" }) {
  const variantClasses = {
    default: "bg-blue-100 text-[#1EA4DC]",
    success: "bg-green-100 text-green-600",
    info: "bg-blue-100 text-blue-600",
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
  }

  const valueClasses = {
    default: "text-gray-900",
    success: "text-green-600",
    info: "text-blue-600",
    danger: "text-red-600",
    warning: "text-amber-600",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${variantClasses[variant]}`}>
        {icon}
      </div>
      <h3 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${valueClasses[variant]}`}>
        {value}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">{title}</p>
      <p className="text-[11px] sm:text-xs text-gray-400">{subtitle}</p>
    </div>
  )
}