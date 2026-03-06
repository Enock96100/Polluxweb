import {
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  Package,
  History,
  Pencil
} from "lucide-react"
import { useState } from "react"

export default function Commissions() {
  const [activeTab, setActiveTab] = useState("baremes")
  const [searchTerm, setSearchTerm] = useState("")
  const [productFilter, setProductFilter] = useState("tous")

  return (
    <div className="p-8 bg-gray-50 min-h-screen space-y-6">

      {/* ================= TITLE ================= */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Gestion des Commissions
        </h1>
        <p className="text-gray-500">
          Configuration des barèmes et suivi des paiements
        </p>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard
          icon={<DollarSign className="text-green-600" />}
          label="Commissions Payées"
          amount="618 800 FCFA"
          subtext="Ce mois-ci"
          subtextColor="text-green-600"
        />

        <StatCard
          icon={<TrendingUp className="text-orange-500" />}
          label="En Attente"
          amount="212 800 FCFA"
          subtext="À payer"
          subtextColor="text-orange-500"
        />

        <StatCard
          icon={<Clock className="text-blue-600" />}
          label="Opérations Totales"
          amount="1 267"
          subtext="Ce mois-ci"
          subtextColor="text-blue-600"
        />
      </div>

      {/* ================= TABS ================= */}
      <div className="bg-gray-100 p-1 rounded-full flex w-fit gap-1">
        <Tab
          icon={<Package size={16} />}
          label="Barèmes (13)"
          active={activeTab === "baremes"}
          onClick={() => setActiveTab("baremes")}
        />
        <Tab
          icon={<History size={16} />}
          label="Historique (8)"
          active={activeTab === "historique"}
          onClick={() => setActiveTab("historique")}
        />
      </div>

      {/* ================= TABLE CARD ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">

        {/* Header */}
        <div>
          <h2 className="font-semibold text-lg">Barèmes de Commission</h2>
          <p className="text-gray-500 text-sm">
            Taux de commission par sous-produit
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un sous-produit..."
              className="w-full pl-10 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="tous">Tous les produits</option>
            <option value="cartes">Cartes Prépayées</option>
            <option value="abonnements">Abonnements</option>
          </select>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-6 py-4 text-left">Code</th>
                <th className="px-6 py-4 text-left">Sous-produit</th>
                <th className="px-6 py-4 text-left">Catégorie</th>
                <th className="px-6 py-4 text-left">Prix Vente</th>
                <th className="px-6 py-4 text-left">Comm. Distributeur</th>
                <th className="px-6 py-4 text-left">Comm. Commerçant</th>
                <th className="px-6 py-4 text-left">Statut</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              <CommissionRow
                code="VISA-STD"
                icon="💳"
                name="Visa Prépayée"
                subName="Standard"
                category="Cartes Prépayées"
                price="5 000 FCFA"
                distComm="250 FCFA"
                distPercent="5%"
                merchComm="150 FCFA"
                merchPercent="3%"
              />

              <CommissionRow
                code="VISA-GOLD"
                icon="💳"
                name="Visa Prépayée"
                subName="Gold"
                category="Cartes Prépayées"
                price="10 000 FCFA"
                distComm="500 FCFA"
                distPercent="5%"
                merchComm="300 FCFA"
                merchPercent="3%"
              />

              <CommissionRow
                code="MC-PREP"
                icon="💳"
                name="Mastercard"
                subName="Prépayée"
                category="Cartes Prépayées"
                price="7 500 FCFA"
                distComm="375 FCFA"
                distPercent="5%"
                merchComm="225 FCFA"
                merchPercent="3%"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ================= COMPONENTS ================= */

function StatCard({ icon, label, amount, subtext, subtextColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold">{amount}</p>
      <p className={`text-sm font-medium ${subtextColor}`}>{subtext}</p>
    </div>
  )
}

function Tab({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm ${
        active ? "bg-white shadow font-medium" : "text-gray-500"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function CommissionRow({
  code,
  icon,
  name,
  subName,
  category,
  price,
  distComm,
  distPercent,
  merchComm,
  merchPercent
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">

      <td className="px-6 py-5">
        <span className="px-3 py-1 rounded-full border text-xs font-medium">
          {code}
        </span>
      </td>

      <td className="px-6 py-5">
        <div className="flex gap-3 items-center">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-gray-500">{subName}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-5 text-gray-700">{category}</td>

      <td className="px-6 py-5 font-medium">{price}</td>

      <td className="px-6 py-5">
        <p className="text-green-600 font-semibold">{distComm}</p>
        <p className="text-xs text-gray-500">{distPercent}</p>
      </td>

      <td className="px-6 py-5">
        <p className="text-green-600 font-semibold">{merchComm}</p>
        <p className="text-xs text-gray-500">{merchPercent}</p>
      </td>

      <td className="px-6 py-5">
        <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
          Actif
        </span>
      </td>

      <td className="px-6 py-5 text-center">
        <Pencil size={18} className="cursor-pointer text-gray-600 hover:text-gray-900" />
      </td>
    </tr>
  )
}
