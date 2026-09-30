import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import axios from "axios"

/* ---------- Fonctions utilitaires d'authentification ---------- */
const getAuthData = () => {
  const token = localStorage.getItem("token")
  const companyId = localStorage.getItem("companyId")
  return { token, companyId }
}

const fetchProfile = async () => {
  try {
    const token = localStorage.getItem("token")
    const response = await axios.get("https://youapi.youneed.app/pollux/prod/api/profile", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    })
    return response?.data?.data
  } catch (e) {
    return null
  }
}

/* ===================== MAIN COMPONENT ===================== */

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState("vue-ensemble")
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // ── Recherche & pagination (même comportement que Produits.jsx) ──
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        setError("")

        let { token, companyId } = getAuthData()

        if (!token) throw new Error("Token manquant")

        // Si companyId absent → on recharge le profil
        if (!companyId) {
          console.log("CompanyId absent, récupération du profil...")
          
          const profile = await fetchProfile()

          if (!profile) {
            throw new Error("Impossible de récupérer le profil")
          }

          companyId = profile?.company?.id // FIX IMPORTANT
        }

        if (!companyId) {
          throw new Error("CompanyId manquant")
        }

        console.log("TOKEN:", token)
        console.log("COMPANY ID:", companyId)

        // Récupération simultanée des deux API
        const [statsResponse, agentsResponse] = await Promise.all([
          axios.get(
            `https://youapi.youneed.app/pollux/dev/api/main-companies/companies/${companyId}/statistics?id=${companyId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },  
            }
          ),
          axios.get(
            `https://youapi.youneed.app/pollux/dev/api/admin-agents/company/${companyId}/top-agents`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },  
            }
          )
        ])

        console.log("STATS RESPONSE:", statsResponse.data)
        console.log("AGENTS RESPONSE:", agentsResponse.data)

        setStats(statsResponse?.data?.data || null)
        setAgents(Array.isArray(agentsResponse?.data?.data) ? agentsResponse.data.data : [])

      } catch (error) {
        console.error("ERROR:", error?.response?.data || error.message)

        // gestion token expiré
        if (error?.response?.status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          localStorage.removeItem("company")
          localStorage.removeItem("companyId")
        }

        setError(
          error?.response?.data?.message ||
          error.message ||
          "Impossible de charger les statistiques"
        )
        setStats(null)
        setAgents([])
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // Calculs et extractions des données dynamiques (Vue d'ensemble)
  const distributorsTotal = stats?.distributors?.total || 0
  const distributorsActive = stats?.distributors?.active || 0
  const merchantsTotal = stats?.merchants?.total || 0
  const merchantsActive = stats?.merchants?.active || 0
  const agentsTotal = stats?.adminAgents?.total || 0
  const agentsActive = stats?.adminAgents?.active || 0

  const totalEntities = distributorsTotal + merchantsTotal + agentsTotal
  const totalActive = distributorsActive + merchantsActive + agentsActive
  const totalServices = stats?.services || 0
  
  const totalOperations = stats?.operations?.total || 0
  const pendingOperations = stats?.operations?.pending || 0
  const completedOperations = totalOperations - pendingOperations

  // Calculs des pourcentages d'actifs
  const calcPercentage = (active, total) => {
    if (!total) return "0 %"
    return `${Math.round((active / total) * 100)} %`
  }

  /* ---------- DONNÉES DE LA VUE D'ENSEMBLE (pour recherche/pagination) ---------- */
  const overviewData = [
    { number: 1, role: "Distributeurs", total: distributorsTotal, percentage: calcPercentage(distributorsActive, distributorsTotal), activeCount: distributorsActive },
    { number: 2, role: "Commerçants", total: merchantsTotal, percentage: calcPercentage(merchantsActive, merchantsTotal), activeCount: merchantsActive },
    { number: 3, role: "Agents", total: agentsTotal, percentage: calcPercentage(agentsActive, agentsTotal), activeCount: agentsActive },
  ]

  /* ---------- RECHERCHE + PAGINATION (même logique que Produits.jsx) ---------- */
  const rawData = activeTab === "vue-ensemble" ? overviewData : agents

  const filteredData = rawData.filter((item) => {
    if (!searchQuery) return true
    const searchText =
      activeTab === "vue-ensemble"
        ? item.role
        : `${item?.user?.firstName || ""} ${item?.user?.lastName || ""} ${item?.employeeCode || ""} ${item?.department || ""} ${item?.position || ""}`
    return searchText.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const start = (currentPage - 1) * rowsPerPage
  const end = start + rowsPerPage
  const paginatedData = filteredData.slice(start, end)

  // Revenir automatiquement à la page 1 quand on change d'onglet, de recherche ou de taille de page
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, rowsPerPage])

  // Recaler la page courante si elle devient invalide
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  /* ---------- FONCTIONS DE TÉLÉCHARGEMENT DYNAMIQUE ---------- */
  const handleExport = (format) => {
    let dataToExport = []
    let filename = `export-${activeTab}-${new Date().toISOString().slice(0,10)}`

    if (activeTab === "vue-ensemble") {
      dataToExport = [
        { "N°": 1, "Rôle": "Distributeurs", "Total": distributorsTotal, "Pourcentage d'actif": calcPercentage(distributorsActive, distributorsTotal), "Nombre actif": distributorsActive },
        { "N°": 2, "Rôle": "Commerçants", "Total": merchantsTotal, "Pourcentage d'actif": calcPercentage(merchantsActive, merchantsTotal), "Nombre actif": merchantsActive },
        { "N°": 3, "Rôle": "Agents", "Total": agentsTotal, "Pourcentage d'actif": calcPercentage(agentsActive, agentsTotal), "Nombre actif": agentsActive }
      ]
    } else {
      dataToExport = agents.map((agent, index) => ({
        "Rang": index + 1,
        "Nom et prénom": `${agent?.user?.firstName || ""} ${agent?.user?.lastName || ""}`,
        "Code Employé": agent?.employeeCode || "N/A",
        "Département / Position": `${agent?.department || ""} - ${agent?.position || ""}`,
        "Nbre opération": agent?.totalValidations ?? 0,
        "Validées": agent?.validated ?? 0,
        "Rejetées": agent?.rejected ?? 0,
        "Pourcentage": `${agent?.approvalRate ?? 0} %`
      }))
    }

    if (format === "CSV" || format === "Excel") {
      // Construction simple du fichier CSV / Tableur textuel
      const headers = Object.keys(dataToExport[0] || {}).join(";")
      const rows = dataToExport.map(row => Object.values(row).join(";")).join("\n")
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `${filename}.${format === "CSV" ? "csv" : "xls"}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (format === "PDF") {
      // Simulation d'impression/génération PDF native
      console.log(`Génération du PDF pour ${filename}`, dataToExport)
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex justify-center items-center min-h-screen text-gray-500 font-medium bg-[#F8FAFC] text-center text-sm sm:text-base">
        Chargement des statistiques en cours...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="p-6 text-red-500 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
          <p className="font-semibold">Erreur détectée :</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F8FAFC] min-h-screen">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">Statistiques</h1>
          <p className="text-gray-500 text-sm sm:text-base">Résumé global du système</p>
        </div>

        <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          <ExportButton label="Excel" onClick={() => handleExport("Excel")} />
          <ExportButton label="PDF" onClick={() => handleExport("PDF")} />
          <ExportButton label="CSV" onClick={() => handleExport("CSV")} />
        </div>
      </div>

      {/* ================= KPI STATS DYNAMIQUES ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <StatCard title="Total entités" value={String(totalEntities)} />
        <StatCard title="Actifs" value={String(totalActive)} />
        <StatCard title="Opérations" value={String(totalOperations)} />
        <StatCard title="Services" value={String(totalServices)} />
      </div>

      {/* ================= TABS NAVIGATION (style Produits.jsx) ================= */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <Tab 
            label="Vue d'ensemble" 
            active={activeTab === "vue-ensemble"} 
            onClick={() => setActiveTab("vue-ensemble")} 
        />
        <Tab 
            label="Agents" 
            active={activeTab === "agents"} 
            onClick={() => setActiveTab("agents")} 
        />
      </div>

      {/* ================= TABLE CARD ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Table header with filters */}
        <div className="p-4 sm:p-6 pb-4 space-y-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
          <div>
            <h2 className="font-semibold text-base sm:text-lg text-gray-800">
              {activeTab === "vue-ensemble" ? "Listes des documents" : "Liste des agents"}
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              {activeTab === "vue-ensemble" ? "les documents" : "Gérer tous les agents"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 outline-none border-none text-sm w-full focus:ring-2 focus:ring-[#1EA4DC]/20"
              />
            </div>
          </div>
        </div>

        {/* Table Content — même style que le tableau de Produits.jsx */}
        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
            <table className="table-auto min-w-[640px] w-full text-sm">

              {activeTab === "vue-ensemble" ? (
                /* HEAD VUE D'ENSEMBLE */
                <thead className="bg-[#1EA4DC] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Pourcentage d'actif</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nombre actif</th>
                  </tr>
                </thead>
              ) : (
                /* HEAD AGENTS DYNAMIQUE */
                <thead className="bg-[#1EA4DC] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rang</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nom et prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nbre opération</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Validées</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rejetées</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Pourcentage</th>
                  </tr>
                </thead>
              )}

              <tbody>
                {activeTab === "vue-ensemble" ? (
                  paginatedData.length > 0 ? (
                    paginatedData.map((row, i) => (
                      <ReportRow
                        key={row.number}
                        number={String(row.number)}
                        role={row.role}
                        total={String(row.total)}
                        percentage={row.percentage}
                        activeCount={String(row.activeCount)}
                        alt={i % 2 !== 0}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-400">
                        Aucun résultat trouvé
                      </td>
                    </tr>
                  )
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((agent, i) => {
                    const globalIndex = start + i
                    return (
                      <AgentRow
                        key={agent.id}
                        rangIndex={globalIndex + 1}
                        rang={`# ${globalIndex + 1}`}
                        name={`${agent?.user?.firstName || ""} ${agent?.user?.lastName || ""}`}
                        code={agent?.employeeCode || "N/A"}
                        type={`${agent?.department || ""} . ${agent?.position || ""}`}
                        nbOperation={String(agent?.totalValidations ?? 0)}
                        validees={String(agent?.validated ?? 0)}
                        rejetees={String(agent?.rejected ?? 0)}
                        pourcentage={`${agent?.approvalRate ?? 0} %`}
                        alt={i % 2 !== 0}
                      />
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Aucun agent trouvé
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

          {/* Pagination — même composant et rendu que Produits.jsx */}
          <PaginationFooter
            total={filteredData.length}
            start={start + 1}
            end={Math.min(end, filteredData.length)}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      </div>

      {/* ================= SECTION OPÉRATIONS DYNAMIQUES ================= */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Opérations</h3>
        
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden ">
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 py-3 sm:py-4 px-4 sm:px-8 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div>Total</div>
            <div>En attente</div>
            <div>Complétées</div>
          </div>
          <div className="grid grid-cols-3 py-4 sm:py-6 px-4 sm:px-8 text-base sm:text-lg font-bold text-gray-400 bg-white">
            <div>{totalOperations}</div>
            <div>{pendingOperations}</div>
            <div>{completedOperations >= 0 ? completedOperations : 0}</div>
          </div>
        </div>
      </div>

    </div>
  )
}

/* ================= SUB-COMPONENTS ================= */

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${active ? "bg-white shadow" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

function ExportButton({ label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm shrink-0"
    >
      <Download size={16} className="text-[#1EA4DC]" />
      {label}
    </button>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-4 sm:py-6 flex flex-col space-y-1.5 sm:space-y-2 border border-blue-50/50">
      <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-xl sm:text-3xl font-extrabold text-[#1EA4DC]">{value}</p>
    </div>
  )
}

/* ================= LIGNES DE TABLEAU (style Produits.jsx : lignes alternées + hover bleu) ================= */

function ReportRow({ number, role, total, percentage, activeCount, alt }) {
  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{number}</td>
      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{role}</td>
      <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">{total}</td>
      <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{percentage}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-full text-xs border border-green-100">
          {activeCount}
        </span>
      </td>
    </tr>
  )
}

function AgentRow({ rangIndex, rang, name, code, type, nbOperation, validees, rejetees, pourcentage, alt }) {
  // Détermination de la couleur d'arrière-plan du badge de rang selon la position numérique
  let badgeColor = "bg-green-50 text-green-600 border-green-100" // Couleur par défaut
  
  if (rangIndex === 1) {
    badgeColor = "bg-amber-100 text-amber-700 border-amber-200 font-bold" // Or pour le 1er
  } else if (rangIndex === 2) {
    badgeColor = "bg-slate-200 text-slate-700 border-slate-300 font-bold" // Argent pour le 2e
  } else if (rangIndex === 3) {
    badgeColor = "bg-orange-100 text-orange-700 border-orange-200 font-bold" // Bronze pour le 3e
  }

  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs border ${badgeColor}`}>
          {rang}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800 whitespace-nowrap">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{code}</p>
        <p className="text-xs text-gray-400 whitespace-nowrap">{type}</p>
      </td>
      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{nbOperation}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{validees}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{rejetees}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{pourcentage}</td>
    </tr>
  )
}

/* ================= PAGINATION (copie exacte du style/rendu de Produits.jsx) ================= */

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