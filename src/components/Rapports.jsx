import { Search, Download } from "lucide-react"

export default function ReportsAnalytics() {
  return (
    <div className="p-8 space-y-6">

      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Rapports et Analyses</h1>
          <p className="text-gray-500">
            Visualisation détaillée des performances du système
          </p>
        </div>

        <div className="flex gap-3">
          <ExportButton label="Excel" />
          <ExportButton label="PDF" />
          <ExportButton label="CSV" />
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard
          title="Chiffre d'Affaires"
          value="45 680 000 FCFA"
          growth="+8.5% vs mois précédent"
          color="green"
        />

        <StatCard
          title="Commissions Totales"
          value="2 284 000 FCFA"
          growth="+8.5% vs mois précédent"
          color="green"
        />

        <StatCard
          title="Opérations"
          value="3 456"
          growth="+8.1% vs mois précédent"
          color="green"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-xl border border-gray-200">

        {/* Table header */}
        <div className="p-6 pb-4 space-y-3">
          <h2 className="font-semibold text-lg">Liste des opérations</h2>

          <div className="flex gap-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un sous-produit..."
                className="w-full pl-10 py-2 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select className="py-2 px-3 rounded-lg bg-gray-100 border-0 focus:ring-2 focus:ring-blue-500">
              <option>Financiers</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="px-6 pb-6">
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">N°</th>
                  <th className="px-4 py-3 text-left font-medium">Revenus</th>
                  <th className="px-4 py-3 text-left font-medium">Transactions</th>
                  <th className="px-4 py-3 text-left font-medium">Commission</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Période</th>
                </tr>
              </thead>

              <tbody>
                <ReportRow
                  ref="FIN-2025-11"
                  revenue="45 280 FCFA"
                  transactions="1234"
                  commission="7 000 FCFA"
                  status="Disponible"
                  period="20-10-2025 à 21-11-2025"
                />

                <ReportRow
                  ref="FIN-2025-13"
                  revenue="47 470 FCFA"
                  transactions="1037"
                  commission="2 000 FCFA"
                  status="En attente"
                  period="20-10-2025 à 21-11-2025"
                  alt
                />

                <ReportRow
                  ref="FIN-2025-14"
                  revenue="49 290 FCFA"
                  transactions="1567"
                  commission="5 000 FCFA"
                  status="Disponible"
                  period="20-10-2025 à 21-11-2025"
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

function ExportButton({ label }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
      <Download size={16} />
      {label}
    </button>
  )
}

function StatCard({ title, value, growth }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
      <p className="text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-green-600">{growth}</p>
    </div>
  )
}

function ReportRow({ ref, revenue, transactions, commission, status, period, alt }) {
  const statusClasses =
    status === "Disponible"
      ? "bg-green-100 text-green-600"
      : "bg-yellow-100 text-yellow-600"

  return (
    <tr className={`${alt ? "bg-gray-50" : "bg-white"}`}>
      <td className="px-4 py-4 font-medium">{ref}</td>
      <td className="px-4 py-4">{revenue}</td>
      <td className="px-4 py-4">{transactions}</td>
      <td className="px-4 py-4">{commission}</td>
      <td className="px-4 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-4">{period}</td>
    </tr>
  )
}
