import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import axios from "axios"
import useAuth from "../context/auth/utils"

export default function DocumentsManagement() {
  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  const { can } = useAuth()

  // PAYMENT_PROOF_MANAGEMENT : lecture d'une preuve de paiement
  const canView = can("PAYMENT_PROOF_READ")
  // ⚠️ À CONFIRMER : aucun code dédié dans le catalogue pour modifier ou
  // supprimer une preuve de paiement (seuls PAYMENT_PROOF_READ et
  // PAYMENT_PROOF_SUBMIT existent) — PAYMENT_PROOF_READ réutilisé comme
  // proxy en attendant confirmation ; ces deux boutons n'ont d'ailleurs
  // pas encore de handler branché dans ce fichier.
  const canEdit   = can("PAYMENT_PROOF_READ")
  const canDelete = can("PAYMENT_PROOF_READ")
  // OPERATION_VALIDATION / OPERATION_REJECTION_CANCELLATION : valider ou
  // rejeter une preuve de paiement (boutons du modal de détail)
  const canApprove = can("PAYMENT_PROOF_APPROVE")
  const canReject  = can("PAYMENT_PROOF_REJECT")

  /* ================= STATES ================= */

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Tous les statut")
  const [periodFilter, setPeriodFilter] = useState("Période")

  const [selectedDoc, setSelectedDoc] = useState(null)

  /* ================= PAGINATION ================= */

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  /* ================= FETCH API ================= */

  useEffect(() => {

    const fetchDocuments = async () => {

      try {

        setLoading(true)

        const token = localStorage.getItem("token")

        const response = await axios.get(
          `https://youapi.youneed.app/pollux/prod/api/payment-proofs?page=${currentPage}&limit=${rowsPerPage}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        console.log("RESPONSE DOCUMENTS :", response.data)

        const apiData = response.data?.data || []
        const pagination = response.data?.pagination || {}

        setTotal(pagination.total || 0)
        setCurrentPage(pagination.page || 1)
        setRowsPerPage(pagination.limit || 20)
        setTotalPages(pagination.totalPages || 1)

        const formattedData = apiData.map((item, index) => {

          const createdDate = new Date(item.createdAt)

          let status = "En attente"
          if (item.operation?.status === "COMPLETED") status = "Complétée"
          if (item.operation?.status === "CANCELLED") status = "Annulée"
          if (item.operation?.status === "REJECTED") status = "Rejetée"

          return {
            id: item.id,
            index: (pagination.page - 1) * pagination.limit + index + 1,
            operation: item.operation?.operationType?.replaceAll("_", " ")?.toLowerCase(),
            payment: item.paymentMethod || "-",
            operator: item.operation?.operatorType === "MERCHANT" ? "Commerçant" : "Distributeur",
            operatorName: `${item.merchant?.user?.firstName || ""} ${item.merchant?.user?.lastName || ""}`.trim() || "-",
            amount: `${Number(item.amount).toLocaleString("fr-FR")} FCFA`,
            proofUrl: item.proofUrl,
            date: createdDate.toLocaleDateString("fr-FR"),
            time: createdDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            rawDate: createdDate,
            status,
            // ---- champs détail ----
            description: item.operation?.description || "-",
            requestedAt: createdDate.toLocaleDateString("fr-FR") + " " + createdDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            validatedAt: item.operation?.updatedAt
              ? new Date(item.operation.updatedAt).toLocaleDateString("fr-FR") + " " + new Date(item.operation.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "-",
            merchantEmail: item.merchant?.user?.email || "-",
            merchantPhone: item.merchant?.user?.phone || "-",
            merchantAddress: item.merchant?.address || "-",
            merchantCity: item.merchant?.city || "-",
            merchantStatus: item.merchant?.status || "-",
            metaId: item.id,
            metaCreatedAt: createdDate.toLocaleDateString("fr-FR") + " " + createdDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          }
        })

        setDocuments(formattedData)

      } catch (error) {
        console.error("ERREUR DOCUMENTS :", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()

  }, [currentPage, rowsPerPage])

  /* ================= FILTERS ================= */

  const filteredDocuments = useMemo(() => {

    return documents.filter((item) => {

      const matchesSearch =
        item.operation?.toLowerCase().includes(search.toLowerCase()) ||
        item.operatorName?.toLowerCase().includes(search.toLowerCase()) ||
        item.payment?.toLowerCase().includes(search.toLowerCase())

      let matchesStatus = true
      if (statusFilter !== "Tous les statut") matchesStatus = item.status === statusFilter

      let matchesPeriod = true
      const today = new Date()

      if (periodFilter === "Aujourd'hui") matchesPeriod = item.rawDate.toDateString() === today.toDateString()
      if (periodFilter === "Cette semaine") {
        const firstDay = new Date(today)
        firstDay.setDate(today.getDate() - 7)
        matchesPeriod = item.rawDate >= firstDay
      }
      if (periodFilter === "Ce mois") {
        matchesPeriod =
          item.rawDate.getMonth() === today.getMonth() &&
          item.rawDate.getFullYear() === today.getFullYear()
      }

      return matchesSearch && matchesStatus && matchesPeriod
    })

  }, [documents, search, statusFilter, periodFilter])

  /* ================= STATS ================= */

  const totalValidated = filteredDocuments.filter((item) => item.status === "Complétée").length
  const totalPending = filteredDocuments.filter((item) => item.status === "En attente").length
  const totalRejected = filteredDocuments.filter((item) => item.status === "Rejetée").length
  const totalAmount = filteredDocuments.reduce((acc, item) => acc + Number(item.amount.replace(/[^\d]/g, "")), 0)

  return (

    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F8FAFC] min-h-screen max-w-full overflow-x-hidden">

      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">Gestion des documents</h1>
        <p className="text-gray-500 mt-1">Gérer clients</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard title="TOTAL" value={total} />
        <StatCard title="VALIDÉES" value={totalValidated} />
        <StatCard title="EN ATTENTE" value={totalPending} />
        <StatCard title="REJETÉES" value={totalRejected} />
        <StatCard title="MONTANT TOTAL" value={totalAmount.toLocaleString("fr-FR") + " FCFA"} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-6">

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">

          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Listes des documents</h2>
            <p className="text-gray-500 mt-1">les documents</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#F5F7FA] rounded-xl pl-10 pr-4 py-3 outline-none w-full sm:w-[260px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F5F7FA] rounded-xl px-4 py-3 outline-none text-gray-600 w-full sm:w-auto"
              >
                <option>Tous les statut</option>
                <option>Complétée</option>
                <option>En attente</option>
                <option>Annulée</option>
                <option>Rejetée</option>
              </select>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-[#F5F7FA] rounded-xl px-4 py-3 outline-none text-gray-600 w-full sm:w-auto"
              >
                <option>Période</option>
                <option>Aujourd'hui</option>
                <option>Cette semaine</option>
                <option>Ce mois</option>
              </select>
            </div>

          </div>

        </div>

        {/* TABLEAU */}
        <div className="rounded-xl border border-gray-100 -mx-4 sm:mx-0 overflow-x-auto relative">

          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <span className="text-sm font-medium text-gray-500">Chargement...</span>
            </div>
          )}

          <table className="table-auto min-w-[900px] w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">N°</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Opération / <br /> Mode paiement</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Operateur</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Montant</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Document</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
                <th className="px-4 sm:px-6 py-3 text-center text-sm font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredDocuments) && filteredDocuments.length > 0 ? (
                filteredDocuments.map((item, i) => (
                  <DocumentRow
                    key={item.id}
                    rowIndex={i}
                    {...item}
                    onViewDetail={() => setSelectedDoc(item)}
                    canView={canView}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400">Aucun document trouvé</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          start={(currentPage - 1) * rowsPerPage + 1}
          end={Math.min(currentPage * rowsPerPage, total)}
        />

      </div>

      {selectedDoc && (
        <DetailModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          canApprove={canApprove}
          canReject={canReject}
        />
      )}

    </div>
  )
}

/* ================= DETAIL MODAL ================= */

function DetailModal({ doc, onClose, canApprove, canReject }) {

  const statusColor =
    doc.status === "Complétée"
      ? "text-[#16A34A]"
      : doc.status === "Rejetée"
      ? "text-[#EF4444]"
      : doc.status === "Annulée"
      ? "text-[#D97706]"
      : "text-[#2563EB]"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl w-[860px] max-w-full sm:max-w-[95vw] max-h-[94vh] sm:max-h-[92vh] overflow-y-auto shadow-2xl"
        style={{ animation: "modalIn 0.18s ease-out" }}
      >

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-7 py-4 sm:py-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-[#111827]">Détail sur l'opération</h2>
            <p className="text-gray-500 text-sm mt-0.5 break-all">ID : {doc.metaId}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canApprove && (
              <button className="flex-1 sm:flex-none bg-[#1EA4DC] text-white px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#189ecf] transition whitespace-nowrap">
                Valider
              </button>
            )}
            {canReject && (
              <button className="flex-1 sm:flex-none bg-[#EF4444] text-white px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-500 transition whitespace-nowrap">
                Rejeter
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-7 space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#1EA4DC] text-white px-5 py-3 text-sm font-semibold">
                Informations de l'opération
              </div>
              <div className="px-5 py-4 space-y-3">
                <InfoRow label="Type" value={<span className="capitalize">{doc.operation}</span>} />
                <InfoRow label="Montant" value={<span className={statusColor + " font-semibold"}>{doc.amount}</span>} />
                <InfoRow label="Statut" value={<span className={statusColor + " font-semibold"}>{doc.status}</span>} />
                <InfoRow label="Opérateur" value={doc.operator} />
                <InfoRow label="Description" value={doc.description} />
                <InfoRow label="Demandée le" value={doc.requestedAt} />
                <InfoRow label="Validée le" value={doc.validatedAt} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#1EA4DC] text-white px-5 py-3 text-sm font-semibold">
                Information du commerçant
              </div>
              <div className="px-5 py-4 space-y-3">
                <InfoRow label="Nom" value={doc.operatorName} />
                <InfoRow label="Téléphone" value={doc.merchantPhone} />
                <InfoRow label="Email" value={doc.merchantEmail} />
                <InfoRow label="Adresse" value={doc.merchantAddress} />
                <InfoRow label="Ville" value={doc.merchantCity} />
                <InfoRow label="Statut" value={<span className="text-[#16A34A] font-semibold">{doc.merchantStatus}</span>} />
              </div>
            </div>

          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#1EA4DC] text-white px-5 py-3 text-sm font-semibold">
              Métadonnées
            </div>
            <div className="px-5 py-4 space-y-3">
              <InfoRow label="Id" value={<span className="break-all">{doc.metaId}</span>} />
              <InfoRow label="Créé le" value={doc.metaCreatedAt} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#1EA4DC] text-white px-5 py-3 text-sm font-semibold">
              Preuve de paiement
            </div>
            {doc.proofUrl ? (
              <div className="p-4">
                <img
                  src={doc.proofUrl}
                  alt="Preuve de paiement"
                  className="w-full rounded-lg object-contain max-h-64"
                />
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                Aucune preuve disponible
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ================= INFO ROW ================= */

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-[#111827] text-right break-words min-w-0">{value}</span>
    </div>
  )
}

/* ================= MENU D'ACTIONS (PORTAL) ================= */

const ACTION_MENU_PORTAL_CLASS = "doc-row-action-menu-portal"

function DocumentRowMenu({ onViewDetail, canView, canEdit, canDelete }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const [coords, setCoords] = useState(null) // { top, left, openUpward }

  const MENU_WIDTH  = 160 // ~ w-40
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

  // Si aucune action n'est autorisée, on n'affiche même pas le bouton "..."
  if (!canView && !canEdit && !canDelete) return null

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-gray-100 p-2 rounded-lg transition"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && coords && createPortal(
        <div
          className={`${ACTION_MENU_PORTAL_CLASS} fixed z-[100] w-40 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left`}
          style={{
            top:    coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left:   coords.left,
            animation: "docMenuFadeIn 0.1s ease-out",
          }}
        >
          {canView && (
            <button
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
              onClick={() => { setOpen(false); onViewDetail() }}
            >
              <Eye size={16} className="text-gray-500" /> Voir détails
            </button>
          )}
          {canEdit && (
            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
              <Pencil size={16} className="text-gray-500" /> Modifier
            </button>
          )}
          {canDelete && (
            <>
              <div className="border-t border-gray-100" />
              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={16} />
                <span className="text-[15px] font-medium">Supprimer</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes docMenuFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ================= ROW ================= */

function DocumentRow({
  rowIndex, index, operation, payment, operator, operatorName,
  amount, date, time, status, proofUrl, onViewDetail,
  canView, canEdit, canDelete,
}) {

  const statusClasses =
    status === "Complétée" ? "bg-[#DCFCE7] text-[#16A34A]"
    : status === "Annulée"  ? "bg-[#FEF3C7] text-[#D97706]"
    : status === "Rejetée"  ? "bg-[#FEE2E2] text-[#EF4444]"
    : "bg-[#DBEAFE] text-[#2563EB]"

  return (
    <tr className={`${rowIndex % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 sm:px-6 py-3 text-gray-700">{index}</td>
      <td className="px-4 sm:px-6 py-3">
        <p className="font-medium text-[#111827] capitalize">{operation}</p>
        <p className="text-gray-500 mt-1">{payment}</p>
      </td>
      <td className="px-4 sm:px-6 py-3">
        <p className="font-medium text-[#111827]">{operator}</p>
        <p className="text-gray-500 mt-1">{operatorName}</p>
      </td>
      <td className="px-4 sm:px-6 py-3 font-medium text-[#111827] whitespace-nowrap">{amount}</td>
      <td className="px-4 sm:px-6 py-3">
        <a href={proofUrl} target="_blank" rel="noreferrer" className="hover:bg-gray-100 p-2 rounded-lg inline-flex">
          <Download size={18} />
        </a>
      </td>
      <td className="px-4 sm:px-6 py-3">
        <p className="text-[#111827] whitespace-nowrap">{date}</p>
        <p className="text-gray-500 mt-1 whitespace-nowrap">{time}</p>
      </td>
      <td className="px-4 sm:px-6 py-3">
        <span className={`px-4 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusClasses}`}>{status}</span>
      </td>
      <td className="px-4 sm:px-6 py-3 text-center">
        <DocumentRowMenu
          onViewDetail={onViewDetail}
          canView={canView}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </td>
    </tr>
  )
}

/* ================= STAT CARD ================= */

function StatCard({ title, value, className = "" }) {
  return (
    <div className={`bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-4 sm:py-6 flex flex-col space-y-2 border border-blue-50/50 min-w-0 ${className}`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-xl sm:text-3xl font-extrabold text-[#1EA4DC] break-words">{value}</p>
    </div>
  )
}

/* ================= PAGINATION ================= */

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
            onChange={(e) => { setRowsPerPage(+e.target.value); setCurrentPage(1) }}
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