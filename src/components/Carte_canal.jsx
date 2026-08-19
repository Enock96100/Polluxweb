import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { useNavigate } from "react-router-dom"

/* ===================== MAIN ===================== */

export default function OperationsPage() {
  const { id } = useParams()

  const [activeTab, setActiveTab]           = useState("cartes")
  const [operationsData, setOperationsData] = useState([])
  const [loading, setLoading]               = useState(false)
  const [currentPage, setCurrentPage]       = useState(1)
  const [rowsPerPage, setRowsPerPage]       = useState(20) // limite par défaut : 20 éléments / page
  const [search, setSearch]                 = useState("")
  const [status, setStatus]                 = useState("")

  /* ---- Nouveaux filtres cartes ---- */
  const [bankFilter, setBankFilter]         = useState("")
  const [formulaFilter, setFormulaFilter]   = useState("")
  const [bankOptions, setBankOptions]       = useState([])
  const [formulaOptions, setFormulaOptions] = useState([])

  const navigate = useNavigate()

  /* ===================== AUTH ===================== */

  const getAuthData = () => ({
    token: localStorage.getItem("token"),
    companyId: localStorage.getItem("companyId"),
  })

  /* ===================== STATUS NORMALIZERS ===================== */

  const normalizeCardStatus = (raw) => {
    if (!raw) return "Disponible"
    const s = raw.toUpperCase()
    if (s === "INACTIVE" || s === "AVAILABLE" || s === "DISPONIBLE") return "Disponible"
    if (s === "ASSIGNED"  || s === "ASSIGNÉ"  || s === "ASSIGNE")    return "Assigné"
    if (s === "ACTIVATED" || s === "ACTIVE"   || s === "ACTIVÉ")     return "Activé"
    return raw
  }

  const normalizeSubscriptionStatus = (raw) => {
    if (!raw) return "En Attente"
    const s = raw.toUpperCase()
    if (s === "PENDING")                            return "En Attente"
    if (s === "ACTIVE"    || s === "ACTIVATED")     return "Active"
    if (s === "EXPIRED"   || s === "EXPIRÉE")       return "Expirée"
    if (s === "SUSPENDED" || s === "SUSPENDUE")     return "Suspendue"
    if (s === "CANCELLED" || s === "CANCELED")      return "Annulé"
    return raw
  }

  /* ===================== RESOLVE COMPANY ID ===================== */

  const resolveCompanyId = async () => {
    const { token, companyId } = getAuthData()
    if (!token) throw new Error("Token manquant")
    if (companyId) return { token, companyId }

    try {
      const response = await axios.get(
        "https://youapi.youneed.app/pollux/dev/api/auth/profile",
        { headers: { accept: "application/json", Authorization: `Bearer ${token}` } }
      )
      const profile = response.data
      const resolvedId =
        profile?.company?.id     ||
        profile?.data?.company?.id ||
        profile?.companyId        ||
        profile?.data?.companyId  ||
        profile?.id               ||
        null

      if (!resolvedId) throw new Error("CompanyId introuvable")
      localStorage.setItem("companyId", resolvedId)
      return { token, companyId: resolvedId }
    } catch (err) {
      console.error("ERREUR resolveCompanyId :", err)
      throw err
    }
  }

  /* ===================== FETCH FORMULAS ===================== */

  // ✅ CORRIGÉ : le serviceId était codé en dur ("b9e9ec8f-4fb4-4b29-85c6-e9d54b48b012"),
  // ce qui faisait toujours remonter les formules d'un seul et même service, quelle que
  // soit la page produit réellement affichée. On utilise maintenant l'`id` du service
  // récupéré via useParams() (déjà présent dans le composant mais jamais utilisé ici).
  // ⚠️ À CONFIRMER : je pars du principe que le paramètre d'URL de cette page est bien
  // le serviceId attendu par GET /prepairs-formula/service/:serviceId (c'est cohérent
  // avec l'usage de `id` dans le reste du fichier — passé tel quel dans les routes de
  // navigation `/detail_carte_prepay/:id` etc.). Si ce n'est pas le cas, remplacez `id`
  // par le bon identifiant disponible dans le composant.
  const fetchFormulas = async () => {
    if (!id) {
      setFormulaOptions([])
      return
    }
    try {
      const { token } = getAuthData()
      const response = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/prepairs-formula/service/${id}`,
        { headers: { accept: "application/json", Authorization: `Bearer ${token}` } }
      )

      const data = response.data?.data || response.data || []
      const list = Array.isArray(data) ? data : [data]

      setFormulaOptions(
        list.map((f) => ({
          value: f.id   || f.code || "",
          label: f.name || f.code || f.id || "—",
          code:  f.code || "",
        }))
      )
    } catch (err) {
      console.error("ERREUR fetchFormulas :", err)
      setFormulaOptions([])
    }
  }

  /* ===================== FETCH CARDS ===================== */

  /*  CORRECTION PAGINATION :
      La limite était fixée à 100 (`limit=100`), ce qui tronquait
      silencieusement la liste au-delà de 100 cartes : la pagination
      "page par page" ne portait alors que sur ce sous-ensemble tronqué.
      Comme dans Produits.jsx, on remonte maintenant TOUTE la liste en
      un seul appel, et c'est le rendu qui gère seul la recherche, les
      filtres et la pagination page par page côté client. */
  const fetchCards = async () => {
    try {
      setLoading(true)
      const { token, companyId } = await resolveCompanyId()

      const response = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/prepaid-cards/companies/${companyId}/cards?page=1&limit=1000`,
        { headers: { accept: "application/json", Authorization: `Bearer ${token}` } }
      )
         console.log("fetchCards response:", response.data)
      const data = response.data?.data || []

      const formatted = data.map((item) => {
        const clientUser  = item.client?.user
        const clientName  = clientUser
          ? `${clientUser.firstName || ""} ${clientUser.lastName || ""}`.trim()
          : item.client?.name || "—"
        const clientPhone = clientUser?.phone || item.client?.phone || "—"
        const clientEmail = clientUser?.email || item.client?.email || "—"

        return {
          id:              item.id,
          cardId:          item.cardId           || "—",
          bankName:        item.bank?.name        || "—",
          bankId:          item.bank?.id          || item.bankId || "",
          formulaId:       item.formula?.id       || item.formulaId || "",
          formulaName:     item.formula?.name     || item.formulaName || "—",
          formulaCode:     item.formula?.code     || item.formulaCode || "",
          clientName,
          clientPhone,
          clientEmail,
          distributorName: item.distributor?.businessName || item.distributorName || "—",
          distributorCity: item.distributor?.city         || "—",
          balance:
            item.balance !== undefined && item.balance !== null
              ? `${Number(item.balance).toLocaleString("fr-FR")} FCFA`
              : "0 FCFA",
          activatedAt: item.activatedAt
            ? new Date(item.activatedAt).toLocaleDateString("fr-FR")
            : item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("fr-FR")
            : "—",
          expiryDate: item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString("fr-FR")
            : "—",
          status: normalizeCardStatus(item.status),
        }
      })

      setOperationsData(formatted)

      /* Construire la liste unique des banques à partir des données reçues */
      const uniqueBanks = []
      const seen = new Set()
      formatted.forEach((c) => {
        if (c.bankName && c.bankName !== "—" && !seen.has(c.bankName)) {
          seen.add(c.bankName)
          uniqueBanks.push({ value: c.bankName, label: c.bankName })
        }
      })
      setBankOptions(uniqueBanks)

    } catch (error) {
      console.error("ERREUR fetchCards :", error)
      setOperationsData([])
    } finally {
      setLoading(false)
    }
  }

  /* ===================== FETCH SUBSCRIPTIONS ===================== */

  /*  CORRECTION PAGINATION : même correctif que fetchCards ci-dessus —
      remonter toute la liste des abonnements pour que la pagination
      côté client (recherche + statut + page) porte sur l'ensemble des
      résultats, et pas uniquement sur les 100 premiers. */
  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const { token, companyId } = await resolveCompanyId()

      const response = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/canal-subscriptions/companies/${companyId}?page=1&limit=1000`,
        { headers: { accept: "application/json", Authorization: `Bearer ${token}` } }
      )

      const data = response.data?.data || []

      const formatted = data.map((item) => ({
        id:            item.id,
        cardNumber:    item.subscriptionNumber || "—",
        decoderNumber: item.decoderNumber      || "—",
        clientName:
          item.client?.user
            ? `${item.client.user.firstName || ""} ${item.client.user.lastName || ""}`.trim()
            : item.clientName || item.client?.name || "—",
        clientPhone:     item.phone || "—",
        clientEmail:     "—",
        distributorName: item.distributorName || item.distributor?.businessName || "—",
        distributorCity: item.distributor?.city || "—",
        activatedAt: item.activatedAt
          ? new Date(item.activatedAt).toLocaleDateString("fr-FR")
          : item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("fr-FR")
          : "—",
        status: normalizeSubscriptionStatus(item.status),
      }))

      setOperationsData(formatted)

    } catch (error) {
      console.error("ERREUR fetchSubscriptions :", error)
      setOperationsData([])
    } finally {
      setLoading(false)
    }
  }

  /* ===================== EFFECTS ===================== */

  useEffect(() => {
    if (activeTab === "cartes") {
      fetchCards()
      fetchFormulas()
    } else {
      fetchSubscriptions()
    }
    setCurrentPage(1)
    setSearch("")
    setStatus("")
    setBankFilter("")
    setFormulaFilter("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id])

  // Revenir automatiquement à la page 1 quand un filtre ou la taille de page change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, status, bankFilter, formulaFilter, rowsPerPage])

  /* ===================== FILTER ===================== */

  // ✅ CORRIGÉ : la recherche comparait uniquement `item.cardNumber`, un champ qui
  // n'existe que pour les abonnements Canal+ (les cartes prépayées, elles, ont un
  // champ `cardId` et un `id` — jamais comparés). Résultat : taper un identifiant de
  // carte dans la recherche ne trouvait jamais rien pour l'onglet "Cartes Prépayées".
  // On ajoute désormais :
  //   - la comparaison sur `item.cardId` (identifiant métier de la carte) ;
  //   - la comparaison sur `item.id` (identifiant technique complet, UUID) ;
  //   - la comparaison sur les 3 DERNIERS CARACTÈRES de `item.id`, pour permettre
  //     à l'utilisateur de retrouver une carte en tapant juste la fin de son UUID.
  const filteredData = operationsData.filter((item) => {
    const q = search.trim().toLowerCase()

    const fullId  = String(item.id || "").toLowerCase()
    const last3Id = fullId.slice(-3)

    const matchSearch =
      q === "" ||
      fullId.includes(q) ||
      last3Id === q ||
      item.cardId?.toLowerCase().includes(q)         ||
      item.cardNumber?.toLowerCase().includes(q)     ||
      item.cardHolderName?.toLowerCase().includes(q) ||
      item.clientName?.toLowerCase().includes(q)     ||
      item.clientPhone?.toLowerCase().includes(q)    ||
      item.distributorName?.toLowerCase().includes(q)

    const matchStatus  = status      === "" || item.status   === status
    const matchBank    = bankFilter  === "" || item.bankName  === bankFilter
    const matchFormula = formulaFilter === "" || item.formulaId === formulaFilter || item.formulaCode === formulaFilter

    return matchSearch && matchStatus && matchBank && matchFormula
  })

  /* ===================== PAGINATION ===================== */

  const finalTotalPages    = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const start              = (currentPage - 1) * rowsPerPage
  const end                = start + rowsPerPage
  const finalPaginatedData = filteredData.slice(start, end)

  // Recaler la page courante si elle devient invalide (ex: après un filtrage qui réduit
  // le nombre total de résultats sous la page actuellement affichée)
  useEffect(() => {
    if (currentPage > finalTotalPages) setCurrentPage(finalTotalPages)
  }, [finalTotalPages, currentPage])

  /* ===================== STATUS OPTIONS ===================== */

  const cardStatusOptions = [
    { value: "",           label: "Tous les statuts" },
    { value: "Disponible", label: "Disponible"       },
    { value: "Assigné",    label: "Assigné"          },
    { value: "Activé",     label: "Activé"           },
  ]

  const subscriptionStatusOptions = [
    { value: "",           label: "Tous les statuts" },
    { value: "En Attente", label: "En Attente"       },
    { value: "Active",     label: "Active"           },
    { value: "Expirée",    label: "Expirée"          },
    { value: "Suspendue",  label: "Suspendue"        },
    { value: "Annulé",     label: "Annulé"           },
  ]

  const statusOptions  = activeTab === "cartes" ? cardStatusOptions : subscriptionStatusOptions
  const colSpanCount   = activeTab === "cartes" ? 7 : 7

  /* ===================== RENDER ===================== */

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 bg-[#F5F7FA] min-h-screen space-y-5 sm:space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800">
          Liste des opérations
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm lg:text-base">
          Gérer les catégories de produits et leurs variantes
        </p>
      </div>

      {/* TABS — même style que les onglets "Services / Produits" du fichier Produits */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <TabButton
          label="Cartes Prépayées"
          active={activeTab === "cartes"}
          onClick={() => setActiveTab("cartes")}
        />
        <TabButton
          label="Abonnements Canal+"
          active={activeTab === "abonnements"}
          onClick={() => setActiveTab("abonnements")}
        />
      </div>

      {/* CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 space-y-5 sm:space-y-6 min-w-0">

        {/* TOP */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">
            Variantes de Produits
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm">
            Gérer les sous-produits et leurs tarifs
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:flex-wrap">

          {/* Recherche */}
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "cartes"
                  ? "Rechercher (id, 3 derniers caractères, client...)"
                  : "Rechercher..."
              }
              className="w-full bg-[#F5F7FA] rounded-xl pl-12 pr-4 py-3 outline-none border border-transparent focus:border-[#1EA4DC] text-sm sm:text-base"
            />
          </div>

          {/* Statut */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-auto bg-[#F5F7FA] rounded-xl px-5 py-3 outline-none text-gray-700 sm:min-w-[190px] text-sm sm:text-base"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Filtre Banque — visible uniquement pour les cartes */}
          {activeTab === "cartes" && (
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#F5F7FA] rounded-xl px-5 py-3 outline-none text-gray-700 sm:min-w-[190px] text-sm sm:text-base"
            >
              <option value="">Toutes les banques</option>
              {bankOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Filtre Formule — visible uniquement pour les cartes */}
          {activeTab === "cartes" && (
            <select
              value={formulaFilter}
              onChange={(e) => setFormulaFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#F5F7FA] rounded-xl px-5 py-3 outline-none text-gray-700 sm:min-w-[190px] text-sm sm:text-base"
            >
              <option value="">Toutes les formules</option>
              {formulaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

        </div>

        {/* TABLE — même style que le tableau de Produits (table-auto, en-tête font-semibold, cellules px-4 py-3), avec scroll horizontal sur petits écrans */}
        <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
          <table className="table-auto min-w-[800px] w-full text-sm">

            <thead className="bg-[#1EA4DC] text-white">
              {activeTab === "cartes" ? (
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Produits</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Titulaire de la carte</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Distributeur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date d'activation</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Produits</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Distributeur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date d'activation</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
                </tr>
              )}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpanCount} className="text-center py-10 text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : finalPaginatedData.length > 0 ? (
                finalPaginatedData.map((item, index) => (
                  <OperationRow
                    key={item.id}
                    item={item}
                    start={start}
                    rowIndex={index}
                    activeTab={activeTab}
                    navigate={navigate}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={colSpanCount} className="text-center py-10 text-gray-500">
                    Aucune donnée trouvée
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
        <p className="text-xs text-gray-400 sm:hidden -mt-3">
          Faites glisser le tableau horizontalement pour voir plus de colonnes.
        </p>

        {/* PAGINATION */}
        <PaginationFooter
          total={filteredData.length}
          start={filteredData.length > 0 ? start + 1 : 0}
          end={Math.min(end, filteredData.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={finalTotalPages}
        />

      </div>
    </div>
  )
}

/* ===================== TAB BUTTON ===================== */
/* Style identique au composant Tab du fichier Produits (mêmes classes,
   mêmes tailles), utilisé ici pour "Cartes Prépayées" / "Abonnements Canal+". */

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${active ? "bg-white shadow" : "text-gray-500"}`}
    >
      {label}
    </button>
  )
}

