import { useEffect, useState } from "react"
import axios from "axios"
import {
  Package,
  Users,
  Wallet,
  TrendingUp,
  ShoppingCart,
  Zap,
  Activity,
  Award,
  Building2,
  UserCheck,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
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
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import useAuth from "../context/auth/utils"

/* ---------- Fonctions utilitaires ---------- */
const formatCurrency = (value) => {
  if (!value) return "0 FCFA"
  const num = Number(value)
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + " FCFA"
}

// Version courte utilisée dans les labels de graphiques sur petit écran
// (ex: 1 200 000 -> "1,2M FCFA") pour éviter que le texte ne déborde.
const formatCurrencyCompact = (value) => {
  if (!value) return "0 FCFA"
  const num = Number(value)
  return new Intl.NumberFormat('fr-FR', {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num) + " FCFA"
}

const formatNumber = (value) => {
  if (!value) return "0"
  const num = Number(value)
  return new Intl.NumberFormat('fr-FR').format(num)
}

/* ---------- Hook responsive ----------
   Les composants Recharts (hauteur, rayon du PieChart, longueur des labels)
   ne peuvent pas être pilotés par des classes Tailwind : ce sont des props
   JS. On détecte donc la largeur d'écran pour adapter ces valeurs. */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [breakpoint])

  return isMobile
}

