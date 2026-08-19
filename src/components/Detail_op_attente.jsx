import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  User,
  ShieldCheck,
  Store,
  CreditCard,
  Info,
  Paperclip,
  Percent,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  AlertCircle,
  Repeat,
} from "lucide-react"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios"

/* ===================== HELPERS ===================== */

const API_BASE = "https://youapi.youneed.app/pollux/dev/api"

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    ""
  )
}

function authHeaders() {
  return {
    accept: "application/json",
    Authorization: `Bearer ${getToken()}`,
  }
}

const OPERATION_TYPE_LABELS = {
  SUBPRODUCT_RESTOCKING:                "Réapprovisionnement",
  PREPAID_CARD_ACTIVATION:              "Activation Carte",
  PREPAID_CARD_RECHARGE:                "Recharge Carte",
  CANAL_SUBSCRIPTION_NEW:               "Nouvel Abonnement Canal",
  CANAL_SUBSCRIPTION_RENEWAL:           "Renouvellement Canal+",
  CANAL_SUBSCRIPTION_FORMULA_CHANGE:    "Changement de formule Canal+",
  CANAL_SUBSCRIPTION_REACTIVATION:      "Réactivation Canal+",
  WALLET_DEPOSIT:                       "Dépôt Wallet",
  COMMISSION_WITHDRAWAL:                "Retrait Commission",
  MANUAL_ADJUSTMENT:                    "Ajustement Manuel",
}

function mapOperationName(operationType) {
  if (!operationType) return "—"
  return OPERATION_TYPE_LABELS[operationType] || operationType.replace(/_/g, " ")
}

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
}

function getCardNumber(operation) {
  return (
    operation?.cardId ||
    operation?.metadata?.cardId ||
    operation?.subProduct?.cardId ||
    operation?.metadata?.card?.cardId ||
    operation?.metadata?.cardNumber ||
    operation?.metadata?.card?.number ||
    operation?.metadata?.card?.cardNumber ||
    operation?.metadata?.prepaidCardNumber ||
    operation?.metadata?.prepaidCard?.cardNumber ||
    operation?.subProduct?.cardNumber ||
    null
  )
}

/* ---------- Helpers Canal+ (décodeur / abonnement / formules) ---------- */

function isCanalOperation(operation) {
  return (
    typeof operation?.operationType === "string" &&
    operation.operationType.startsWith("CANAL_SUBSCRIPTION_")
  )
}

function getDecoderNumber(operation) {
  return operation?.metadata?.decoderNumber || operation?.subProduct?.code || null
}

function getDecoderName(operation) {
  return operation?.metadata?.decoderName || operation?.subProduct?.name || null
}

function getSubscriptionNumberFromDescription(operation) {
  const match = /SUB\d+/i.exec(operation?.description || "")
  return match ? match[0] : null
}

function getCanalSubscriptionNumber(operation) {
  return (
    operation?.metadata?.canalSubscriptionNumber ||
    operation?.metadata?.subscriptionNumber ||
    operation?.metadata?.canal?.subscriptionNumber ||
    operation?.metadata?.canalSubscription?.number ||
    operation?.metadata?.abonnementNumber ||
    operation?.subProduct?.canalSubscriptionNumber ||
    getSubscriptionNumberFromDescription(operation) ||
    null
  )
}

function formatOptionsList(options) {
  if (!Array.isArray(options) || options.length === 0) return []
  return options.map((opt) => ({
    name: opt?.name || opt?.optionName || "—",
    price:
      opt?.price != null
        ? Number(opt.price)
        : opt?.optionPrice != null
        ? Number(opt.optionPrice)
        : null,
  }))
}

function formatShortDate(dateString) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getCanalFormulaChangeDetails(operation) {
  const meta = operation?.metadata || {}
  return {
    oldFormula: {
      name: meta.oldFormulaName ?? meta.previousFormulaName ?? null,
      price: meta.oldFormulaPrice ?? meta.previousFormulaPrice ?? null,
      durationInDays: meta.oldFormulaDurationInDays ?? meta.previousFormulaDurationInDays ?? null,
    },
    newFormula: {
      name: meta.formulaName ?? meta.newFormulaName ?? null,
      price: meta.formulaPrice ?? meta.newFormulaPrice ?? null,
      durationInDays: meta.formulaDurationInDays ?? meta.newFormulaDurationInDays ?? null,
      options: formatOptionsList(meta.selectedOptions),
    },
    formulaDifference: meta.formulaPriceDifference ?? meta.formulaDifference ?? null,
    optionsDifference: meta.optionsPriceDifference ?? meta.optionsDifference ?? meta.totalOptionsPrice ?? null,
    amountToPay: meta.amountToPay ?? meta.totalDifference ?? meta.priceDifference ?? null,
    currentEndDate: meta.currentEndDate ?? meta.oldEndDate ?? null,
    newEndDate: meta.newEndDate ?? null,
  }
}

function getCanalReactivationDetails(operation) {
  const meta = operation?.metadata || {}
  return {
    formula: {
      name: meta.formulaName ?? null,
      price: meta.formulaPrice ?? null,
      durationInDays: meta.formulaDurationInDays ?? null,
      options: formatOptionsList(meta.selectedOptions),
    },
    originalPeriod: {
      startDate: meta.oldStartDate ?? meta.originalStartDate ?? null,
      endDate: meta.oldEndDate ?? meta.originalEndDate ?? null,
    },
    newPeriod: {
      startDate: meta.newStartDate ?? null,
      endDate: meta.newEndDate ?? null,
    },
    reason: meta.reactivationReason ?? meta.reason ?? null,
  }
}

function buildAttachments(operation) {
  const list = []
  const seen = new Set()

  const push = (label, url) => {
    if (url && typeof url === "string" && url.startsWith("http") && !seen.has(url)) {
      seen.add(url)
      list.push({ label, url })
    }
  }

  push("Pièce d'identité client", operation?.client?.idAttachment)
  push("Justificatif de validation", operation?.validationAttachment)
  push("Preuve de paiement", getPaymentProof(operation)?.proofUrl)

  if (operation?.metadata && typeof operation.metadata === "object") {
    Object.entries(operation.metadata).forEach(([key, value]) => {
      if (typeof value === "string" && value.startsWith("http")) {
        push(humanizeKey(key), value)
      }
    })
  }

  return list
}

function getPaymentProof(operation) {
  return operation?.paymentProof || operation?.metadata?.paymentProof || null
}

function isImageUrl(url) {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(url)
}

const ACTION_LABELS = {
  validate: { verb: "valider", title: "Validation de l'opération", color: "#1EA4DC" },
  reject:   { verb: "rejeter",  title: "Rejet de l'opération",      color: "#DC2626" },
  cancel:   { verb: "annuler",  title: "Annulation de l'opération", color: "#EA580C" },
}

function operationHasCommission(operation) {
  const commissionDetails = operation?.metadata?.commissionDetails || null
  return Boolean(commissionDetails || operation?.appliedCommissionType)
}

function isCanalSubscriptionOperation(operation) {
  return (
    operation?.operationType === "CANAL_SUBSCRIPTION_NEW" ||
    operation?.operationType === "CANAL_SUBSCRIPTION_RENEWAL"
  )
}

function usesOptionalAttachmentValidationFlow(operation) {
  return (
    operation?.operationType === "CANAL_SUBSCRIPTION_FORMULA_CHANGE" ||
    operation?.operationType === "CANAL_SUBSCRIPTION_REACTIVATION" ||
    operation?.operationType === "WALLET_DEPOSIT" ||
    operation?.operationType === "COMMISSION_WITHDRAWAL"
  )
}

const OPTIONAL_ATTACHMENT_OPERATION_STYLE = {
  CANAL_SUBSCRIPTION_FORMULA_CHANGE: { icon: Repeat,      color: "#7C3AED" },
  CANAL_SUBSCRIPTION_REACTIVATION:   { icon: ShieldCheck, color: "#0EA5E9" },
  WALLET_DEPOSIT:                    { icon: CreditCard,  color: "#16A34A" },
  COMMISSION_WITHDRAWAL:             { icon: Percent,     color: "#EA580C" },
}

function getOptionalAttachmentOperationStyle(operationType) {
  return OPTIONAL_ATTACHMENT_OPERATION_STYLE[operationType] || { icon: CheckCircle, color: "#16A34A" }
}

