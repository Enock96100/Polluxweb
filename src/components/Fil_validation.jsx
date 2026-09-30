import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  RefreshCw,
  Eye,
  Trash2,
} from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import useAuth from "../context/auth/utils"

/* ===================== CONFIG API ===================== */

const BASE_URL = "https://youapi.youneed.app/pollux/prod/api"

// Mapping UI label → valeur API pour operationType
// ⚠️ SYNCHRONISÉ avec l'enum réellement documenté par le back (Swagger) :
// SUBPRODUCT_RESTOCKING, PREPAID_CARD_ACTIVATION, PREPAID_CARD_RECHARGE,
// CANAL_SUBSCRIPTION_NEW, CANAL_SUBSCRIPTION_RENEWAL, WALLET_DEPOSIT,
// COMMISSION_WITHDRAWAL, MANUAL_ADJUSTMENT.
// Les valeurs "CANAL_SUBSCRIPTION_FORMULA_CHANGE" et
// "CANAL_SUBSCRIPTION_REACTIVATION" ont été retirées car elles
// n'existent pas dans l'enum operationType exposé par l'API : les
// envoyer faisait échouer/fausser le filtrage côté back.
const OPERATION_TYPES = [
  { label: "Tous",                          apiValue: null },
  { label: "Réapprovisionnement",           apiValue: "SUBPRODUCT_RESTOCKING" },
  { label: "Activation Carte",              apiValue: "PREPAID_CARD_ACTIVATION" },
  { label: "Recharge Carte",               apiValue: "PREPAID_CARD_RECHARGE" },
  { label: "Nouvel Abonnement Canal",       apiValue: "CANAL_SUBSCRIPTION_NEW" },
  { label: "Renouvellement Canal+",         apiValue: "CANAL_SUBSCRIPTION_RENEWAL" },
  { label: "Dépôt Wallet",                  apiValue: "WALLET_DEPOSIT" },
  { label: "Retrait Commission",            apiValue: "COMMISSION_WITHDRAWAL" },
  { label: "Ajustement Manuel",             apiValue: "MANUAL_ADJUSTMENT" },
]

// Mapping inverse apiValue → label, généré automatiquement à partir de OPERATION_TYPES
// (évite de dupliquer la liste et reste synchronisé si on ajoute un type plus tard)
const OPERATION_TYPE_LABELS = OPERATION_TYPES.reduce((acc, { label, apiValue }) => {
  if (apiValue) acc[apiValue] = label
  return acc
}, {})

// Mapping UI tab → valeur API pour status
const STATUS_MAP = {
  "En attente": "PENDING",
  "Validées":   "VALIDATED",
  "Rejetées":   "REJECTED",
  "Annulées":   "CANCELLED",
}

// Statuts utilisés pour calculer les compteurs synoptiques (StatCards)
const STATS_STATUSES = ["PENDING", "VALIDATED", "COMPLETED", "REJECTED", "CANCELLED"]

// Taille de page utilisée pour compter les opérations par statut/type.
// ⚠️ La limite maximale acceptée par l'API pour /operations est 20 (au-delà,
// le back plafonne silencieusement le résultat) : il faut donc paginer par
// lots de 20 et enchaîner sur la page suivante tant qu'une page pleine est
// reçue, pour obtenir un total exact.
const STATS_PAGE_SIZE = 20
// Garde-fou anti boucle infinie si jamais l'API ne renvoie jamais un lot
// incomplet (ex. réponse mal formée) : 200 pages × 20 = 4 000 lignes max.
const STATS_MAX_PAGES = 200

// Compte le nombre exact d'opérations correspondant à un statut (+ un type
// d'opération optionnel) en paginant page par page tant que la page reçue
// est pleine (= il peut y avoir une page suivante).
async function countOperations({ status, apiOpType, headers }) {
  let total = 0
  let page = 1

  while (page <= STATS_MAX_PAGES) {
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(STATS_PAGE_SIZE),
      ...(status    && { status }),
      ...(apiOpType && { operationType: apiOpType }),
    })
    const res = await fetch(`${BASE_URL}/operations?${params.toString()}`, { headers })
    if (!res.ok) throw new Error("Erreur lors de la récupération des statistiques filtrées")
    const d = await res.json()
    const rawList = d?.data || d?.operations || []

    total += rawList.length

    // Page incomplète (ou vide) → c'était la dernière page
    if (rawList.length < STATS_PAGE_SIZE) break

    page += 1
  }

  return total
}

