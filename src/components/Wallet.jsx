import {
  Plus,
  Wallet as WalletIcon,
  DollarSign,
  Search,
  Eye,
} from "lucide-react"
import { useState } from "react"

/* ===================== DATA ===================== */

const usersWallets = [
  {
    id: 1,
    role: "Distributeur",
    name: "Alpha",
    code: "DIST-001",
    recharge: "235 000 FCFA",
    rechargeBlocked: "15 000 FCFA",
    commission: "40 000 FCFA",
    commissionBlocked: "5 000 FCFA",
    total: "295 000 FCFA",
  },
  {
    id: 2,
    role: "Distributeur",
    name: "Beta",
    code: "DIST-002",
    recharge: "172 000 FCFA",
    rechargeBlocked: "8 000 FCFA",
    commission: "30 000 FCFA",
    commissionBlocked: "2 000 FCFA",
    total: "212 000 FCFA",
  },
]

const transactions = [
  {
    id: 1,
    ref: "TRX-001",
    ref2: "REF-2025-001",
    user: "Distributeur Alpha",
    code: "DIST-001",
    accountType: "Rechargement",
    type: "Crédit",
    amount: "+50 000 FCFA",
    description: "Réapprovisionnement wallet",
    method: "Virement bancaire",
    date: "29/10/2025 14:30",
    status: "Validé",
  },
  {
    id: 2,
    ref: "TRX-002",
    ref2: "REF-2025-002",
    user: "Distributeur Alpha",
    code: "DIST-001",
    accountType: "Commission",
    type: "Crédit",
    amount: "+5 000 FCFA",
    description: "Commission sur ventes",
    method: "Automatique",
    date: "29/10/2025 14:15",
    status: "Validé",
  },
  {
    id: 3,
    ref: "TRX-003",
    ref2: "REF-2025-003",
    user: "Boutique Le Phoenix",
    code: "COM-001",
    accountType: "Rechargement",
    type: "Crédit",
    amount: "+30 000 FCFA",
    description: "Abonnement canal",
    method: "Mobile Money",
    date: "29/10/2025 13:45",
    status: "En attente",
  },
]

/* ===================== MAIN ===================== */

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState("ensemble")

  return (
    <div className="p-8 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des Wallets</h1>
          <p className="text-gray-500">
            Gestion des comptes de rechargement et commission
          </p>
        </div>

        <button className="flex items-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> Nouvelle Recharge
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-gray-100 rounded-full p-1 w-fit">
        <Tab label="Vue d'ensemble" active={activeTab === "ensemble"} onClick={() => setActiveTab("ensemble")} />
        <Tab label="Comptes Utilisateurs" active={activeTab === "comptes"} onClick={() => setActiveTab("comptes")} />
        <Tab label="Transactions" active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} />
      </div>

      {/* ===================== VUE D'ENSEMBLE ===================== */}
      {activeTab === "ensemble" && (
        <>
          <Section
            icon={<WalletIcon size={20} className="text-blue-600" />}
            title="Compte Rechargement"
            color="bg-blue-100"
            cards={[
              { label: "Solde Total", amount: "730 000 FCFA", sub: "Tous les comptes", color: "text-blue-600" },
              { label: "Fonds Bloqués", amount: "35 000 FCFA", sub: "En validation", color: "text-yellow-600" },
              { label: "Fonds Disponibles", amount: "695 000 FCFA", sub: "Utilisables", color: "text-green-600" },
            ]}
          />

          <Section
            icon={<DollarSign size={20} className="text-green-600" />}
            title="Compte Commission"
            color="bg-green-100"
            cards={[
              { label: "Solde Total", amount: "135 000 FCFA", sub: "Toutes commissions", color: "text-green-600" },
              { label: "Fonds Bloqués", amount: "10 000 FCFA", sub: "En attente", color: "text-yellow-600" },
              { label: "Fonds Disponibles", amount: "125 000 FCFA", sub: "Retirables", color: "text-green-600" },
            ]}
          />
        </>
      )}

      {/* ===================== COMPTES UTILISATEURS ===================== */}
      {activeTab === "comptes" && (
        <div className="bg-white rounded-xl p-6 space-y-6">
          <h2 className="font-semibold text-lg">Comptes Utilisateurs</h2>

          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3">Rechargement</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {usersWallets.map((u, i) => (
                <tr key={u.id} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="px-4 py-4">
                    <p className="font-medium">{u.role} {u.name}</p>
                    <p className="text-xs text-gray-500">{u.code}</p>
                  </td>
                  <td className="px-4 py-4">{u.recharge}</td>
                  <td className="px-4 py-4 text-green-600">{u.commission}</td>
                  <td className="px-4 py-4 font-medium">{u.total}</td>
                  <td className="px-4 py-4 text-center">
                    <Eye size={18} className="cursor-pointer mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== TRANSACTIONS ===================== */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">Historique des Transactions</h2>
              <p className="text-gray-500 text-sm">
                Toutes les transactions des comptes rechargement et commission
              </p>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg"
              />
            </div>
          </div>

          {/* FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select label="Tous les comptes" />
            <Select label="Tous les types" />
            <Select label="Tous" />
            <Select label="Tous les statuts" />
          </div>

          {/* TABLE */}
          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Type Compte</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t.id} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="px-4 py-4">
                    <p className="font-medium">{t.ref}</p>
                    <p className="text-xs text-gray-500">{t.ref2}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{t.user}</p>
                    <p className="text-xs text-gray-500">{t.code}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge blue={t.accountType === "Rechargement"}>
                      {t.accountType}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">{t.type}</td>
                  <td className="px-4 py-4 text-green-600 font-medium">{t.amount}</td>
                  <td className="px-4 py-4">
                    <p>{t.description}</p>
                    <p className="text-xs text-gray-500">{t.method}</p>
                  </td>
                  <td className="px-4 py-4">{t.date}</td>
                  <td className="px-4 py-4">
                    <Badge>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ================= COMPONENTS ================= */

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm ${
        active ? "bg-white shadow font-medium" : "text-gray-500"
      }`}
    >
      {label}
    </button>
  )
}

function Section({ icon, title, color, cards }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <h2 className="font-semibold text-lg">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <WalletCard key={i} {...c} />
        ))}
      </div>
    </div>
  )
}

function WalletCard({ label, amount, sub, color }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{amount}</p>
      <p className={`text-sm font-medium ${color}`}>{sub}</p>
    </div>
  )
}

function Select({ label }) {
  return (
    <select className="bg-gray-100 rounded-lg px-4 py-2">
      <option>{label}</option>
    </select>
  )
}

function Badge({ children, blue }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        blue ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
      }`}
    >
      {children}
    </span>
  )
}