function getCanalFormulaId(operation) {
  return (
    operation?.metadata?.canalFormulaId ||
    operation?.metadata?.formulaId ||
    operation?.subProduct?.canalFormulaId ||
    operation?.subProduct?.prepaidCardFormulaId ||
    operation?.canalSubscription?.formulaId ||
    null
  )
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
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition-all
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

/* ===================== PIN DIGIT BOXES (composant partagé) ===================== */

function PinDigitBoxes({ value, onChange, length = 4, masked = true, autoFocus = false, error }) {
  const inputsRef = useRef([])

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  const handleChange = (index, rawChar) => {
    const char = rawChar.replace(/[^0-9]/g, "")
    const chars = value.split("")
    chars[index] = char.slice(-1) || ""
    const next = chars.join("").slice(0, length)
    onChange(next)

    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold rounded-2xl border bg-[#F5F7FA] outline-none transition-colors
            ${error ? "border-red-400 text-red-600" : "border-gray-200 text-gray-800 focus:border-[#1EA4DC]"}`}
        />
      ))}
    </div>
  )
}

/* ===================== MODAL SHELL ===================== */

function ModalShell({ onClose, children, disableClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
        {!disableClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/* ===================== POPUP : VÉRIFICATION DU PIN ===================== */

function PinVerifyModal({ actionType, onClose, onVerified }) {
  const [pin, setPin] = useState("")
  const [masked, setMasked] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState(null)

  const label = ACTION_LABELS[actionType] || ACTION_LABELS.validate

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("Veuillez saisir les 4 chiffres de votre code PIN.")
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await axios.post(
        `${API_BASE}/pin/verify`,
        { pin },
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      )
      const data = response.data?.data
      if (data?.attemptsRemaining != null) {
        setAttemptsRemaining(data.attemptsRemaining)
      }
      onVerified()
    } catch (err) {
      console.error("Erreur vérification PIN :", err)
      const remaining = err?.response?.data?.data?.attemptsRemaining
      if (remaining != null) setAttemptsRemaining(remaining)
      setError(
        err?.response?.data?.message ||
        "Code PIN incorrect. Veuillez réessayer."
      )
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, ${label.color}, #0B4F6C)` }}
        >
          <Lock className="text-white" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">{label.title}</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Entrez votre code PIN pour {label.verb} cette opération.
        </p>

        <PinDigitBoxes value={pin} onChange={setPin} masked={masked} autoFocus error={!!error} />

        <button
          type="button"
          onClick={() => setMasked((m) => !m)}
          className="flex items-center gap-1.5 text-[#1EA4DC] text-sm mt-4"
        >
          {masked ? <Eye size={16} /> : <EyeOff size={16} />}
          {masked ? "Afficher" : "Masquer"}
        </button>

        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mt-4">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {attemptsRemaining != null && (
          <p className="text-orange-500 text-xs mt-2">
            Tentatives restantes : {attemptsRemaining}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || pin.length !== 4}
          className="w-full mt-6 py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: label.color }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {loading ? "Vérification…" : "Confirmer"}
        </button>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : CRÉATION DU PIN ===================== */

function PinCreateModal({ onClose, onCreated }) {
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [masked, setMasked] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError("Veuillez saisir un code PIN à 4 chiffres dans les deux champs.")
      return
    }
    if (pin !== confirmPin) {
      setError("Les deux codes PIN ne correspondent pas.")
      return
    }
    try {
      setLoading(true)
      setError(null)
      await axios.post(
        `${API_BASE}/pin/set`,
        { pin, confirmPin },
        { headers: { ...authHeaders(), "Content-Type": "application/json" } }
      )
      onCreated()
    } catch (err) {
      console.error("Erreur création PIN :", err)
      setError(
        err?.response?.data?.message ||
        "Impossible de créer le code PIN. Veuillez réessayer."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-[#1EA4DC] to-[#0B4F6C]">
          <Lock className="text-white" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Créer votre code PIN</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Vous devez créer un code PIN à 4 chiffres avant de pouvoir valider,
          rejeter ou annuler une opération.
        </p>

        <p className="text-gray-400 text-xs font-medium self-start mb-2">Code PIN</p>
        <PinDigitBoxes value={pin} onChange={setPin} masked={masked} autoFocus />

        <p className="text-gray-400 text-xs font-medium self-start mb-2 mt-5">Confirmer le code PIN</p>
        <PinDigitBoxes value={confirmPin} onChange={setConfirmPin} masked={masked} />

        <button
          type="button"
          onClick={() => setMasked((m) => !m)}
          className="flex items-center gap-1.5 text-[#1EA4DC] text-sm mt-4"
        >
          {masked ? <Eye size={16} /> : <EyeOff size={16} />}
          {masked ? "Afficher" : "Masquer"}
        </button>

        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mt-4">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
          className="w-full mt-6 py-3 rounded-2xl text-white font-medium bg-[#1EA4DC] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          {loading ? "Création…" : "Créer mon code PIN"}
        </button>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : MOTIF DE REJET ===================== */

function RejectReasonModal({ onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState(null)

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Veuillez indiquer un motif de rejet.")
      return
    }
    setError(null)
    onConfirm(reason.trim())
  }

  return (
    <ModalShell onClose={onClose} disableClose={loading}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 bg-red-50">
          <XCircle className="text-red-600" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Motif du rejet</h2>
        <p className="text-gray-500 text-sm mt-1 mb-5">
          Expliquez pourquoi cette opération est rejetée. Ce motif sera visible
          par le partenaire concerné.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Ex : justificatif de paiement illisible…"
          className="w-full rounded-2xl border border-gray-200 bg-[#F5F7FA] p-4 text-sm text-gray-800 outline-none focus:border-red-400 resize-none"
        />

        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mt-3 self-start">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 py-3 rounded-2xl text-white font-medium bg-red-600 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
          {loading ? "Rejet en cours…" : "Confirmer le rejet"}
        </button>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : CONFIRMATION SIMPLE (ACTIVATION CARTE SANS RECHARGEMENT / SANS COMMISSION) ===================== */

function SimpleConfirmModal({ operation, loading, onClose, onConfirm }) {
  return (
    <ModalShell onClose={onClose} disableClose={loading}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 bg-green-50">
          <CheckCircle className="text-green-600" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Valider l'opération</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Êtes-vous sûr de vouloir valider cette opération {mapOperationName(operation?.operationType)} ?
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:flex-1 py-3 rounded-2xl text-white font-medium bg-green-600 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {loading ? "Validation…" : "Valider"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : CONFIRMATION D'ANNULATION ===================== */

function CancelConfirmModal({ operation, loading, onClose, onConfirm }) {
  return (
    <ModalShell onClose={onClose} disableClose={loading}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 bg-orange-50">
          <XCircle className="text-orange-500" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Annuler l'opération</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Êtes-vous sûr de vouloir annuler cette opération {mapOperationName(operation?.operationType)} ?
          Cette action est irréversible.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Retour
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:flex-1 py-3 rounded-2xl text-white font-medium bg-orange-500 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
            {loading ? "Annulation…" : "Confirmer l'annulation"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : VALIDATION AVEC JUSTIFICATIF OPTIONNEL
   (CHANGEMENT DE FORMULE CANAL+ / RÉACTIVATION CANAL+ / DÉPÔT WALLET /
    RETRAIT COMMISSION) ===================== */

function OptionalAttachmentConfirmModal({ operation, resolvedId, onClose, onValidated }) {
  const { icon: OperationIcon, color: accentColor } = getOptionalAttachmentOperationStyle(
    operation?.operationType
  )

  const [attachment, setAttachment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setAttachment(file)
  }

  const handleRemoveAttachment = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAttachment(null)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setSubmitError(null)

      const formData = new FormData()
      if (attachment) {
        formData.append("validationAttachment", attachment)
      }

      await axios.post(
        `${API_BASE}/operations/${resolvedId}/validate`,
        formData,
        {
          headers: {
            ...authHeaders(),
          },
        }
      )
      onValidated()
    } catch (error) {
      console.error("Erreur validation (justificatif optionnel) :", error)
      setSubmitError(
        error?.response?.data?.message ||
        "Erreur lors de la validation de l'opération."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} disableClose={submitting}>
      <div className="flex flex-col items-center text-center">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #0B4F6C)` }}
        >
          <OperationIcon className="text-white" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Valider la demande</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Êtes-vous sûr de vouloir valider cette demande de{" "}
          <span className="font-semibold text-gray-700">
            {mapOperationName(operation?.operationType)}
          </span>{" "}
          ?
        </p>

        <p className="text-gray-700 text-sm font-semibold self-start mb-2">
          Pièce jointe <span className="text-gray-400 font-normal">(optionnel)</span>
        </p>

        <label
          className={`w-full flex items-center justify-center gap-2 border rounded-2xl px-4 py-3.5 cursor-pointer transition-colors
            ${attachment
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-[#1EA4DC]/40 bg-[#1EA4DC]/5 text-[#1EA4DC] hover:bg-[#1EA4DC]/10"}`}
        >
          {attachment ? <Check size={17} className="shrink-0" /> : <Paperclip size={17} className="shrink-0" />}
          <span className="font-medium text-sm truncate">
            {attachment ? attachment.name : "Joindre un justificatif"}
          </span>
          {attachment && (
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="ml-auto shrink-0 text-green-600 hover:text-green-800"
            >
              <X size={15} />
            </button>
          )}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleAttachmentChange}
          />
        </label>
        <p className="text-gray-400 text-[11px] mt-1.5 self-start">
          Formats acceptés : JPG, PNG, PDF — vous pouvez valider sans pièce jointe.
        </p>

        {submitError && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mt-3 self-start">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:flex-1 py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:flex-1 py-3 rounded-2xl text-white font-medium bg-green-600 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? "Validation…" : "Valider"}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ===================== POPUP : VALIDATION AVEC COMMISSION
   (ACTIVATION CARTE + RECHARGEMENT / RECHARGE CARTE / ABONNEMENTS CANAL+) ===================== */

function getCommissionAssignmentsUrl(operation) {
  const isDistributor = operation?.operatorType === "DISTRIBUTOR"
  const partnerId = isDistributor ? operation?.distributor?.id : operation?.merchant?.id
  if (!partnerId) return null
  const segment = isDistributor ? "distributors" : "merchants"
  const base = isCanalSubscriptionOperation(operation) ? "canal-commissions" : "commissions"
  return `${API_BASE}/${base}/${segment}/${partnerId}/assignments?onlyActive=true`
}

function pickBestAssignment(assignments, amount) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null
  const value = Number(amount) || 0
  const inRange = assignments.find((a) => {
    const min = Number(a?.serviceCommissionRate?.minAmount ?? 0)
    const max = Number(a?.serviceCommissionRate?.maxAmount ?? Infinity)
    return value >= min && value <= max
  })
  return inRange || assignments[0]
}

function pickBestCanalAssignment(assignments, formulaId) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null
  if (!formulaId) return assignments[0]
  const match = assignments.find((a) => a?.formulaId === formulaId)
  return match || assignments[0]
}

function formatRate(rate, commissionType) {
  const value = Number(rate) || 0
  return commissionType === "PERCENTAGE"
    ? `${(value * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : `${value.toLocaleString("fr-FR")} FCFA`
}

function formatCanalRate(rate, commissionType) {
  const value = Number(rate) || 0
  return commissionType === "PERCENTAGE"
    ? `${value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    : `${value.toLocaleString("fr-FR")} FCFA`
}

function formatAmountShort(value) {
  const num = Number(value)
  if (!isFinite(num)) return "—"
  if (Math.abs(num) >= 1000000) {
    const m = num / 1000000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  if (Math.abs(num) >= 1000) {
    const k = num / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return `${num}`
}

function computeCommissionAmount(rate, commissionType, baseAmount) {
  const value = Number(rate) || 0
  if (commissionType === "PERCENTAGE") {
    return (Number(baseAmount) || 0) * value
  }
  return value
}

function computeCanalCommissionAmount(rate, commissionType, baseAmount) {
  const value = Number(rate) || 0
  if (commissionType === "PERCENTAGE") {
    return ((Number(baseAmount) || 0) * value) / 100
  }
  return value
}

function CommissionRow({ label, value, valueClass, last }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 text-sm ${last ? "" : "border-b border-[#1EA4DC]/10"}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`${valueClass || "text-gray-800 font-semibold"} text-right`}>{value}</span>
    </div>
  )
}

/* ===================== POPUP : CHOISIR UN TAUX (changement de la grille de commission) ===================== */

function RateSelectionModal({ assignments, operation, variant, onClose, onConfirm }) {
  const [pendingId, setPendingId] = useState(null)

  const isCanal = variant === "canal"
  const isNewSubscription = operation?.operationType === "CANAL_SUBSCRIPTION_NEW"

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-4 border-b border-gray-100">
          <h2 className="text-gray-800 font-bold text-lg sm:text-xl">
            {isCanal ? "Choisir une formule Canal+" : "Choisir un taux Prépayé"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3">
          {assignments.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">
              Aucun taux disponible pour ce partenaire.
            </p>
          )}

          {assignments.map((a) => {
            const active = a.id === pendingId

            if (isCanal) {
              const price = a?.formula?.price
              const formulaName = a?.formula?.name || "Formule"
              const currentLabel = isNewSubscription ? "Nouvel abonnement" : "Renouvellement"
              const currentValue = formatCanalRate(
                isNewSubscription ? a?.newSubscriptionRate : a?.renewalRate,
                a?.commissionType
              )
              const otherLabel = isNewSubscription ? "Renouvellement" : "Nouvel abonnement"
              const otherValue = formatCanalRate(
                isNewSubscription ? a?.renewalRate : a?.newSubscriptionRate,
                a?.commissionType
              )

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPendingId((prev) => (prev === a.id ? null : a.id))}
                  className={`w-full flex items-center gap-3 sm:gap-4 rounded-2xl border px-3 sm:px-4 py-4 text-left transition-colors
                    ${active ? "border-[#1EA4DC] bg-[#1EA4DC]/5" : "border-gray-200 bg-white"}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                      ${active ? "border-[#1EA4DC]" : "border-gray-300"}`}
                  >
                    {active && <span className="w-3 h-3 rounded-full bg-[#1EA4DC]" />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-semibold text-base truncate">{formulaName}</p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {price != null ? `${Number(price).toLocaleString("fr-FR")} FCFA` : "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-[#1EA4DC]/10 text-[#1EA4DC] text-xs font-semibold px-2.5 py-1 rounded-full">
                        {currentLabel} : {currentValue}
                      </span>
                      <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {otherLabel} : {otherValue}
                      </span>
                    </div>
                  </div>
                </button>
              )
            }

            const min = a?.serviceCommissionRate?.minAmount
            const max = a?.serviceCommissionRate?.maxAmount
            const rangeLabel = `${formatAmountShort(min)} – ${formatAmountShort(max)} FCFA`
            const rateName = a?.serviceCommissionRate?.name || "Palier"

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setPendingId((prev) => (prev === a.id ? null : a.id))}
                className={`w-full flex items-center gap-3 sm:gap-4 rounded-2xl border px-3 sm:px-4 py-4 text-left transition-colors
                  ${active ? "border-[#1EA4DC] bg-[#1EA4DC]/5" : "border-gray-200 bg-white"}`}
              >
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                    ${active ? "border-[#1EA4DC]" : "border-gray-300"}`}
                >
                  {active && <span className="w-3 h-3 rounded-full bg-[#1EA4DC]" />}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-semibold text-base truncate">{rateName}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{rangeLabel}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      Commercial : {formatRate(a?.partnerRate, a?.commissionType)}
                    </span>
                    <span className="bg-[#1EA4DC]/10 text-[#1EA4DC] text-xs font-semibold px-2.5 py-1 rounded-full">
                      Pollux : {formatRate(a?.companyRate, a?.commissionType)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
          <button
            onClick={() => onConfirm(pendingId)}
            className="w-full py-3.5 rounded-2xl text-white font-semibold bg-[#1EA4DC] flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Confirmer ce taux
          </button>
        </div>
      </div>
    </div>
  )
}

function CommissionValidationModal({ operation, resolvedId, onClose, onValidated }) {
  const isCanal = isCanalSubscriptionOperation(operation)
  const canalFormulaId = isCanal ? getCanalFormulaId(operation) : null
  const isNewSubscription = operation?.operationType === "CANAL_SUBSCRIPTION_NEW"
  const canalRateField = isNewSubscription ? "newSubscriptionRate" : "renewalRate"
  const canalRateLabel = isNewSubscription ? "Taux nouvel abonnement" : "Taux renouvellement"

  const [assignments, setAssignments] = useState([])
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [assignmentsError, setAssignmentsError] = useState(null)

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [defaultAssignmentId, setDefaultAssignmentId] = useState(null)
  const [showRatePicker, setShowRatePicker] = useState(false)

  const [attachment, setAttachment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    fetchAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAssignments = async () => {
    const url = getCommissionAssignmentsUrl(operation)
    if (!url) {
      setAssignmentsError("Impossible de déterminer le partenaire à l'origine de cette opération.")
      setLoadingAssignments(false)
      return
    }
    try {
      setLoadingAssignments(true)
      setAssignmentsError(null)
      const response = await axios.get(url, { headers: authHeaders() })
      const list = response.data?.data || []
      setAssignments(Array.isArray(list) ? list : [])

      const best = isCanal
        ? pickBestCanalAssignment(list, canalFormulaId)
        : pickBestAssignment(list, operation?.amount)
      if (best?.id) {
        setDefaultAssignmentId(best.id)
        setSelectedAssignmentId(best.id)
      }
    } catch (error) {
      console.error("Erreur chargement des commissions :", error)
      setAssignmentsError(
        isCanal
          ? "Impossible de charger la grille de commission Canal+ du partenaire."
          : "Impossible de charger la grille de commission du partenaire."
      )
    } finally {
      setLoadingAssignments(false)
    }
  }

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId) || null
  const commissionType = selectedAssignment?.commissionType

  const commissionTypeLabel = commissionType === "FIXED"
    ? "Montant fixe"
    : commissionType === "PERCENTAGE"
    ? "Montant en pourcentage"
    : "—"

  const partnerRate = selectedAssignment?.partnerRate
  const companyRate = selectedAssignment?.companyRate
  const partnerRateDisplay = selectedAssignment ? formatRate(partnerRate, commissionType) : "—"
  const companyRateDisplay = selectedAssignment ? formatRate(companyRate, commissionType) : "—"

  const canalRateValue = selectedAssignment?.[canalRateField]
  const canalRateDisplay = selectedAssignment ? formatCanalRate(canalRateValue, commissionType) : "—"
  const canalFormulaName = selectedAssignment?.formula?.name || "—"
  const canalFormulaPrice = selectedAssignment?.formula?.price

  const baseAmount = isCanal
    ? Number(selectedAssignment?.formula?.price ?? operation?.amount ?? 0)
    : operation?.amount

  const partnerCommissionAmount = selectedAssignment
    ? isCanal
      ? computeCanalCommissionAmount(canalRateValue, commissionType, baseAmount)
      : computeCommissionAmount(partnerRate, commissionType, baseAmount)
    : 0
  const companyCommissionAmount = (!isCanal && selectedAssignment)
    ? computeCommissionAmount(companyRate, commissionType, baseAmount)
    : 0
  const totalCommissionAmount = partnerCommissionAmount + companyCommissionAmount

  const partnerCommissionDisplay = selectedAssignment
    ? `${partnerCommissionAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"
  const totalCommissionDisplay = selectedAssignment
    ? `${totalCommissionAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setAttachment(file)
  }

  const handleSubmit = async () => {
    if (!attachment) {
      setSubmitError("Veuillez joindre un justificatif avant de valider.")
      return
    }
    try {
      setSubmitting(true)
      setSubmitError(null)

      const formData = new FormData()
      if (selectedAssignmentId && selectedAssignmentId !== defaultAssignmentId) {
        formData.append("overrideAssignmentId", selectedAssignmentId)
      }
      formData.append("validationAttachment", attachment)

      await axios.post(
        `${API_BASE}/operations/${resolvedId}/validate`,
        formData,
        {
          headers: {
            ...authHeaders(),
          },
        }
      )
      onValidated()
    } catch (error) {
      console.error("Erreur validation (commission + justificatif) :", error)
      setSubmitError(
        error?.response?.data?.message ||
        "Erreur lors de la validation de l'opération."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} disableClose={submitting}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 bg-green-50">
          <CheckCircle className="text-green-600" size={26} />
        </div>

        <h2 className="text-gray-800 font-semibold text-base sm:text-lg">Valider la demande</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">
          Êtes-vous sûr de vouloir valider cette demande de {mapOperationName(operation?.operationType)} ?
        </p>

        <div className="w-full rounded-2xl bg-[#1EA4DC]/5 border border-[#1EA4DC]/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-[#1EA4DC] font-semibold text-sm">
              <Percent size={16} className="shrink-0" />
              Commission appliquée
              {selectedAssignmentId && defaultAssignmentId && selectedAssignmentId !== defaultAssignmentId && (
                <span className="ml-1.5 bg-orange-100 text-orange-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Taux modifié
                </span>
              )}
            </span>
            {!loadingAssignments && assignments.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRatePicker(true)}
                className="flex items-center gap-1.5 bg-[#1EA4DC] text-white text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
              >
                <Repeat size={13} />
                Changer le taux
              </button>
            )}
          </div>

          {loadingAssignments && (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">Chargement de la commission…</span>
            </div>
          )}

          {!loadingAssignments && assignmentsError && (
            <p className="text-red-600 text-xs text-left">{assignmentsError}</p>
          )}

          {!loadingAssignments && !assignmentsError && !selectedAssignment && (
            <p className="text-gray-400 text-xs text-left">
              Aucune grille de commission active trouvée pour ce partenaire.
            </p>
          )}

          {!loadingAssignments && selectedAssignment && (
            <div className="space-y-0">
              {isCanal && (
                <CommissionRow
                  label="Formule"
                  value={
                    canalFormulaPrice != null
                      ? `${canalFormulaName} (${Number(canalFormulaPrice).toLocaleString("fr-FR")} FCFA)`
                      : canalFormulaName
                  }
                />
              )}
              <CommissionRow label="Type" value={commissionTypeLabel} />
              {isCanal ? (
                <CommissionRow
                  label={canalRateLabel}
                  value={canalRateDisplay}
                  valueClass="text-[#1EA4DC] font-bold"
                  last
                />
              ) : (
                <>
                  <CommissionRow label="Taux partenaire" value={partnerRateDisplay} />
                  <CommissionRow label="Taux Pollux" value={companyRateDisplay} />
                </>
              )}
              <CommissionRow
                label="Commission partenaire"
                value={partnerCommissionDisplay}
                valueClass="text-green-600 font-semibold"
                last={isCanal}
              />
              {!isCanal && (
                <CommissionRow
                  label="Commission totale"
                  value={totalCommissionDisplay}
                  valueClass="text-[#1EA4DC] font-bold"
                  last
                />
              )}
            </div>
          )}
        </div>

        <p className="text-gray-700 text-sm font-semibold self-start mt-6 mb-2">
          Pièce jointe (obligatoire)
        </p>
        <label
          className={`w-full flex items-center justify-center gap-2 border rounded-2xl px-4 py-3.5 cursor-pointer transition-colors
            ${attachment
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-[#1EA4DC]/40 bg-[#1EA4DC]/5 text-[#1EA4DC] hover:bg-[#1EA4DC]/10"}`}
        >
          {attachment ? <Check size={17} className="shrink-0" /> : <Paperclip size={17} className="shrink-0" />}
          <span className="font-medium text-sm truncate">
            {attachment ? attachment.name : "Joindre un justificatif"}
          </span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleAttachmentChange}
          />
        </label>
        <p className="text-gray-400 text-[11px] mt-1.5 self-start">
          Formats acceptés : JPG, PNG, PDF
        </p>

        {submitError && (
          <div className="flex items-center gap-1.5 text-red-600 text-xs mt-3 self-start">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:flex-1 py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !attachment}
            className="w-full sm:flex-1 py-3 rounded-2xl text-white font-medium bg-green-600 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? "Validation…" : "Valider"}
          </button>
        </div>
      </div>

      {showRatePicker && (
        <RateSelectionModal
          assignments={assignments}
          operation={operation}
          variant={isCanal ? "canal" : "prepaid"}
          onClose={() => setShowRatePicker(false)}
          onConfirm={(id) => {
            setSelectedAssignmentId(id || defaultAssignmentId)
            setShowRatePicker(false)
          }}
        />
      )}
    </ModalShell>
  )
}

/* ===================== POPUP : VALIDATION AVEC SÉLECTION (RÉAPPROVISIONNEMENT) ===================== */

function ManualSelectionModal({ operation, resolvedId, onClose, onValidated }) {
  const requiredCount =
    operation?.metadata?.requestedQuantity ||
    operation?.metadata?.quantity ||
    1

  const serviceId =
    operation?.subProduct?.serviceId ||
    operation?.subProduct?.service?.id ||
    operation?.metadata?.serviceId ||
    null

  const bankId =
    operation?.subProduct?.bankId ||
    operation?.subProduct?.bank?.id ||
    operation?.metadata?.bankId ||
    operation?.metadata?.bank?.id ||
    null

  const prepaidCardFormulaId =
    operation?.subProduct?.prepaidCardFormulaId ||
    operation?.subProduct?.prepaidCardFormula?.id ||
    operation?.metadata?.prepaidCardFormulaId ||
    null

  const [subProducts, setSubProducts] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [attachment, setAttachment] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    fetchAvailableSubProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAvailableSubProducts = async () => {
    if (!serviceId) {
      setListError("Impossible de déterminer le service concerné par cette opération.")
      setLoadingList(false)
      return
    }
    try {
      setLoadingList(true)
      setListError(null)

      const queryParams = new URLSearchParams()
      queryParams.set("status", "AVAILABLE")
      queryParams.set("page", "1")
      queryParams.set("limit", "20")
      if (bankId) queryParams.set("bankId", bankId)
      if (prepaidCardFormulaId) queryParams.set("prepaidCardFormulaId", prepaidCardFormulaId)

      const response = await axios.get(
        `${API_BASE}/products/sub-products/product/${serviceId}?${queryParams.toString()}`,
        { headers: authHeaders() }
      )
      const list = response.data?.data || response.data || []
      setSubProducts(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error("Erreur chargement produits disponibles :", error)
      setListError("Impossible de charger la liste des produits disponibles.")
    } finally {
      setLoadingList(false)
    }
  }

  const isAvailable = (sp) => sp.status === "AVAILABLE"

  const filteredList = subProducts.filter((sp) => {
    if (!search.trim()) return true
    const term = search.trim().toLowerCase()
    const name = (sp.name || "").toLowerCase()
    const code = String(sp.code ?? "").toLowerCase()
    return name.includes(term) || code.includes(term)
  })

  const toggleSelect = (sp) => {
    const id = sp.id
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= requiredCount) {
        return prev
      }
      return [...prev, id]
    })
  }

  const selectedProducts = subProducts.filter((sp) => selectedIds.includes(sp.id))

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setAttachment(file)
  }

  const handleSubmit = async () => {
    if (selectedIds.length !== requiredCount) {
      setSubmitError(`Veuillez sélectionner exactement ${requiredCount} produit(s).`)
      return
    }
    if (!attachment) {
      setSubmitError("Veuillez joindre un justificatif avant de valider.")
      return
    }
    try {
      setSubmitting(true)
      setSubmitError(null)

      const formData = new FormData()
      selectedIds.forEach((id) => formData.append("selectedSubProductIds", id))
      formData.append("validationAttachment", attachment)

      await axios.post(
        `${API_BASE}/operations/${resolvedId}/validate-with-selection`,
        formData,
        {
          headers: {
            ...authHeaders(),
          },
        }
      )
      onValidated()
    } catch (error) {
      console.error("Erreur validate-with-selection :", error)
      setSubmitError(
        error?.response?.data?.message ||
        "Erreur lors de la validation avec sélection des produits."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const remaining = requiredCount - selectedIds.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-xl flex flex-col max-h-[92vh]">

        <div className="p-4 sm:p-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#1EA4DC] to-[#0B4F6C] shrink-0">
                <Layers className="text-white" size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-gray-800 font-semibold text-base sm:text-lg leading-tight">
                  Validation Approvisionnement
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {mapOperationName(operation?.operationType)}
                </p>

                <label
                  className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors
                    ${attachment
                      ? "bg-green-50 text-green-600 hover:bg-green-100"
                      : "bg-[#1EA4DC]/10 text-[#1EA4DC] hover:bg-[#1EA4DC]/15"}`}
                >
                  {attachment ? <Check size={15} /> : <Paperclip size={15} />}
                  {attachment ? attachment.name.slice(0, 22) : "Joindre un justificatif *"}
                  <input type="file" className="hidden" onChange={handleAttachmentChange} />
                </label>
                {!attachment && (
                  <p className="text-gray-400 text-[11px] mt-1">
                    Justificatif requis pour valider l'opération.
                  </p>
                )}
              </div>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-3 bg-[#F5F7FA] rounded-2xl px-4 py-3">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="bg-transparent outline-none text-sm text-gray-700 w-full placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-4">
          <div
            className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
              selectedIds.length >= requiredCount
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                selectedIds.length >= requiredCount ? "bg-green-500" : "bg-orange-400"
              }`}
            >
              {selectedIds.length >= requiredCount ? (
                <Check size={15} className="text-white" />
              ) : (
                <Info size={15} className="text-white" />
              )}
            </div>
            <div>
              <p
                className={`font-semibold text-sm ${
                  selectedIds.length >= requiredCount ? "text-green-700" : "text-orange-600"
                }`}
              >
                Sélection : {selectedIds.length}/{requiredCount}
              </p>
              <p className="text-gray-500 text-xs">
                {selectedIds.length >= requiredCount
                  ? "Sélection complète — décochez un produit pour en choisir un autre"
                  : `Sélectionnez ${remaining} produit(s) de plus`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {loadingList && (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-10">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Chargement des produits…</span>
            </div>
          )}

          {!loadingList && listError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {listError}
            </div>
          )}

          {!loadingList && !listError && filteredList.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-10">
              Aucun produit disponible pour cette recherche.
            </p>
          )}

          {!loadingList && !listError && filteredList.map((sp) => {
            const id = sp.id
            const checked = selectedIds.includes(id)
            const available = isAvailable(sp)
            const price = sp.price != null ? Number(sp.price) : null
            const limitReached = !checked && selectedIds.length >= requiredCount
            const disabled = !available || limitReached

            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => toggleSelect(sp)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors
                  ${checked ? "border-[#1EA4DC] bg-[#1EA4DC]/5" : "border-gray-200 bg-white"}
                  ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#1EA4DC]/50"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-gray-800 font-semibold text-sm truncate">{sp.name || "—"}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Code : {sp.code || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {price != null && (
                        <span className="text-[#1EA4DC] font-semibold text-sm">
                          {price.toLocaleString("fr-FR")} {sp.currency || "FCFA"}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          available ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {available ? "Disponible" : "Indisponible"}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    checked ? "bg-[#1EA4DC] border-[#1EA4DC]" : "border-gray-300"
                  }`}
                >
                  {checked && <Check size={13} className="text-white" />}
                </span>
              </button>
            )
          })}
        </div>

        {submitError && (
          <div className="mx-4 sm:mx-6 mb-2 flex items-center gap-1.5 text-red-600 text-xs">
            <AlertTriangle size={13} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1EA4DC] flex items-center justify-center shrink-0">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <span className="text-gray-800 font-semibold text-sm flex items-center gap-1.5 truncate">
                {selectedProducts.length === 0
                  ? "Aucun produit sélectionné"
                  : `${selectedProducts.length} produit(s) sélectionné(s)`}
                {selectedIds.length >= requiredCount && (
                  <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-white" />
                  </span>
                )}
              </span>
            </div>
            {summaryOpen ? (
              <ChevronDown size={18} className="text-gray-400 shrink-0" />
            ) : (
              <ChevronUp size={18} className="text-gray-400 shrink-0" />
            )}
          </button>

          {summaryOpen && selectedProducts.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
              {selectedProducts.map((sp) => (
                <div
                  key={sp.id}
                  className="flex justify-between gap-2 text-xs text-gray-500"
                >
                  <span className="truncate">{sp.name}</span>
                  <span className="shrink-0">Code : {sp.code || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {selectedIds.length >= requiredCount && (
            <>
              <button
                onClick={handleSubmit}
                disabled={submitting || !attachment}
                className="w-full mt-4 py-3 rounded-2xl text-white font-medium bg-[#1EA4DC] flex items-center justify-center gap-2 disabled:opacity-40 animate-[fadeIn_0.15s_ease-out]"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {submitting ? "Validation en cours…" : "Valider l'approvisionnement"}
              </button>
              {!attachment && (
                <p className="text-orange-500 text-[11px] text-center mt-2">
                  Joignez un justificatif ci-dessus pour activer la validation.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ===================== MAIN COMPONENT ===================== */

export default function DetailOperation({ operationId: directId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const resolvedId =
    directId ||
    params?.id ||
    location.state?.operationId ||
    localStorage.getItem("lastOperationId")

  const [operation, setOperation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [flow, setFlow] = useState({ step: null, action: null })
  const [pinCheckError, setPinCheckError] = useState(null)

  const [showManualSelection, setShowManualSelection] = useState(false)
  const [showSimpleConfirm, setShowSimpleConfirm] = useState(false)
  const [showCommissionValidation, setShowCommissionValidation] = useState(false)
  const [showOptionalAttachmentConfirm, setShowOptionalAttachmentConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    if (resolvedId) {
      fetchOperation()
    } else {
      setLoading(false)
    }
  }, [resolvedId])

  /* ================= FETCH ================= */

  const fetchOperation = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/operations/${resolvedId}`, {
        headers: authHeaders(),
      })
      setOperation(response.data?.data)
    } catch (error) {
      console.error("Erreur detail operation :", error)
    } finally {
      setLoading(false)
    }
  }

  /* ================= ACTIONS API ================= */

  const callAction = async (endpoint, errorMsg, body, successMsg, useMultipart = false, bodyless = false) => {
    try {
      setActionLoading(true)

      let payload
      let headers

      if (bodyless) {
        payload = undefined
        headers = authHeaders()
      } else if (useMultipart) {
        const formData = new FormData()
        if (body && typeof body === "object") {
          Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, value)
            }
          })
        }
        payload = formData
        headers = {
          ...authHeaders(),
        }
      } else {
        payload = body || ""
        headers = { ...authHeaders(), "Content-Type": "application/json" }
      }

      await axios.post(
        `${API_BASE}/operations/${resolvedId}/${endpoint}`,
        payload,
        { headers }
      )
      await fetchOperation()
      showSuccess(successMsg || "Opération réalisée avec succès.")
    } catch (error) {
      console.error(`Erreur ${endpoint} :`, error)
      showError(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const executeValidate = () =>
    callAction(
      "validate",
      "Erreur lors de la validation de l'opération.",
      null,
      "Opération validée avec succès.",
      true
    )

  const executeCancel = () =>
    callAction(
      "cancel",
      "Erreur lors de l'annulation de l'opération.",
      null,
      "Opération annulée avec succès.",
      false,
      true
    )

  const executeReject = async (reason) => {
    await callAction(
      "reject",
      "Erreur lors du rejet de l'opération.",
      { rejectionReason: reason },
      "Opération rejetée avec succès."
    )
    setFlow({ step: null, action: null })
  }

  /* ================= DÉCLENCHEMENT DU FLUX (PIN → action) ================= */

  const startActionFlow = async (action) => {
    setPinCheckError(null)
    setFlow({ step: "checking-pin", action })

    try {
      const response = await axios.get(`${API_BASE}/pin/status`, {
        headers: authHeaders(),
      })
      const data = response.data?.data

      if (data?.isLocked) {
        setPinCheckError(
          "Votre code PIN est temporairement verrouillé suite à plusieurs tentatives échouées. Réessayez plus tard."
        )
        setFlow({ step: null, action: null })
        return
      }

      if (!data?.hasPin) {
        setFlow({ step: "create-pin", action })
      } else {
        setFlow({ step: "verify-pin", action })
      }
    } catch (error) {
      console.error("Erreur vérification statut PIN :", error)
      setPinCheckError("Impossible de vérifier votre code PIN pour le moment. Veuillez réessayer.")
      setFlow({ step: null, action: null })
    }
  }

  const closeFlow = () => setFlow({ step: null, action: null })

  const handlePinCreated = () => {
    proceedAfterPin(flow.action)
  }

  const handlePinVerified = () => {
    proceedAfterPin(flow.action)
  }

  const proceedAfterPin = (action) => {
    if (action === "reject") {
      setFlow({ step: "reject-reason", action })
      return
    }

    if (action === "validate") {
      closeFlow()

      if (operation?.operationType === "SUBPRODUCT_RESTOCKING") {
        setShowManualSelection(true)
        return
      }

      if (operation?.operationType === "PREPAID_CARD_ACTIVATION") {
        if (operationHasCommission(operation)) {
          setShowCommissionValidation(true)
        } else {
          setShowSimpleConfirm(true)
        }
        return
      }

      if (
        operation?.operationType === "PREPAID_CARD_RECHARGE" ||
        operation?.operationType === "CANAL_SUBSCRIPTION_NEW" ||
        operation?.operationType === "CANAL_SUBSCRIPTION_RENEWAL"
      ) {
        setShowCommissionValidation(true)
        return
      }

      if (usesOptionalAttachmentValidationFlow(operation)) {
        setShowOptionalAttachmentConfirm(true)
        return
      }

      executeValidate()
      return
    }

    if (action === "cancel") {
      closeFlow()
      setShowCancelConfirm(true)
    }
  }

  const handleManualSelectionValidated = async () => {
    setShowManualSelection(false)
    await fetchOperation()
    showSuccess("Réapprovisionnement validé avec succès.")
  }

  const handleSimpleConfirmValidate = async () => {
    await executeValidate()
    setShowSimpleConfirm(false)
  }

  const handleCancelConfirm = async () => {
    await executeCancel()
    setShowCancelConfirm(false)
  }

  const handleCommissionValidationValidated = async () => {
    setShowCommissionValidation(false)
    await fetchOperation()
    const successMessage =
      operation?.operationType === "PREPAID_CARD_RECHARGE"
        ? "Recharge Carte validée avec succès."
        : operation?.operationType === "CANAL_SUBSCRIPTION_NEW"
        ? "Nouvel Abonnement Canal+ validé avec succès."
        : operation?.operationType === "CANAL_SUBSCRIPTION_RENEWAL"
        ? "Renouvellement Canal+ validé avec succès."
        : "Activation Carte (avec commission) validée avec succès."
    showSuccess(successMessage)
  }

  const handleOptionalAttachmentValidated = async () => {
    setShowOptionalAttachmentConfirm(false)
    await fetchOperation()
    const successMessage =
      operation?.operationType === "CANAL_SUBSCRIPTION_FORMULA_CHANGE"
        ? "Changement de formule Canal+ validé avec succès."
        : operation?.operationType === "CANAL_SUBSCRIPTION_REACTIVATION"
        ? "Réactivation Canal+ validée avec succès."
        : operation?.operationType === "WALLET_DEPOSIT"
        ? "Dépôt Wallet validé avec succès."
        : operation?.operationType === "COMMISSION_WITHDRAWAL"
        ? "Retrait Commission validé avec succès."
        : "Opération validée avec succès."
    showSuccess(successMessage)
  }

  /* ================= LOADING / GUARD ================= */

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-screen bg-[#F5F7FA]">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin w-5 h-5 text-[#1EA4DC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Chargement de l'opération…</span>
        </div>
      </div>
    )
  }

  if (!resolvedId || !operation) {
    return (
      <div className="p-4 sm:p-8 bg-[#F5F7FA] min-h-screen space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          Aucune donnée ou identifiant d'opération trouvé.
        </div>
      </div>
    )
  }

  /* ================= STATUS ================= */

  const isPending   = operation.status === "PENDING"
  const isValidated = operation.status === "COMPLETED" || operation.status === "VALIDATED"
  const isRejected  = operation.status === "REJECTED"
  const isCancelled = operation.status === "CANCELLED"

  const statusLabel = isPending
    ? "En attente"
    : isValidated
    ? "Validée"
    : isRejected
    ? "Rejetée"
    : isCancelled
    ? "Annulée"
    : operation.status

  const statusColor = isPending
    ? "bg-orange-100 text-orange-600"
    : isValidated
    ? "bg-green-100 text-green-600"
    : "bg-red-100 text-red-600"

  /* ================= PARTENAIRE DYNAMIQUE (Commerçant / Distributeur) ================= */

  const isMerchantOperator = operation.operatorType === "MERCHANT"
  const isDistributorOperator = operation.operatorType === "DISTRIBUTOR"

  const partner = isMerchantOperator
    ? operation.merchant
    : isDistributorOperator
    ? operation.distributor
    : operation.merchant || operation.distributor || null

  const partnerTitle = isMerchantOperator
    ? "Commerçant"
    : isDistributorOperator
    ? "Distributeur"
    : "Partenaire"

  const PartnerIcon = isMerchantOperator ? Store : ShieldCheck

  const partnerName = partner?.user
    ? `${partner.user.firstName || ""} ${partner.user.lastName || ""}`.trim() || "—"
    : partner?.businessName || "—"

  const partnerEmail = partner?.user?.email || "—"
  const partnerPhone = partner?.user?.phone || "—"
  const partnerCity = partner?.city || partner?.user?.city || "—"
  const partnerAddress = partner?.shopAddress || partner?.address || "—"
  const partnerPhoto = partner?.user?.photo || null
  const partnerIsActive = partner?.isActive

  /* ================= BADGES (numéro carte / numéro décodeur Canal) ================= */

  const cardNumber = getCardNumber(operation)
  const decoderNumber = isCanalOperation(operation) ? getDecoderNumber(operation) : null

  /* ================= PIÈCES JOINTES ================= */

  const attachments = buildAttachments(operation)
  const paymentProof = getPaymentProof(operation)

  /* ================= VARIABLES INFORMATIONS DÉTAILLÉES (opérations non-Canal+) ================= */

  const bank = operation.metadata?.bank || operation.subProduct?.bank || null

  const formulaName = operation.metadata?.prepaidCardFormulaName
    || operation.subProduct?.prepaidCardFormulaId
    || "—"

  const formulaMaxBalance = operation.metadata?.prepaidCardFormulaMaxBalance
    ?? null

  const category = operation.subProduct?.service?.category
    ? operation.subProduct.service.category === "PREPAID_CARD"
      ? "Carte Prépayée"
      : operation.subProduct.service.category
    : operation.operationType === "PREPAID_CARD_RECHARGE"
    ? "Carte Prépayée"
    : "—"

  const quantiteDemandee = operation.operationType === "PREPAID_CARD_RECHARGE"
    ? "1 Carte Prépayée(s)"
    : operation.metadata?.requestedQuantity
    ? `${operation.metadata.requestedQuantity} unité(s)`
    : operation.metadata?.quantity
    ? `${operation.metadata.quantity} unité(s)`
    : "—"

  const totalEstime = operation.amount
    ? `${Number(operation.amount).toLocaleString("fr-FR")} FCFA`
    : "—"

  const stockDisponible = operation.metadata?.availableStock != null
    ? `${operation.metadata.availableStock} unité(s)`
    : operation.metadata?.stockAvailable != null
    ? `${operation.metadata.stockAvailable} unité(s)`
    : operation.subProduct?.stock != null
    ? `${operation.subProduct.stock} unité(s)`
    : "—"

  const totalCarte = operation.metadata?.decoderEstimatedTotal
    ? `${Number(operation.metadata.decoderEstimatedTotal).toLocaleString("fr-FR")} FCFA`
    : operation.effectiveAmount
    ? `${Number(operation.effectiveAmount).toLocaleString("fr-FR")} FCFA`
    : "—"

  const formatBirthDate = (dateString) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  /* ================= VARIABLES COMMISSIONS ================= */

  const commissionDetails = operation.metadata?.commissionDetails || null
  const hasCommission = operationHasCommission(operation)

  const appliedCommissionType = commissionDetails?.commissionType || operation.appliedCommissionType

  const commissionTypeLabel = appliedCommissionType === "FIXED"
    ? "Montant fixe"
    : appliedCommissionType === "PERCENTAGE"
    ? "Montant en pourcentage"
    : appliedCommissionType || "—"

  const distributorCommission = Number(
    commissionDetails?.partnerCommission ??
    commissionDetails?.partnerRate ??
    (operation.operatorType === "DISTRIBUTOR"
      ? operation.distributorCommissionAmount
      : operation.merchantCommissionAmount)
  ) || 0

  const companyCommission = Number(
    commissionDetails?.companyCommission ??
    commissionDetails?.companyRate ??
    operation.companyCommissionAmount
  ) || 0

  const totalCommission = Number(
    commissionDetails?.totalCommission ?? commissionDetails?.totalRate
  ) || (distributorCommission + companyCommission)

  const distributorCommissionFormatted = distributorCommission > 0
    ? `${distributorCommission.toLocaleString("fr-FR")} FCFA`
    : "—"

  const distributorCommissionFormattedLarge = distributorCommission > 0
    ? `${Number(distributorCommission).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  const companyCommissionFormatted = companyCommission > 0
    ? `${companyCommission.toLocaleString("fr-FR")} FCFA`
    : "—"

  const companyCommissionFormattedLarge = companyCommission > 0
    ? `${Number(companyCommission).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  const totalCommissionFormatted = totalCommission > 0
    ? `${Number(totalCommission).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  /* ================= RENDER ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F5F7FA] min-h-screen">

      {/* BOUTON RETOUR */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">Détail sur l'opération</h1>
          <p className="text-gray-500 text-sm">Information sur l'opération</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">

          {/* PENDING → Valider + Rejeter */}
          {isPending && (
            <>
              <button
                onClick={() => startActionFlow("validate")}
                disabled={actionLoading || flow.step === "checking-pin"}
                className="bg-[#1EA4DC] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
              >
                <CheckCircle size={18} />
                {actionLoading && flow.action === "validate" ? "En cours…" : "Valider l'Opération"}
              </button>

              <button
                onClick={() => startActionFlow("reject")}
                disabled={actionLoading || flow.step === "checking-pin"}
                className="bg-red-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
              >
                <XCircle size={18} />
                {actionLoading && flow.action === "reject" ? "En cours…" : "Rejeter l'Opération"}
              </button>
            </>
          )}

          {/* VALIDATED → Annuler */}
          {isValidated && (
            <button
              onClick={() => startActionFlow("cancel")}
              disabled={actionLoading || flow.step === "checking-pin"}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
            >
              <XCircle size={18} />
              {actionLoading && flow.action === "cancel" ? "En cours…" : "Annuler l'Opération"}
            </button>
          )}

        </div>
      </div>

      {/* NOTIFICATION (succès / erreur des actions) */}
      {notif && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto z-[70] sm:w-full sm:max-w-sm">
          <NotificationBanner notif={notif} onDismiss={dismiss} />
        </div>
      )}

      {/* MESSAGE ERREUR VÉRIFICATION PIN (verrouillage, statut injoignable…) */}
      {pinCheckError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {pinCheckError}
        </div>
      )}

      {/* CONTAINER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6 sm:space-y-8">

          {/* LIGNE 1 : Opération + Client + Pièces jointes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

            {/* OPÉRATION + COMMISSIONS (dans le même cadre) */}
            <InfoCard title="Détail sur l'opération" icon={<CreditCard size={18} />}>
              <InfoRow label="Type opération" value={mapOperationName(operation.operationType)} />
              <InfoRow label="Montant" value={`${Number(operation.amount).toLocaleString("fr-FR")} FCFA`} />
              <InfoRow label="Montant effectif" value={`${Number(operation.effectiveAmount).toLocaleString("fr-FR")} FCFA`} />
              <InfoRow label="Description" value={operation.description} />
              <InfoRow label="Date demande" value={new Date(operation.createdAt).toLocaleString("fr-FR")} />
              <InfoRow label="Statut" value={statusLabel} statusColor={statusColor} isStatus />

              {(cardNumber || decoderNumber) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {cardNumber && (
                    <span className="inline-flex items-center gap-1.5 bg-[#1EA4DC]/10 text-[#1EA4DC] px-3 py-1.5 rounded-full text-xs font-semibold">
                      <CreditCard size={13} />
                      N° Carte : {cardNumber}
                    </span>
                  )}
                  {decoderNumber && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <ShieldCheck size={13} />
                      N° Décodeur : {decoderNumber}
                    </span>
                  )}
                </div>
              )}

              {hasCommission && (
                <>
                  <div className="my-6 border-t pt-6">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Percent size={16} className="text-[#1EA4DC] shrink-0" />
                        <h3 className="text-gray-800 font-semibold">Détails des commissions</h3>
                      </div>
                      <span className="bg-[#1EA4DC]/10 text-[#1EA4DC] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        {commissionTypeLabel}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 text-gray-400 text-xs font-semibold pb-3 border-b border-gray-100">
                        <div></div>
                        <div className="text-center">Montant</div>
                        <div className="text-right">Montant</div>
                      </div>

                      <div className="space-y-0">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center py-3 border-b border-gray-50">
                          <div className="text-gray-800 font-medium">Vous</div>
                          <div className="text-center text-gray-800 text-xs sm:text-sm">{distributorCommissionFormatted}</div>
                          <div className="text-right text-gray-800 font-semibold text-xs sm:text-sm">{distributorCommissionFormattedLarge}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center py-3 border-b border-gray-50">
                          <div className="text-gray-800 font-medium">Pollux</div>
                          <div className="text-center text-gray-800 text-xs sm:text-sm">{companyCommissionFormatted}</div>
                          <div className="text-right text-gray-800 font-semibold text-xs sm:text-sm">{companyCommissionFormattedLarge}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center py-3">
                          <div className="text-[#1EA4DC] font-bold">Total</div>
                          <div className="text-center text-gray-400">—</div>
                          <div className="text-right text-[#1EA4DC] font-bold text-xs sm:text-sm">{totalCommissionFormatted}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </InfoCard>

            {/* CLIENT + PIÈCES JOINTES */}
            <div className="space-y-6 sm:space-y-8">
              {/* CLIENT */}
              <InfoCard title="Client" icon={<User size={18} />}>
                <InfoRow
                  label="Nom"
                  value={
                    operation.client
                      ? `${operation.client.firstName || ""} ${operation.client.lastName || ""}`.trim() || "—"
                      : "—"
                  }
                />
                <InfoRow label="Email" value={operation.client?.email || "—"} />
                <InfoRow label="Téléphone" value={operation.client?.phone || "—"} />
                <InfoRow label="Date de naissance" value={formatBirthDate(operation.client?.birthDate)} />
                <InfoRow label="Pays" value={operation.client?.country || "—"} />
                <InfoRow label="Ville" value={operation.client?.city || "—"} />
                <InfoRow label="Adresse" value={operation.client?.address || "—"} />
                <InfoRow label="Nom du fichier" value={operation.client?.attachementName || "—"} />
                {!operation.client && (
                  <p className="text-gray-400 text-xs italic pt-1">
                    Aucune information client associée à cette opération.
                  </p>
                )}
              </InfoCard>

              {/* PIÈCES JOINTES (multi-fichiers, dynamique) */}
              <InfoCard title="Pièces jointes" icon={<Paperclip size={18} />}>
                {attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {attachments.map((file, index) => (
                      <div key={index} className="pb-3">
                        <p className="text-gray-500 text-sm mb-2">{file.label}</p>
                        {isImageUrl(file.url) ? (
                          <a href={file.url} target="_blank" rel="noreferrer">
                            <img
                              src={file.url}
                              alt={file.label}
                              className="w-full rounded-lg border border-gray-200 shadow-sm object-cover max-h-40"
                            />
                          </a>
                        ) : (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-[#1EA4DC] font-medium text-sm"
                          >
                            <FileText size={16} />
                            Voir le document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic">Aucune pièce jointe disponible pour cette opération.</p>
                )}
              </InfoCard>
            </div>

          </div>

          {/* LIGNE 2 : Partenaire (dynamique) + Informations détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

            {/* PARTENAIRE : cadre dynamique Commerçant / Distributeur */}
            <InfoCard title={partnerTitle} icon={<PartnerIcon size={18} />}>
              {partner ? (
                <>
                  {partnerPhoto && (
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      <img
                        src={partnerPhoto}
                        alt={partnerName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                      <p className="text-gray-800 font-semibold text-sm">{partnerName}</p>
                    </div>
                  )}
                  {!partnerPhoto && (
                    <InfoRow label="Nom" value={partnerName} />
                  )}
                  <InfoRow label="Email" value={partnerEmail} />
                  <InfoRow label="Téléphone" value={partnerPhone} />
                  <InfoRow label="Ville" value={partnerCity} />
                  {isMerchantOperator && <InfoRow label="Adresse boutique" value={partnerAddress} />}
                  <InfoRow
                    label="Statut"
                    value={partnerIsActive ? "Actif" : "Inactif"}
                    isStatus
                    statusColor={partnerIsActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                  />
                </>
              ) : (
                <p className="text-gray-400 text-xs italic">Aucun partenaire associé à cette opération.</p>
              )}
            </InfoCard>

            {/* INFORMATIONS DÉTAILLÉES */}
            <InfoCard title="Informations détaillées" icon={<Info size={18} />}>
              {isCanalOperation(operation) ? (
                <CanalOperationDetails operation={operation} />
              ) : (
                <>
                  {bank && (
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      {bank.logo && (
                        <img
                          src={bank.logo}
                          alt={bank.name}
                          className="w-12 h-12 object-contain rounded-lg border border-gray-200 p-1 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-gray-800 font-semibold text-sm truncate">{bank.name || "—"}</p>
                        <p className="text-gray-400 text-xs">Code: {bank.code || "—"}</p>
                      </div>
                    </div>
                  )}
                  {cardNumber && (
                    <InfoRow label="N° Carte" value={cardNumber} />
                  )}
                  <InfoRow label="Formule" value={formulaName} />
                  <InfoRow
                    label="Formule Plafond"
                    value={formulaMaxBalance != null ? Number(formulaMaxBalance).toLocaleString("fr-FR") : "—"}
                  />
                  <InfoRow label="Catégorie" value={category} />
                  <InfoRow label="Quantité demandée" value={quantiteDemandee} />
                  <InfoRow label="Total estimé" value={totalEstime} />
                  <InfoRow label="Stock disponible" value={stockDisponible} />
                  <InfoRow label="Total carte" value={totalCarte} />
                </>
              )}
            </InfoCard>

          </div>

          {/* LIGNE 3 : Preuve de paiement (pleine largeur) */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8">
            <InfoCard title="Preuve de paiement" icon={<FileText size={18} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Méthode" value={paymentProof?.paymentMethod || "—"} />
                <InfoRow label="Référence" value={paymentProof?.receiptNumber || "—"} />
                <InfoRow label="Notes" value={paymentProof?.notes || "—"} />
              </div>
              {paymentProof?.proofUrl && (
                <div className="mt-2">
                  <a
                    href={paymentProof.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1EA4DC] font-medium"
                  >
                    Voir la preuve
                  </a>
                </div>
              )}
              {!paymentProof && (
                <p className="text-gray-400 text-xs italic mt-2">
                  Aucune preuve de paiement disponible pour cette opération.
                </p>
              )}
            </InfoCard>
          </div>

        </div>
      </div>

      {/* ================= POPUPS DU FLUX PIN / MOTIF ================= */}

      {flow.step === "verify-pin" && (
        <PinVerifyModal
          actionType={flow.action}
          onClose={closeFlow}
          onVerified={handlePinVerified}
        />
      )}

      {flow.step === "create-pin" && (
        <PinCreateModal
          onClose={closeFlow}
          onCreated={handlePinCreated}
        />
      )}

      {flow.step === "reject-reason" && (
        <RejectReasonModal
          onClose={closeFlow}
          loading={actionLoading}
          onConfirm={executeReject}
        />
      )}

      {showManualSelection && (
        <ManualSelectionModal
          operation={operation}
          resolvedId={resolvedId}
          onClose={() => setShowManualSelection(false)}
          onValidated={handleManualSelectionValidated}
        />
      )}

      {/* Activation Carte SANS commission → confirmation simple */}
      {showSimpleConfirm && (
        <SimpleConfirmModal
          operation={operation}
          loading={actionLoading}
          onClose={() => setShowSimpleConfirm(false)}
          onConfirm={handleSimpleConfirmValidate}
        />
      )}

      {/* Annulation → popup de confirmation dédiée */}
      {showCancelConfirm && (
        <CancelConfirmModal
          operation={operation}
          loading={actionLoading}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {/* Activation Carte AVEC commission, Recharge Carte, et opérations
          Canal+ (Nouvel Abonnement / Renouvellement) → commission +
          justificatif obligatoire */}
      {showCommissionValidation && (
        <CommissionValidationModal
          operation={operation}
          resolvedId={resolvedId}
          onClose={() => setShowCommissionValidation(false)}
          onValidated={handleCommissionValidationValidated}
        />
      )}

      {/* Changement de formule Canal+, Réactivation Canal+, Dépôt Wallet,
          Retrait Commission → même endpoint que la Recharge Carte, mais
          justificatif optionnel et sans bloc commission */}
      {showOptionalAttachmentConfirm && (
        <OptionalAttachmentConfirmModal
          operation={operation}
          resolvedId={resolvedId}
          onClose={() => setShowOptionalAttachmentConfirm(false)}
          onValidated={handleOptionalAttachmentValidated}
        />
      )}

    </div>
  )
}

/* ================= COMPOSANTS ================= */

function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3.5 flex items-center gap-2">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, isStatus, statusColor }) {
  return (
    <div className="flex justify-between gap-3 text-sm border-b border-gray-50 py-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      {isStatus ? (
        <span className={`${statusColor} px-3 py-1 rounded-full text-xs font-semibold shrink-0`}>
          {value}
        </span>
      ) : (
        <span className="text-gray-800 font-semibold text-right break-words">
          {value || "—"}
        </span>
      )}
    </div>
  )
}

/* ================= CADRE "INFORMATIONS DÉTAILLÉES" — CANAL+ ================= */

function CanalFormulaCard({ label, tone = "new", name, price, durationInDays, options }) {
  const toneClasses = tone === "old" ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
  const labelClass = tone === "old" ? "text-red-600" : "text-green-600"

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className={`font-bold text-sm mb-2 ${labelClass}`}>{label}</p>
      <p className="text-gray-800 font-bold text-lg break-words">{name || "—"}</p>
      {price != null && (
        <p className="text-gray-500 text-sm mt-1">
          {Number(price).toLocaleString("fr-FR")} FCFA
        </p>
      )}
      {durationInDays != null && (
        <p className="text-gray-500 text-sm">Durée : {durationInDays} jours</p>
      )}
      {options && options.length > 0 && (
        <div className="mt-2">
          <p className="text-gray-600 font-semibold text-xs mb-1">Options :</p>
          <ul className="space-y-0.5">
            {options.map((opt, i) => (
              <li key={i} className="text-gray-500 text-sm">
                • {opt.name}
                {opt.price != null ? ` (${opt.price.toLocaleString("fr-FR")} FCFA)` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CanalDateRangeCard({ title, fromLabel, fromDate, toLabel, toDate }) {
  return (
    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
      <p className="text-blue-600 font-bold text-sm mb-2">{title}</p>
      <div className="flex justify-between gap-3 text-sm py-0.5">
        <span className="text-gray-500">{fromLabel}</span>
        <span className="text-gray-700 text-right">{fromDate}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm py-0.5">
        <span className="text-gray-500">{toLabel}</span>
        <span className="text-gray-800 font-semibold text-right">{toDate}</span>
      </div>
    </div>
  )
}

function CanalReactivationFormulaCard({ name, price, durationInDays, options }) {
  return (
    <div className="rounded-2xl border p-4 bg-[#1EA4DC]/5 border-[#1EA4DC]/20">
      <p className="font-bold text-sm mb-2 text-[#1EA4DC]">Formule de réactivation</p>
      <p className="text-gray-800 font-bold text-lg break-words">{name || "—"}</p>
      {price != null && (
        <p className="text-gray-500 text-sm mt-1">
          {Number(price).toLocaleString("fr-FR")} FCFA
        </p>
      )}
      {durationInDays != null && (
        <p className="text-gray-500 text-sm">Durée : {durationInDays} jours</p>
      )}
      {options && options.length > 0 && (
        <div className="mt-2">
          <p className="text-gray-600 font-semibold text-xs mb-1">Options :</p>
          <ul className="space-y-0.5">
            {options.map((opt, i) => (
              <li key={i} className="text-gray-500 text-sm">
                • {opt.name}
                {opt.price != null ? ` (${opt.price.toLocaleString("fr-FR")} FCFA)` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CanalReactivationPeriodCard({ originalPeriod, newPeriod }) {
  const formatRange = (start, end) => {
    if (!start && !end) return "—"
    return `${formatShortDate(start)} - ${formatShortDate(end)}`
  }

  return (
    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
      <p className="text-blue-600 font-bold text-sm mb-2">Période d'abonnement</p>
      <div className="flex justify-between gap-3 text-sm py-0.5">
        <span className="text-gray-500">Période originale</span>
        <span className="text-gray-700 text-right">{formatRange(originalPeriod.startDate, originalPeriod.endDate)}</span>
      </div>
      <div className="flex justify-between gap-3 text-sm py-0.5">
        <span className="text-gray-500">Nouvelle période</span>
        <span className="text-gray-800 font-semibold text-right">{formatRange(newPeriod.startDate, newPeriod.endDate)}</span>
      </div>
    </div>
  )
}

function CanalReactivationReasonCard({ reason }) {
  if (!reason) return null
  return (
    <div className="rounded-2xl border border-[#1EA4DC]/40 bg-white p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Info size={15} className="text-[#1EA4DC] shrink-0" />
        <span className="text-gray-700 font-semibold text-sm">Raison de la réactivation</span>
      </div>
      <p className="text-gray-500 text-sm break-words">{reason}</p>
    </div>
  )
}

function CanalOperationDetails({ operation }) {
  const decoderNumber = getDecoderNumber(operation)
  const decoderName = getDecoderName(operation)
  const subscriptionNumber = getCanalSubscriptionNumber(operation)

  return (
    <>
      <InfoRow label="Numéro décodeur" value={decoderNumber} />
      <InfoRow label="Nom décodeur" value={decoderName} />
      <InfoRow label="Numéro abonnement" value={subscriptionNumber} />

      {operation.operationType === "CANAL_SUBSCRIPTION_NEW" && (
        <CanalNewSubscriptionDetails operation={operation} />
      )}
      {operation.operationType === "CANAL_SUBSCRIPTION_RENEWAL" && (
        <CanalRenewalDetails operation={operation} />
      )}
      {operation.operationType === "CANAL_SUBSCRIPTION_FORMULA_CHANGE" && (
        <CanalFormulaChangeDetails operation={operation} />
      )}
      {operation.operationType === "CANAL_SUBSCRIPTION_REACTIVATION" && (
        <CanalReactivationDetails operation={operation} />
      )}
    </>
  )
}

function CanalNewSubscriptionDetails({ operation }) {
  const meta = operation?.metadata || {}
  const options = formatOptionsList(meta.selectedOptions)

  const parabolaAssignment =
    operation?.subProduct?.decoderParabolas?.find((p) => p.isActive) ||
    operation?.subProduct?.decoderParabolas?.[0] ||
    null
  const parabola = parabolaAssignment?.parabola || null

  return (
    <div className="space-y-4 pt-2">
      <CanalFormulaCard
        label="Nouvelle Formule"
        tone="new"
        name={meta.formulaName}
        price={meta.formulaPrice}
        durationInDays={meta.formulaDurationInDays}
        options={options}
      />
      {parabola && (
        <>
          <InfoRow label="Parabole" value={parabola.name} />
          <InfoRow
            label="Prix parabole"
            value={
              parabola.price != null
                ? `${Number(parabola.price).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
                : "—"
            }
          />
        </>
      )}
    </div>
  )
}

function CanalRenewalDetails({ operation }) {
  const meta = operation?.metadata || {}
  const options = formatOptionsList(meta.selectedOptions)

  return (
    <div className="space-y-4 pt-2">
      <CanalFormulaCard
        label="Nouvelle Formule"
        tone="new"
        name={meta.formulaName}
        price={meta.formulaPrice}
        durationInDays={meta.formulaDurationInDays}
        options={options}
      />
      <CanalDateRangeCard
        title="Renouvellement"
        fromLabel="Ancienne date"
        fromDate={formatShortDate(meta.oldEndDate)}
        toLabel="Nouvelle date"
        toDate={formatShortDate(meta.newEndDate)}
      />
    </div>
  )
}

function CanalFormulaChangeDetails({ operation }) {
  const details = getCanalFormulaChangeDetails(operation)

  const sameFormula =
    !!details.oldFormula.name &&
    !!details.newFormula.name &&
    details.oldFormula.name === details.newFormula.name
  const badgeLabel = sameFormula ? "Changement d'options" : "Changement de formule"

  const formatDiff = (value) => {
    if (value == null) return "—"
    const num = Number(value)
    const sign = num > 0 ? "+ " : num < 0 ? "- " : ""
    return `${sign}${Math.abs(num).toLocaleString("fr-FR")} FCFA`
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <Repeat size={16} className="text-[#1EA4DC] shrink-0" />
        <span className="text-[#1EA4DC] font-semibold text-sm">{badgeLabel}</span>
      </div>

      <CanalFormulaCard
        label="Ancienne Formule"
        tone="old"
        name={details.oldFormula.name}
        price={details.oldFormula.price}
        durationInDays={details.oldFormula.durationInDays}
      />

      <div className="flex justify-center">
        <ChevronDown className="text-[#1EA4DC]" size={22} />
      </div>

      <CanalFormulaCard
        label="Nouvelle Formule"
        tone="new"
        name={details.newFormula.name}
        price={details.newFormula.price}
        durationInDays={details.newFormula.durationInDays}
        options={details.newFormula.options}
      />

      <div className="rounded-2xl bg-[#1EA4DC]/5 border border-[#1EA4DC]/20 p-4 space-y-2">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-gray-500">Différence formule</span>
          <span className="text-green-600 font-semibold text-right">{formatDiff(details.formulaDifference)}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-gray-500">Différence options</span>
          <span className="text-green-600 font-semibold text-right">{formatDiff(details.optionsDifference)}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm pt-2 border-t border-[#1EA4DC]/10">
          <span className="text-gray-800 font-semibold">Montant à payer</span>
          <span className="text-green-600 font-bold text-right">{formatDiff(details.amountToPay)}</span>
        </div>
      </div>

      <CanalDateRangeCard
        title="Période d'abonnement"
        fromLabel="Fin actuelle"
        fromDate={formatShortDate(details.currentEndDate)}
        toLabel="Nouvelle fin"
        toDate={formatShortDate(details.newEndDate)}
      />
    </div>
  )
}

function CanalReactivationDetails({ operation }) {
  const details = getCanalReactivationDetails(operation)

  const hasFormula = !!details.formula.name
  const hasPeriod = !!(
    details.originalPeriod.startDate ||
    details.originalPeriod.endDate ||
    details.newPeriod.startDate ||
    details.newPeriod.endDate
  )
  const hasReason = !!details.reason

  if (!hasFormula && !hasPeriod && !hasReason) return null

  return (
    <div className="space-y-4 pt-2">
      {hasFormula && (
        <CanalReactivationFormulaCard
          name={details.formula.name}
          price={details.formula.price}
          durationInDays={details.formula.durationInDays}
          options={details.formula.options}
        />
      )}
      {hasPeriod && (
        <CanalReactivationPeriodCard
          originalPeriod={details.originalPeriod}
          newPeriod={details.newPeriod}
        />
      )}
      {hasReason && <CanalReactivationReasonCard reason={details.reason} />}
    </div>
  )
}