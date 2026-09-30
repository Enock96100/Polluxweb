import {
  Search,
  X,
  MoreHorizontal,
  Eye,
  RotateCcw,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  CheckCircle,
  UserCog,
  Truck,
  Store,
  Building2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"

/* ══════════════════════════════════════════════
   DÉTAIL OPÉRATEUR — Gestion des PIN
   Route : /detail_operateur/:id
   ══════════════════════════════════════════════ */

/* ✅ CONFIRMÉ — listes des opérateurs */
const MERCHANTS_API    = "https://youapi.youneed.app/pollux/prod/api/merchants/companies"
const DISTRIBUTORS_API = "https://youapi.youneed.app/pollux/prod/api/distributors/by-company"
const AGENTS_API       = "https://youapi.youneed.app/pollux/prod/api/admin-agents/company"
/* Entreprise Principale : plus d'appel dédié — voir fetchProfile() plus bas,
   déjà confirmé et utilisé ailleurs dans l'app, chargé directement sans appel
   réseau supplémentaire. */

/* ✅ CONFIRMÉ — actions PIN (endpoints communs à tous les types d'opérateurs) */
const PIN_RESET_API   = "https://youapi.youneed.app/pollux/prod/api/pin/reset"
const PIN_UNLOCK_API  = "https://youapi.youneed.app/pollux/prod/api/pin/unlock"
const PIN_HISTORY_API = "https://youapi.youneed.app/pollux/prod/api/pin/history"


/* ✅ CONFIRMÉ : valeur "operatorType" attendue par /pin/reset et /pin/unlock,
   déduite du champ user.userType renvoyé par chaque liste d'opérateurs. */
const OPERATOR_TYPE_MAP = {
  "commercant":            "MERCHANT",
  "distributeur":          "DISTRIBUTOR",
  "agent-admin":           "ADMIN_AGENT",
  "entreprise-principale": "MAIN_COMPANY",
}

const OPERATEUR_LABELS = {
  "entreprise-principale": "Entreprise Principale",
  "agent-admin":           "Agent Admin",
  "distributeur":          "Distributeur",
  "commercant":            "Commerçant",
}

const TYPE_CONFIG = {
  "entreprise-principale": { icon: Building2, color: "text-[#1EA4DC]", bg: "bg-blue-50",   ring: "border-blue-100" },
  "agent-admin":           { icon: UserCog,   color: "text-purple-600", bg: "bg-purple-50", ring: "border-purple-100" },
  "distributeur":          { icon: Truck,     color: "text-green-600",  bg: "bg-green-50",  ring: "border-green-100" },
  "commercant":            { icon: Store,     color: "text-orange-600", bg: "bg-orange-50", ring: "border-orange-100" },
}

/* ══════════════════════════════════════════════
   NORMALISATION DES RÉPONSES API
   ══════════════════════════════════════════════ */

function fullName(user) {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
  return name || user?.email || "-"
}

function resolvePinStatus(entity = {}) {
  if (entity.pinLockedUntil && new Date(entity.pinLockedUntil) > new Date()) return "verrouille"
  if (entity.pinCode) return "actif"
  return "sans_pin"
}

/* ✅ CONFIRMÉ : GET /merchants/companies/{companyId} */
function normalizeMerchant(item) {
  return {
    id:               item.id,
    nom:              fullName(item.user),
    role:             item.city || item.user?.city || "-",
    email:            item.user?.email,
    phone:            item.user?.phone,
    createdAt:        item.createdAt,
    pinAttempts:      item.pinAttempts,
    pinMustChange:    item.pinMustChange,
    pinLockedUntil:   item.pinLockedUntil,
    pinLastChangedAt: item.pinLastChangedAt,
    pinStatus:        resolvePinStatus(item),
  }
}

/* ✅ CONFIRMÉ : GET /distributors/by-company/{companyId} */
function normalizeDistributor(item) {
  return {
    id:               item.id,
    nom:              fullName(item.user),
    role:             item.city || item.user?.city || "-",
    email:            item.user?.email,
    phone:            item.user?.phone,
    createdAt:        item.createdAt,
    pinAttempts:      item.pinAttempts,
    pinMustChange:    item.pinMustChange,
    pinLockedUntil:   item.pinLockedUntil,
    pinLastChangedAt: item.pinLastChangedAt,
    pinStatus:        resolvePinStatus(item),
  }
}

/* ✅ CONFIRMÉ : GET /admin-agents/company/{companyId} */
function normalizeAgent(item) {
  const roleLabel = item.user?.userRoles?.[0]?.role?.libelle || item.position || item.department || "-"
  return {
    id:               item.id,
    nom:              fullName(item.user),
    role:             roleLabel,
    email:            item.user?.email,
    phone:            item.user?.phone,
    createdAt:        item.createdAt,
    pinAttempts:      item.pinAttempts,
    pinMustChange:    item.pinMustChange,
    pinLockedUntil:   item.pinLockedUntil,
    pinLastChangedAt: item.pinLastChangedAt,
    pinStatus:        resolvePinStatus(item),
  }
}

function normalizeCompany(company) {
  if (!company) return []
  const owner = company.owner || {}
  const nom = [owner.firstName, owner.lastName].filter(Boolean).join(" ") || "Utilisateur"
  return [{
    id:               company.id,
    nom,
    role:             company.name || "Entreprise Principale",
    email:            owner.email || company.email || "",
    phone:            owner.phone || company.phone,
    createdAt:        company.createdAt,
    pinAttempts:      company.pinAttempts,
    pinMustChange:    company.pinMustChange,
    pinLockedUntil:   company.pinLockedUntil,
    pinLastChangedAt: company.pinLastChangedAt,
    pinStatus:        resolvePinStatus(company),
  }]
}

/* ══════════════════════════════════════════════
   NOTIFICATION
   ══════════════════════════════════════════════ */
function useNotification() {
  const [notif, setNotif] = useState(null)
  const timerRef = useRef(null)
  const show = useCallback((type, message) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotif({ type, message })
    timerRef.current = setTimeout(() => setNotif(null), 6000)
  }, [])
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  return {
    notif,
    showSuccess: (msg) => show("success", msg),
    showError:   (msg) => show("error", msg),
    dismiss: () => setNotif(null),
  }
}

