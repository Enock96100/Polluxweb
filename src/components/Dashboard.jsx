import {
  Package,
  Users,
  Wallet,
  TrendingUp,
} from "lucide-react"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

/* ---------- DATA ---------- */

const statsData = [
  { name: "Lun", ventes: 40 },
  { name: "Mar", ventes: 65 },
  { name: "Mer", ventes: 55 },
  { name: "Jeu", ventes: 80 },
  { name: "Ven", ventes: 70 },
  { name: "Sam", ventes: 95 },
  { name: "Dim", ventes: 60 },
]

const produitsData = [
  { name: "Cartes", total: 8 },
  { name: "Abonnements", total: 5 },
  { name: "Services", total: 6 },
]

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-gray-500">
          Vue d’ensemble de l’activité de la plateforme
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPI title="Produits" value="12" icon={<Package />} />
        <KPI title="Partenaires" value="38" icon={<Users />} />
        <KPI title="Solde Wallet" value="1 250 000 FCFA" icon={<Wallet />} />
        <KPI title="Croissance" value="+18%" icon={<TrendingUp />} green />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Line chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 xl:col-span-2">
          <h2 className="font-semibold mb-4">
            Activité des ventes (7 jours)
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="ventes"
                stroke="#1EA4DC"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-4">
            Répartition des produits
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={produitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#1EA4DC" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activities table */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold mb-4">
          Activités récentes
        </h2>

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              <ActivityRow
                action="Ajout d’un produit"
                user="Admin"
                type="Produit"
                date="Aujourd’hui"
              />
              <ActivityRow
                action="Modification sous-produit"
                user="Superviseur"
                type="Sous-produit"
                date="Hier"
                alt
              />
              <ActivityRow
                action="Nouveau partenaire"
                user="Admin"
                type="Partenaire"
                date="18/01/2025"
              />
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

/* ---------- COMPONENTS ---------- */

function KPI({ title, value, icon, green }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-xl font-semibold mt-1">{value}</h3>
      </div>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          green
            ? "bg-green-100 text-green-600"
            : "bg-blue-100 text-blue-600"
        }`}
      >
        {icon}
      </div>
    </div>
  )
}

function ActivityRow({ action, user, type, date, alt }) {
  return (
    <tr className={`${alt ? "bg-gray-50" : ""} border-t`}>
      <td className="px-4 py-3">{action}</td>
      <td className="px-4 py-3">{user}</td>
      <td className="px-4 py-3 text-center">
        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs">
          {type}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-gray-500">
        {date}
      </td>
    </tr>
  )
}
