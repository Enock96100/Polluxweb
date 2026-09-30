import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Pencil,
  UserCog,
  Power,
  PowerOff,
  Trash2,
  Plus,
  Lock,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react"
import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import useAuth from "../context/auth/utils"

/* ================= API ================= */
const BASE_URL = "https://youapi.youneed.app/pollux/prod/api"

const getToken = () => localStorage.getItem("token")
const getCompanyId = () => localStorage.getItem("companyId")

const agentsUrl = (companyId) => `${BASE_URL}/admin-agents/company/${companyId}`
const agentsStatsUrl = (companyId) =>
  `${BASE_URL}/admin-agents/company/${companyId}/statistics`

const agentsCreateUrl = () => `${BASE_URL}/admin-agents`
const agentDetailUrl = (id) => `${BASE_URL}/admin-agents/${id}`
const agentToggleStatusUrl = (id) => `${BASE_URL}/admin-agents/${id}/toggle-status`
const agentDeleteUrl = (id) => `${BASE_URL}/admin-agents/${id}/hard`
const agentAssignRolesUrl = (id) => `${BASE_URL}/admin-agents/${id}/roles/bulk`

const rolesUrl = () => `${BASE_URL}/roles/all-roles-except-main-roles`
const rolesCreateUrl = () => `${BASE_URL}/roles`
const roleDetailUrl = (id) => `${BASE_URL}/roles/${id}`
const roleActivateUrl = (id) => `${BASE_URL}/roles/${id}/activate`
const roleDeactivateUrl = (id) => `${BASE_URL}/roles/${id}/deactivate`

const DEPARTMENT_LABELS = {
  ADMINISTRATION: "Administration",
  SUPPORT: "Support",
  VALIDATION: "Validation",
  TECHNIQUE: "Technique",
}