function NotificationBanner({ notif, onDismiss }) {
  if (!notif) return null
  const isSuccess = notif.type === "success"
  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-sm ${
      isSuccess ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
    }`}>
      {isSuccess ? <CheckCircle size={18} className="shrink-0 text-green-500" /> : <AlertTriangle size={18} className="shrink-0 text-red-500" />}
      <span className="flex-1 break-words">{notif.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"><X size={16} /></button>
    </div>
  )
}

/* ══════════════════════════════════════════════
   BADGE STATUT PIN
   ══════════════════════════════════════════════ */
function PinStatusBadge({ status }) {
  const map = {
    actif:      { label: "Actif",      className: "bg-green-100 text-green-600" },
    sans_pin:   { label: "Sans PIN",   className: "bg-orange-100 text-orange-600" },
    verrouille: { label: "Verrouillé", className: "bg-red-100 text-red-600" },
  }
  const cfg = map[status] || map.sans_pin
  return <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cfg.className}`}>{cfg.label}</span>
}

/* ══════════════════════════════════════════════
   ACTION MENU (3 points) — portal, positionnement dynamique
   ══════════════════════════════════════════════ */
const ACTION_MENU_PORTAL_CLASS = "pin-action-menu-portal"

function ActionMenu({ user, onApercu, onReset, onLock, onHistorique, isOpen, onToggle }) {
  const buttonRef = useRef(null)
  const [coords, setCoords] = useState(null)
  const MENU_WIDTH = 200
  const MENU_MARGIN = 8

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const estimatedMenuHeight = 220
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < estimatedMenuHeight + MENU_MARGIN
    let left = rect.right - MENU_WIDTH
    left = Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    left = Math.max(left, MENU_MARGIN)
    const top = openUpward ? rect.top - MENU_MARGIN : rect.bottom + MENU_MARGIN
    setCoords({ top, left, openUpward })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    computePosition()
    const handleReposition = () => computePosition()
    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleReposition)
    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleReposition)
    }
  }, [isOpen, computePosition])

  const isLocked = user.pinStatus === "verrouille"

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Ouvrir le menu des actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && coords && createPortal(
        <div
          className={`${ACTION_MENU_PORTAL_CLASS} fixed z-[100] w-52 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left`}
          style={{
            top: coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left: coords.left,
          }}
        >
          <button
            type="button"
            onClick={() => { onApercu(user); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} className="text-gray-500" /> Aperçu
          </button>
          <button
            type="button"
            onClick={() => { onReset(user); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <RotateCcw size={16} /> Réinitialiser le PIN
          </button>
          <button
            type="button"
            onClick={() => { onLock(user); onToggle() }}
            className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm transition-colors ${
              isLocked ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50"
            }`}
          >
            {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
            {isLocked ? "Déverrouiller le PIN" : "Verrouiller le PIN"}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { onHistorique(user); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
          >
            <History size={16} className="text-gray-500" /> Historique
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL GÉNÉRIQUE
   ══════════════════════════════════════════════ */
function Modal({ children, className = "w-full max-w-md" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className={`bg-white rounded-2xl sm:rounded-3xl relative shadow-xl max-h-[90vh] overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return "-"
  try { return new Date(value).toLocaleDateString("fr-FR") } catch { return "-" }
}

function formatDateTime(value) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch { return "-" }
}

function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return err?.message || fallback

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const detail = data.errors
      .map((e) => e?.message || e?.msg || (typeof e === "string" ? e : JSON.stringify(e)))
      .filter(Boolean)
      .join(" — ")
    if (detail) return `${data.message || fallback} : ${detail}`
  }

  if (Array.isArray(data.message)) return data.message.join(" — ")
  if (typeof data.message === "string") return data.message
  if (typeof data.error === "string") return data.error
  return err?.message || fallback
}

