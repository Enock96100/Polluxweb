import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import {
  ArrowLeft,
  Lock,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  CheckCircle2,
  XCircle,
  Percent,
  ListChecks,
  Loader2,
} from "lucide-react"
import { getAuthData } from "./auth"
import useAuth from "../context/auth/utils"

const API_BASE = "https://youapi.youneed.app/pollux/prod/api"

/* ================= NOTIFICATIONS ================= */
function useNotification() {
  const [notification, setNotification] = useState(null)
  const notify = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }
  return { notification, notify }
}

function NotificationBanner({ notification }) {
  if (!notification) return null
  const isSuccess = notification.type === "success"
  return (
    <div
      className={`fixed top-4 right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
        isSuccess
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-red-100 text-red-700 border border-red-200"
      }`}
    >
      {notification.message}
    </div>
  )
}

const TABS = [
  { key: "infos", label: "Infos" },
  { key: "permissions", label: "Permissions" },
  { key: "statistiques", label: "Statistiques" },
]

/* ================= MAIN PAGE (dynamique) ================= */
export default function DetailAgent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notification, notify } = useNotification()
  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  const { can } = useAuth()

  const [activeTab, setActiveTab] = useState("infos")
  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState(null)
  const [permissionGroups, setPermissionGroups] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      // ✅ Utilise désormais le même getAuthData() partagé que le reste du
      // projet (components/auth.jsx), au lieu d'une version locale
      // redéfinie ici qui ne lisait que le token et pouvait diverger.
      const { token } = getAuthData()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      try {
        const [agentRes, permsRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/admin-agents/${id}`, { headers }),
          axios.get(`${API_BASE}/admin-agents/${id}/permissions`, { headers }),
          axios.get(`${API_BASE}/admin-agents/${id}/statistics`, { headers }),
        ])

        if (cancelled) return

        setAgent(agentRes.data?.data || null)
        setPermissionGroups(normalizePermissions(permsRes.data?.data))
        setStats(statsRes.data?.data || null)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          notify("Erreur lors du chargement des données de l'agent", "error")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /* ⚠️ À CONFIRMER: forme exacte de la réponse de /admin-agents/:id/permissions.
     La fonction gère plusieurs formes possibles: déjà groupé par module,
     ou liste plate avec un champ "module" à regrouper côté client. */
  function normalizePermissions(data) {
    if (!data) return []

    const mapPerm = (p) => ({
      id: p.id,
      libelle: p.name || p.libelle,
      description: p.description,
      assigned: p.assigned !== false,
    })

    // Cas 1: déjà groupé -> [{ module, permissions: [...] }]
    if (Array.isArray(data) && data[0]?.permissions) {
      return data.map((g) => ({
        module: g.module || g.name,
        permissions: (g.permissions || []).map(mapPerm),
      }))
    }

    if (data.groups) {
      return data.groups.map((g) => ({
        module: g.module || g.name,
        permissions: (g.permissions || []).map(mapPerm),
      }))
    }

    // Cas 2: liste plate de permissions avec champ "module"
    const flat = Array.isArray(data) ? data : data.permissions || []
    const map = {}
    flat.forEach((p) => {
      const moduleKey = p.module || "AUTRE"
      if (!map[moduleKey]) map[moduleKey] = []
      map[moduleKey].push(mapPerm(p))
    })
    return Object.entries(map).map(([module, permissions]) => ({ module, permissions }))
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500 text-sm sm:text-base text-center">
          <Loader2 size={22} className="animate-spin text-[#1EA4DC] shrink-0" />
          Chargement des informations de l'agent...
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400">
          Impossible de charger les informations de cet agent.
        </div>
        <NotificationBanner notification={notification} />
      </div>
    )
  }

  const user = agent.user || {}
  const roles = (user.userRoles || []).map((ur) => ur.role).filter(Boolean)
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toUpperCase()
  const initials = `${(user.firstName || "?")[0] || "?"}${(user.lastName || "")[0] || ""}`.toUpperCase()

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <NotificationBanner notification={notification} />

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
      </div>

      {/* ================= CARTE AGENT ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
          Détail sur agent
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0B3A5B] to-[#1EA4DC] text-white flex items-center justify-center text-base sm:text-lg font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{fullName || "-"}</h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base truncate">{user.email || "-"}</p>
            </div>
          </div>

          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
              agent.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            }`}
          >
            {agent.isActive ? "Actif" : "Inactif"}
          </span>
        </div>

        {/* ================= ONGLETS ================= */}
        <div className="mt-6 flex items-center bg-gray-100 rounded-full p-1 overflow-x-auto no-scrollbar w-full sm:w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= CONTENU DES ONGLETS ================= */}
      {activeTab === "infos" && (
        <InfosTab agent={agent} user={user} roles={roles} navigate={navigate} can={can} />
      )}
      {activeTab === "permissions" && <PermissionsTab groups={permissionGroups} />}
      {activeTab === "statistiques" && (
        <StatistiquesTab stats={stats} agentId={id} navigate={navigate} can={can} />
      )}
    </div>
  )
}

