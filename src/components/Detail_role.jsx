import {
  ArrowLeft,
  Shield,
  Lock,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Folder,
  Save,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData } from "./auth"

/* =================================================================
   ⚠️ À CONFIRMER : c'était la cause du bug (bouton "Assigner permission"
   disparu + permissions/utilisateurs assignés introuvables).
   API_BASE était utilisée dans tout le fichier (fetchRole,
   fetchPermissionsGrouped, fetchAssignedUsers, AssignPermissionsModal,
   EditPermissionModal) mais n'était JAMAIS importée ni définie.
   Résultat : chaque appel levait un `ReferenceError: API_BASE is not
   defined`, silencieusement avalé par les try/catch, ce qui vidait
   les données ET faisait sortir le composant en early-return
   (bloc errorRole) sans afficher le bouton ni les sections.

   Si vous avez un fichier de config centralisé ailleurs dans le
   projet Pollux (ex: ./config.js), remplacez la ligne ci-dessous par :
   import { API_BASE } from "./config"
   ================================================================= */
const API_BASE = "https://youapi.youneed.app/pollux/dev/api" // ✅ CONFIRMÉ (URL API Pollux utilisée ailleurs dans le projet)

/* ================= LIBELLÉS DES MODULES (FR) =================
   Mapping code module (API) -> libellé français affiché en titre de groupe.
   Si un module n'est pas dans ce mapping, son code est formaté automatiquement (fallback). */
const MODULE_LABELS = {
  ADMIN_AGENT_MANAGEMENT: "Gestion des agents administratifs",
  AUDIT_LOGS: "Journaux d'audit",
  BANK_MANAGEMENT: "Gestion des banques",
  CLIENT_MANAGEMENT: "Gestion des clients",
  COMMISSION_MANAGEMENT: "Gestion des commissions",
  DISTRIBUTOR_MANAGEMENT: "Gestion des distributeurs",
  MAIN_COMPANY_MANAGEMENT: "Gestion de l'entreprise principale",
  MERCHANT_MANAGEMENT: "Gestion des commerçants",
  OPERATION_MANAGEMENT: "Gestion des opérations",
  OPERATION_REJECTION_CANCELLATION: "Rejet et annulation d'opérations",
  OPERATION_VALIDATION: "Validation des opérations",
  PAYMENT_PROOF_MANAGEMENT: "Gestion des preuves de paiement",
  PREPAID_CARD_MANAGEMENT: "Gestion des cartes prépayées",
  RECHARGE_MANAGEMENT: "Gestion des rechargements",
  REPLENISHMENT_MANAGEMENT: "Gestion des approvisionnements",
  REPORTS_ANALYTICS: "Rapports et statistiques",
  ROLE_MANAGEMENT: "Gestion des rôles",
  SERVICE_MANAGEMENT: "Gestion des services",
  STOCK_MANAGEMENT: "Gestion des stocks",
  SUBPRODUCT_MANAGEMENT: "Gestion des sous-produits",
  SUBSCRIPTION_MANAGEMENT: "Gestion des abonnements",
  SUPPORT_MANAGEMENT: "Gestion du support",
  SYSTEM_SETTINGS: "Paramètres système",
  TRANSACTION_MANAGEMENT: "Gestion des transactions",
  USER_MANAGEMENT: "Gestion des utilisateurs",
  WALLET_MANAGEMENT: "Gestion des wallets",
}

