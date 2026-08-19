import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import axios from "axios"

/* ===================== MAIN ===================== */

export default function Clients() {

  /* ===================== STATES ===================== */

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Tous les clients")

  /* MENU ACTION */
  const [openMenuId, setOpenMenuId] = useState(null)

  /* DETAILED CLIENT MODAL STATES */
  const [selectedClientData, setSelectedClientData] = useState(null)
  const [selectedClientStatus, setSelectedClientStatus] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  /* ===================== PAGINATION ===================== */

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalClients, setTotalClients] = useState(0)

  /* ===================== STATS ===================== */

  const [activeClients, setActiveClients] = useState(0)

  /* ===================== FETCH API ===================== */

  useEffect(() => {

    const fetchClients = async () => {

      try {

        const token = localStorage.getItem("token")

        const response = await axios.get(
          `https://youapi.youneed.app/pollux/dev/api/clients?page=${currentPage}&limit=${rowsPerPage}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        console.log("RESPONSE CLIENTS :", response.data)

        const apiData = response.data?.data ?? []
        const apiPagination = response.data?.pagination ?? {}

        setCurrentPage(apiPagination.page || 1)
        setRowsPerPage(apiPagination.limit || 20)
        setTotalPages(apiPagination.totalPages || 1)
        setTotalClients(response.data?._count || 0)

        const formattedData = apiData.map((item, index) => {

          const createdDate = new Date(item.createdAt)
          const currentDate = new Date()

          const isNewThisMonth =
            createdDate.getMonth() === currentDate.getMonth() &&
            createdDate.getFullYear() === currentDate.getFullYear()

          return {
            id: item.id || index + 1,
            fullname: `${item.firstName || ""} ${item.lastName || ""}`,
            phone: item.phone || "-",
            email: item.email || "-",
            city: item.city || "-",
            country: item.country || "-",
            date: createdDate.toLocaleDateString("fr-FR"),
            time: createdDate.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: isNewThisMonth ? "Nouveaux ce mois" : "Actif",
          }
        })

        setClients(formattedData)

        const activeClientsCount = formattedData.filter(
          (client) => client.status === "Actif"
        ).length

        setActiveClients(activeClientsCount)

      } catch (error) {
        console.error("ERREUR CLIENTS :", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()

  }, [currentPage, rowsPerPage])

  /* ===================== FETCH SPECIFIC CLIENT DETAILS ===================== */

  const handleViewDetails = async (clientId, clientStatus) => {
    setOpenMenuId(null)
    setModalLoading(true)
    setIsModalOpen(true)
    setSelectedClientStatus(clientStatus)

    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/clients/profile/${clientId}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      console.log("RESPONSE DETAILS CLIENT :", response.data)

      // FIX : l'API retourne { data: { ...client } }, on extrait response.data.data
      const clientData = response.data?.data ?? response.data ?? null

      setSelectedClientData(clientData)

    } catch (error) {
      console.error("ERREUR FETCH DETAILS CLIENT :", error)
      alert("Impossible de récupérer les détails de ce client.")
      setIsModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }

  /* ===================== FILTERS ===================== */

  const filteredClients = useMemo(() => {

    return clients.filter((client) => {

      const matchesSearch =
        client.fullname.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        client.phone.toLowerCase().includes(search.toLowerCase())

      let matchesStatus = true

      if (statusFilter === "Actifs") {
        matchesStatus = client.status === "Actif"
      }

      if (statusFilter === "Inactifs") {
        matchesStatus = client.status === "Inactif"
      }

      if (statusFilter === "Nouveaux ce mois") {
        matchesStatus = client.status === "Nouveaux ce mois"
      }

      return matchesSearch && matchesStatus
    })

  }, [clients, search, statusFilter])

  if (loading) return <div className="p-4 sm:p-8">Chargement...</div>
  if (!clients.length) return <div className="p-4 sm:p-8">Aucune donnée trouvée</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 bg-[#F8FAFC] min-h-screen relative">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">
          Gestion des clients
        </h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">Gérer clients</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

        <div className="bg-[#EEF5FF] rounded-xl px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm sm:text-base">Total client</span>
          <span className="text-xl sm:text-2xl font-bold text-[#1EA4DC]">{totalClients}</span>
        </div>

        <div className="bg-[#EEF5FF] rounded-xl px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm sm:text-base">Clients Actifs</span>
          <span className="text-xl sm:text-2xl font-bold text-[#1EA4DC]">{activeClients}</span>
        </div>

      </div>

      {/* CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5 sm:space-y-6">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">

          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Listes des clients</h2>
            <p className="text-gray-500 mt-1 text-sm">les client</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-3 outline-none sm:w-[260px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#F5F7FA] rounded-xl px-4 py-3 outline-none text-gray-600"
            >
              <option>Tous les clients</option>
              <option>Actifs</option>
              <option>Inactifs</option>
              <option>Nouveaux ce mois</option>
            </select>

          </div>
        </div>

        {/* TABLE — même style que le tableau de Produits (table-auto, en-tête
            font-semibold, cellules px-4 py-3, lignes alternées + hover bleu),
            avec scroll horizontal sur petits écrans */}
        <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">

          <table className="table-auto min-w-[800px] w-full text-sm">

            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nom et prénom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Téléphone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">E-mail</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut</th>
                <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredClients.map((item, i) => (
                <ClientRow
                  key={item.id}
                  id={item.id}
                  index={(currentPage - 1) * rowsPerPage + i + 1}
                  rowIndex={i}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onViewDetails={handleViewDetails}
                  {...item}
                />
              ))}
            </tbody>

          </table>

        </div>
        <p className="text-xs text-gray-400 sm:hidden -mt-3">
          Faites glisser le tableau horizontalement pour voir plus de colonnes.
        </p>

        {/* PAGINATION — même style de rendu que Produits.jsx */}
        <PaginationFooter
          total={totalClients}
          start={(currentPage - 1) * rowsPerPage + 1}
          end={Math.min(currentPage * rowsPerPage, totalClients)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />

      </div>

      {/* DETAILS POPUP MODAL */}
      <ClientDetailsModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedClientData(null) }}
        data={selectedClientData}
        status={selectedClientStatus}
        loading={modalLoading}
      />

    </div>
  )
}

/* ===================== MENU D'ACTIONS (PORTAL) ===================== */
/*
   CORRECTION DU BUG "menu caché / coupé" :
   Le menu de la ligne (Voir détails / Modifier / Supprimer) était en
   `position: absolute`, imbriqué dans le <td> d'un tableau enveloppé par
   un conteneur `overflow-x-auto`. Dès que le menu dépassait la zone
   visible (dernière ligne, bord du tableau, scroll horizontal), il était
   tronqué ou totalement invisible.

   Solution : on calcule la position réelle du bouton "⋯" à l'écran
   (getBoundingClientRect) et on rend le menu via un PORTAL React
   (createPortal) directement dans <body>, en position `fixed`. Le menu
   n'est donc plus soumis à l'overflow du tableau et reste toujours
   entièrement visible, y compris sur mobile.
*/

const ACTION_MENU_PORTAL_CLASS = "client-row-action-menu-portal"

function ClientRowMenu({ id, status, onViewDetails, isOpen, onToggle }) {
  const buttonRef = useRef(null)
  const [coords, setCoords] = useState(null) // { top, left, openUpward }

  const MENU_WIDTH  = 176 // ~ w-44
  const MENU_HEIGHT = 150 // estimation (3 items)
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
    if (!isOpen) return
    computePosition()

    const handleReposition = () => computePosition()
    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleReposition)
    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleReposition)
    }
  }, [isOpen, computePosition])

  // Fermeture au clic en dehors (bouton + menu porté)
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      const clickedButton = buttonRef.current && buttonRef.current.contains(e.target)
      const clickedMenu    = e.target.closest && e.target.closest(`.${ACTION_MENU_PORTAL_CLASS}`)
      if (!clickedButton && !clickedMenu) onToggle(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onToggle])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => onToggle(isOpen ? null : id)}
        className="hover:bg-gray-100 p-2 rounded-lg"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && coords && createPortal(
        <div
          className={`${ACTION_MENU_PORTAL_CLASS} fixed z-[100] w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left overflow-hidden`}
          style={{
            top:    coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left:   coords.left,
            animation: "clientMenuFadeIn 0.1s ease-out",
          }}
        >
          <button
            onClick={() => onViewDetails(id, status)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} className="text-gray-500" />
            <span>Voir détails</span>
          </button>

          <button className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
            <Pencil size={16} className="text-gray-500" />
            <span>Modifier</span>
          </button>

          <div className="border-t border-gray-200" />

          <button className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={16} />
            <span>Supprimer</span>
          </button>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes clientMenuFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}

/* ===================== ROW ===================== */
/* Style aligné sur les lignes du tableau de Produits : fond alterné
   (bg-gray-50 / bg-white), hover:bg-blue-50, cellules px-4 py-3, et
   badge de statut au format px-3 py-1 rounded-full text-xs font-medium. */

function ClientRow({
  id,
  index,
  rowIndex,
  fullname,
  phone,
  email,
  date,
  time,
  status,
  openMenuId,
  setOpenMenuId,
  onViewDetails,
}) {

  return (
    <tr className={`${rowIndex % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>

      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{index}</td>
      <td className="px-4 py-3 font-medium text-[#111827] whitespace-nowrap">{fullname}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{phone}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{email}</td>

      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-gray-700">{date}</p>
        <p className="text-sm text-gray-400">{time}</p>
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
            ${
              status === "Actif"
                ? "bg-[#DCFCE7] text-[#16A34A]"
                : status === "Inactif"
                ? "bg-red-100 text-red-500"
                : "bg-blue-100 text-blue-500"
            }
          `}
        >
          {status}
        </span>
      </td>

      {/* ACTIONS */}
      <td className="px-4 py-3 text-center relative whitespace-nowrap">
        <ClientRowMenu
          id={id}
          status={status}
          onViewDetails={onViewDetails}
          isOpen={openMenuId === id}
          onToggle={setOpenMenuId}
        />
      </td>

    </tr>
  )
}

/* ===================== PAGINATION ===================== */
/* Style de rendu repris à l'identique de Produits.jsx : libellé "Affichage
   de X à Y sur Z entrées" à gauche, sélecteur "Par page" + navigation
   compacte (<< < page/total > >>) à droite, avec boutons désactivés
   grisés (icônes text-gray-200) plutôt que masqués. */

function PaginationFooter({
  total,
  start,
  end,
  rowsPerPage,
  setRowsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
}) {
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
            onChange={(e) => {
              setRowsPerPage(+e.target.value)
              setCurrentPage(1)
            }}
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

/* ===================== CLIENT DETAILS MODAL (POP-UP) ===================== */

function ClientDetailsModal({ isOpen, onClose, data, status, loading }) {
  if (!isOpen) return null

  const getDaysCount = (createdAtString) => {
    if (!createdAtString) return ""
    const createdDate = new Date(createdAtString)
    const today = new Date()
    const diffTime = Math.abs(today - createdDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `Client depuis ${diffDays} jours`
  }

  const formatDate = (dateString) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[580px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100 relative p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">

        {/* BOUTON FERMER X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#1EA4DC] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm">Chargement du profil...</p>
          </div>
        ) : data ? (
          <div className="space-y-6 pr-6">

            {/* EN-TETE POPUP */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Détails sur le client</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                N°: CLI - {data.id?.substring(0, 3).toUpperCase() || "001"}
              </p>
            </div>

            {/* BANNER EN-TETE BLEUTE */}
            <div className="bg-[#F0F7FF] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-start gap-3">
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800">
                  {data.firstName || ""} {data.lastName || ""}
                </h4>
                <p className="text-sm text-gray-500">
                  {getDaysCount(data.createdAt)}
                </p>
              </div>

              {/* BADGE DE STATUT DYNAMIQUE */}
              <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold shrink-0
                ${
                  status === "Actif"
                    ? "bg-[#DCFCE7] text-[#16A34A]"
                    : status === "Inactif"
                    ? "bg-red-100 text-red-500"
                    : "bg-blue-100 text-blue-500"
                }
              `}>
                {status}
              </span>
            </div>

            <div className="border-t border-gray-100 my-2" />

            {/* SECTION INFORMATIONS PERSONNELLES */}
            <div className="space-y-4">
              <h5 className="text-sm font-semibold text-gray-400">Informations personnelles</h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900">{data.phone || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">E-mail</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{data.email || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                  <p className="text-sm font-medium text-gray-900">{data.address || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date de naissance</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(data.birthDate)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Ville</p>
                  <p className="text-sm font-medium text-gray-900">{data.city || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Pays</p>
                  <p className="text-sm font-medium text-gray-900">
                    {data.country === "BJ" ? "Bénin" : data.country || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Type de pièce</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{data.attachementName || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Numéro de pièce</p>
                  <p className="text-sm font-medium text-gray-900">{data.idNumber || "-"}</p>
                </div>

              </div>
            </div>

            {/* PIÈCE D'IDENTITÉ — affichage de l'image si disponible */}
            {data.idAttachment && (
              <>
                <div className="border-t border-gray-100" />
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-gray-400">Pièce d'identité</h5>
                  <img
                    src={data.idAttachment}
                    alt="Pièce d'identité"
                    className="w-full rounded-xl border border-gray-100 object-cover max-h-48"
                  />
                </div>
              </>
            )}

          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">Aucune donnée disponible.</div>
        )}

      </div>
    </div>
  )
}