/* ================= ONGLET INFOS ================= */
function InfosTab({ agent, user, roles, navigate, can }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Informations personnelles</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <InfoField label="Code employé" value={agent.employeeCode} />
          <InfoField label="Département" value={agent.department} />
          <InfoField label="Poste" value={agent.position} />
          <InfoField label="Téléphone" value={user.phone} />
          <InfoField label="Ville" value={user.city} />
          <InfoField
            label="Date d'embauche"
            value={agent.hiredAt ? new Date(agent.hiredAt).toLocaleDateString("fr-FR") : null}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Users size={18} className="text-[#1EA4DC]" />
          Rôles assignés ({roles.length})
        </h2>

        {/* Vue tableau (desktop / tablette) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">Description</th>
                {/* Colonne Action affichée seulement si le lien de détail
                    a une chance d'être visible (permission ROLE_READ) */}
                {can("ROLE_READ") && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>

            <tbody>
              {roles.map((role) => (
                <RoleRow key={role.id} role={role} navigate={navigate} can={can} />
              ))}

              {roles.length === 0 && (
                <tr>
                  <td colSpan={can("ROLE_READ") ? 3 : 2} className="text-center text-gray-400 py-8">
                    Aucun rôle assigné à cet agent
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vue cartes (mobile) */}
        <div className="sm:hidden space-y-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} navigate={navigate} can={can} />
          ))}

          {roles.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              Aucun rôle assigné à cet agent
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-gray-800 font-medium break-words">{value || "-"}</p>
    </div>
  )
}

/* ================= ROLE ROW (table desktop) ================= */
function RoleRow({ role, navigate, can }) {
  // ROLE_READ : consulter le détail d'un rôle (page /detail_role/:id).
  // Sans cette permission, le nom du rôle reste visible mais non cliquable.
  const canViewRole = can("ROLE_READ")

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Users size={16} className="text-[#1EA4DC]" />
          </div>
          <p className="font-medium">{role.libelle || role.name}</p>
        </div>
      </td>

      <td className="px-4 py-4 text-gray-500 max-w-xs">{role.description || "-"}</td>

      {canViewRole && (
        <td className="px-4 py-4 text-center">
          <button
            onClick={() => navigate(`/detail_role/${role.id}`)}
            className="inline-flex items-center gap-1 text-[#1EA4DC] hover:underline text-sm font-medium"
          >
            Voir détails
            <ChevronRight size={14} />
          </button>
        </td>
      )}
    </tr>
  )
}

/* ================= ROLE CARD (mobile) ================= */
function RoleCard({ role, navigate, can }) {
  const canViewRole = can("ROLE_READ")

  const content = (
    <>
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <Users size={16} className="text-[#1EA4DC]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{role.libelle || role.name}</p>
        <p className="text-gray-500 text-xs truncate">{role.description || "-"}</p>
      </div>
      {canViewRole && <ChevronRight size={16} className="text-[#1EA4DC] shrink-0" />}
    </>
  )

  if (!canViewRole) {
    return (
      <div className="w-full text-left border border-gray-100 rounded-xl p-4 flex items-center gap-3">
        {content}
      </div>
    )
  }

  return (
    <button
      onClick={() => navigate(`/detail_role/${role.id}`)}
      className="w-full text-left border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-50"
    >
      {content}
    </button>
  )
}

