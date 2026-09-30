import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ShieldCheck,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import axios from "axios"
import useAuth from "../context/auth/utils"

/* ═══════════════════════════════════════════════
  API
═══════════════════════════════════════════════ */

const API_BASE = "https://youapi.youneed.app/pollux/prod/api"

//  CONFIRMÉ : permissions groupées d'un utilisateur (agent connecté)
// GET /roles/users/:userId/permissions/grouped
const USER_PERMISSIONS_GROUPED_API = (userId) =>
  `${API_BASE}/roles/users/${userId}/permissions/grouped`

// D'après AuthProvider.jsx : en mode agent, userInfo EST l'objet "user"
// de l'agent (agentRecord.user), donc userInfo.id est le bon champ à
// envoyer à l'endpoint /roles/users/:userId/...
function resolveConnectedUserId(userInfo) {
  const userId = userInfo?.id || userInfo?.userId || null
  if (!userId) throw new Error("Identifiant de l'utilisateur manquant")
  return userId
}

// Récupère le token indépendamment de useAuth (même logique que Header.jsx)
function getToken() {
  try {
    const raw = localStorage.getItem("authData")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.token) return parsed.token
      if (parsed?.accessToken) return parsed.accessToken
    }
  } catch {
    // ignore
  }
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || null
}

/* ═══════════════════════════════════════════════
  LIBELLÉS DES MODULES (catégories affichées)
═══════════════════════════════════════════════ */
// ⚠️ À CONFIRMER si de nouveaux modules apparaissent côté API : ils
// s'afficheront quand même, avec un libellé déduit automatiquement
// (voir formatModuleLabel).
const MODULE_LABELS = {
  OPERATION_MANAGEMENT: "Gestion des opérations",
  ADMIN_AGENT_MANAGEMENT: "Gestion des agents administratifs",
  AUDIT_LOGS: "Journaux d'audit",
  BANK_MANAGEMENT: "Gestion des banques",
  CLIENT_MANAGEMENT: "Gestion des clients",
  DISTRIBUTOR_MANAGEMENT: "Gestion des distributeurs",
  MAIN_COMPANY_MANAGEMENT: "Gestion de l'entreprise",
  MERCHANT_MANAGEMENT: "Gestion des commerçants",
  OPERATION_REJECTION_CANCELLATION: "Rejet et annulation d'opérations",
  OPERATION_VALIDATION: "Validation des opérations",
  PAYMENT_PROOF_MANAGEMENT: "Preuves de paiement",
  PREPAID_CARD_MANAGEMENT: "Cartes prépayées",
  RECHARGE_MANAGEMENT: "Rechargements",
  REPLENISHMENT_MANAGEMENT: "Approvisionnements",
  REPORTS_ANALYTICS: "Rapports et statistiques",
  ROLE_MANAGEMENT: "Gestion des rôles",
  SERVICE_MANAGEMENT: "Gestion des services",
  STOCK_MANAGEMENT: "Gestion du stock",
  SUBPRODUCT_MANAGEMENT: "Gestion des sous-produits",
  SUBSCRIPTION_MANAGEMENT: "Gestion des abonnements",
  SUPPORT_MANAGEMENT: "Support",
  SYSTEM_SETTINGS: "Paramètres système",
  TRANSACTION_MANAGEMENT: "Gestion des transactions",
  USER_MANAGEMENT: "Gestion des utilisateurs",
  WALLET_MANAGEMENT: "Gestion des wallets",
  COMMISSION_MANAGEMENT: "Gestion des commissions",
}

// Libellé lisible pour un module inconnu, ex: "NEW_MODULE" -> "New module"
function formatModuleLabel(moduleKey) {
  if (!moduleKey) return "Autre"
  const readable = moduleKey.toLowerCase().replace(/_/g, " ")
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}

function getModuleLabel(moduleKey) {
  return MODULE_LABELS[moduleKey] || formatModuleLabel(moduleKey)
}

// Transforme la réponse groupée { MODULE: [permission, ...] } en liste plate
function flattenPermissions(grouped) {
  if (!grouped || typeof grouped !== "object") return []
  return Object.entries(grouped).flatMap(([moduleKey, perms]) =>
    (perms || []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      module: moduleKey,
      category: getModuleLabel(moduleKey),
    }))
  )
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

