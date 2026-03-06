import { Search, Eye, Check, X, AlertCircle, Clock } from "lucide-react"
import { useState } from "react"

export default function FileValidation() {
  const [searchTerm, setSearchTerm] = useState("")
  const [productFilter, setProductFilter] = useState("tous")
  const [priorityFilter, setPriorityFilter] = useState("toutes")
  const [distributorFilter, setDistributorFilter] = useState("tous")

  return (
    <div className="p-8 space-y-6">

      {/* ================= TITLE ================= */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">File de Validation</h1>
          <p className="text-gray-500">
            Opérations en attente de validation manuelle
          </p>
        </div>

        <div className="flex gap-3">
          <StatusBadge count="12" label="en attente" color="orange" icon={<Clock size={16} />} />
          <StatusBadge count="4" label="priorité haute" color="red" icon={<AlertCircle size={16} />} />
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Filtres</h2>
          <p className="text-gray-500 text-sm">Affiner la recherche des opérations</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ID, client, commerçant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 py-2 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Produit</label>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500"
            >
              <option value="tous">Tous les produits</option>
              <option value="canal">Canal+</option>
              <option value="visa">Visa Prépayée</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priorité</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500"
            >
              <option value="toutes">Toutes</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Distributeur</label>
            <select
              value={distributorFilter}
              onChange={(e) => setDistributorFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500"
            >
              <option value="tous">Tous</option>
              <option value="dist1">Distributeur 1</option>
              <option value="dist2">Distributeur 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border border-gray-200">

        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="font-semibold text-lg">Opérations en Attente</h2>
          <p className="text-gray-500 text-sm">12 transactions à valider</p>
        </div>

        {/* Table Wrapper (same margins as filters) */}
        <div className="px-6 pb-6">
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID Opération</th>
                  <th className="px-4 py-3 text-left font-medium">Date/Heure</th>
                  <th className="px-4 py-3 text-left font-medium">Produit/Service</th>
                  <th className="px-4 py-3 text-left font-medium">Commerçant</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Montant</th>
                  <th className="px-4 py-3 text-left font-medium">Priorité</th>
                  <th className="px-4 py-3 text-left font-medium">Délai</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                <OperationRow
                  opId="OP-202510"
                  opCode="31-0001"
                  date="31/10/2025"
                  time="09:15"
                  productIcon="📺"
                  productName="Canal+ Access"
                  productSubtext="Abonnements Canal+"
                  merchant="Boutique Plateau"
                  merchantCode="COM-045"
                  clientName="Koua ssi Yao"
                  clientPhone="+225 05 77 88 99 00"
                  amount="3 500"
                  commission="+175 FCFA"
                  priority="Haute"
                  delay="15 min"
                  alt={false}
                />

                <OperationRow
                  opId="OP-202510"
                  opCode="31-0002"
                  date="31/10/2025"
                  time="09:05"
                  productIcon="💳"
                  productName="Visa Prépayée Gold"
                  productSubtext="Cartes Prépayées"
                  merchant="Shop Cocody"
                  merchantCode="COM-023"
                  clientName="Aya Touré"
                  clientPhone="+225 01 55 66 77 88"
                  amount="10 000"
                  commission="+500 FCFA"
                  priority="Normale"
                  delay="25 min"
                  alt={true}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= COMPONENTS ================= */

function StatusBadge({ count, label, color, icon }) {
  const colorClasses = {
    orange: "bg-orange-100 text-orange-600 border-orange-200",
    red: "bg-red-100 text-red-600 border-red-200"
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClasses[color]}`}>
      {icon}
      <span className="font-semibold">{count}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

function OperationRow({
  opId,
  opCode,
  date,
  time,
  productIcon,
  productName,
  productSubtext,
  merchant,
  merchantCode,
  clientName,
  clientPhone,
  amount,
  commission,
  priority,
  delay,
  alt
}) {
  const priorityColor =
    priority === "Haute"
      ? "bg-red-100 text-red-600"
      : "bg-blue-100 text-blue-600"

  const delayColor =
    priority === "Haute" ? "text-red-600" : "text-orange-600"

  return (
    <tr className={` border-gray-100 ${alt ? "bg-gray-50" : "bg-white"}`}>
      <td className="px-4 py-4">
        <p className="font-medium">{opId}</p>
        <p className="text-xs text-gray-500">{opCode}</p>
      </td>

      <td className="px-4 py-4">
        <p>{date}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </td>

      <td className="px-4 py-4">
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
            {productIcon}
          </div>
          <div>
            <p className="font-medium">{productName}</p>
            <p className="text-xs text-gray-500">{productSubtext}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <p>{merchant}</p>
        <p className="text-xs text-gray-500">{merchantCode}</p>
      </td>

      <td className="px-4 py-4">
        <p>{clientName}</p>
        <p className="text-xs text-gray-500">{clientPhone}</p>
      </td>

      <td className="px-4 py-4">
        <p className="font-semibold">{amount} FCFA</p>
        <p className="text-xs text-green-600">{commission}</p>
      </td>

      <td className="px-4 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
          {priority}
        </span>
      </td>

      <td className="px-4 py-4">
        <span className={`font-medium ${delayColor}`}>{delay}</span>
      </td>

      <td className="px-4 py-4 text-center">
        <div className="flex justify-center gap-2">
          <Eye size={18} className="text-gray-600 cursor-pointer" />
          <Check size={18} className="text-green-600 cursor-pointer" />
          <X size={18} className="text-red-600 cursor-pointer" />
        </div>
      </td>
    </tr>
  )
}