/* ================= ONGLET PERMISSIONS ================= */
function PermissionsTab({ groups }) {
  const total = groups.reduce((acc, g) => acc + g.permissions.length, 0)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
        <Lock size={18} className="text-[#1EA4DC]" />
        Permissions ({total})
      </h2>

      <div className="space-y-4">
        {groups.map((group) => (
          <PermissionGroup key={group.module} group={group} />
        ))}

        {groups.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucune permission assignée à cet agent
          </p>
        )}
      </div>
    </div>
  )
}

function PermissionGroup({ group }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-3 bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Folder size={18} className="text-[#1EA4DC] shrink-0" />
          <span className="font-semibold text-gray-800 text-sm sm:text-base truncate">{group.module}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 shrink-0">
            {group.permissions.length}
          </span>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-[#1EA4DC] shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <>
          {/* Vue tableau (desktop / tablette) */}
          <table className="w-full text-sm hidden sm:table">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">Permission</th>
                <th className="px-4 py-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {group.permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    {permission.assigned ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : (
                      <XCircle size={18} className="text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium">{permission.libelle}</td>
                  <td className="px-4 py-4 text-gray-500">{permission.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Vue liste (mobile) */}
          <div className="sm:hidden divide-y divide-gray-100">
            {group.permissions.map((permission) => (
              <div key={permission.id} className="flex items-start gap-3 px-3 py-3">
                {permission.assigned ? (
                  <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={18} className="text-gray-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">{permission.libelle}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{permission.description || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ================= ONGLET STATISTIQUES ================= */
function StatistiquesTab({ stats, agentId, navigate, can }) {
  const s = stats || {}
  const cards = [
    {
      label: "Opérations Validées",
      value: s.validatedOperations ?? 0,
      icon: CheckCircle2,
      bg: "bg-green-100",
      color: "text-green-600",
    },
    {
      label: "Opérations Rejetées",
      value: s.rejectedOperations ?? 0,
      icon: XCircle,
      bg: "bg-orange-100",
      color: "text-orange-500",
    },
    {
      label: "Validations",
      value: s.totalValidations ?? 0,
      icon: CheckCircle2,
      bg: "bg-green-100",
      color: "text-green-600",
    },
    {
      label: "Taux de Validation",
      value: `${(s.approvalRate ?? 0).toFixed(1)}%`,
      icon: Percent,
      bg: "bg-green-100",
      color: "text-green-600",
    },
  ]

  // ⚠️ À CONFIRMER : route exacte d'une vue "opérations de cet agent".
  // En l'absence d'un endpoint/route dédié confirmé, on redirige vers
  // Fil_validation.jsx (le tableau général des opérations) — à remplacer
  // par une route filtrée par agentId dès qu'elle sera confirmée côté
  // backend/routing (ex: /fil_validation?agentId=...).
  const handleViewOperations = () => {
    navigate("/fil_validation", { state: { agentId } })
  }

  // Le bouton n'a de sens que si l'utilisateur connecté a le droit de
  // consulter des opérations (admin : toutes ; agent : au minimum les
  // siennes).
  const canViewOperations = can("OPERATION_READ_ALL") || can("OPERATION_READ_OWN")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 flex items-center gap-4"
          >
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon size={20} className={card.color} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {s.operationsByType && s.operationsByType.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Opérations par type</h3>
          <div className="space-y-2">
            {s.operationsByType.map((op) => (
              <div
                key={op.type}
                className="flex items-center justify-between gap-3 text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0"
              >
                <span className="text-gray-600 truncate">{op.type}</span>
                <span className="font-semibold text-gray-900 shrink-0">{op.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canViewOperations && (
        <button
          onClick={handleViewOperations}
          className="w-full flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#1a8bbd] transition-colors"
        >
          <ListChecks size={18} />
          Voir Opérations
        </button>
      )}
    </div>
  )
}