/* ===================== ROW ===================== */

function OperationRow({ item, start, rowIndex, activeTab, navigate }) {

  const getStatusStyle = () => {
    switch (item.status) {
      case "Disponible": return "bg-blue-100 text-blue-600"
      case "Assigné":    return "bg-yellow-100 text-yellow-600"
      case "Activé":     return "bg-green-100 text-green-600"
      case "Active":     return "bg-green-100 text-green-600"
      case "En Attente": return "bg-yellow-100 text-yellow-600"
      case "Expirée":    return "bg-red-100 text-red-600"
      case "Suspendue":  return "bg-orange-100 text-orange-600"
      case "Annulé":     return "bg-gray-200 text-gray-600"
      default:           return "bg-gray-100 text-gray-600"
    }
  }

  const rowBase = `${rowIndex % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`

  /* ---- CARTES ---- */
  if (activeTab === "cartes") {
    return (
      <tr className={rowBase}>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{start + rowIndex + 1}</td>

        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-medium text-gray-800">{item.bankName}</p>
          <p className="text-sm text-gray-400">{item.cardId}</p>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-gray-800">{item.clientName}</p>
          <p className="text-xs text-gray-400">{item.clientPhone}</p>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-gray-800">{item.distributorName}</p>
          <p className="text-xs text-gray-400">{item.distributorCity}</p>
        </td>

        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.activatedAt}</td>

        <td className="px-4 py-3 text-center whitespace-nowrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusStyle()}`}>
            {item.status}
          </span>
        </td>

        <td className="px-4 py-3 text-center whitespace-nowrap">
          <div className="flex justify-center">
            <button
              onClick={() => navigate(`/detail_carte_prepay/${item.id}`)}
              className="text-gray-600 hover:text-[#1EA4DC] transition"
            >
              <Eye size={16} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  /* ---- ABONNEMENTS ---- */
  return (
    <tr className={rowBase}>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{start + rowIndex + 1}</td>

      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium text-gray-800">{item.cardNumber}</p>
        <p className="text-sm text-gray-400">{item.decoderNumber}</p>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium text-gray-800">{item.clientName}</p>
        <p className="text-sm text-gray-400">{item.clientPhone}</p>
      </td>

      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.distributorName}</td>

      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.activatedAt}</td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusStyle()}`}>
          {item.status}
        </span>
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/detail_abonnement/${item.id}`)}
            className="text-gray-600 hover:text-[#1EA4DC] transition"
          >
            <Eye size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ===================== PAGINATION ===================== */
/* Style exactement identique à celui de la page Produits. */

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