/* ===================== HELPERS AUTH ===================== */

function getAuthData() {
  return {
    token:
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      "",
    companyId: localStorage.getItem("companyId") || "",
  }
}

const resolveCompanyId = async () => {
  const { token, companyId } = getAuthData()
  if (!token) throw new Error("Token manquant")
  if (companyId) return { token, companyId }

  const response = await fetch(`${BASE_URL}/auth/profile`, {
    headers: { accept: "application/json", Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Profil inaccessible")
  const profile = await response.json()

  const resolvedId =
    profile?.company?.id ||
    profile?.data?.company?.id ||
    profile?.companyId ||
    profile?.data?.companyId ||
    profile?.id ||
    null

  if (!resolvedId) throw new Error("CompanyId introuvable")
  localStorage.setItem("companyId", resolvedId)
  return { token, companyId: resolvedId }
}

/* ===================== MAPPERS API → UI ===================== */

function mapStatus(s) {
  const map = {
    PENDING:   "En attente",
    VALIDATED: "Validées",
    COMPLETED: "Validées",
    REJECTED:  "Rejetées",
    CANCELLED: "Annulées",
  }
  return map[s] || s || "En attente"
}

// ✅ Traduit op.operationType (valeur API brute, ex. "SUBPRODUCT_RESTOCKING")
// en libellé lisible côté UI (ex. "Réapprovisionnement") via OPERATION_TYPE_LABELS.
// Fallback : si un nouveau type API arrive sans être encore ajouté à OPERATION_TYPES,
// on retombe sur l'ancien affichage (underscores remplacés par des espaces)
// pour ne jamais laisser un champ vide.
function mapOperationName(operationType) {
  if (!operationType) return "—"
  return OPERATION_TYPE_LABELS[operationType] || operationType.replace(/_/g, " ")
}

function mapOperation(op) {
  const actor = op.distributor || op.merchant || op.client
  const user = actor?.user || {}
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    actor?.businessName ||
    "—"

  const actorType =
    op.operatorType === "DISTRIBUTOR"
      ? "Distributeur"
      : op.operatorType === "MERCHANT"
      ? "Commerçant"
      : op.operatorType || "—"

  const dateObj = op.requestedAt ? new Date(op.requestedAt) : null
  const date  = dateObj ? dateObj.toLocaleDateString("fr-FR") : "—"
  const heure = dateObj
    ? dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "—"

  const amt = op.amount
    ? Number(op.amount).toLocaleString("fr-FR") + " FCFA"
    : "—"

  // Nom de la banque (dispo sur PREPAID_CARD_ACTIVATION et PREPAID_CARD_RECHARGE)
  const bankName =
    op.metadata?.bank?.name ||
    op.subProduct?.bank?.name ||
    null

  return {
    id:             op.id,
    idOperation:    op.id || "—",
    operationName:  mapOperationName(op.operationType),
    operationDetail: op.description || "—",
    montant:        amt,
    operateur:      fullName,
    operateurType:  actorType,
    bankName,
    date,
    heure,
    status:    mapStatus(op.status),
    rawStatus: op.status,
  }
}

/* ===================== MAIN COMPONENT ===================== */

export default function FileDeValidation() {
  const navigate = useNavigate()

  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  // ⚠️ Adapter OPERATION_READ / OPERATION_DELETE aux codes réels exposés
  // par le back si différents (même logique que SERVICE_READ/DELETE
  // dans Produits.jsx).
  const { can } = useAuth()
  const canViewOperation   = can("OPERATION_READ")
  const canDeleteOperation = can("OPERATION_DELETE")

  // Onglet statut actif
  const [activeTab, setActiveTab] = useState("En attente")
  // Index du type d'opération actif
  const [activeOperationType, setActiveOperationType] = useState(0)

  // Données
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({
    pending: 0, validated: 0, rejected: 0, cancelled: 0, totalAmount: "0 FCFA",
  })

  // État UI
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState("")

  // Pagination côté API
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalItems,  setTotalItems]  = useState(0)

  /* ================= FETCH DATA ================= */
  const fetchData = useCallback(async (page = 1, limit = 10) => {
    setLoading(true)
    setError(null)
    try {
      const { token, companyId } = await resolveCompanyId()

      // ---- Paramètres de filtrage dynamiques ----
      const apiOpType = OPERATION_TYPES[activeOperationType].apiValue
      const headers   = { accept: "application/json", Authorization: `Bearer ${token}` }

      const buildParams = (status, overrideLimit, overridePage) => {
        const p = new URLSearchParams({
          page:  String(overridePage ?? page),
          limit: String(overrideLimit ?? limit),
          ...(status    && { status }),
          ...(apiOpType && { operationType: apiOpType }),
        })
        return p.toString()
      }

      // ---- 1) Requête pour le tableau (dépend de l'onglet statut actif) ----
      // Le total réel est calculé via `countOperations` (parcours exact des
      // pages) plutôt que via un champ "total" de l'API dont la fiabilité
      // n'est pas garantie — c'est ce total exact qui pilote la pagination
      // (totalPages), donc "page suivante" fonctionne désormais correctement.
      const tablePromise = (async () => {
        if (activeTab === "Validées") {
          // "Validées" regroupe VALIDATED + COMPLETED → requêtes parallèles
          const [resV, resC, totalV, totalC] = await Promise.all([
            fetch(`${BASE_URL}/operations?${buildParams("VALIDATED")}`, { headers }),
            fetch(`${BASE_URL}/operations?${buildParams("COMPLETED")}`, { headers }),
            countOperations({ status: "VALIDATED", apiOpType, headers }),
            countOperations({ status: "COMPLETED", apiOpType, headers }),
          ])
          if (!resV.ok || !resC.ok) throw new Error("Erreur lors de la récupération des données")
          const [dataV, dataC] = await Promise.all([resV.json(), resC.json()])

          const rawV = dataV?.data || dataV?.operations || []
          const rawC = dataC?.data || dataC?.operations || []

          return { raw: [...rawV, ...rawC], total: totalV + totalC }
        }

        const apiStatus = STATUS_MAP[activeTab]
        const [opsRes, total] = await Promise.all([
          fetch(`${BASE_URL}/operations?${buildParams(apiStatus)}`, { headers }),
          countOperations({ status: apiStatus, apiOpType, headers }),
        ])
        if (!opsRes.ok) throw new Error("Erreur lors de la récupération des données")
        const opsData = await opsRes.json()
        const raw = opsData?.data || opsData?.operations || []
        return { raw, total }
      })()

      // ---- 2) Dashboard global (utilisé pour le montant total et comme fallback
      //          des compteurs quand le filtre "Tous" est actif) ----
      const dashPromise = fetch(
        `${BASE_URL}/operations/dashboard?companyId=${companyId}`,
        { headers }
      )

      // ---- 3) Compteurs synoptiques filtrés par type d'opération.
      //          Uniquement lancée quand un type précis (≠ "Tous") est sélectionné :
      //          on compte, pour chaque statut, le nombre exact d'opérations
      //          correspondant à ce type en parcourant les pages une à une
      //          (voir `countOperations`), sans dépendre d'un champ "total"
      //          hypothétique renvoyé par l'API. ----
      const filteredStatsPromise = apiOpType
        ? Promise.all(
            STATS_STATUSES.map((status) => countOperations({ status, apiOpType, headers }))
          )
        : null

      const [tableResult, dashRes, filteredTotals] = await Promise.all([
        tablePromise,
        dashPromise,
        filteredStatsPromise,
      ])

      if (!dashRes.ok) throw new Error("Erreur lors de la récupération du dashboard")
      const dashData = await dashRes.json()
      const s = dashData?.data?.statistics || {}
      const totalAmount = s.totalAmount
        ? Number(s.totalAmount).toLocaleString("fr-FR") + " FCFA"
        : "0 FCFA"

      if (filteredTotals) {
        // Un type d'opération précis est sélectionné → compteurs filtrés
        const [pendingT, validatedT, completedT, rejectedT, cancelledT] = filteredTotals
        setStats({
          pending:   pendingT,
          validated: validatedT + completedT,
          rejected:  rejectedT,
          cancelled: cancelledT,
          totalAmount,
        })
      } else {
        // "Tous" est sélectionné → compteurs globaux du dashboard
        setStats({
          pending:   s.pending   ?? 0,
          validated: (s.validated ?? 0) + (s.completed ?? 0),
          rejected:  s.rejected  ?? 0,
          cancelled: s.cancelled ?? 0,
          totalAmount,
        })
      }

      // Opérations + total pour pagination
      setTransactions(tableResult.raw.map(mapOperation))
      setTotalItems(tableResult.total)
    } catch (err) {
      console.error("ERREUR fetchData :", err)
      setError(err.message || "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [activeTab, activeOperationType])   // ← se re-exécute si l'un ou l'autre change

  // Rechargement auto quand les filtres ou la page changent
  useEffect(() => {
    fetchData(currentPage, rowsPerPage)
  }, [fetchData, currentPage, rowsPerPage])

  /* ================= HANDLERS ================= */
  const handleDetail = (id) => {
    if (!id) return
    localStorage.setItem("lastOperationId", id)
    navigate(`/detail_op_attente/${id}`)
  }

  const handleTabChange = (i) => {
    setActiveOperationType(i)
    setCurrentPage(1)
  }

  const handleSelectStatus = (value) => {
    setActiveTab(value)
    setCurrentPage(1)
  }

  const handleSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  /* ================= FILTRAGE LOCAL (recherche texte) ================= */
  // Les filtres status/operationType sont gérés par l'API.
  // On garde uniquement le filtre textuel côté client.
  const filteredData = transactions.filter((item) => {
    if (!search) return true
    return [item.idOperation, item.operationName, item.operateur, item.montant].some(
      (v) => v.toLowerCase().includes(search.toLowerCase())
    )
  })

  // Pagination : totaux viennent de l'API
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1
  const start = (currentPage - 1) * rowsPerPage
  const end   = Math.min(start + rowsPerPage, totalItems)

  const tabLabel =
    activeTab === "En attente" ? "Opérations en Attente"
    : activeTab === "Validées" ? "Opérations Validées"
    : activeTab === "Rejetées" ? "Opérations Rejetées"
    : "Opérations Annulées"

  const isTableType1 = activeOperationType === 2 || activeOperationType === 3
  const isTableType2 = activeOperationType >= 4 && activeOperationType <= 8

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F5F7FA] min-h-screen">

      {/* TITRE PRINCIPAL */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Liste des Opérations</h1>
          <button
            onClick={() => fetchData(currentPage, rowsPerPage)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50 self-start"
          >
            {loading ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <RefreshCw size={14} />
            )}
            Actualiser
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-0.5">Opérations en attente de validation manuelle</p>
      </div>

      {/* TABS TYPES D'OPÉRATIONS */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-1 sm:pb-0 no-scrollbar">
        {OPERATION_TYPES.map((opType, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors ${
              i === activeOperationType
                ? "bg-[#1EA4DC] text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {opType.label}
          </button>
        ))}
      </div>

      {/* COMPTEURS SYNOPTIQUES (reflètent le type d'opération sélectionné) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard title="Opérations en attente" value={loading ? "…" : String(stats.pending)} />
        <StatCard title="Opérations validées"   value={loading ? "…" : String(stats.validated)} />
        <StatCard title="Opérations rejetées"   value={loading ? "…" : String(stats.rejected)} />
        <StatCard title="Opérations annulées"   value={loading ? "…" : String(stats.cancelled ?? 0)} />
      </div>

      {/* MESSAGE D'ERREUR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* TABLEAU / BLOC PRINCIPAL */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* ENTÊTE DU BLOC */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <h2 className="font-semibold text-gray-800 text-base sm:text-lg">{tabLabel}</h2>
            <p className="text-gray-400 text-sm">
              {loading ? "Chargement…" : `${totalItems} transaction${totalItems !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* BARRE DE RECHERCHE + SELECT STATUT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 focus:bg-white text-sm transition-all"
            />
          </div>

          <select
            value={activeTab}
            onChange={(e) => handleSelectStatus(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 shadow-sm cursor-pointer"
          >
            <option value="En attente">En attente</option>
            <option value="Validées">Validées</option>
            <option value="Rejetées">Rejetées</option>
            <option value="Annulées">Annulées</option>
          </select>
        </div>

        {/* STRUCTURE DU TABLEAU — même style que Produits.jsx */}
        <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
          {activeOperationType === 0 ? (
            <TableDefault
              loading={loading}
              data={filteredData}
              start={start}
              onDetail={handleDetail}
              canView={canViewOperation}
              canDelete={canDeleteOperation}
            />
          ) : activeOperationType === 1 ? (
            <TableReapprovisionnement
              loading={loading}
              data={filteredData}
              start={start}
              onDetail={handleDetail}
              canView={canViewOperation}
            />
          ) : isTableType1 ? (
            <TableType1
              loading={loading}
              data={filteredData}
              start={start}
              onDetail={handleDetail}
              canView={canViewOperation}
            />
          ) : isTableType2 ? (
            <TableType2
              loading={loading}
              data={filteredData}
              start={start}
              onDetail={handleDetail}
              canView={canViewOperation}
            />
          ) : null}
        </div>

        {/* PAGINATION — même composant et rendu que Produits.jsx */}
        <PaginationFooter
          total={totalItems}
          start={totalItems > 0 ? start + 1 : 0}
          end={end}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={(n) => { setRowsPerPage(n); setCurrentPage(1) }}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}

/* ===================== TABLEAUX (style Produits.jsx : thead bleu, lignes alternées, hover bleu) ===================== */

function TableDefault({ loading, data, start, onDetail, canView, canDelete }) {
  return (
    <table className="table-auto min-w-[820px] w-full text-sm">
      <thead className="bg-[#1EA4DC] text-white">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">N°</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-1/5">ID Opération</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-1/4">Opération</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Montant</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Opérateur</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
          <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRow colSpan={8} />
        ) : data.length > 0 ? (
          data.map((item, i) => (
            <TransactionRow
              key={item.id}
              {...item}
              id={start + i + 1}
              alt={i % 2 !== 0}
              onDetail={() => onDetail(item.id)}
              onSupprimer={() => console.log("Supprimer :", item.id)}
              canView={canView}
              canDelete={canDelete}
            />
          ))
        ) : (
          <EmptyRow colSpan={8} />
        )}
      </tbody>
    </table>
  )
}

function TableReapprovisionnement({ loading, data, start, onDetail, canView }) {
  return (
    <table className="table-auto min-w-[720px] w-full text-sm">
      <thead className="bg-[#1EA4DC] text-white">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Opérations</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Quantité carte / Prix</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle / Date</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
          <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Détails</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRow colSpan={6} />
        ) : data.length > 0 ? (
          data.map((item, i) => (
            <ReapprovisionnementRow
              key={item.id}
              {...item}
              id={start + i + 1}
              alt={i % 2 !== 0}
              onDetail={() => onDetail(item.id)}
              canView={canView}
            />
          ))
        ) : (
          <EmptyRow colSpan={6} />
        )}
      </tbody>
    </table>
  )
}

function TableType1({ loading, data, start, onDetail, canView }) {
  return (
    <table className="table-auto min-w-[720px] w-full text-sm">
      <thead className="bg-[#1EA4DC] text-white">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Opérations</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Description</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle / Date</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
          <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Détails</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRow colSpan={6} />
        ) : data.length > 0 ? (
          data.map((item, i) => (
            <TableType1Row
              key={item.id}
              {...item}
              id={start + i + 1}
              alt={i % 2 !== 0}
              onDetail={() => onDetail(item.id)}
              canView={canView}
            />
          ))
        ) : (
          <EmptyRow colSpan={6} />
        )}
      </tbody>
    </table>
  )
}

function TableType2({ loading, data, start, onDetail, canView }) {
  return (
    <table className="table-auto min-w-[720px] w-full text-sm">
      <thead className="bg-[#1EA4DC] text-white">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Opérations</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Description</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date</th>
          <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
          <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Détails</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRow colSpan={6} />
        ) : data.length > 0 ? (
          data.map((item, i) => (
            <TableType2Row
              key={item.id}
              {...item}
              id={start + i + 1}
              alt={i % 2 !== 0}
              onDetail={() => onDetail(item.id)}
              canView={canView}
            />
          ))
        ) : (
          <EmptyRow colSpan={6} />
        )}
      </tbody>
    </table>
  )
}

/* ===================== ROWS ===================== */

function LoadingRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <svg className="animate-spin w-5 h-5 text-[#1EA4DC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Chargement des opérations…</span>
        </div>
      </td>
    </tr>
  )
}

function EmptyRow({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
        Aucune opération enregistrée sous ce statut
      </td>
    </tr>
  )
}

/* ===================== MENU D'ACTIONS (PORTAL) ===================== */
/*
   CORRECTION DU BUG "menu caché / coupé" :
   Le menu de la ligne était en `position: absolute`, imbriqué dans le
   <td>/<tr> d'un tableau enveloppé par un conteneur `overflow-x-auto`
   (voir le wrapper autour de <TableDefault /> etc.). Dès que le menu
   dépassait la zone visible (dernière ligne, bord de tableau, scroll
   horizontal), il était tronqué ou totalement invisible.

   Solution : on calcule la position réelle du bouton "⋯" à l'écran
   (getBoundingClientRect) et on rend le menu via un PORTAL React
   (createPortal) directement dans <body>, en position `fixed`. Le menu
   n'est donc plus soumis à l'overflow du tableau et reste toujours
   entièrement visible, y compris sur mobile.

   AJOUT PERMISSIONS (même logique que ActionMenu dans Produits.jsx) :
   chaque action ("Détail" / "Supprimer") est désormais conditionnée à
   showDetail/showDelete — si aucune des deux n'est autorisée pour la
   ligne, le bouton "⋯" n'est même pas rendu.
*/

const ACTION_MENU_PORTAL_CLASS = "row-action-menu-portal"

function RowActionMenu({ onDetail, onSupprimer, showDetail = true, showDelete = true }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const [coords, setCoords] = useState(null) // { top, left, openUpward }

  const MENU_WIDTH  = 160 // ~ w-40
  const MENU_HEIGHT = 100 // estimation (2 items)
  const MENU_MARGIN = 8

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()

    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward  = spaceBelow < MENU_HEIGHT + MENU_MARGIN

    let left = rect.right - MENU_WIDTH
    left = Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    left = Math.max(left, MENU_MARGIN)

    const top = openUpward
      ? rect.top - MENU_MARGIN
      : rect.bottom + MENU_MARGIN

    setCoords({ top, left, openUpward })
  }, [])

  // Recalcule/maintient la position tant que le menu est ouvert
  useEffect(() => {
    if (!open) return
    computePosition()

    const handleReposition = () => computePosition()
    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleReposition)
    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleReposition)
    }
  }, [open, computePosition])

  // Fermeture au clic en dehors (bouton + menu porté)
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      const clickedButton = buttonRef.current && buttonRef.current.contains(e.target)
      const clickedMenu    = e.target.closest && e.target.closest(`.${ACTION_MENU_PORTAL_CLASS}`)
      if (!clickedButton && !clickedMenu) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Aucune action autorisée pour cette ligne → on n'affiche même pas le "⋯"
  if (!showDetail && !showDelete) return null

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && coords && createPortal(
        <div
          className={`${ACTION_MENU_PORTAL_CLASS} fixed z-[100] w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5`}
          style={{
            top:    coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left:   coords.left,
          }}
        >
          {showDetail && (
            <button
              onClick={() => { setOpen(false); onDetail?.() }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye size={16} className="text-gray-500" /> Détail
            </button>
          )}
          {showDelete && (
            <button
              onClick={() => { setOpen(false); onSupprimer?.() }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} className="text-red-400" /> Supprimer
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function TransactionRow({
  id, idOperation, operationName, operationDetail, montant,
  operateur, operateurType, date, heure, status, alt, onDetail, onSupprimer,
  canView, canDelete,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(idOperation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 font-semibold text-gray-700 text-center text-sm whitespace-nowrap">{id}</td>
      <td
        className="px-4 py-3 font-semibold text-gray-700 tracking-tight text-xs font-mono break-all cursor-pointer hover:text-[#1EA4DC] transition-colors"
        title={idOperation}
        onClick={handleCopyId}
      >
        {idOperation.length > 8 ? `${idOperation.substring(0, 8)}…` : idOperation}
        {copied && <span className="text-green-600 text-xs ml-1">(✓)</span>}
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operationName}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{operationDetail}</p>
      </td>
      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{montant}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operateur}</p>
        {operateurType && operateurType !== "—" && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-500 border border-purple-100">
            {operateurType}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        <p className="text-sm font-medium">{date}</p>
        <p className="text-xs text-gray-400 mt-0.5">{heure}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusBadgeClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <RowActionMenu
          onDetail={onDetail}
          onSupprimer={onSupprimer}
          showDetail={canView}
          showDelete={canDelete}
        />
      </td>
    </tr>
  )
}

function ReapprovisionnementRow({ id, operationName, operationDetail, montant, operateurType, date, status, alt, onDetail, canView }) {
  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 font-semibold text-gray-700 text-center text-sm whitespace-nowrap">{id}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operationName}</p>
        {operationDetail && operationDetail !== "—" && (
          <p className="text-xs text-gray-400 mt-0.5">{operationDetail}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">1 Carte</p>
        <p className="text-xs text-gray-500 mt-0.5">{montant}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operateurType}</p>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${statusBadgeClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {canView && (
          <button onClick={onDetail} className="text-gray-400 hover:text-[#1EA4DC] transition-colors p-1 rounded-lg hover:bg-gray-100">
            <Eye size={18} />
          </button>
        )}
      </td>
    </tr>
  )
}

function TableType1Row({ id, operationName, operationDetail, operateurType, bankName, date, status, alt, onDetail, canView }) {
  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 font-semibold text-gray-700 text-center text-sm whitespace-nowrap">{id}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operationName}</p>
        {bankName && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-500 border border-blue-100">
            {bankName}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm truncate max-w-[200px]">{operationDetail}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operateurType}</p>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${statusBadgeClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {canView && (
          <button onClick={onDetail} className="text-gray-400 hover:text-[#1EA4DC] transition-colors p-1 rounded-lg hover:bg-gray-100">
            <Eye size={18} />
          </button>
        )}
      </td>
    </tr>
  )
}

function TableType2Row({ id, operationName, operationDetail, operateurType, date, status, alt, onDetail, canView }) {
  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 font-semibold text-gray-700 text-center text-sm whitespace-nowrap">{id}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 text-sm">{operationName}</p>
        {operateurType && operateurType !== "—" && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-500 border border-purple-100">
            {operateurType}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm truncate max-w-[200px]">{operationDetail}</td>
      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{date}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${statusBadgeClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {canView && (
          <button onClick={onDetail} className="text-gray-400 hover:text-[#1EA4DC] transition-colors p-1 rounded-lg hover:bg-gray-100">
            <Eye size={18} />
          </button>
        )}
      </td>
    </tr>
  )
}

/* ===================== COMPOSANTS UTILITAIRES ===================== */

function StatCard({ title, value }) {
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col space-y-1 sm:space-y-2 border border-blue-50/50 min-w-0">
      <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest truncate">{title}</p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1EA4DC]">{value}</p>
    </div>
  )
}

function statusBadgeClass(status) {
  if (status === "Validées")  return "bg-green-50 text-green-600 border-green-100"
  if (status === "Rejetées")  return "bg-red-50 text-red-500 border-red-100"
  if (status === "Annulées")  return "bg-gray-50 text-gray-500 border-gray-200"
  return "bg-amber-50 text-amber-600 border-amber-100"
}

/* ===================== PAGINATION (copie exacte du style/rendu de Produits.jsx) ===================== */

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  const isFirstPage = currentPage <= 1
  const isLastPage  = currentPage >= totalPages

  const btnClass = (disabled) =>
    `p-1.5 rounded-md transition-colors ${
      disabled
        ? "text-gray-200 cursor-not-allowed"
        : "text-gray-400 hover:text-[#1EA4DC] hover:bg-blue-50"
    }`

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-gray-200 pt-4 text-xs sm:text-sm">
      <span className="text-center sm:text-left">
        {total > 0 ? `Affichage de ${start} à ${end} sur ${total} entrées` : "Aucune entrée à afficher"}
      </span>
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-gray-500 whitespace-nowrap hidden sm:inline">Par page</label>
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(+e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs sm:text-sm bg-white"
          >
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={isFirstPage}
            aria-label="Première page"
            className={btnClass(isFirstPage)}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={isFirstPage}
            aria-label="Page précédente"
            className={btnClass(isFirstPage)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-600 whitespace-nowrap px-1.5 font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={isLastPage}
            aria-label="Page suivante"
            className={btnClass(isLastPage)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={isLastPage}
            aria-label="Dernière page"
            className={btnClass(isLastPage)}
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}