function formatModuleLabel(moduleCode) {
  if (MODULE_LABELS[moduleCode]) return MODULE_LABELS[moduleCode]
  return moduleCode
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function DetailRole() {
  const { id: idFromParams } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const roleFromState = location.state?.role

  // L'id peut venir de l'URL (/detail_role/:id) ou, à défaut, de l'objet
  // rôle transmis via location.state.
  const roleId = idFromParams || roleFromState?.id

  //  Affichage immédiat : si on a déjà le rôle via location.state (cas
  const [role, setRole] = useState(roleFromState || null)
  const [permissionsGrouped, setPermissionsGrouped] = useState({})
  const [assignedUsers, setAssignedUsers] = useState([])

  const [loadingRole, setLoadingRole] = useState(!roleFromState)
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [errorRole, setErrorRole] = useState(null)
  const [errorPermissions, setErrorPermissions] = useState(null)
  const [errorUsers, setErrorUsers] = useState(null)

  // ================= Modal d'assignation de permissions =================
  const [showAssignModal, setShowAssignModal] = useState(false)

  // ================= Modal de modification d'une permission =================
  const [editingPermission, setEditingPermission] = useState(null)

  // ================= Confirmation avant retrait d'une permission =================
  const [permissionToRemove, setPermissionToRemove] = useState(null)
  const [removingPermission, setRemovingPermission] = useState(false)

  // ================= Notification (succès / erreur) =================

  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 4000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    if (!roleId) {
      setLoadingRole(false)
      setLoadingPermissions(false)
      setLoadingUsers(false)
      setErrorRole("Aucun identifiant de rôle fourni.")
      return
    }

    fetchRole()
    fetchPermissionsGrouped()
    fetchAssignedUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId])

  /* ================= GET /roles/:id  =================    */

  async function fetchRole() {
    try {

      setLoadingRole((prev) => prev || !role)
      setErrorRole(null)
      const { token } = getAuthData()
      const res = await axios.get(`${API_BASE}/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success) {
        setRole(res.data.data)
      } else if (!role) {

        setErrorRole("Impossible de charger les informations du rôle.")
      }
    } catch (err) {
      console.error("Erreur fetchRole:", err)
      if (!role) {
        setErrorRole("Erreur lors du chargement du rôle.")
      }
    } finally {
      setLoadingRole(false)
    }
  }

  /* ================= GET /roles/:id/permissions/grouped ================= */

  async function fetchPermissionsGrouped() {
    try {
      setLoadingPermissions(true)
      setErrorPermissions(null)
      const { token } = getAuthData()
      const res = await axios.get(
        `${API_BASE}/roles/${roleId}/permissions/grouped`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data?.success) {
        setPermissionsGrouped(res.data.data || {})
      } else {
        setErrorPermissions("Impossible de charger les permissions du rôle.")
      }
    } catch (err) {
      console.error("Erreur fetchPermissionsGrouped:", err)
      setErrorPermissions("Erreur lors du chargement des permissions.")
    } finally {
      setLoadingPermissions(false)
    }
  }

  /* ================= GET /roles/:id/users=================*/

  async function fetchAssignedUsers() {
    try {
      setLoadingUsers(true)
      setErrorUsers(null)
      const { token } = getAuthData()
      const res = await axios.get(`${API_BASE}/roles/${roleId}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success) {
        setAssignedUsers(res.data.data || [])
      } else {
        setErrorUsers("Impossible de charger les utilisateurs assignés.")
      }
    } catch (err) {
      console.error("Erreur fetchAssignedUsers:", err)
      setErrorUsers("Endpoint utilisateurs assignés à confirmer avec le back-end.")
      setAssignedUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  /* ================= Étape 1 : demande de confirmation =================*/
  function handleRemovePermission(permission) {
    setPermissionToRemove(permission)
  }

  /* ================= DELETE /roles/:id/permissions/:permissionId  CONFIRMÉ ================= */
  async function confirmRemovePermission() {
    if (!permissionToRemove) return
    const permission = permissionToRemove
    try {
      setRemovingPermission(true)
      const { token } = getAuthData()
      const res = await axios.delete(
        `${API_BASE}/roles/${roleId}/permissions/${permission.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNotification({
        type: "success",
        message:
          res?.data?.message ||
          `Permission "${permission.name}" retirée avec succès.`,
      })
      fetchPermissionsGrouped()
    } catch (err) {
      console.error("Erreur confirmRemovePermission:", err)
      setNotification({
        type: "error",
        message:
          err?.response?.data?.message ||
          "Erreur lors du retrait de la permission (endpoint à confirmer).",
      })
    } finally {
      setRemovingPermission(false)
      setPermissionToRemove(null)
    }
  }

  /* ================= Callback après assignation de permissions réussie ================= */
  function handlePermissionsAssigned(message) {
    setNotification({ type: "success", message })
    fetchPermissionsGrouped()
  }

  /* ================= Callback après modification d'une permission réussie ================= */
  function handlePermissionUpdated(message) {
    setNotification({ type: "success", message })
    setEditingPermission(null)
    fetchPermissionsGrouped()
  }


  const existingPermissionIds = new Set(
    Object.values(permissionsGrouped)
      .flat()
      .map((p) => p.id)
  )

  const totalPermissions = Object.values(permissionsGrouped).reduce(
    (sum, perms) => sum + perms.length,
    0
  )


  if (loadingRole && !role) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-[#1EA4DC]" size={32} />
      </div>
    )
  }

  if (errorRole && !role) {
    return (
      <div className="p-4 sm:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 text-center text-red-500">
          {errorRole || "Rôle introuvable."}
        </div>
      </div>
    )
  }

  if (!role) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* ================= NOTIFICATION ================= */}
      {notification && (
        <div
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium sm:max-w-sm ${
            notification.type === "success"
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span className="break-words">{notification.message}</span>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1a8bbd] transition-colors w-full sm:w-auto"
        >
          <Lock size={18} />
          Assigner permission
        </button>
      </div>

      {/* ================= CARTE RÔLE ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Détail du rôle
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">
              {role.libelle}
            </h1>
            {role.description && (
              <p className="text-gray-500 mt-1 break-words">{role.description}</p>
            )}
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
              role.isActive
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {role.isActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </div>

      {/* ================= INFORMATIONS GÉNÉRALES ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <AlertCircle size={18} className="text-[#1EA4DC] shrink-0" />
          Informations générales
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <InfoField label="Nom" value={role.name} />
          <InfoField label="Libellé" value={role.libelle} />
          <InfoField label="Description" value={role.description} full />
          <InfoField
            label="Statut"
            value={role.isActive ? "Actif" : "Inactif"}
          />
          <InfoField
            label="Créé le"
            value={
              role.createdAt ? new Date(role.createdAt).toLocaleString() : "-"
            }
          />
          <InfoField
            label="Mis à jour le"
            value={
              role.updatedAt ? new Date(role.updatedAt).toLocaleString() : "-"
            }
          />
        </div>
      </div>

      {/* ================= PERMISSIONS (GROUPÉES PAR MODULE) ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-6">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Lock size={18} className="text-[#1EA4DC] shrink-0" />
          Permissions ({totalPermissions})
        </h2>

        {loadingPermissions && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#1EA4DC]" size={24} />
          </div>
        )}

        {!loadingPermissions && errorPermissions && (
          <p className="text-center text-red-500 py-8">{errorPermissions}</p>
        )}

        {!loadingPermissions &&
          !errorPermissions &&
          Object.keys(permissionsGrouped).length === 0 && (
            <p className="text-center text-gray-400 py-8">
              Aucune permission assignée à ce rôle
            </p>
          )}

        {!loadingPermissions &&
          !errorPermissions &&
          Object.entries(permissionsGrouped).map(([moduleCode, perms]) => (
            <div key={moduleCode} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {formatModuleLabel(moduleCode)}{" "}
                <span className="text-gray-400 font-normal">
                  ({perms.length})
                </span>
              </h3>

              <div className="rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-[#1EA4DC] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Permission</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {perms.map((permission) => (
                      <PermissionRow
                        key={permission.id}
                        permission={permission}
                        onEdit={() => setEditingPermission(permission)}
                        onRemove={() => handleRemovePermission(permission)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>

      {/* ================= UTILISATEURS ASSIGNÉS (TABLEAU) ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-6">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Users size={18} className="text-[#1EA4DC] shrink-0" />
          Utilisateurs assignés ({assignedUsers.length})
        </h2>

        {loadingUsers && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-[#1EA4DC]" size={24} />
          </div>
        )}

        {!loadingUsers && errorUsers && (
          <p className="text-center text-amber-500 text-xs py-2">
            {errorUsers}
          </p>
        )}

        {!loadingUsers && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Agent</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Statut</th>
                </tr>
              </thead>

              <tbody>
                {assignedUsers.map((user) => (
                  <AgentRow key={user.id} user={user} />
                ))}

                {assignedUsers.length === 0 && !errorUsers && (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-400 py-8">
                      Aucun agent assigné à ce rôle
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL D'ASSIGNATION DE PERMISSIONS ================= */}
      {showAssignModal && (
        <AssignPermissionsModal
          roleId={roleId}
          roleLibelle={role.libelle}
          existingPermissionIds={existingPermissionIds}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handlePermissionsAssigned}
        />
      )}

      {/* ================= MODAL DE MODIFICATION D'UNE PERMISSION ================= */}
      {editingPermission && (
        <EditPermissionModal
          permission={editingPermission}
          onClose={() => setEditingPermission(null)}
          onUpdated={handlePermissionUpdated}
        />
      )}

      {/* ================= CONFIRMATION DE RETRAIT D'UNE PERMISSION ================= */}
      {permissionToRemove && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !removingPermission && setPermissionToRemove(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Retirer la permission
              </h3>
            </div>
            <p className="text-sm text-gray-600 break-words">
              Retirer la permission «&nbsp;{permissionToRemove.name}&nbsp;» de ce rôle&nbsp;?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => setPermissionToRemove(null)}
                disabled={removingPermission}
                className="w-full sm:flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRemovePermission}
                disabled={removingPermission}
                className="w-full sm:flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
              >
                {removingPermission && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= INFO FIELD ================= */
function InfoField({ label, value, full = false }) {
  return (
    <div className={`min-w-0 ${full ? "sm:col-span-2" : ""}`}>
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-gray-800 font-medium break-words">{value || "-"}</p>
    </div>
  )
}

/* ================= PERMISSION ROW ================= */
function PermissionRow({ permission, onEdit, onRemove }) {
  const [open, setOpen] = useState(false)

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-[#1EA4DC]" />
          </div>
          <p className="font-medium break-words">{permission.name}</p>
        </div>
      </td>

      <td className="px-4 py-4 text-gray-500 max-w-xs break-words">
        {permission.description || "-"}
      </td>

      <td className="px-4 py-4 text-center relative">
        <button
          onClick={() => setOpen(!open)}
          className="mx-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
        >
          <MoreHorizontal className="text-gray-600" size={18} />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 sm:right-6 top-10 w-52 max-w-[85vw] bg-white border border-gray-100 rounded-2xl shadow-lg z-20 py-2 text-left">
              <button
                onClick={() => {
                  setOpen(false)
                  onEdit()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil size={17} className="text-gray-500" />
                Modifier permission
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  setOpen(false)
                  onRemove()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={17} />
                Retirer
              </button>
            </div>
          </>
        )}
      </td>
    </tr>
  )
}

/* ================= AGENT ROW (utilisateur assigné au rôle) ================= */
function AgentRow({ user }) {
  const initials = `${(user.firstName || "?")[0]}${
    (user.lastName || "")[0] || ""
  }`.toUpperCase()

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {user.photo ? (
            <img
              src={user.photo}
              alt=""
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#1EA4DC] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          <p className="font-medium break-words">
            {user.firstName} {user.lastName}
          </p>
        </div>
      </td>

      <td className="px-4 py-4 text-gray-500 break-words">{user.email || "-"}</td>

      <td className="px-4 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            user.isActive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {user.isActive ? "Actif" : "Inactif"}
        </span>
      </td>
    </tr>
  )
}

/* ================= CHECKBOX PERSONNALISÉE (utilisée dans la modal d'assignation) ================= */
function CustomCheckbox({ checked, indeterminate = false, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange()
      }}
      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
        disabled
          ? "bg-gray-100 border-gray-200 cursor-not-allowed"
          : checked || indeterminate
          ? "bg-[#1EA4DC] border-[#1EA4DC]"
          : "bg-white border-gray-300 hover:border-[#1EA4DC]"
      }`}
    >
      {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      {!checked && indeterminate && (
        <div className="w-2 h-0.5 bg-white rounded-full" />
      )}
    </button>
  )
}

/* ================= MODAL D'ASSIGNATION DE PERMISSIONS ================= */
function AssignPermissionsModal({
  roleId,
  roleLibelle,
  existingPermissionIds = new Set(),
  onClose,
  onAssigned,
}) {
  const [permissionsGrouped, setPermissionsGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [expandedModules, setExpandedModules] = useState({})
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    fetchAllPermissionsGrouped()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ================= GET /roles/permissions/grouped  =================
     Catalogue complet des permissions disponibles, regroupées par module. */
  async function fetchAllPermissionsGrouped() {
    try {
      setLoading(true)
      setError(null)
      const { token } = getAuthData()
      const res = await axios.get(`${API_BASE}/roles/permissions/grouped`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success) {
        const data = res.data.data || {}
        setPermissionsGrouped(data)
        // Toutes les sections sont ouvertes par défaut
        const expanded = {}
        Object.keys(data).forEach((mod) => {
          expanded[mod] = true
        })
        setExpandedModules(expanded)
      } else {
        setError("Impossible de charger le catalogue des permissions.")
      }
    } catch (err) {
      console.error("Erreur fetchAllPermissionsGrouped:", err)
      setError("Erreur lors du chargement des permissions.")
    } finally {
      setLoading(false)
    }
  }

  /* ================= Permissions assignables par module ================= */
  const assignableGrouped = useMemo(() => {
    const term = search.trim().toLowerCase()
    const result = {}

    Object.entries(permissionsGrouped).forEach(([moduleCode, perms]) => {
      const assignable = perms.filter((p) => !existingPermissionIds.has(p.id))
      const filtered = term
        ? assignable.filter(
            (p) =>
              p.name?.toLowerCase().includes(term) ||
              p.code?.toLowerCase().includes(term) ||
              p.description?.toLowerCase().includes(term)
          )
        : assignable


      if (assignable.length > 0 && (!term || filtered.length > 0)) {
        result[moduleCode] = { all: assignable, filtered }
      }
    })

    return result
  }, [permissionsGrouped, existingPermissionIds, search])

  const totalAssignable = Object.values(assignableGrouped).reduce(
    (sum, { all }) => sum + all.length,
    0
  )

  function toggleModule(moduleCode) {
    setExpandedModules((prev) => ({ ...prev, [moduleCode]: !prev[moduleCode] }))
  }

  function togglePermission(permissionId) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  function toggleModuleSelection(moduleCode) {
    const { all } = assignableGrouped[moduleCode]
    const allSelected = all.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        all.forEach((p) => next.delete(p.id))
      } else {
        all.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  /* ================= POST /roles/:id/permissions/bulk ================= */
  async function handleSubmit() {
    if (selectedIds.size === 0 || submitting) return
    try {
      setSubmitting(true)
      setSubmitError(null)
      const { token } = getAuthData()
      const res = await axios.post(
        `${API_BASE}/roles/${roleId}/permissions/bulk`,
        { permissionIds: Array.from(selectedIds) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (res.data?.success) {
        onAssigned?.(
          res.data.message ||
            `${selectedIds.size} permission(s) assignée(s) avec succès`
        )
        onClose?.()
      } else {
        setSubmitError("Impossible d'assigner les permissions sélectionnées.")
      }
    } catch (err) {
      console.error("Erreur handleSubmit (assignation permissions):", err)
      setSubmitError(
        err?.response?.data?.message ||
          "Erreur lors de l'assignation des permissions."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose?.()}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* ================= HEADER ================= */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Assigner des permissions
            </h2>
            <button
              onClick={() => !submitting && onClose?.()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Badge rôle */}
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
            <div className="w-10 h-10 rounded-xl bg-[#1EA4DC] flex items-center justify-center shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Rôle</p>
              <p className="font-semibold text-gray-900 break-words">{roleLibelle}</p>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative mt-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une permission..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] focus:border-transparent"
            />
          </div>
        </div>

        {/* ================= CONTENU (liste) ================= */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#1EA4DC]" size={28} />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 justify-center py-16 text-red-500 text-sm text-center">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && totalAssignable === 0 && (
            <p className="text-center text-gray-400 py-16 text-sm">
              {search
                ? "Aucune permission ne correspond à votre recherche."
                : "Toutes les permissions disponibles sont déjà assignées à ce rôle."}
            </p>
          )}

          {!loading &&
            !error &&
            Object.entries(assignableGrouped).map(
              ([moduleCode, { all, filtered }]) => {
                const isExpanded = expandedModules[moduleCode]
                const selectedCount = all.filter((p) =>
                  selectedIds.has(p.id)
                ).length
                const allSelected = selectedCount === all.length
                const someSelected = selectedCount > 0 && !allSelected

                return (
                  <div
                    key={moduleCode}
                    className="mb-3 rounded-xl border border-gray-100 overflow-hidden"
                  >
                    {/* En-tête du module */}
                    <button
                      type="button"
                      onClick={() => toggleModule(moduleCode)}
                      className="w-full flex items-center gap-3 bg-blue-50/60 px-3 sm:px-4 py-3 hover:bg-blue-50"
                    >
                      <CustomCheckbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={() => toggleModuleSelection(moduleCode)}
                      />
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Folder size={16} className="text-[#1EA4DC]" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-gray-800 text-sm break-words">
                          {formatModuleLabel(moduleCode)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedCount}/{all.length} permission(s)
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Liste des permissions du module */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {filtered.map((permission) => {
                          const checked = selectedIds.has(permission.id)
                          return (
                            <button
                              type="button"
                              key={permission.id}
                              onClick={() => togglePermission(permission.id)}
                              className={`w-full flex items-start gap-3 px-3 sm:px-4 py-3 text-left hover:bg-gray-50 ${
                                checked ? "bg-blue-50/40" : ""
                              }`}
                            >
                              <div className="mt-0.5">
                                <CustomCheckbox
                                  checked={checked}
                                  onChange={() =>
                                    togglePermission(permission.id)
                                  }
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-800 text-sm break-words">
                                  {permission.name}
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#1EA4DC] text-xs font-mono break-all">
                                  {permission.code}
                                </span>
                                {permission.description && (
                                  <p className="text-xs text-gray-400 mt-1 break-words">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        })}
                        {filtered.length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-3">
                            Aucun résultat dans ce module pour cette recherche
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              }
            )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
          {submitError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 break-words">
              <AlertCircle size={14} className="shrink-0" />
              {submitError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => !submitting && onClose?.()}
              disabled={submitting}
              className="w-full sm:flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || submitting}
              className="w-full sm:flex-1 py-2.5 rounded-lg bg-[#1EA4DC] text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a8bbd]"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Assigner ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


function EditPermissionModal({ permission, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: permission.name || "",
    code: permission.code || "",
    description: permission.description || "",
    module: permission.module || "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const moduleOptions = useMemo(() => {
    const codes = new Set(Object.keys(MODULE_LABELS))
    if (form.module) codes.add(form.module)
    return Array.from(codes).sort((a, b) =>
      formatModuleLabel(a).localeCompare(formatModuleLabel(b))
    )
  }, [form.module])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /* ================= PUT /roles/permissions/:id ================= */
  async function handleSubmit() {
    if (submitting) return
    if (!form.name.trim() || !form.code.trim() || !form.module) {
      setSubmitError("Nom, code et module sont obligatoires.")
      return
    }
    try {
      setSubmitting(true)
      setSubmitError(null)
      const { token } = getAuthData()
      const res = await axios.put(
        `${API_BASE}/roles/permissions/${permission.id}`,
        {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          module: form.module,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (res.data?.success) {
        onUpdated?.(
          res.data.message ||
            `Permission "${form.name.trim()}" modifiée avec succès.`
        )
      } else {
        setSubmitError("Impossible d'enregistrer les modifications.")
      }
    } catch (err) {
      console.error("Erreur handleSubmit (modification permission):", err)
      setSubmitError(
        err?.response?.data?.message ||
          "Erreur lors de la modification de la permission."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-2 sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose?.()}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]">
        {/* ================= HEADER ================= */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Modifier la permission
            </h2>
            <button
              onClick={() => !submitting && onClose?.()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-[#1EA4DC] flex items-center justify-center shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Permission</p>
              <p className="font-semibold text-gray-900 break-words">{permission.name}</p>
            </div>
          </div>
        </div>

        {/* ================= FORMULAIRE ================= */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Nom
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex : Créer un agent administratif"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Code
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) =>
                handleChange("code", e.target.value.toUpperCase())
              }
              placeholder="Ex : ADMIN_AGENT_CREATE"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Module
            </label>
            <select
              value={form.module}
              onChange={(e) => handleChange("module", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] focus:border-transparent"
            >
              <option value="" disabled>
                Sélectionner un module
              </option>
              {moduleOptions.map((code) => (
                <option key={code} value={code}>
                  {formatModuleLabel(code)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              placeholder="Décrire l'objet de cette permission..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] focus:border-transparent"
            />
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
          {submitError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 break-words">
              <AlertCircle size={14} className="shrink-0" />
              {submitError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => !submitting && onClose?.()}
              disabled={submitting}
              className="w-full sm:flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:flex-1 py-2.5 rounded-lg bg-[#1EA4DC] text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a8bbd]"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}