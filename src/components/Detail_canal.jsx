import {
  Plus,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

/* ===================== DATA ===================== */

const distributors = [
  {
    id: 1,
    name: "Jean Paul",
    role: "Distributeur",
    date: "20-12-2025",
    taux: "1234 FCFA",
  },
  {
    id: 2,
    name: "Jean Paul",
    role: "Distributeur",
    date: "20-12-2025",
    taux: "1234 FCFA",
  },
]

const merchants = [
  {
    id: 1,
    name: "Jean Paul",
    role: "Commerçant",
    date: "20-12-2025",
    taux: "1234 FCFA",
  },
  {
    id: 2,
    name: "Jean Paul",
    role: "Commerçant",
    date: "20-12-2025",
    taux: "1234 FCFA",
  },
]

/* ===================== MAIN ===================== */

export default function FormuleCanalDetail() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-semibold text-gray-800">
            Formules Canal +
          </h1>

          <p className="text-gray-500 mt-1">
            Formules Access
          </p>
        </div>

        {/* TABS */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
          <HeaderTab
            label="Aperçu"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />

          <HeaderTab
            label="Statistique"
            active={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
          />

          <HeaderTab
            label="Abonnement"
            active={activeTab === "subscription"}
            onClick={() => setActiveTab("subscription")}
          />

          <HeaderTab
            label="Historique"
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          />
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-8">

        {/* INFO HEADER */}
        <div className="bg-[#1EA4DC] text-white rounded-lg px-5 py-3 font-medium">
          Information Générales
        </div>

        {/* INFO CONTENT */}
        <div className="grid grid-cols-2 gap-20">

          {/* LEFT */}
          <div className="space-y-5">

            <InfoRow label="Statut">
              <span className="px-4 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                Activé
              </span>
            </InfoRow>

            <InfoRow label="Code">
              FOR-01
            </InfoRow>

            <InfoRow label="Nom">
              Access
            </InfoRow>

            <InfoRow label="ID services">
              b56hhijoyubdzhzhhzhbdznjjeiyjzj
            </InfoRow>

            <InfoRow label="Date de réception">
              04-12-2025 08:24
            </InfoRow>

          </div>

          {/* RIGHT */}
          <div className="space-y-5">

            <InfoRow label="Date de réception">
              04-12-2025 08:24
            </InfoRow>

            <InfoRow label="Prix">
              <span className="px-4 py-1 bg-blue-100 text-[#1EA4DC] rounded-full text-sm font-medium">
                5000 F
              </span>
            </InfoRow>

            <InfoRow label="Durée">
              <span className="px-4 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                30 Jours
              </span>
            </InfoRow>

            <InfoRow label="Dernière mise à jour">
              03-12-2025 09:34
            </InfoRow>

          </div>
        </div>

        {/* DISTRIBUTORS */}
        <SectionTable
          title="Assigné un distributeur"
          data={distributors}
        />

        {/* MERCHANTS */}
        <SectionTable
          title="Assigné un commerçant"
          data={merchants}
        />
      </div>
    </div>
  )
}

/* ===================== COMPONENTS ===================== */

function HeaderTab({ label, active, onClick }) {
  return (
   <button
  onClick={onClick}
  className={`
    px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
    ${
      active
        ? "bg-[#1EA4DC] text-white shadow-sm"
        : "text-gray-500 hover:bg-gray-100"
    }
  `}
>
  {label}
</button>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
      <p className="text-gray-500 text-sm">
        {label}
      </p>

      <div className="font-medium text-gray-800 text-sm">
        {children}
      </div>
    </div>
  )
}

function SectionTable({ title, data }) {

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const totalPages = Math.ceil(data.length / rowsPerPage)

  const start = (currentPage - 1) * rowsPerPage
  const end = start + rowsPerPage

  const paginatedData = data.slice(start, end)

  return (
    <div className="space-y-5">

      {/* BUTTON */}
      <div>
        <button className="flex items-center gap-2 bg-[#1EA4DC] text-white px-5 py-3 rounded-xl shadow-sm hover:opacity-90 transition">
          <Plus size={18} />
          {title}
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden">

        {/* SEARCH */}
        <div className="p-5 border-b border-gray-100">
          <div className="relative w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />

            <input
              placeholder="Rechercher..."
              className="w-full pl-10 py-2.5 rounded-xl bg-gray-100 outline-none"
            />
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full text-sm">

          <thead className="bg-[#1EA4DC] text-white">
            <tr>
              <th className="px-4 py-4 text-left">N°</th>
              <th className="px-4 py-4 text-left">Nom et Prénom</th>
              <th className="px-4 py-4 text-left">Rôle</th>
              <th className="px-4 py-4 text-left">Date</th>
              <th className="px-4 py-4 text-left">Taux</th>
              <th className="px-4 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item, i) => (
              <TableRow
                key={item.id}
                number={start + i + 1}
                {...item}
                alt={i % 2}
              />
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <PaginationFooter
          total={data.length}
          start={start + 1}
          end={Math.min(end, data.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>
    </div>
  )
}

function TableRow({
  number,
  name,
  role,
  date,
  taux,
  alt,
}) {

  return (
    <tr className={alt ? "bg-gray-50" : ""}>

      <td className="px-4 py-4">
        {number}
      </td>

      <td className="px-4 py-4 font-medium text-gray-800">
        {name}
      </td>

      <td className="px-4 py-4 text-gray-700">
        {role}
      </td>

      <td className="px-4 py-4 text-gray-600">
        {date}
      </td>

      <td className="px-4 py-4">
        <span className="px-4 py-1 bg-green-100 text-green-600 rounded-full font-medium">
          {taux}
        </span>
      </td>

      <td className="px-4 py-4">

        <div className="flex justify-center">
          <button className="hover:bg-gray-100 p-2 rounded-lg transition">
            <MoreHorizontal size={18} />
          </button>
        </div>

      </td>
    </tr>
  )
}

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

  return (
    <div className="flex justify-between items-center border-t border-gray-100 px-5 py-5 text-sm">

      <span className="text-gray-500">
        Affichage de {start} à {end} sur {total} entrées
      </span>

      <div className="flex items-center gap-4">

        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            Lignes par page:
          </span>

          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(+e.target.value)
              setCurrentPage(1)
            }}
            className="bg-gray-100 rounded-lg px-3 py-2 outline-none"
          >
            {[5, 10, 20].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-40"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            onClick={() =>
              setCurrentPage((p) => Math.max(1, p - 1))
            }
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-gray-600 font-medium px-2">
            Page {currentPage} sur {totalPages || 1}
          </span>

          <button
            onClick={() =>
              setCurrentPage((p) =>
                Math.min(totalPages, p + 1)
              )
            }
            disabled={currentPage === totalPages}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-40"
          >
            <ChevronsRight size={16} />
          </button>

        </div>
      </div>
    </div>
  )
}