export default function MesPermissions() {
  // "permissions" ici = liste de codes déjà résolue de façon fiable par
  // AuthProvider via GET /roles/:roleId/permissions (utilisée aussi pour
  // can() ailleurs dans l'app). On la renomme pour ne pas entrer en
  // conflit avec l'état local "permissions" (liste enrichie affichée).
  const { userInfo, permissions: grantedCodes = [] } = useAuth()

  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("tous")

  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) throw new Error("Token manquant")

      const userId = resolveConnectedUserId(userInfo)

      const res = await axios.get(USER_PERMISSIONS_GROUPED_API(userId), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })

      const catalog = flattenPermissions(res.data?.data)

      // Sécurité supplémentaire : on ne garde que les permissions que
      // l'agent possède réellement, d'après son rôle (déjà résolu de
      // façon fiable via useAuth().permissions). Ça évite d'afficher tout
      // le catalogue si l'endpoint groupé ne filtre pas correctement par
      // utilisateur.
      const grantedSet = new Set(grantedCodes)
      const scoped =
        grantedSet.size > 0 ? catalog.filter((p) => grantedSet.has(p.code)) : catalog

      setPermissions(scoped)
    } catch (err) {
      // 404 = aucune permission trouvée pour cet utilisateur : pas une
      // vraie erreur, on affiche simplement une liste vide.
      if (err?.response?.status === 404) {
        setPermissions([])
      } else {
        setError(
          err?.response?.data?.description ||
            err?.response?.data?.message ||
            err.message ||
            "Impossible de charger les permissions"
        )
        setPermissions([])
      }
    } finally {
      setLoading(false)
    }
  }, [userInfo, grantedCodes])

  useEffect(() => {
    // On attend que userInfo soit chargé (via useAuth) avant d'appeler l'API
    if (userInfo) {
      fetchPermissions()
    }
  }, [userInfo, fetchPermissions])

  // Catégories dynamiques, déduites des permissions reçues
  const categories = useMemo(
    () => ["tous", ...Array.from(new Set(permissions.map((p) => p.category).filter(Boolean)))],
    [permissions]
  )

  // Filtrage (catégorie + recherche)
  const permissionsFiltrees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return permissions.filter((p) => {
      const categorieOk = activeCategory === "tous" || p.category === activeCategory
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      return categorieOk && searchOk
    })
  }, [permissions, search, activeCategory])

  // Pagination côté client
  const total = permissionsFiltrees.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const debut = (page - 1) * limit
  const permissionsPage = permissionsFiltrees.slice(debut, debut + limit)

  useEffect(() => {
    setPage(1)
  }, [search, activeCategory])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Mes permissions</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            {permissions.length} permission{permissions.length > 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Recherche + filtre catégorie */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-medium">Liste des permissions</h3>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une permission"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1EA4DC]"
              />
            </div>

            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full sm:w-auto border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1EA4DC]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "tous" ? "Toutes les catégories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 text-gray-400 py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
            <span className="text-sm">Chargement des permissions...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <div className="flex items-start sm:items-center gap-3 flex-1">
              <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
              <span className="flex-1 break-words">{error}</span>
            </div>
            <button
              onClick={fetchPermissions}
              className="w-full sm:w-auto bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Tableau */}
            <div className="rounded-xl overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[640px]">
                <thead className="bg-[#1EA4DC] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">N°</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Permission</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Catégorie</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsPage.length > 0 ? (
                    permissionsPage.map((item, index) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">{debut + index + 1}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.description || "-"}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge green>{item.category || "-"}</Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-8 text-gray-400">
                        {permissions.length === 0
                          ? "Aucune permission pour le moment"
                          : "Aucune permission ne correspond à votre recherche"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 sm:hidden">
              Faites glisser le tableau horizontalement pour voir plus de colonnes.
            </p>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-2 sm:p-4 text-sm text-gray-600">
              <span className="text-center sm:text-left">
                Affichage de {total === 0 ? 0 : debut + 1} à {debut + permissionsPage.length} sur {total} entrées
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="whitespace-nowrap">Lignes par page : {limit}</span>
                <button onClick={() => setPage(1)} disabled={page <= 1} className="disabled:opacity-30">
                  <ChevronsLeft size={18} />
                </button>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <span className="whitespace-nowrap">Page {page} sur {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="disabled:opacity-30">
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