/* ══════════════════════════════════════════════
   MODAL — APERÇU
   ══════════════════════════════════════════════ */
function ApercuModal({ user, typeConfig, operateurLabel, onClose }) {
  const Icon = typeConfig.icon
  return (
    <Modal>
      <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{user.nom}</h2>
          <p className="text-xs sm:text-sm text-gray-500">{operateurLabel}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={20} /></button>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className={`rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 border ${typeConfig.bg} ${typeConfig.ring}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white ${typeConfig.color}`}>
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{user.nom}</p>
            <p className="text-xs sm:text-sm text-gray-500">{user.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="font-semibold text-gray-800 text-sm break-words">{user.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Téléphone</p>
            <p className="font-semibold text-gray-800 text-sm break-words">{user.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Créé le</p>
            <p className="font-semibold text-gray-800 text-sm">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tentatives PIN échouées</p>
            <p className="font-semibold text-gray-800 text-sm">{user.pinAttempts ?? 0}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut du PIN</p>
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">État actuel</span>
            <PinStatusBadge status={user.pinStatus} />
          </div>
          {user.pinStatus === "verrouille" && (
            <p className="text-xs text-red-500">Verrouillé jusqu'au {formatDateTime(user.pinLockedUntil)}</p>
          )}
          {user.pinMustChange && (
            <p className="text-xs text-orange-500">⚠ Le changement de PIN sera exigé à la prochaine connexion.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   MODAL — HISTORIQUE (dynamique)
    CONFIRMÉ : GET /pin/history/{id}?page=1&limit=20
   ══════════════════════════════════════════════ */
function HistoriqueModal({ user, typeConfig, operateurLabel, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  const fetchHistory = useCallback(async (targetPage) => {
    setLoading(true)
    setError("")
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const res = await axios.get(`${PIN_HISTORY_API}/${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: targetPage, limit },
      })
      setEntries(Array.isArray(res.data?.data) ? res.data.data : [])
      setTotalPages(res.data?.pagination?.totalPages || 1)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Impossible de charger l'historique")
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { fetchHistory(page) }, [page, fetchHistory])

  return (
    <Modal>
      <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Historique :{user.nom}</h2>
          <p className="text-xs sm:text-sm text-gray-500">{operateurLabel}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={20} /></button>
      </div>

      <div className="p-4 sm:p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin h-6 w-6 text-[#1EA4DC]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="ml-3 text-sm text-gray-400">Chargement...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-6">{error}</p>
        ) : entries.length > 0 ? (
          <>
            {entries.map((entry, i) => (
              <div key={entry.id || i} className="bg-gray-50 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.bg} ${typeConfig.color}`}>
                  <History size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">
                    {entry.action || entry.actionType || entry.type || "Action sur le PIN"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{operateurLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(entry.createdAt || entry.date)}</p>
                  {(entry.ip || entry.ipAddress) && (
                    <p className="text-xs text-gray-500">IP : {entry.ip || entry.ipAddress}</p>
                  )}
                  {entry.reason && <p className="text-xs text-gray-500">Raison : {entry.reason}</p>}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-md text-gray-400 hover:text-[#1EA4DC] hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-md text-gray-400 hover:text-[#1EA4DC] hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Aucune modification de PIN enregistrée.</p>
        )}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   MODAL — RÉINITIALISER LE PIN
    CONFIRMÉ : POST /pin/reset/{id}  body: { operatorType }
   ══════════════════════════════════════════════ */
function ResetPinModal({ user, onClose, onConfirm, submitting }) {
  const [raison, setRaison] = useState("")
  const [confirmStep, setConfirmStep] = useState(false)

  if (confirmStep) {
    return (
      <Modal>
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold pt-1.5">Confirmer la réinitialisation</h2>
          </div>

          <p className="text-sm text-gray-600">
            Le PIN actuel de <strong>{user.nom}</strong> sera immédiatement invalidé et remplacé par un
            nouveau PIN temporaire. Cette action est irréversible. Voulez-vous continuer ?
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => setConfirmStep(false)}
              disabled={submitting}
              className="px-6 py-3 border border-gray-200 rounded-xl text-sm sm:text-base w-full sm:w-auto hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={() => onConfirm(user, raison)}
              disabled={submitting}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm sm:text-base w-full sm:w-auto font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {submitting ? "Réinitialisation..." : "Oui, réinitialiser"}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-base sm:text-lg font-semibold pt-1.5">Réinitialiser le PIN</h2>
        </div>

        <p className="text-sm text-gray-600">
          Un PIN temporaire sera généré et envoyé à <strong>{user.nom}</strong>.
        </p>

        {/*  La "raison" n'est pas encore acceptée par l'endpoint /pin/reset — champ conservé
            côté UI pour cohérence visuelle, non transmis tant que ce n'est pas confirmé. */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Raison (optionnel)</label>
          <textarea
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            placeholder="Précisez la raison de cette action..."
            rows={3}
            className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm resize-none"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm sm:text-base w-full sm:w-auto hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => setConfirmStep(true)}
            disabled={submitting}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm sm:text-base w-full sm:w-auto font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   MODAL — VERROUILLER / DÉVERROUILLER
    CONFIRMÉ (déverrouiller) : POST /pin/unlock/{id}  body: { operatorType }
    À CONFIRMER (verrouiller) : aucun endpoint fourni, action locale/optimiste
   ══════════════════════════════════════════════ */
function LockPinModal({ user, onClose, onConfirm, submitting }) {
  const [raison, setRaison] = useState("")
  const [confirmStep, setConfirmStep] = useState(false)
  const isLocked = user.pinStatus === "verrouille"
  const title = isLocked ? "Déverrouiller le compte" : "Verrouiller le compte"
  const description = isLocked
    ? "Le compte de cet opérateur sera déverrouillé immédiatement."
    : "Le compte de cet opérateur sera verrouillé immédiatement."
  const iconBg   = isLocked ? "bg-green-100 text-green-500"  : "bg-red-100 text-red-500"
  const btnColor = isLocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"

  if (confirmStep) {
    return (
      <Modal>
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold pt-1.5">
              {isLocked ? "Confirmer le déverrouillage" : "Confirmer le verrouillage"}
            </h2>
          </div>

          <p className="text-sm text-gray-600">
            {isLocked
              ? <>L'accès de <strong>{user.nom}</strong> sera immédiatement rétabli. Voulez-vous continuer ?</>
              : <><strong>{user.nom}</strong> ne pourra plus se connecter tant que le compte ne sera pas déverrouillé. Voulez-vous continuer ?</>
            }
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => setConfirmStep(false)}
              disabled={submitting}
              className="px-6 py-3 border border-gray-200 rounded-xl text-sm sm:text-base w-full sm:w-auto hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={() => onConfirm(user)}
              disabled={submitting}
              className={`px-6 py-3 text-white rounded-xl text-sm sm:text-base w-full sm:w-auto font-semibold transition-colors disabled:opacity-60 ${btnColor}`}
            >
              {submitting ? "Traitement..." : (isLocked ? "Oui, déverrouiller" : "Oui, verrouiller")}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-base sm:text-lg font-semibold pt-1.5">{title}</h2>
        </div>

        <p className="text-sm text-gray-600">{description}</p>

        {!isLocked && (
          <p className="text-xs text-orange-500 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
            ⚠️ L'endpoint de verrouillage manuel n'est pas encore confirmé côté API : cette action
            met seulement à jour l'affichage localement pour le moment.
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Raison (optionnel)</label>
          <textarea
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            placeholder="Précisez la raison de cette action..."
            rows={3}
            className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm resize-none"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm sm:text-base w-full sm:w-auto hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => setConfirmStep(true)}
            disabled={submitting}
            className={`px-6 py-3 text-white rounded-xl text-sm sm:text-base w-full sm:w-auto font-semibold transition-colors disabled:opacity-60 ${btnColor}`}
          >
            {isLocked ? "Déverrouiller" : "Verrouiller"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════
   TABLEAU DES UTILISATEURS
   ══════════════════════════════════════════════ */
function UsersTable({ data, loading, typeConfig, onApercu, onReset, onLock, onHistorique }) {
  const [openRow, setOpenRow] = useState(null)
  const tableRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideTable = tableRef.current && tableRef.current.contains(e.target)
      const clickedInsideMenu = e.target.closest && e.target.closest(`.${ACTION_MENU_PORTAL_CLASS}`)
      if (!clickedInsideTable && !clickedInsideMenu) setOpenRow(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={tableRef} className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
      <table className="table-auto min-w-[640px] w-full text-sm">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Opérateur</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Rôle / Ville</th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut PIN</th>
            <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((user, i) => (
              <tr key={user.id} className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800">{user.nom}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.role}</td>
                <td className="px-4 py-3 text-center"><PinStatusBadge status={user.pinStatus} /></td>
                <td className="px-4 py-3 text-center">
                  <ActionMenu
                    user={user}
                    onApercu={onApercu}
                    onReset={onReset}
                    onLock={onLock}
                    onHistorique={onHistorique}
                    isOpen={openRow === user.id}
                    onToggle={() => setOpenRow(openRow === user.id ? null : user.id)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-8 text-gray-400">
                {loading ? "Chargement..." : "Aucun opérateur trouvé"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
   ══════════════════════════════════════════════ */
export default function Detail_operateur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [modalType, setModalType] = useState(null) // "apercu" | "historique" | "reset" | "lock"
  const [selectedUser, setSelectedUser] = useState(null)

  const operateurLabel = OPERATEUR_LABELS[id] || "Opérateur"
  const typeConfig = TYPE_CONFIG[id] || TYPE_CONFIG["agent-admin"]
  const operatorType = OPERATOR_TYPE_MAP[id]

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile?.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")

      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" }
      const params  = { page: 1, limit: 100 }

      if (id === "commercant") {
        const res = await axios.get(`${MERCHANTS_API}/${companyId}`, { headers, params })
        setUsers((res.data?.data || []).map(normalizeMerchant))
      } else if (id === "distributeur") {
        const res = await axios.get(`${DISTRIBUTORS_API}/${companyId}`, { headers, params })
        setUsers((res.data?.data || []).map(normalizeDistributor))
      } else if (id === "agent-admin") {
        const res = await axios.get(`${AGENTS_API}/${companyId}`, { headers, params })
        setUsers((res.data?.data || []).map(normalizeAgent))
      } else if (id === "entreprise-principale") {
        // On connaît déjà companyId : fetchProfile() (déjà confirmé, déjà utilisé
        // ailleurs dans l'app) suffit pour afficher directement le nom/email du
        // propriétaire, sans appel réseau supplémentaire.
        const profile = await fetchProfile()
        setUsers(normalizeCompany(profile?.company))
      } else {
        setUsers([])
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("company")
      }
      showError(err?.response?.data?.message || err.message || "Impossible de charger les opérateurs")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [id, showError])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filteredUsers = users.filter((u) => {
    const searchText = `${u.nom} ${u.role}`.toLowerCase()
    return !searchQuery || searchText.includes(searchQuery.toLowerCase())
  })

  const openModal = (type, user) => { setSelectedUser(user); setModalType(type) }
  const closeModal = () => {
    if (actionLoading) return
    setModalType(null)
    setSelectedUser(null)
  }

  /*  CONFIRMÉ : POST /pin/reset/{id}  body: { operatorType } */
  const handleConfirmReset = async (user /*, raison */) => {
    setActionLoading(true)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const payload = { operatorType }
      console.log("[PIN][reset] URL:", `${PIN_RESET_API}/${user.id}`, "payload:", payload)
      const res = await axios.post(
        `${PIN_RESET_API}/${user.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      const nouveauPin = res.data?.data
      showSuccess(
        nouveauPin
          ? `PIN réinitialisé pour "${user.nom}". Nouveau PIN temporaire : ${nouveauPin}`
          : `PIN réinitialisé avec succès pour "${user.nom}"`
      )
      setModalType(null)
      setSelectedUser(null)
      fetchUsers() // rafraîchit le statut (pinMustChange, tentatives, etc.)
    } catch (err) {
      console.error("[PIN][reset] échec :", JSON.stringify(err?.response?.data, null, 2))
      showError(extractErrorMessage(err, "Erreur lors de la réinitialisation du PIN"))
    } finally {
      setActionLoading(false)
    }
  }

  /*  CONFIRMÉ (déverrouiller) : POST /pin/unlock/{id}  body: { operatorType } */
    
  const handleConfirmLock = async (user) => {
    const isLocked = user.pinStatus === "verrouille"

    if (!isLocked) {
      // Verrouillage manuel : endpoint non confirmé, on garde un comportement local optimiste
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, pinStatus: "verrouille" } : u)))
      showSuccess(`Le compte de "${user.nom}" a été marqué comme verrouillé (localement)`)
      setModalType(null)
      setSelectedUser(null)
      return
    }

    setActionLoading(true)
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const payload = { operatorType }
      console.log("[PIN][unlock] URL:", `${PIN_UNLOCK_API}/${user.id}`, "payload:", payload)
      await axios.post(
        `${PIN_UNLOCK_API}/${user.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Le compte de "${user.nom}" a été déverrouillé`)
      setModalType(null)
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      console.error("[PIN][unlock] échec :", JSON.stringify(err?.response?.data, null, 2))
      showError(extractErrorMessage(err, "Erreur lors du déverrouillage du compte"))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">{operateurLabel}</h1>
            <p className="text-gray-500 text-xs sm:text-sm lg:text-base">Gestion des PIN — Opérateurs</p>
          </div>
        </div>
      </div>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-w-0">
        <div className="relative w-full sm:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Rechercher un opérateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 py-2 rounded-lg bg-gray-100 text-sm sm:text-base"
          />
        </div>

        <UsersTable
          data={filteredUsers}
          loading={loading}
          typeConfig={typeConfig}
          onApercu={(user) => openModal("apercu", user)}
          onReset={(user) => openModal("reset", user)}
          onLock={(user) => openModal("lock", user)}
          onHistorique={(user) => openModal("historique", user)}
        />
      </div>

      {modalType === "apercu" && selectedUser && (
        <ApercuModal user={selectedUser} typeConfig={typeConfig} operateurLabel={operateurLabel} onClose={closeModal} />
      )}
      {modalType === "historique" && selectedUser && (
        <HistoriqueModal user={selectedUser} typeConfig={typeConfig} operateurLabel={operateurLabel} onClose={closeModal} />
      )}
      {modalType === "reset" && selectedUser && (
        <ResetPinModal user={selectedUser} onClose={closeModal} onConfirm={handleConfirmReset} submitting={actionLoading} />
      )}
      {modalType === "lock" && selectedUser && (
        <LockPinModal user={selectedUser} onClose={closeModal} onConfirm={handleConfirmLock} submitting={actionLoading} />
      )}
    </div>
  )
}