export default function Dashboard() {
  // On récupère companyId et l'état de chargement directement depuis le contexte
  // d'authentification, au lieu de refaire un appel /profile en parallèle.
  const { userCompany, loading: authLoading } = useAuth()

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const isMobile = useIsMobile()

  useEffect(() => {
    // Tant que le contexte auth n'a pas fini de charger le profil/société,
    // on ne tente rien : ça évite l'erreur "Impossible de récupérer le profil"
    // qui apparaissait quand ce composant se montait avant que AuthProvider
    // ait fini sa requête initiale.
    if (authLoading) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError("")

        const token = localStorage.getItem("token")
        if (!token) throw new Error("Token manquant")
console.log("Token found:", token);
        // companyId vient en priorité du contexte (déjà chargé par AuthProvider),
        // avec un repli sur localStorage au cas où le contexte n'aurait pas
        // encore été synchronisé (ex: juste après un login).
        const companyId = userCompany?.id || localStorage.getItem("companyId")

        if (!companyId) {
          throw new Error("CompanyId manquant")
        }
console.log("Fetching dashboard data for companyId:", companyId);
        const response = await axios.get(
          `https://youapi.youneed.app/pollux/prod/api/reports/company/dashboard/${companyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        )

        setDashboardData(response?.data?.data || null)

      } catch (error) {
        console.error("ERROR:", error?.response?.data || error.message)

        if (error?.response?.status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          localStorage.removeItem("company")
          localStorage.removeItem("companyId")
        }

        setError(
          error?.response?.data?.message ||
          error.message ||
          "Impossible de charger les statistiques"
        )
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [authLoading, userCompany])

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-8 flex justify-center items-center min-h-[400px] sm:min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#1EA4DC] mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium text-sm sm:text-base px-4">
            Chargement des données du tableau de bord...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 m-2 sm:m-8">
          <p className="font-semibold text-red-700 text-sm sm:text-base">Erreur de chargement :</p>
          <p className="text-xs sm:text-sm text-red-600 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  // Extraction des données
  const thisMonth = dashboardData?.thisMonth || {}
  const thisYear = dashboardData?.thisYear || {}
  const today = dashboardData?.today || {}
  const systemData = dashboardData?.system || {}
  const topPerformers = dashboardData?.topPerformers || []

  // Calcul des variations
  const monthlyRevenue = Number(thisMonth.totalRevenue) || 0
  const monthlyNetRevenue = Number(thisMonth.netRevenue) || 0
  const yearlyRevenue = Number(thisYear.totalRevenue) || 0
  const yearlyNetRevenue = Number(thisYear.netRevenue) || 0
  const dailyRevenue = Number(today.totalRevenue) || 0
  const dailyNetRevenue = Number(today.netRevenue) || 0

  // Données pour graphiques
  const commissionsGraphData = [
    { name: "Distributeurs", value: thisMonth?.totalCommissions?.distributor || 0 },
    { name: "Commerçants", value: thisMonth?.totalCommissions?.merchant || 0 },
    { name: "Entreprise", value: thisMonth?.totalCommissions?.company || 0 },
  ]

  const systemGraphData = [
    { name: "Distributeurs", actifs: systemData?.distributors?.active || 0, total: systemData?.distributors?.total || 0 },
    { name: "Commerçants", actifs: systemData?.merchants?.active || 0, total: systemData?.merchants?.total || 0 },
    { name: "Agents", actifs: systemData?.agents?.active || 0, total: systemData?.agents?.total || 0 },
  ]

  const performanceByType = [
    {
      name: "DISTRIBUTOR",
      count: topPerformers.filter(p => p.type === "DISTRIBUTOR").length,
      color: "#1EA4DC"
    },
    {
      name: "MERCHANT",
      count: topPerformers.filter(p => p.type === "MERCHANT").length,
      color: "#10B981"
    }
  ]

  const COLORS = ["#1EA4DC", "#10B981", "#F59E0B"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 lg:space-y-8">

        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Tableau de bord
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1 sm:mt-2">
            Vue d'ensemble complète de l'activité et de la performance
          </p>
        </div>

        {/* KPIs Principaux - Ligne 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <KPICard 
            title="Chiffre d'affaires (Mois)" 
            value={formatCurrency(monthlyRevenue)}
            icon={<Package className="w-5 h-5 sm:w-6 sm:h-6" />}
            trend={monthlyRevenue > dailyRevenue ? "up" : "down"}
            subtext={`${formatCurrency(dailyRevenue)} aujourd'hui`}
          />
          <KPICard 
            title="Revenu Net (Mois)" 
            value={formatCurrency(monthlyNetRevenue)}
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
            variant="success"
            trend={monthlyNetRevenue > 0 ? "up" : "down"}
            subtext={`${formatCurrency(yearlyNetRevenue / 12)} en moyenne/mois`}
          />
          <KPICard 
            title="Commissions (Mois)" 
            value={formatCurrency(thisMonth?.totalCommissions?.total || 0)}
            icon={<Wallet className="w-5 h-5 sm:w-6 sm:h-6" />}
            subtext={`${formatNumber(thisMonth?.totalOperations || 0)} opérations`}
          />
          <KPICard 
            title="Opérations (Année)" 
            value={formatNumber(thisYear?.totalOperations || 0)}
            icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
            subtext={`${formatCurrency(yearlyRevenue)} générés`}
          />
        </div>

        {/* KPIs Système - Ligne 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <SystemKPI 
            title="Distributeurs" 
            active={systemData?.distributors?.active || 0}
            total={systemData?.distributors?.total || 0}
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
            color="blue"
          />
          <SystemKPI 
            title="Commerçants" 
            active={systemData?.merchants?.active || 0}
            total={systemData?.merchants?.total || 0}
            icon={<Building2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            color="green"
          />
          <SystemKPI 
            title="Agents" 
            active={systemData?.agents?.active || 0}
            total={systemData?.agents?.total || 0}
            icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
            color="purple"
          />
          <SystemKPI 
            title="Cartes Actives" 
            active={systemData?.cards?.active || 0}
            total={systemData?.cards?.total || 0}
            icon={<CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />}
            color="orange"
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Répartition des commissions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              Répartition des commissions
            </h2>
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <PieChart>
                <Pie
                  data={commissionsGraphData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    isMobile
                      ? formatCurrencyCompact(value)
                      : `${name}: ${formatCurrency(value)}`
                  }
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {commissionsGraphData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                {isMobile && <Legend wrapperStyle={{ fontSize: "11px" }} />}
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* État du système */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow xl:col-span-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
              État du système
            </h2>
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <BarChart
                data={systemGraphData}
                margin={isMobile ? { left: -20, right: 5, top: 5, bottom: 0 } : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={isMobile ? 10 : 12} />
                <YAxis fontSize={isMobile ? 10 : 12} width={isMobile ? 30 : 60} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend wrapperStyle={{ fontSize: isMobile ? "11px" : "13px" }} />
                <Bar dataKey="actifs" fill="#1EA4DC" name="Actifs" />
                <Bar dataKey="total" fill="#E5E7EB" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meilleurs performers */}
        {topPerformers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Top performers</h2>
            </div>

            {/* overflow-x-auto permet de scroller horizontalement le tableau
                sur mobile plutôt que de le laisser déborder de l'écran */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[560px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Rang</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Opérations</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Montant Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((performer, index) => (
                    <tr key={performer.id} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100 hover:bg-gray-100 transition-colors`}>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1EA4DC] text-white text-[10px] sm:text-xs font-bold">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{performer.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{performer.email}</p>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                          performer.type === 'DISTRIBUTOR' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {performer.type === 'DISTRIBUTOR' ? 'Distributeur' : 'Commerçant'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{formatNumber(performer.operationsCount)}</p>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">{formatCurrency(performer.totalAmount)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Résumé des abonnements et cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Abonnements Canal+</h3>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{systemData?.subscriptions?.total || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {systemData?.subscriptions?.active || 0} actifs
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-medium text-green-600">
                  {Math.round(((systemData?.subscriptions?.active || 0) / (systemData?.subscriptions?.total || 1)) * 100)}% actifs
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Cartes prépayées</h3>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{systemData?.cards?.total || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {systemData?.cards?.active || 0} actives
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-medium text-green-600">
                  {Math.round(((systemData?.cards?.active || 0) / (systemData?.cards?.total || 1)) * 100)}% actives
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Base clients</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900">{formatNumber(systemData?.clients || 0)}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">Clients actifs sur la plateforme</p>
        </div>

      </div>
    </div>
  )
}

/* ---------- COMPONENTS ---------- */

function KPICard({ title, value, icon, variant = "default", trend, subtext }) {
  const baseClasses = "bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
  
  const iconClasses = {
    default: "bg-blue-100 text-[#1EA4DC]",
    success: "bg-green-100 text-green-600",
  }

  return (
    <div className={baseClasses}>
      <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">{title}</p>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{value}</h3>
        </div>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClasses[variant]}`}>
          {icon}
        </div>
      </div>
      {subtext && (
        <p className="text-[11px] sm:text-xs text-gray-500 truncate">{subtext}</p>
      )}
    </div>
  )
}

function SystemKPI({ title, active, total, icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  }

  const percentage = total > 0 ? Math.round((active / total) * 100) : 0

  return (
    <div className={`rounded-xl border p-3 sm:p-6 shadow-sm hover:shadow-md transition-shadow ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white">
          {icon}
        </div>
      </div>
      <p className="text-xs sm:text-sm font-medium opacity-75 mb-1 sm:mb-2 truncate">{title}</p>
      <p className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{active}</p>
      <div className="w-full bg-white bg-opacity-30 rounded-full h-1.5 sm:h-2 mb-1 sm:mb-2">
        <div 
          className="h-full rounded-full bg-current opacity-50"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-[10px] sm:text-xs opacity-75">
        {active} actifs sur {total} ({percentage}%)
      </p>
    </div>
  )
}