/* ═══════════════════════ NOTIFICATIONS ═══════════════════════ */
function useNotification() {
  const [notif, setNotif] = useState(null)
  const timerRef = useRef(null)

  const show = useCallback((type, message) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotif({ type, message })
    timerRef.current = setTimeout(() => setNotif(null), 4000)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotif(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { notif, showSuccess: (msg) => show("success", msg), showError: (msg) => show("error", msg), dismiss }
}

function NotificationBanner({ notif, onDismiss }) {
  if (!notif) return null
  const isSuccess = notif.type === "success"
  return (
    <div className={`flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition-all
      ${isSuccess
        ? "bg-green-50 border border-green-200 text-green-700"
        : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {isSuccess
        ? <CheckCircle size={18} className="shrink-0 text-green-500" />
        : <AlertCircle size={18} className="shrink-0 text-red-500" />
      }
      <span className="flex-1">{notif.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}

/* ═══════════════════════ PAGINATION ═══════════════════════ */
function Pagination({ page, setPage, limit, setLimit, total, limitOptions = [10, 25, 50, 100] }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages

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
        {setLimit && (
          <div className="flex items-center gap-2">
            <label htmlFor="rowsPerPage" className="text-gray-500 whitespace-nowrap hidden sm:inline">Par page</label>
            <select
              id="rowsPerPage"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="border border-gray-200 rounded px-2 py-1 text-xs sm:text-sm bg-white"
            >
              {limitOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={isFirstPage}
            aria-label="Première page"
            className={btnClass(isFirstPage)}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={isFirstPage}
            aria-label="Page précédente"
            className={btnClass(isFirstPage)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-600 whitespace-nowrap px-1.5 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={isLastPage}
            aria-label="Page suivante"
            className={btnClass(isLastPage)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setPage(totalPages)}
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

/* ═══════════════════════ CONFIRMATION PERSONNALISÉE ═══════════════════════ */
function useConfirm() {
  const [state, setState] = useState(null)

  const ask = useCallback((message, onConfirm, options = {}) => {
    setState({ message, onConfirm, title: options.title, variant: options.variant })
  }, [])

  const close = useCallback(() => setState(null), [])

  const handleConfirm = useCallback(async () => {
    if (state?.onConfirm) await state.onConfirm()
    close()
  }, [state, close])

  return { confirmState: state, ask, close, handleConfirm }
}

function ConfirmDialog({ state, onCancel, onConfirm }) {
  if (!state) return null
  const isDanger = state.variant === "danger"

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDanger ? "bg-red-100 text-red-600" : "bg-blue-100 text-[#1EA4DC]"
            }`}
          >
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">
              {state.title || "Confirmation"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{state.message}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white text-sm font-medium ${
              isDanger ? "bg-red-600" : "bg-[#1EA4DC]"
            }`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════ ACTION MENU ═══════════════════════ */
function ActionMenu({ items, menuWidth = 208 }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const margin = 8

    let left = rect.right - menuWidth
    if (left < margin) left = margin
    if (left + menuWidth > window.innerWidth - margin) {
      left = window.innerWidth - menuWidth - margin
    }

    const estimatedMenuHeight = items.length * 44 + 24
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight

    const top = openUpward ? rect.top - estimatedMenuHeight - 4 : rect.bottom + 4

    setPos({ top, left })
  }, [items.length, menuWidth])

  const toggleOpen = () => {
    if (!open) updatePosition()
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return

    const handleReposition = () => updatePosition()
    const handleClose = () => setOpen(false)

    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleClose)

    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleClose)
    }
  }, [open, updatePosition])

  useLayoutEffect(() => {
    if (open) updatePosition()
  }, [open, updatePosition])

  if (!items || items.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="mx-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
      >
        <MoreHorizontal className="text-gray-600" size={18} />
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />

            <div
              className="fixed bg-white border border-gray-100 rounded-2xl shadow-lg z-[110] py-2 text-left"
              style={{ top: pos.top, left: pos.left, width: menuWidth }}
            >
              {items.map((item, idx) => (
                <div key={idx}>
                  {item.dividerBefore && <div className="border-t border-gray-100 my-1" />}
                  <button
                    onClick={() => {
                      setOpen(false)
                      item.onClick()
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 ${
                      item.className || "text-gray-700"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

/* ================= HOOK : liste des rôles ================= */
function useAssignableRoles({ search, isActive } = {}) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const params = {}
      if (typeof isActive === "boolean") params.isActive = isActive
      if (search) params.search = search
      params._t = Date.now()

      const response = await axios.get(rolesUrl(), {
        params,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: "application/json",
        },
      })
      setRoles(response.data.data || [])
    } catch (err) {
      console.error("FETCH ROLES ERROR:", err.response || err)
      setRoles([])
      setError("Impossible de charger les rôles")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isActive])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const addRole = useCallback((role) => {
    setRoles((prev) => [role, ...prev])
  }, [])

  const updateRoleInList = useCallback((id, patch) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const removeRoleFromList = useCallback((id) => {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { roles, loading, error, refetch: fetchRoles, addRole, updateRoleInList, removeRoleFromList }
}

/* ================= MAIN COMPONENT ================= */
export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("agents")

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            {activeTab === "agents"
              ? "Gestion des Agents Administratifs"
              : "Gestion des Rôles"}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            {activeTab === "agents"
              ? "Créer et gérer les accès des agents au système"
              : "Créer et gérer les rôles et permissions"}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${
            activeTab === "agents" ? "bg-white shadow" : "text-gray-500"
          }`}
        >
          Agents
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${
            activeTab === "roles" ? "bg-white shadow" : "text-gray-500"
          }`}
        >
          Rôles
        </button>
      </div>

      {activeTab === "agents" ? <AgentsSection /> : <RolesSection />}
    </div>
  )
}

/* ================= AGENTS SECTION ================= */
function AgentsSection() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { notif, showSuccess, showError, dismiss } = useNotification()
  const { confirmState, ask, close, handleConfirm } = useConfirm()

  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    agentsByDepartment: [],
  })

  const [search, setSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("tous")
  const [statusFilter, setStatusFilter] = useState("tous")

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  const [showEdit, setShowEdit] = useState(false)
  const [editAgent, setEditAgent] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const [showAssignRole, setShowAssignRole] = useState(false)
  const [roleAgent, setRoleAgent] = useState(null)

  useEffect(() => {
    fetchAgents()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, departmentFilter, statusFilter])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError("")

      const token = getToken()
      const companyId = getCompanyId()
      if (!token) throw new Error("Token manquant")
      if (!companyId) throw new Error("Entreprise introuvable")

      const response = await axios.get(agentsUrl(companyId), {
        params: {
          page,
          limit,
          search: search || undefined,
          department:
            departmentFilter !== "tous" ? departmentFilter : undefined,
          isActive:
            statusFilter === "tous" ? undefined : statusFilter === "actif",
        },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

      setAgents(response.data.data || [])
      setTotal(response.data.pagination?.total || response.data.data.length)
    } catch {
      setError("Impossible de charger les agents")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = getToken()
      const companyId = getCompanyId()
      if (!token || !companyId) return

      const response = await axios.get(agentsStatsUrl(companyId), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

      setStats(response.data.data || {})
    } catch {
      // silencieux
    }
  }

  const handleDelete = (id) => {
    ask(
      "Cette action est irréversible.",
      async () => {
        try {
          await axios.delete(agentDeleteUrl(id), {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              Accept: "application/json",
            },
          })
          showSuccess("Agent supprimé avec succès")
          await fetchAgents()
          await fetchStats()
        } catch {
          showError("Erreur lors de la suppression")
        }
      },
      { title: "Supprimer cet agent ?", variant: "danger" }
    )
  }

  const handleEdit = (agent) => {
    setEditAgent(agent)
    setShowEdit(true)
  }

  const handleDetails = (agent) => {
    navigate(`/detail_agent/${agent.id}`, { state: { agent } })
  }

  const handleAssignRole = (agent) => {
    setRoleAgent(agent)
    setShowAssignRole(true)
  }

  const handleToggleStatus = (agent) => {
    const nextStatus = !agent.isActive

    ask(
      nextStatus
        ? "L'agent retrouvera l'accès au système."
        : "L'agent perdra l'accès au système.",
      async () => {
        try {
          await axios.patch(
            agentToggleStatusUrl(agent.id),
            { isActive: nextStatus },
            {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          )
          showSuccess(nextStatus ? "Agent activé" : "Agent désactivé")
          await fetchAgents()
          await fetchStats()
        } catch {
          showError("Erreur lors du changement de statut")
        }
      },
      { title: nextStatus ? "Activer cet agent ?" : "Désactiver cet agent ?" }
    )
  }

  const totalDepartments = stats.agentsByDepartment?.length || 0

  return (
    <>
      {notif && (
        <NotificationBanner notif={notif} onDismiss={dismiss} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Agents" value={stats.totalAgents ?? 0} icon={<Users />} />
        <StatCard
          label="Agents Actifs"
          value={stats.activeAgents ?? 0}
          color="green"
          icon={<CheckCircle />}
        />
        <StatCard
          label="Total Département"
          value={totalDepartments}
          color="purple"
          icon={<Building2 />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-base sm:text-lg font-semibold">Liste des Agents</h2>
          {can("ADMIN_AGENT_CREATE") && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm shrink-0"
            >
              <UserPlus size={18} />
              Nouvel Agent
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-100 text-sm focus:outline-none"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full sm:w-auto py-2.5 px-3 rounded-lg bg-gray-100 text-sm"
          >
            <option value="tous">Tous les départements</option>
            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto py-2.5 px-3 rounded-lg bg-gray-100 text-sm"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : (
          <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
            <table className="table-auto min-w-[820px] w-full text-sm">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Agent</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Département</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Créé le</th>
                  <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody>
                {agents.map((agent, i) => (
                  <AgentRow
                    key={agent.id}
                    rowIndex={i}
                    agent={agent}
                    onDelete={handleDelete}
                    onDetails={handleDetails}
                    onEdit={handleEdit}
                    onAssignRole={handleAssignRole}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}

                {agents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8">
                      Aucun agent trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <Pagination
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            total={total}
          />
        )}
      </div>

      {showEdit && editAgent && (
        <AgentFormModal
          mode="edit"
          agent={editAgent}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            fetchAgents()
            fetchStats()
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {showCreate && (
        <AgentFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            fetchAgents()
            fetchStats()
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {showAssignRole && roleAgent && (
        <AssignRoleModal
          agent={roleAgent}
          onClose={() => setShowAssignRole(false)}
          onSuccess={() => {
            fetchAgents()
            fetchStats()
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      <ConfirmDialog state={confirmState} onCancel={close} onConfirm={handleConfirm} />
    </>
  )
}

/* ================= AGENT ROW ================= */
function AgentRow({
  rowIndex,
  agent,
  onDelete,
  onDetails,
  onEdit,
  onAssignRole,
  onToggleStatus,
}) {
  const { can } = useAuth()
  const user = agent.user || {}
  const role = user.userRoles?.[0]?.role

  const menuItems = [
    can("ADMIN_AGENT_READ") && {
      icon: <Eye size={17} className="text-gray-500" />,
      label: "Détail",
      onClick: () => onDetails(agent),
    },
    can("ADMIN_AGENT_UPDATE") && {
      icon: <Pencil size={17} className="text-gray-500" />,
      label: "Modifier",
      onClick: () => onEdit(agent),
    },
    can("ADMIN_AGENT_PERMISSIONS") && {
      icon: <UserCog size={17} className="text-gray-500" />,
      label: "Assigner Rôle",
      onClick: () => onAssignRole(agent),
    },
    can("ADMIN_AGENT_UPDATE") && {
      icon: agent.isActive ? <PowerOff size={17} /> : <Power size={17} />,
      label: agent.isActive ? "Désactiver" : "Activer",
      onClick: () => onToggleStatus(agent),
      className: agent.isActive ? "text-orange-500" : "text-green-600",
      dividerBefore: true,
    },
    can("ADMIN_AGENT_DELETE") && {
      icon: <Trash2 size={17} />,
      label: "Supprimer",
      onClick: () => onDelete(agent.id),
      className: "text-red-600",
      dividerBefore: true,
    },
  ].filter(Boolean)

  return (
    <tr className={`${rowIndex % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium uppercase">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </td>

      <td className="px-4 py-3 uppercase whitespace-nowrap">{agent.employeeCode || "-"}</td>

      <td className="px-4 py-3 whitespace-nowrap">
        {DEPARTMENT_LABELS[agent.department] || agent.department || "-"}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">{role?.libelle || "-"}</td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            agent.isActive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {agent.isActive ? "Actif" : "Inactif"}
        </span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : "-"}
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <ActionMenu items={menuItems} />
      </td>
    </tr>
  )
}

/* ================= AGENT FORM MODAL ================= */
function AgentFormModal({ mode = "create", agent, onClose, onSuccess, showSuccess, showError }) {
  const isEdit = mode === "edit"
  const user = agent?.user || {}

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { roles, loading: rolesLoading } = useAssignableRoles({ isActive: true })

  const [form, setForm] = useState({
    firstName: isEdit ? user.firstName ?? "" : "",
    lastName: isEdit ? user.lastName ?? "" : "",
    email: isEdit ? user.email ?? "" : "",
    phone: isEdit ? user.phone ?? "" : "",
    employeeCode: isEdit ? agent?.employeeCode ?? "" : "",
    department: isEdit ? agent?.department ?? "" : "",
    position: isEdit ? agent?.position ?? "" : "",
    isActive: isEdit ? agent?.isActive ?? true : true,
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(
    isEdit ? agent?.photo || user.photo || null : null
  )
  const [selectedRoleIds, setSelectedRoleIds] = useState([])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    )
  }

  const goToStep2 = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setError("Merci de renseigner toutes les informations personnelles")
      return
    }
    setError("")
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!form.department || !form.position) {
      setError("Merci de renseigner le département et le poste")
      return
    }

    try {
      setLoading(true)
      setError("")

      const token = getToken()

      const formData = new FormData()
      formData.append("firstName", form.firstName)
      formData.append("lastName", form.lastName)
      formData.append("email", form.email)
      formData.append("phone", form.phone)
      formData.append("department", form.department)
      formData.append("position", form.position)

      if (isEdit) {
        formData.append("employeeCode", form.employeeCode)
        formData.append("isActive", String(Boolean(form.isActive)))
        formData.append("photo", photo || "")

        await axios.put(agentDetailUrl(agent.id), formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        })

        showSuccess?.("Agent modifié avec succès")
      } else {
        const companyId = getCompanyId()
        formData.append("employeeCode", form.employeeCode)
        formData.append("companyId", companyId)
        selectedRoleIds.forEach((roleId) => formData.append("roleIds", roleId))
        if (photo) formData.append("photo", photo)

        await axios.post(agentsCreateUrl(), formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        })

        showSuccess?.("Agent créé avec succès")
      }

      await onSuccess()
      onClose()
    } catch (err) {
      console.error(isEdit ? "UPDATE ERROR:" : "CREATE ERROR:", err.response || err)
      const msg =
        err.response?.data?.message ||
        (isEdit ? "Erreur lors de la modification" : "Erreur lors de la création de l'agent")
      setError(msg)
      showError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-4 sm:px-6 pt-5 sm:pt-6">
          <h2 className="text-lg sm:text-xl font-semibold text-center">
            {isEdit ? "Modifier l'agent" : "Ajouter un agent"}
          </h2>

          <div className="flex items-center gap-2 mt-5 mb-2">
            <StepPill active={step === 1} done={step > 1} label="1" />
            <div className="flex-1 h-0.5 bg-gray-200" />
            <StepPill active={step === 2} done={false} label="2" />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs text-gray-500 mb-4 gap-2">
            <span>Informations personnelles</span>
            <span className="text-right">Informations professionnelles</span>
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-2">
            {error}
          </div>
        )}

        <div className="px-4 sm:px-6 pb-2 overflow-y-auto text-sm space-y-4">
          {step === 1 && (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="text-gray-300" size={36} />
                  )}
                </div>
                <label className="text-[#1EA4DC] text-sm font-medium cursor-pointer">
                  Choisir une photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Prénom"
                required
              />

              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Nom"
                required
              />

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Email"
                required
              />

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Téléphone"
                required
              />

              <input
                name="employeeCode"
                value={form.employeeCode}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Code employé"
              />
            </>
          )}

          {step === 2 && (
            <>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                required
              >
                <option value="">Sélectionner un département</option>
                {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <input
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full bg-gray-100 p-3 rounded-lg"
                placeholder="Poste"
                required
              />

              {isEdit ? (
                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  Agent actif
                </label>
              ) : (
                <div className="pt-2">
                  <p className="font-medium text-gray-700 mb-3">Rôles et permissions</p>

                  {rolesLoading ? (
                    <p className="text-gray-400 text-sm">Chargement des rôles...</p>
                  ) : roles.length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      Aucun rôle disponible. Créez-en un depuis l'onglet "Rôles".
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {roles.map((role) => (
                        <label
                          key={role.id}
                          className="flex items-start justify-between gap-3 border border-gray-100 rounded-xl p-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800">
                              {role.libelle || role.name}
                            </p>
                            {role.description && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                {role.description}
                              </p>
                            )}
                            <p className="text-green-600 text-xs mt-1">
                              {role._count?.rolePermissions ?? role.permissions?.length ?? 0} permissions
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id)}
                            className="mt-1 w-4 h-4 shrink-0"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200">
                Annuler
              </button>
              <button
                onClick={goToStep2}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1EA4DC] text-white"
              >
                Suivant
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200"
              >
                Précédent
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1EA4DC] text-white disabled:opacity-50"
              >
                {loading
                  ? isEdit
                    ? "Enregistrement..."
                    : "Création..."
                  : isEdit
                  ? "Enregistrer"
                  : "Ajouter l'agent"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StepPill({ active, done, label }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
        active
          ? "bg-[#1EA4DC] text-white"
          : done
          ? "bg-green-500 text-white"
          : "bg-gray-200 text-gray-500"
      }`}
    >
      {label}
    </div>
  )
}

/* ================= ASSIGN ROLE MODAL ================= */
function AssignRoleModal({ agent, onClose, onSuccess, showSuccess, showError }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const { roles, loading: rolesLoading } = useAssignableRoles({
    search: debouncedSearch || undefined,
    isActive: true,
  })

  const currentRoleIds = (agent.user?.userRoles || [])
    .map((ur) => ur.role?.id)
    .filter(Boolean)
  const [selectedRoleIds, setSelectedRoleIds] = useState(currentRoleIds)

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError("")

      await axios.post(
        agentAssignRolesUrl(agent.id),
        { roleIds: selectedRoleIds },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )

      showSuccess?.("Rôles assignés avec succès")
      await onSuccess()
      onClose()
    } catch (err) {
      console.error("ASSIGN ROLES ERROR:", err.response || err)
      const msg = err.response?.data?.message || "Erreur lors de l'assignation des rôles"
      setError(msg)
      showError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">Assigner des rôles</h2>
            <p className="text-gray-500 text-sm mt-1 truncate">
              {agent.user?.firstName} {agent.user?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-2">
            {error}
          </div>
        )}

        <div className="px-4 sm:px-6 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un rôle"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-100 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2 overflow-y-auto space-y-3 flex-1">
          {rolesLoading ? (
            <p className="text-center text-gray-400 text-sm py-8">Chargement des rôles...</p>
          ) : roles.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucun rôle trouvé</p>
          ) : (
            roles.map((role) => {
              const checked = selectedRoleIds.includes(role.id)
              return (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 border rounded-2xl p-3 sm:p-4 cursor-pointer transition-colors ${
                    checked ? "border-[#1EA4DC]/30 bg-blue-50/40" : "border-gray-100"
                  }`}
                >
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      checked ? "bg-[#1EA4DC] text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Shield size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{role.libelle || role.name}</p>
                    {role.description && (
                      <p className="text-gray-500 text-sm mt-0.5">{role.description}</p>
                    )}
                  </div>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role.id)}
                    className="mt-1 w-5 h-5 accent-[#1EA4DC] shrink-0"
                  />
                </label>
              )
            })
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 text-sm font-medium"
          >
            Annuler
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#1EA4DC] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= ROLES SECTION ================= */
function RolesSection() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const { notif, showSuccess, showError, dismiss } = useNotification()
  const { confirmState, ask, close, handleConfirm } = useConfirm()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("tous")

  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const isActiveParam =
    statusFilter === "tous" ? undefined : statusFilter === "actif"

  const {
    roles,
    loading,
    error,
    refetch,
    addRole,
    updateRoleInList,
    removeRoleFromList,
  } = useAssignableRoles({
    search: debouncedSearch || undefined,
    isActive: isActiveParam,
  })

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editRole, setEditRole] = useState(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, isActiveParam])

  const totalRoles = roles.length
  const totalPages = Math.max(1, Math.ceil(totalRoles / limit))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedRoles = roles.slice((page - 1) * limit, page * limit)

  const handleRoleCreated = (newRole) => {
    addRole(newRole)
    setShowCreate(false)
    showSuccess("Rôle créé avec succès")
    refetch()
  }

  const handleEdit = (role) => {
    setEditRole(role)
    setShowEdit(true)
  }

  const handleDetails = (role) => {
    navigate(`/detail_role/${role.id}`, { state: { role } })
  }

  const handleToggleStatus = (role) => {
    const nextStatus = !role.isActive

    ask(
      nextStatus
        ? "Ce rôle redeviendra assignable aux agents."
        : "Ce rôle ne sera plus assignable aux agents.",
      async () => {
        try {
          const url = nextStatus ? roleActivateUrl(role.id) : roleDeactivateUrl(role.id)
          const response = await axios.post(
            url,
            {},
            {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: "application/json",
              },
            }
          )

          if (response.data?.success === false) {
            throw new Error(response.data?.message || "Le changement de statut a échoué")
          }

          showSuccess(
            response.data?.message ||
              (nextStatus ? "Rôle activé avec succès" : "Rôle désactivé avec succès")
          )

          await refetch()
        } catch (err) {
          console.error("TOGGLE ROLE STATUS ERROR:", err.response || err)
          const msg =
            err.response?.data?.message || err.message || "Erreur lors du changement de statut"
          showError(msg)
          await refetch()
        }
      },
      { title: nextStatus ? "Activer ce rôle ?" : "Désactiver ce rôle ?" }
    )
  }

  const handleDelete = (role) => {
    ask(
      "Cette action est irréversible.",
      async () => {
        try {
          const response = await axios.delete(roleDetailUrl(role.id), {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              Accept: "application/json",
            },
          })

          if (response.data?.success === false) {
            throw new Error(response.data?.message || "La suppression a échoué")
          }

          showSuccess(response.data?.message || "Rôle supprimé avec succès")
          await refetch()
        } catch (err) {
          console.error("DELETE ROLE ERROR:", err.response || err)
          const msg =
            err.response?.data?.message || err.message || "Erreur lors de la suppression"
          showError(msg)
          await refetch()
        }
      },
      {
        title: `Supprimer le rôle "${role.libelle || role.name}" ?`,
        variant: "danger",
      }
    )
  }

  return (
    <>
      {notif && <NotificationBanner notif={notif} onDismiss={dismiss} />}

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Liste des Rôles</h2>
            {!loading && !error && (
              <p className="text-sm text-gray-500 mt-0.5">
                {totalRoles} rôle{totalRoles > 1 ? "s" : ""} au total
              </p>
            )}
          </div>
          {can("ROLE_CREATE") && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm shrink-0"
            >
              <Plus size={18} />
              Nouveau rôle
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rôle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-100 text-sm focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto py-2.5 px-3 rounded-lg bg-gray-100 text-sm"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : (
          <div className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
            <table className="table-auto min-w-[760px] w-full text-sm">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Permissions</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Utilisateurs</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRoles.map((role, i) => (
                  <RoleRow
                    key={role.id}
                    rowIndex={i}
                    role={role}
                    onDetails={handleDetails}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                  />
                ))}

                {roles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-8">
                      Aucun rôle trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <Pagination
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            total={totalRoles}
          />
        )}
      </div>

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={handleRoleCreated}
          showError={showError}
        />
      )}

      {showEdit && editRole && (
        <EditRoleModal
          role={editRole}
          onClose={() => setShowEdit(false)}
          onSuccess={(patch) => {
            updateRoleInList(editRole.id, patch)
            refetch()
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      <ConfirmDialog state={confirmState} onCancel={close} onConfirm={handleConfirm} />
    </>
  )
}

/* ================= ROLE ROW ================= */
function RoleRow({ rowIndex, role, onDetails, onEdit, onToggleStatus, onDelete }) {
  const { can } = useAuth()
  const permissionsCount = role._count?.rolePermissions ?? role.permissions?.length ?? 0
  const usersCount = role._count?.userRoles ?? role.usersCount ?? 0

  const menuItems = [
    can("ROLE_READ") && {
      icon: <Eye size={17} className="text-gray-500" />,
      label: "Détail",
      onClick: () => onDetails(role),
    },
    can("ROLE_UPDATE") && {
      icon: <Pencil size={17} className="text-gray-500" />,
      label: "Modifier",
      onClick: () => onEdit(role),
    },
    can("ROLE_UPDATE") && {
      icon: role.isActive ? <PowerOff size={17} /> : <Power size={17} />,
      label: role.isActive ? "Désactiver" : "Activer",
      onClick: () => onToggleStatus(role),
      className: role.isActive ? "text-orange-500" : "text-green-600",
      dividerBefore: true,
    },
    can("ROLE_DELETE") && {
      icon: <Trash2 size={17} />,
      label: "Supprimer",
      onClick: () => onDelete(role),
      className: "text-red-600",
      dividerBefore: true,
    },
  ].filter(Boolean)

  return (
    <tr className={`${rowIndex % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1EA4DC] to-blue-700 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <p className="font-medium">{role.libelle || role.name}</p>
        </div>
      </td>

      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
        {role.description || "-"}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Lock size={12} />
          {permissionsCount} permission{permissionsCount > 1 ? "s" : ""}
        </span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Users size={12} />
          {usersCount} utilisateur{usersCount > 1 ? "s" : ""}
        </span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            role.isActive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {role.isActive ? "Actif" : "Inactif"}
        </span>
      </td>

      <td className="px-4 py-3 text-center whitespace-nowrap">
        <ActionMenu items={menuItems} />
      </td>
    </tr>
  )
}

/* ================= CREATE ROLE MODAL ================= */
function CreateRoleModal({ onClose, onCreated, showError }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    libelle: "",
    description: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.libelle.trim()) {
      setError("Le nom et le libellé du rôle sont requis")
      return
    }

    try {
      setLoading(true)
      setError("")

      const token = getToken()
      const formattedName = form.name.trim().replace(/\s+/g, "_")

      const response = await axios.post(
        rolesCreateUrl(),
        {
          name: formattedName,
          description: form.description,
          libelle: form.libelle,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )

      const newRole = response.data.data || response.data
      onCreated(newRole)
    } catch (err) {
      console.error("CREATE ROLE ERROR:", err.response || err)
      const msg = err.response?.data?.message || "Erreur lors de la création du rôle"
      setError(msg)
      showError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-3 sm:px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100 gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1EA4DC] to-blue-700 flex items-center justify-center shrink-0">
              <Plus className="text-white" size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold leading-snug">
              Créer un nouveau rôle
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4 text-sm">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg"
              placeholder="Nom du rôle (technique)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Le nom sera formaté automatiquement (espaces remplacés par des underscores)
            </p>
          </div>

          <input
            name="libelle"
            value={form.libelle}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Libellé (affichage)"
          />

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full bg-gray-100 p-3 rounded-lg resize-none"
            placeholder="Description"
          />

          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 text-[#1EA4DC] text-sm p-3 rounded-xl">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>
              Note: Vous pourrez assigner des permissions à ce rôle après sa création.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-gray-200 text-gray-700"
          >
            Annuler
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#1EA4DC] text-white disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= EDIT ROLE MODAL ================= */
function EditRoleModal({ role, onClose, onSuccess, showSuccess, showError }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: role.name ?? "",
    libelle: role.libelle ?? "",
    description: role.description ?? "",
    isActive: role.isActive ?? true,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.libelle.trim()) {
      setError("Le nom et le libellé du rôle sont requis")
      return
    }

    try {
      setLoading(true)
      setError("")

      const formattedName = form.name.trim().replace(/\s+/g, "_")

      const response = await axios.put(
        roleDetailUrl(role.id),
        {
          name: formattedName,
          description: form.description,
          libelle: form.libelle,
          isActive: Boolean(form.isActive),
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )

      const updated = response.data?.data || form
      showSuccess?.(response.data?.message || "Rôle modifié avec succès")
      onSuccess?.(updated)
      onClose()
    } catch (err) {
      console.error("UPDATE ROLE ERROR:", err.response || err)
      const msg = err.response?.data?.message || "Erreur lors de la modification"
      setError(msg)
      showError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-3 sm:px-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-center mb-6">Modifier le rôle</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-gray-100 p-3 rounded-lg"
              placeholder="Nom du rôle (technique)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Le nom sera formaté automatiquement (espaces remplacés par des underscores)
            </p>
          </div>

          <input
            name="libelle"
            value={form.libelle}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Libellé (affichage)"
          />

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full bg-gray-100 p-3 rounded-lg resize-none"
            placeholder="Description"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            Rôle actif
          </label>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-200">
            Annuler
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1EA4DC] text-white disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= STAT CARD ================= */
function StatCard({ label, value, icon, color = "blue" }) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className={`text-xl sm:text-2xl font-semibold ${colors[color]}`}>{value}</p>
      </div>
      <div className={colors[color]}>{icon}</div>
    </div>
  )
}