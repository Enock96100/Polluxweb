import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState } from "react"

/* ===================== DATA ===================== */

const distributeursInit = [
  {
    id: 1,
    name: "DIST-001",
    email: "dist1@example.com",
    phone: "+229 01 90 00 00 01",
    solde: "400 000 FCFA",
    status: "Actif",
  },
  {
    id: 2,
    name: "DIST-002",
    email: "dist2@example.com",
    phone: "+229 01 90 00 00 02",
    solde: "433 000 FCFA",
    status: "Actif",
  },
]

const commercantsInit = [
  {
    id: 1,
    name: "Boutique Le Phoenix",
    code: "COM-001",
    email: "phoenix@example.com",
    solde: "14 000F",
    phone: "+229 01 97 34 56 78",
    distributor: "DIST-001",
    status: "Actif",
  },
  {
    id: 2,
    name: "Kiosque Central",
    code: "COM-002",
    email: "central@example.com",
    solde: "14 000F",
    phone: "+229 01 97 45 67 89",
    distributor: "DIST-001",
    status: "Actif",
  },
]

/* ===================== MAIN ===================== */

export default function Partenaires() {
  const [activeTab, setActiveTab] = useState("distributeurs")

  const [distributeurs, setDistributeurs] = useState(distributeursInit)
  const [commercants, setCommercants] = useState(commercantsInit)

  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const data = activeTab === "distributeurs" ? distributeurs : commercants

  /* ================= PAGINATION ================= */

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const totalPages = Math.ceil(data.length / rowsPerPage)
  const start = (currentPage - 1) * rowsPerPage
  const end = start + rowsPerPage
  const paginatedData = data.slice(start, end)

  /* ================= ACTIONS ================= */

  const handleCreate = (item) => {
    if (activeTab === "distributeurs") {
      setDistributeurs([...distributeurs, { ...item, id: Date.now() }])
    } else {
      setCommercants([...commercants, { ...item, id: Date.now() }])
    }
    setCreateModal(false)
  }

  const handleEdit = (item) => {
    if (activeTab === "distributeurs") {
      setDistributeurs(distributeurs.map(d => d.id === item.id ? item : d))
    } else {
      setCommercants(commercants.map(c => c.id === item.id ? item : c))
    }
    setEditModal(false)
  }

  const handleDelete = () => {
    if (activeTab === "distributeurs") {
      setDistributeurs(distributeurs.filter(d => d.id !== selectedItem.id))
    } else {
      setCommercants(commercants.filter(c => c.id !== selectedItem.id))
    }
    setDeleteModal(false)
  }

  return (
    <div className="p-8 space-y-6">

      {/* TITLE */}
      <div>
        <h1 className="text-2xl font-semibold">Gestion des Partenaires</h1>
        <p className="text-gray-500">Gérer distributeurs et commerçants</p>
      </div>

      {/* TABS */}
      <div className="flex gap-4 bg-gray-100 rounded-full p-1 w-fit">
        <Tab label="Distributeurs" active={activeTab === "distributeurs"} onClick={() => setActiveTab("distributeurs")} />
        <Tab label="Commerçants" active={activeTab === "commercants"} onClick={() => setActiveTab("commercants")} />
      </div>

      {/* CARD */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between">
          <div>
            <h2 className="font-semibold text-lg">
              {activeTab === "distributeurs" ? "Liste des Distributeurs" : "Liste des Commerçants"}
            </h2>
            <p className="text-gray-500 text-sm">
              {activeTab === "distributeurs" ? "Gérer tous les distributeurs" : "Gérer tous les commerçants"}
            </p>
          </div>

          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} />
            Ajouter
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex justify-between gap-4">
          <div className="relative w-1/2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input placeholder="Rechercher..." className="w-full pl-10 py-2 rounded-lg bg-gray-100" />
          </div>

          <select className="bg-gray-100 rounded-lg px-4 py-2">
            <option>Tous les statuts</option>
            <option>Actif</option>
            <option>En attente</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Solde</th>
                <th className="px-4 py-3 text-left">Distributeur</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((item, i) => (
                <PartnerRow
                  key={item.id}
                  {...item}
                  alt={i % 2}
                  onEdit={() => { setSelectedItem(item); setEditModal(true) }}
                  onDelete={() => { setSelectedItem(item); setDeleteModal(true) }}
                />
              ))}
            </tbody>
          </table>
        </div>
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

      {/* MODALS */}
      {createModal && (
        <Modal title="Ajouter" onClose={() => setCreateModal(false)}>
          <PartnerForm type={activeTab} onSubmit={handleCreate} />
        </Modal>
      )}

      {editModal && (
        <Modal title="Modifier" onClose={() => setEditModal(false)}>
          <PartnerForm type={activeTab} data={selectedItem} onSubmit={handleEdit} />
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Suppression" onClose={() => setDeleteModal(false)}>
          <p>Voulez-vous supprimer <strong>{selectedItem?.name}</strong> ?</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeleteModal(false)} className="border px-4 py-2 rounded-lg">Annuler</button>
            <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg">Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ================= COMPONENTS ================= */

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex justify-between items-center border-t border-gray-200 pt-4 text-sm">
      <span>Affichage de {start} à {end} sur {total} entrées</span>

      <div className="flex items-center gap-4">
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(+e.target.value)
            setCurrentPage(1)
          }}
          className="border border-gray-200 rounded px-2 py-1"
        >
          {[5, 10, 20].map(n => <option key={n}>{n}</option>)}
        </select>

        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(1)} className="text-gray-400">
            <ChevronsLeft size={18} />
          </button>

          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={18} />
          </button>

          <span className="text-gray-600">{currentPage} / {totalPages}</span>

          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="text-gray-400 hover:text-gray-600">
            <ChevronRight size={18} />
          </button>

          <button onClick={() => setCurrentPage(totalPages)} className="text-gray-400 hover:text-gray-600">
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-6 py-2 rounded-full ${active ? "bg-white shadow font-medium" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

function PartnerRow({ name, code, email, solde, phone, distributor, status, alt, onEdit, onDelete }) {
  return (
    <tr className={alt ? "bg-gray-50" : ""}>
      <td className="px-4 py-4">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-gray-500">{code}</p>
      </td>
      <td className="px-4 py-4">
        <p>{email}</p>
        <p className="text-xs text-gray-500">{phone}</p>
      </td>
      <td className="px-4 py-4">{solde}</td>
      <td className="px-4 py-4">{distributor}</td>
      <td className="px-4 py-4">{status}</td>
      <td className="px-4 py-4 flex justify-center gap-3">
        <button onClick={onEdit}><Pencil size={16} /></button>
        <button onClick={onDelete}><Trash2 size={16} className="text-red-500" /></button>
      </td>
    </tr>
  )
}

function PartnerForm({ type, data = {}, onSubmit }) {
  const [form, setForm] = useState(data)
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
       
       {type === "distributeurs" && (
            <>
      <input name="name" defaultValue={form.name} onChange={handleChange} placeholder="Nom" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="code" defaultValue={form.code} onChange={handleChange} placeholder="Code" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="distributor" defaultValue={form.distributor} onChange={handleChange} placeholder="Distributeur" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="email" defaultValue={form.email} onChange={handleChange} placeholder="Email" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="phone" defaultValue={form.phone} onChange={handleChange} placeholder="Téléphone" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="solde" defaultValue={form.solde} onChange={handleChange} placeholder="Solde" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />

      <select name="status" defaultValue={form.status || "Actif"} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg">
        <option value="Actif">Actif</option>
        <option value="En attente">En attente</option>
      </select>
   </>
      )}
       
       
        {type === "commercants" && (
            <>
      <input name="name" defaultValue={form.name} onChange={handleChange} placeholder="Nom" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="code" defaultValue={form.code} onChange={handleChange} placeholder="Code" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="distributor" defaultValue={form.distributor} onChange={handleChange} placeholder="Distributeur" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="email" defaultValue={form.email} onChange={handleChange} placeholder="Email" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="phone" defaultValue={form.phone} onChange={handleChange} placeholder="Téléphone" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />
      <input name="solde" defaultValue={form.solde} onChange={handleChange} placeholder="Solde" className="w-full bg-gray-100 px-4 py-2 rounded-lg" />

      <select name="status" defaultValue={form.status || "Actif"} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg">
        <option value="Actif">Actif</option>
        <option value="En attente">En attente</option>
      </select>
   </>
      )}
      <div className="flex justify-end">
        <button className="bg-[#1EA4DC] text-white px-4 py-2 rounded-lg">Enregistrer</button>
      </div>
    </form>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute right-4 top-4"><X /></button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}
