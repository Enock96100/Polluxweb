import { Search, Eye, RefreshCw, AlertCircle, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"

/* ══════════════════════════════════════════════
   GESTION DES PIN — Liste des types d'opérateurs
   ══════════════════════════════════════════════ */

/* ✅ CONFIRMÉ */
const MERCHANTS_API    = "https://youapi.youneed.app/pollux/dev/api/merchants/companies"
/* ✅ CONFIRMÉ */
const DISTRIBUTORS_API = "https://youapi.youneed.app/pollux/dev/api/distributors/by-company"
/* ✅ CONFIRMÉ */
const AGENTS_API       = "https://youapi.youneed.app/pollux/dev/api/admin-agents/company"
/* ⚠️ À CONFIRMER : endpoint dédié à l'entreprise principale (aucun curl fourni pour celui-ci,
   la structure vient d'un exemple Swagger). En attendant on retombe sur fetchProfile(). */
const COMPANY_API      = "https://youapi.youneed.app/pollux/dev/api/companies"

const OPERATEUR_DEFS = [
  { id: "entreprise-principale", nom: "Entreprise Principale", description: "" },
  { id: "agent-admin",           nom: "Agent Admin",           description: "Agents internes de l'entreprise" },
  { id: "distributeur",          nom: "Distributeur",          description: "Réseau de distribution" },
  { id: "commercant",            nom: "Commerçant",             description: "Commerçants partenaires" },
]

/* ⚠️ À CONFIRMER : les endpoints fournis ne montrent pas de champ "meta.total".
   En attendant, on utilise la longueur du tableau "data" (avec limit=100) comme
   approximation du total. À remplacer dès qu'un champ de pagination est confirmé. */
function extractTotal(res) {
  return (
    res?.data?.meta?.total ??
    res?.data?.total ??
    (Array.isArray(res?.data?.data) ? res.data.data.length : 0)
  )
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-sm bg-red-50 border border-red-200 text-red-700">
      <AlertCircle size={18} className="shrink-0 text-red-500" />
      <span className="flex-1 break-words">{message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"><X size={16} /></button>
    </div>
  )
}

export default function Gpin() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [operateurs, setOperateurs] = useState(OPERATEUR_DEFS.map((o) => ({ ...o, nbOperateurs: null })))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile?.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")

      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" }
      const params  = { page: 1, limit: 100 }

      const [merchantsRes, distributorsRes, agentsRes, companyRes] = await Promise.allSettled([
        axios.get(`${MERCHANTS_API}/${companyId}`, { headers, params }),
        axios.get(`${DISTRIBUTORS_API}/${companyId}`, { headers, params }),
        axios.get(`${AGENTS_API}/${companyId}`, { headers, params }),
        axios.get(`${COMPANY_API}/${companyId}`, { headers }), // ⚠️ endpoint non confirmé
      ])

      setOperateurs((prev) =>
        prev.map((op) => {
          if (op.id === "commercant") {
            return {
              ...op,
              nbOperateurs: merchantsRes.status === "fulfilled" ? extractTotal(merchantsRes.value) : 0,
            }
          }
          if (op.id === "distributeur") {
            return {
              ...op,
              nbOperateurs: distributorsRes.status === "fulfilled" ? extractTotal(distributorsRes.value) : 0,
            }
          }
          if (op.id === "agent-admin") {
            return {
              ...op,
              nbOperateurs: agentsRes.status === "fulfilled" ? extractTotal(agentsRes.value) : 0,
            }
          }
          if (op.id === "entreprise-principale") {
            const company = companyRes.status === "fulfilled" ? companyRes.value?.data?.data : null
            return {
              ...op,
              nom: company?.name || op.nom,
              description: company?.address || company?.email || "",
              nbOperateurs: 1,
            }
          }
          return op
        })
      )
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Impossible de charger les opérateurs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  const filteredData = operateurs.filter((item) => {
    const searchText = `${item.nom} ${item.description}`.toLowerCase()
    return !searchQuery || searchText.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Gestion des PIN</h1>
          <p className="text-gray-500 text-xs sm:text-sm lg:text-base">Types d'opérateurs</p>
        </div>
        <button
          onClick={fetchCounts}
          disabled={loading}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Rafraîchir"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="font-semibold text-base sm:text-lg">Sélectionner un type d'opérateur</h2>
        </div>

        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 py-2 rounded-lg bg-gray-100 text-sm sm:text-base"
          />
        </div>

        <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
          <table className="table-auto min-w-[640px] w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Opérateurs</th>
                <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, i) => (
                  <tr key={item.id} className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-3 font-medium">{item.nom}</td>
                    <td className="px-4 py-3 max-w-xs whitespace-normal break-words text-gray-600">{item.description || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.nbOperateurs === null ? <span className="text-gray-400">…</span> : item.nbOperateurs}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/detail_operateur/${item.id}`)}
                        className="inline-flex items-center gap-1.5 text-[#1EA4DC] hover:text-[#0B2A6B] font-medium text-sm transition-colors"
                        aria-label={`Voir détails ${item.nom}`}
                      >
                        <Eye size={16} />
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400">
                    {loading ? "Chargement..." : "Aucun opérateur trouvé"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}