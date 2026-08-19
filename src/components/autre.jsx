import {
  Plus,
  Search,
  X,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Upload,
  Package,
  Unlock,
  Radio,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Tv,
  Landmark,
  ArrowLeft,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"

const DIST_API            = "https://youapi.youneed.app/pollux/dev/api/distributors/by-company"
const MERCHANT_API        = "https://youapi.youneed.app/pollux/dev/api/merchants/companies"
const DIST_CREATE_API     = "https://youapi.youneed.app/pollux/dev/api/distributors"
const MERCHANT_CREATE_API = "https://youapi.youneed.app/pollux/dev/api/merchants"

/**
 * Endpoints de bascule (activation / désactivation) dynamique du statut.
 * Le PATCH est appelé avec { isActive: true|false } dans le body.
 */
const DIST_TOGGLE_STATUS_API     = (id) => `https://youapi.youneed.app/pollux/dev/api/distributors/${id}/toggle-status`
const MERCHANT_TOGGLE_STATUS_API = (id) => `https://youapi.youneed.app/pollux/dev/api/merchants/${id}/toggle-status`

/**
 * Endpoints de modification (édition) d'un partenaire existant.
 * Le PUT réutilise le même formulaire que la création, avec les
 * champs pré-remplis. Les documents / photo sont optionnels : ils
 * ne sont envoyés que si l'utilisateur en sélectionne de nouveaux.
 */
const DIST_UPDATE_API     = (id) => `https://youapi.youneed.app/pollux/dev/api/distributors/${id}`
const MERCHANT_UPDATE_API = (id) => `https://youapi.youneed.app/pollux/dev/api/merchants/${id}`

/**
 * Endpoint de réapprovisionnement d'un partenaire (distributeur ou commerçant).
 * Le POST reçoit le service concerné, la sélection (banque/formule ou
 * décodeurs) ainsi que la liste des produits avec leur quantité.
 */
const RESTOCK_API = (id) => `https://youapi.youneed.app/pollux/dev/api/partners/${id}/restock`

/* ══════════════════════════════════════════════
   HELPERS DE FORMATAGE
   ══════════════════════════════════════════════ */

/** "DUPONT SARL" → "DUPONT SARL" (déjà géré par toUpperCase dans le JSX) */
/** "cOTONOU" → "Cotonou" */
function capitalizeCity(str) {
  if (!str || str === "-") return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function formatFCFA(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`
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

  return {
    notif,
    showSuccess: (msg) => show("success", msg),
    showError:   (msg) => show("error",   msg),
    dismiss,
  }
}

function NotificationBanner({ notif, onDismiss }) {
  if (!notif) return null
  const isSuccess = notif.type === "success"
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition-all
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
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════
   HELPERS : normalisation des données API
   ══════════════════════════════════════════════ */

function normalizeDistributeur(d) {
  return {
    id:                 d.id,
    raisonSociale:      d.businessName                   || "-",
    nom:                `${d.user?.firstName || ""} ${d.user?.lastName || ""}`.trim() || "-",
    email:              d.user?.email                    || "-",
    phone:              d.user?.phone                    || "-",
    ville:              d.city           || d.user?.city  || "-",
    pays:               d.country        || d.user?.country || "-",
    adresse:            d.address                        || "-",
    registrationNumber: d.registrationNumber             || "-",
    operations:         d._count?.operations             ?? 0,
    isActive:           d.isActive,
    status:             d.isActive ? "Actif" : "Inactif",
    createdAt:          d.createdAt,
    _raw: d,
  }
}

function normalizeMerchant(m) {
  return {
    id:         m.id,
    nom:        `${m.user?.firstName || ""} ${m.user?.lastName || ""}`.trim() || "-",
    email:      m.user?.email          || "-",
    phone:      m.user?.phone          || "-",
    ville:      m.city || m.user?.city  || "-",
    pays:       m.user?.country         || "-",
    adresse:    m.shopAddress           || "-",
    commission: m.totalCommissionEarned || "0",
    operations: m._count?.operations    ?? 0,
    isActive:   m.isActive,
    status:     m.isActive ? "Actif" : "Inactif",
    createdAt:  m.createdAt,
    _raw: m,
  }
}

/* ══════════════════════════════════════════════
   PHONE INPUT
   ══════════════════════════════════════════════ */
function PhoneInput({ value, onChange, placeholder = "Numéro de téléphone" }) {
  const [countryCode, setCountryCode] = useState("+229")
  const countries = [
    { code: "+229", flag: "🇧🇯", label: "BJ" },
    { code: "+225", flag: "🇨🇮", label: "CI" },
    { code: "+221", flag: "🇸🇳", label: "SN" },
    { code: "+223", flag: "🇲🇱", label: "ML" },
    { code: "+226", flag: "🇧🇫", label: "BF" },
    { code: "+228", flag: "🇹🇬", label: "TG" },
    { code: "+237", flag: "🇨🇲", label: "CM" },
    { code: "+212", flag: "🇲🇦", label: "MA" },
    { code: "+33",  flag: "🇫🇷", label: "FR" },
  ]

  return (
    <div className="flex gap-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 focus-within:border-[#1EA4DC] transition-colors">
      <div className="flex items-center gap-1.5 px-3 py-3 border-r border-gray-200 shrink-0 bg-gray-100">
        <span className="text-base leading-none">
          {countries.find(c => c.code === countryCode)?.flag || "🇧🇯"}
        </span>
        <select
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
          className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer appearance-none pr-1"
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </select>
        <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <input
        type="tel"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 bg-gray-100 px-4 py-3 text-sm outline-none text-gray-700 placeholder-gray-400"
      />
    </div>
  )
}

/* ══════════════════════════════════════════════
   FILE UPLOAD FIELD
   ══════════════════════════════════════════════ */
function FileUploadField({ label, value, onChange, required = false }) {
  const inputRef = useRef(null)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 cursor-pointer hover:border-[#1EA4DC] transition-colors"
      >
        <Upload size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500 truncate flex-1">
          {value ? value.name : "Choisir un fichier…"}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="text-gray-400 hover:text-red-500"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════
   FORM FIELD HELPER
   ══════════════════════════════════════════════ */
function FormField({ label, children, required = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function FormInput({ placeholder, value, onChange, type = "text", required = false }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700"
    />
  )
}

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-1">
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

/* ══════════════════════════════════════════════
   ADD PARTNER MODAL
   ══════════════════════════════════════════════ */
function AddPartnerModal({ onClose, onCreated }) {
  const [partnerType, setPartnerType] = useState("distributeur")
  const [submitting,  setSubmitting]  = useState(false)
  const [localError,  setLocalError]  = useState(null)

  const [distForm, setDistForm] = useState({
    businessName:       "",
    registrationNumber: "",
    address:            "",
    city:               "",
    firstName:          "",
    lastName:           "",
    email:              "",
    phone:              "",
    country:            "",
    rccmDocument:       null,
    ifuDocument:        null,
    photo:              null,
  })

  const [mercForm, setMercForm] = useState({
    firstName:   "",
    lastName:    "",
    email:       "",
    phone:       "",
    city:        "",
    shopAddress: "",
    photo:       null,
  })

  const setDist = (key, val) => setDistForm(prev => ({ ...prev, [key]: val }))
  const setMerc = (key, val) => setMercForm(prev => ({ ...prev, [key]: val }))

  const validateDistributeur = () => {
    const { businessName, registrationNumber, address, city, firstName, lastName, email, phone, country, rccmDocument, ifuDocument } = distForm
    if (!businessName?.trim())       return "Le nom commercial est requis"
    if (!registrationNumber?.trim()) return "Le numéro d'enregistrement est requis"
    if (!address?.trim())            return "L'adresse est requise"
    if (!city?.trim())               return "La ville est requise"
    if (!firstName?.trim())          return "Le prénom est requis"
    if (!lastName?.trim())           return "Le nom est requis"
    if (!email?.trim())              return "L'email est requis"
    if (!phone?.trim())              return "Le téléphone est requis"
    if (!country?.trim())            return "Le pays est requis"
    if (!rccmDocument)               return "Le document RCCM est requis"
    if (!ifuDocument)                return "Le document IFU est requis"
    return null
  }

  const validateMerchant = () => {
    const { firstName, lastName, email, phone, city, shopAddress } = mercForm
    if (!firstName?.trim())   return "Le prénom est requis"
    if (!lastName?.trim())    return "Le nom est requis"
    if (!email?.trim())       return "L'email est requis"
    if (!phone?.trim())       return "Le téléphone est requis"
    if (!city?.trim())        return "La ville est requise"
    if (!shopAddress?.trim()) return "L'adresse du commerce est requise"
    return null
  }

  const handleSubmit = async () => {
    setLocalError(null)
    try {
      setSubmitting(true)

      const { token, companyId: storedId } = getAuthData()
      if (!token) throw new Error("Token manquant")

      let companyId = storedId
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")

      if (partnerType === "distributeur") {
        const error = validateDistributeur()
        if (error) { setLocalError(error); return }

        const formData = new FormData()
        const cleanCity = distForm.city.split(/[\/,]/)[0].trim()
        const cleanPhone = distForm.phone.includes("+") ? distForm.phone : `+229${distForm.phone}`

        formData.append("businessName",        distForm.businessName.trim())
        formData.append("registrationNumber",  distForm.registrationNumber.trim())
        formData.append("address",             distForm.address.trim())
        formData.append("city",                cleanCity)
        formData.append("firstName",           distForm.firstName.trim())
        formData.append("lastName",            distForm.lastName.trim())
        formData.append("email",               distForm.email.trim())
        formData.append("phone",               cleanPhone)
        formData.append("country",             distForm.country.trim())
        formData.append("companyId",           companyId)

        if (distForm.rccmDocument instanceof File) {
          formData.append("rccm", distForm.rccmDocument)
        } else {
          throw new Error("Document RCCM invalide")
        }

        if (distForm.ifuDocument instanceof File) {
          formData.append("ifu", distForm.ifuDocument)
        } else {
          throw new Error("Document IFU invalide")
        }

        if (distForm.photo instanceof File) {
          formData.append("photo", distForm.photo)
        }

        const response = await axios.post(DIST_CREATE_API, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })

        console.log("✓ Réponse API (201 Created):", response.data)
        onCreated("distributor", `Distributeur "${distForm.businessName}" créé avec succès`)
      } else {
        const error = validateMerchant()
        if (error) { setLocalError(error); return }

        const formData = new FormData()
        const cleanCity = mercForm.city.split(/[\/,]/)[0].trim()
        const cleanPhone = mercForm.phone.includes("+") ? mercForm.phone : `+229${mercForm.phone}`

        formData.append("firstName",   mercForm.firstName.trim())
        formData.append("lastName",    mercForm.lastName.trim())
        formData.append("email",       mercForm.email.trim())
        formData.append("phone",       cleanPhone)
        formData.append("city",        cleanCity)
        formData.append("shopAddress", mercForm.shopAddress.trim())
        formData.append("companyId",   companyId)

        if (mercForm.photo instanceof File) {
          formData.append("photo", mercForm.photo)
        }

        const response = await axios.post(MERCHANT_CREATE_API, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })

        console.log("✓ Réponse API (201 Created):", response.data)
        onCreated("merchant", `Commerçant "${mercForm.firstName} ${mercForm.lastName}" créé avec succès`)
      }

      onClose()
    } catch (err) {
      const message = err?.response?.data?.description || err.message || "Erreur lors de la création"
      console.error("❌ Erreur création partenaire:", {
        status: err?.response?.status,
        message: message,
        data: err?.response?.data,
      })
      setLocalError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-5">Ajouter un partenaire</h2>

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex gap-6 px-4 py-3 rounded-xl border border-gray-200 bg-white mb-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="partnerType"
              value="distributeur"
              checked={partnerType === "distributeur"}
              onChange={(e) => setPartnerType(e.target.value)}
              className="accent-[#1EA4DC] w-4 h-4"
              disabled={submitting}
            />
            <span className="text-sm font-medium text-gray-700">Distributeur</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="partnerType"
              value="commercant"
              checked={partnerType === "commercant"}
              onChange={(e) => setPartnerType(e.target.value)}
              className="accent-[#1EA4DC] w-4 h-4"
              disabled={submitting}
            />
            <span className="text-sm font-medium text-gray-700">Commerçant</span>
          </label>
        </div>

        {partnerType === "distributeur" && (
          <div className="space-y-4">
            <SectionTitle title="Informations du commerce" />
            <FormField label="Nom commercial" required>
              <FormInput
                placeholder="Nom commercial"
                value={distForm.businessName}
                onChange={e => setDist("businessName", e.target.value)}
                required
              />
            </FormField>
            <FormField label="N° d'enregistrement" required>
              <FormInput
                placeholder="Numéro d'enregistrement (RCCM)"
                value={distForm.registrationNumber}
                onChange={e => setDist("registrationNumber", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Adresse" required>
              <FormInput
                placeholder="Adresse du commerce"
                value={distForm.address}
                onChange={e => setDist("address", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Ville" required>
              <FormInput
                placeholder="Ville"
                value={distForm.city}
                onChange={e => setDist("city", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Informations personnelles" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required>
                <FormInput
                  placeholder="Prénom"
                  value={distForm.firstName}
                  onChange={e => setDist("firstName", e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nom" required>
                <FormInput
                  placeholder="Nom"
                  value={distForm.lastName}
                  onChange={e => setDist("lastName", e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Email" required>
              <FormInput
                type="email"
                placeholder="Adresse email"
                value={distForm.email}
                onChange={e => setDist("email", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Téléphone" required>
              <PhoneInput
                value={distForm.phone}
                onChange={e => setDist("phone", e.target.value)}
              />
            </FormField>
            <FormField label="Pays" required>
              <FormInput
                placeholder="Pays"
                value={distForm.country}
                onChange={e => setDist("country", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Documents légaux" />
            <FileUploadField
              label="Document RCCM"
              value={distForm.rccmDocument}
              onChange={f => setDist("rccmDocument", f)}
              required
            />
            <FileUploadField
              label="Document IFU"
              value={distForm.ifuDocument}
              onChange={f => setDist("ifuDocument", f)}
              required
            />
            <FileUploadField
              label="Photo de profil (optionnel)"
              value={distForm.photo}
              onChange={f => setDist("photo", f)}
            />
          </div>
        )}

        {partnerType === "commercant" && (
          <div className="space-y-4">
            <SectionTitle title="Informations personnelles" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required>
                <FormInput
                  placeholder="Prénom"
                  value={mercForm.firstName}
                  onChange={e => setMerc("firstName", e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nom" required>
                <FormInput
                  placeholder="Nom"
                  value={mercForm.lastName}
                  onChange={e => setMerc("lastName", e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Email" required>
              <FormInput
                type="email"
                placeholder="Adresse email"
                value={mercForm.email}
                onChange={e => setMerc("email", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Téléphone" required>
              <PhoneInput
                value={mercForm.phone}
                onChange={e => setMerc("phone", e.target.value)}
              />
            </FormField>
            <FormField label="Ville" required>
              <FormInput
                placeholder="Ville"
                value={mercForm.city}
                onChange={e => setMerc("city", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Adresse du commerce" required>
              <FormInput
                placeholder="Adresse du commerce"
                value={mercForm.shopAddress}
                onChange={e => setMerc("shopAddress", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Document" />
            <FileUploadField
              label="Photo de profil (optionnel)"
              value={mercForm.photo}
              onChange={f => setMerc("photo", f)}
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#178dbf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   EDIT PARTNER MODAL
   Réutilise les mêmes champs que le formulaire de création,
   pré-remplis avec les données existantes du partenaire.
   Envoie un PUT vers /distributors/:id ou /merchants/:id.
   Les documents / photo sont optionnels : seuls les nouveaux
   fichiers sélectionnés sont envoyés (ne remplace pas les
   documents existants si on ne touche à rien).
   ══════════════════════════════════════════════ */
function initDistFormFromItem(item) {
  const raw = item?._raw || {}
  return {
    businessName:       raw.businessName || "",
    registrationNumber: raw.registrationNumber || "",
    address:            raw.address || "",
    city:               raw.city || raw.user?.city || "",
    firstName:          raw.user?.firstName || "",
    lastName:           raw.user?.lastName || "",
    email:              raw.user?.email || "",
    phone:              raw.user?.phone || "",
    country:            raw.country || raw.user?.country || "",
    rccmDocument:       null,
    ifuDocument:        null,
    photo:              null,
  }
}

function initMercFormFromItem(item) {
  const raw = item?._raw || {}
  return {
    firstName:   raw.user?.firstName || "",
    lastName:    raw.user?.lastName || "",
    email:       raw.user?.email || "",
    phone:       raw.user?.phone || "",
    city:        raw.city || raw.user?.city || "",
    shopAddress: raw.shopAddress || "",
    photo:       null,
  }
}

function EditPartnerModal({ partnerType, item, onClose, onUpdated }) {
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)

  const [distForm, setDistForm] = useState(() => initDistFormFromItem(item))
  const [mercForm, setMercForm] = useState(() => initMercFormFromItem(item))

  const setDist = (key, val) => setDistForm(prev => ({ ...prev, [key]: val }))
  const setMerc = (key, val) => setMercForm(prev => ({ ...prev, [key]: val }))

  const validateDistributeur = () => {
    const { businessName, registrationNumber, address, city, firstName, lastName, email, phone, country } = distForm
    if (!businessName?.trim())       return "Le nom commercial est requis"
    if (!registrationNumber?.trim()) return "Le numéro d'enregistrement est requis"
    if (!address?.trim())            return "L'adresse est requise"
    if (!city?.trim())               return "La ville est requise"
    if (!firstName?.trim())          return "Le prénom est requis"
    if (!lastName?.trim())           return "Le nom est requis"
    if (!email?.trim())              return "L'email est requis"
    if (!phone?.trim())              return "Le téléphone est requis"
    if (!country?.trim())            return "Le pays est requis"
    return null
  }

  const validateMerchant = () => {
    const { firstName, lastName, email, phone, city, shopAddress } = mercForm
    if (!firstName?.trim())   return "Le prénom est requis"
    if (!lastName?.trim())    return "Le nom est requis"
    if (!email?.trim())       return "L'email est requis"
    if (!phone?.trim())       return "Le téléphone est requis"
    if (!city?.trim())        return "La ville est requise"
    if (!shopAddress?.trim()) return "L'adresse du commerce est requise"
    return null
  }

  const handleSubmit = async () => {
    setLocalError(null)
    try {
      setSubmitting(true)

      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!item?.id) throw new Error("Identifiant du partenaire manquant")

      if (partnerType === "distributeur") {
        const error = validateDistributeur()
        if (error) { setLocalError(error); return }

        const formData = new FormData()
        const cleanCity  = distForm.city.split(/[\/,]/)[0].trim()
        const cleanPhone = distForm.phone.includes("+") ? distForm.phone : `+229${distForm.phone}`

        formData.append("businessName",       distForm.businessName.trim())
        formData.append("registrationNumber", distForm.registrationNumber.trim())
        formData.append("address",            distForm.address.trim())
        formData.append("city",               cleanCity)
        formData.append("firstName",          distForm.firstName.trim())
        formData.append("lastName",           distForm.lastName.trim())
        formData.append("email",              distForm.email.trim())
        formData.append("phone",              cleanPhone)
        formData.append("country",            distForm.country.trim())

        // Documents optionnels : envoyés uniquement si remplacés
        if (distForm.rccmDocument instanceof File) formData.append("rccm",  distForm.rccmDocument)
        if (distForm.ifuDocument  instanceof File) formData.append("ifu",   distForm.ifuDocument)
        if (distForm.photo        instanceof File) formData.append("photo", distForm.photo)

        const response = await axios.put(DIST_UPDATE_API(item.id), formData, {
          headers: { Authorization: `Bearer ${token}` },
        })

        console.log("✓ Réponse API (200 OK) - distributeur modifié:", response.data)
        onUpdated("distributor", `Distributeur "${distForm.businessName}" modifié avec succès`)
      } else {
        const error = validateMerchant()
        if (error) { setLocalError(error); return }

        const formData = new FormData()
        const cleanCity  = mercForm.city.split(/[\/,]/)[0].trim()
        const cleanPhone = mercForm.phone.includes("+") ? mercForm.phone : `+229${mercForm.phone}`

        formData.append("firstName",   mercForm.firstName.trim())
        formData.append("lastName",    mercForm.lastName.trim())
        formData.append("email",       mercForm.email.trim())
        formData.append("phone",       cleanPhone)
        formData.append("city",        cleanCity)
        formData.append("shopAddress", mercForm.shopAddress.trim())

        if (mercForm.photo instanceof File) formData.append("photo", mercForm.photo)

        const response = await axios.put(MERCHANT_UPDATE_API(item.id), formData, {
          headers: { Authorization: `Bearer ${token}` },
        })

        console.log("✓ Réponse API (200 OK) - commerçant modifié:", response.data)
        onUpdated("merchant", `Commerçant "${mercForm.firstName} ${mercForm.lastName}" modifié avec succès`)
      }

      onClose()
    } catch (err) {
      const message = err?.response?.data?.description || err.message || "Erreur lors de la modification"
      console.error("❌ Erreur modification partenaire:", {
        status: err?.response?.status,
        message,
        data: err?.response?.data,
      })
      setLocalError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-5">
          {partnerType === "distributeur" ? "Modifier le distributeur" : "Modifier le commerçant"}
        </h2>

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {partnerType === "distributeur" ? (
          <div className="space-y-4">
            <SectionTitle title="Informations du commerce" />
            <FormField label="Nom commercial" required>
              <FormInput
                placeholder="Nom commercial"
                value={distForm.businessName}
                onChange={e => setDist("businessName", e.target.value)}
                required
              />
            </FormField>
            <FormField label="N° d'enregistrement" required>
              <FormInput
                placeholder="Numéro d'enregistrement (RCCM)"
                value={distForm.registrationNumber}
                onChange={e => setDist("registrationNumber", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Adresse" required>
              <FormInput
                placeholder="Adresse du commerce"
                value={distForm.address}
                onChange={e => setDist("address", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Ville" required>
              <FormInput
                placeholder="Ville"
                value={distForm.city}
                onChange={e => setDist("city", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Informations personnelles" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required>
                <FormInput
                  placeholder="Prénom"
                  value={distForm.firstName}
                  onChange={e => setDist("firstName", e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nom" required>
                <FormInput
                  placeholder="Nom"
                  value={distForm.lastName}
                  onChange={e => setDist("lastName", e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Email" required>
              <FormInput
                type="email"
                placeholder="Adresse email"
                value={distForm.email}
                onChange={e => setDist("email", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Téléphone" required>
              <PhoneInput
                value={distForm.phone}
                onChange={e => setDist("phone", e.target.value)}
              />
            </FormField>
            <FormField label="Pays" required>
              <FormInput
                placeholder="Pays"
                value={distForm.country}
                onChange={e => setDist("country", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Documents légaux (optionnel)" />
            <p className="text-xs text-gray-400 -mt-2">
              Laissez vide pour conserver les documents déjà enregistrés.
            </p>
            <FileUploadField
              label="Document RCCM"
              value={distForm.rccmDocument}
              onChange={f => setDist("rccmDocument", f)}
            />
            <FileUploadField
              label="Document IFU"
              value={distForm.ifuDocument}
              onChange={f => setDist("ifuDocument", f)}
            />
            <FileUploadField
              label="Photo de profil"
              value={distForm.photo}
              onChange={f => setDist("photo", f)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <SectionTitle title="Informations personnelles" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required>
                <FormInput
                  placeholder="Prénom"
                  value={mercForm.firstName}
                  onChange={e => setMerc("firstName", e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Nom" required>
                <FormInput
                  placeholder="Nom"
                  value={mercForm.lastName}
                  onChange={e => setMerc("lastName", e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Email" required>
              <FormInput
                type="email"
                placeholder="Adresse email"
                value={mercForm.email}
                onChange={e => setMerc("email", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Téléphone" required>
              <PhoneInput
                value={mercForm.phone}
                onChange={e => setMerc("phone", e.target.value)}
              />
            </FormField>
            <FormField label="Ville" required>
              <FormInput
                placeholder="Ville"
                value={mercForm.city}
                onChange={e => setMerc("city", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Adresse du commerce" required>
              <FormInput
                placeholder="Adresse du commerce"
                value={mercForm.shopAddress}
                onChange={e => setMerc("shopAddress", e.target.value)}
                required
              />
            </FormField>

            <SectionTitle title="Document (optionnel)" />
            <FileUploadField
              label="Photo de profil"
              value={mercForm.photo}
              onChange={f => setMerc("photo", f)}
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#178dbf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   RÉAPPROVISIONNEMENT — ASSISTANT EN ÉTAPES
   ──────────────────────────────────────────────
   Parcours "Carte prépayée" :  Service → Banque → Formule → Produits
   Parcours "Abonnement Canal+" : Service → Décodeurs
   Chaque étape ne montre que ce qui dépend du choix précédent.
   L'étape finale (Produits / Décodeurs) permet de cocher plusieurs
   articles, d'ajuster leur quantité, et affiche en direct le nombre
   d'articles sélectionnés et le prix total avant validation.
   ══════════════════════════════════════════════ */

const RESTOCK_SERVICES = [
  {
    id:          "carte_prepaid",
    label:       "Carte prépayée",
    description: "Banque, puis formule, puis produits",
  },
  {
    id:          "canal_plus",
    label:       "Abonnement Canal+",
    description: "Sélection directe des décodeurs",
  },
]

const RESTOCK_BANQUES = [
  { id: "uba",     label: "UBA" },
  { id: "ecobank", label: "Ecobank" },
  { id: "boa",     label: "Bank Of Africa" },
  { id: "orabank", label: "Orabank" },
]

const RESTOCK_FORMULES = {
  uba: [
    { id: "classique", label: "Formule Classique" },
    { id: "premium",   label: "Formule Premium" },
  ],
  ecobank: [
    { id: "standard", label: "Formule Standard" },
    { id: "gold",     label: "Formule Gold" },
  ],
  boa: [
    { id: "essentiel", label: "Formule Essentiel" },
    { id: "privilege",  label: "Formule Privilège" },
  ],
  orabank: [
    { id: "basic", label: "Formule Basic" },
    { id: "plus",  label: "Formule Plus" },
  ],
}

const RESTOCK_PRODUITS = {
  "uba_classique":     [
    { id: "uba-c-1", name: "Carte prépayée UBA Classique 5 000",  price: 5000  },
    { id: "uba-c-2", name: "Carte prépayée UBA Classique 10 000", price: 10000 },
    { id: "uba-c-3", name: "Carte prépayée UBA Classique 25 000", price: 25000 },
  ],
  "uba_premium":       [
    { id: "uba-p-1", name: "Carte prépayée UBA Premium 25 000",  price: 25000 },
    { id: "uba-p-2", name: "Carte prépayée UBA Premium 50 000",  price: 50000 },
    { id: "uba-p-3", name: "Carte prépayée UBA Premium 100 000", price: 100000 },
  ],
  "ecobank_standard":  [
    { id: "eco-s-1", name: "Carte prépayée Ecobank Standard 5 000",  price: 5000  },
    { id: "eco-s-2", name: "Carte prépayée Ecobank Standard 10 000", price: 10000 },
  ],
  "ecobank_gold":      [
    { id: "eco-g-1", name: "Carte prépayée Ecobank Gold 25 000",  price: 25000 },
    { id: "eco-g-2", name: "Carte prépayée Ecobank Gold 50 000",  price: 50000 },
  ],
  "boa_essentiel":     [
    { id: "boa-e-1", name: "Carte prépayée BOA Essentiel 5 000",  price: 5000  },
    { id: "boa-e-2", name: "Carte prépayée BOA Essentiel 10 000", price: 10000 },
  ],
  "boa_privilege":     [
    { id: "boa-pr-1", name: "Carte prépayée BOA Privilège 50 000",  price: 50000 },
    { id: "boa-pr-2", name: "Carte prépayée BOA Privilège 100 000", price: 100000 },
  ],
  "orabank_basic":     [
    { id: "ora-b-1", name: "Carte prépayée Orabank Basic 5 000",  price: 5000  },
    { id: "ora-b-2", name: "Carte prépayée Orabank Basic 10 000", price: 10000 },
  ],
  "orabank_plus":      [
    { id: "ora-pl-1", name: "Carte prépayée Orabank Plus 25 000", price: 25000 },
    { id: "ora-pl-2", name: "Carte prépayée Orabank Plus 50 000", price: 50000 },
  ],
}

const RESTOCK_DECODEURS = [
  { id: "decoder-mini",   name: "Décodeur Canal+ Mini",           price: 15000 },
  { id: "decoder-access", name: "Décodeur Canal+ Access",         price: 25000 },
  { id: "decoder-evasion",name: "Décodeur Canal+ Évasion",        price: 45000 },
  { id: "decoder-hd",     name: "Décodeur Canal+ HD",             price: 65000 },
  { id: "decoder-parab",  name: "Décodeur Canal+ + Parabole kit", price: 85000 },
]

/** Fil d'ariane cliquable : permet de revenir à une étape déjà validée. */
function RestockBreadcrumb({ steps, currentIndex, onNavigate }) {
  return (
    <div className="flex items-center gap-1.5 mb-5 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={i > currentIndex}
            onClick={() => i < currentIndex && onNavigate(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
              ${i === currentIndex
                ? "bg-[#1EA4DC] text-white"
                : i < currentIndex
                ? "bg-blue-50 text-[#1EA4DC] hover:bg-blue-100 cursor-pointer"
                : "bg-gray-100 text-gray-300 cursor-not-allowed"
              }`}
          >
            {s.label}
          </button>
          {i < steps.length - 1 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
        </div>
      ))}
    </div>
  )
}

/** Carte de sélection générique (service / banque / formule). */
function SelectionCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 hover:border-[#1EA4DC] hover:bg-blue-50 transition-colors text-left"
    >
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1EA4DC] shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </button>
  )
}

/** Ligne produit avec case à cocher + sélecteur de quantité. */
function RestockProductRow({ product, qty, onToggle, onQtyChange }) {
  const checked = qty > 0
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors
        ${checked ? "border-[#1EA4DC] bg-blue-50/60" : "border-gray-200 bg-white"}`}
    >
      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(product)}
          className="accent-[#1EA4DC] w-4 h-4 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
          <p className="text-xs text-gray-400">{formatFCFA(product.price)} / unité</p>
        </div>
      </label>

      {checked && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onQtyChange(product.id, Math.max(1, qty - 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold text-gray-700">{qty}</span>
          <button
            type="button"
            onClick={() => onQtyChange(product.id, qty + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

function RestockWizardModal({ item, onClose, onConfirm }) {
  const label = item?.raisonSociale && item.raisonSociale !== "-" ? item.raisonSociale : item?.nom

  const [selectedService, setSelectedService] = useState(null) // "carte_prepaid" | "canal_plus"
  const [selectedBank,    setSelectedBank]    = useState(null)
  const [selectedFormule, setSelectedFormule] = useState(null)
  const [cart,         setCart]         = useState({}) // { [productId]: { product, qty } }
  const [observation,  setObservation]  = useState("")
  const [submitting,   setSubmitting]   = useState(false)
  const [localError,   setLocalError]   = useState(null)

  const isCarte = selectedService === "carte_prepaid"
  const isCanal = selectedService === "canal_plus"

  // Étape courante déduite des choix déjà faits
  let stepKey = "service"
  if (isCarte) {
    if (!selectedBank)         stepKey = "bank"
    else if (!selectedFormule) stepKey = "formule"
    else                       stepKey = "products"
  } else if (isCanal) {
    stepKey = "decodeurs"
  }

  const steps = isCarte
    ? [
        { key: "service",  label: "Service" },
        { key: "bank",     label: "Banque" },
        { key: "formule",  label: "Formule" },
        { key: "products", label: "Produits" },
      ]
    : isCanal
    ? [
        { key: "service",   label: "Service" },
        { key: "decodeurs", label: "Décodeurs" },
      ]
    : [{ key: "service", label: "Service" }]

  const currentIndex = Math.max(0, steps.findIndex(s => s.key === stepKey))

  const resetSelection = () => {
    setSelectedService(null)
    setSelectedBank(null)
    setSelectedFormule(null)
    setCart({})
  }

  const goToStep = (index) => {
    const key = steps[index]?.key
    setLocalError(null)
    if (key === "service")      resetSelection()
    else if (key === "bank")    { setSelectedBank(null); setSelectedFormule(null); setCart({}) }
    else if (key === "formule") { setSelectedFormule(null); setCart({}) }
  }

  const goBack = () => {
    setLocalError(null)
    if (stepKey === "bank")          setSelectedService(null)
    else if (stepKey === "formule")  setSelectedBank(null)
    else if (stepKey === "products") { setSelectedFormule(null); setCart({}) }
    else if (stepKey === "decodeurs") setSelectedService(null)
  }

  const toggleProduct = (product) => {
    setCart(prev => {
      const next = { ...prev }
      if (next[product.id]) delete next[product.id]
      else next[product.id] = { product, qty: 1 }
      return next
    })
  }

  const changeQty = (productId, qty) => {
    setCart(prev => (prev[productId] ? { ...prev, [productId]: { ...prev[productId], qty } } : prev))
  }

  const cartItems  = Object.values(cart)
  const totalCount = cartItems.reduce((sum, c) => sum + c.qty, 0)
  const totalPrice = cartItems.reduce((sum, c) => sum + c.qty * c.product.price, 0)

  const formuleKey = selectedBank && selectedFormule ? `${selectedBank}_${selectedFormule}` : null
  const products   = formuleKey ? (RESTOCK_PRODUITS[formuleKey] || []) : []
  const catalogue  = stepKey === "products" ? products : stepKey === "decodeurs" ? RESTOCK_DECODEURS : []

  const bankLabel    = RESTOCK_BANQUES.find(b => b.id === selectedBank)?.label
  const formuleLabel = (RESTOCK_FORMULES[selectedBank] || []).find(f => f.id === selectedFormule)?.label

  const handleConfirm = async () => {
    if (totalCount === 0) return
    setLocalError(null)
    setSubmitting(true)
    try {
      await onConfirm({
        service:     selectedService,
        bank:        selectedBank,
        bankLabel,
        formule:     selectedFormule,
        formuleLabel,
        items:       cartItems.map(c => ({
          productId: c.product.id,
          name:      c.product.name,
          qty:       c.qty,
          price:     c.product.price,
        })),
        totalCount,
        totalPrice,
        observation,
      })
    } catch (err) {
      setLocalError(err?.message || "Erreur lors du réapprovisionnement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-1">Réapprovisionner</h2>
        <p className="text-sm text-gray-400 mb-4">{label}</p>

        <RestockBreadcrumb steps={steps} currentIndex={currentIndex} onNavigate={goToStep} />

        {stepKey !== "service" && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1EA4DC] mb-4 -mt-1 transition-colors w-fit"
          >
            <ArrowLeft size={14} /> Retour
          </button>
        )}

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ÉTAPE 1 : SERVICE */}
        {stepKey === "service" && (
          <div className="space-y-3">
            {RESTOCK_SERVICES.map(s => (
              <SelectionCard
                key={s.id}
                icon={s.id === "carte_prepaid" ? <CreditCard size={20} /> : <Tv size={20} />}
                title={s.label}
                subtitle={s.description}
                onClick={() => setSelectedService(s.id)}
              />
            ))}
          </div>
        )}

        {/* ÉTAPE 2 (carte prépayée) : BANQUE */}
        {stepKey === "bank" && (
          <div className="space-y-3">
            {RESTOCK_BANQUES.map(b => (
              <SelectionCard
                key={b.id}
                icon={<Landmark size={20} />}
                title={b.label}
                onClick={() => setSelectedBank(b.id)}
              />
            ))}
          </div>
        )}

        {/* ÉTAPE 3 (carte prépayée) : FORMULE */}
        {stepKey === "formule" && (
          <div className="space-y-3">
            {(RESTOCK_FORMULES[selectedBank] || []).map(f => (
              <SelectionCard
                key={f.id}
                title={f.label}
                subtitle={bankLabel}
                onClick={() => setSelectedFormule(f.id)}
              />
            ))}
          </div>
        )}

        {/* ÉTAPE FINALE : PRODUITS (carte prépayée) ou DÉCODEURS (canal+) */}
        {(stepKey === "products" || stepKey === "decodeurs") && (
          <>
            {stepKey === "products" && (
              <p className="text-xs text-gray-400 mb-3">
                {bankLabel} · {formuleLabel}
              </p>
            )}

            <div className="space-y-2.5">
              {catalogue.map(p => (
                <RestockProductRow
                  key={p.id}
                  product={p}
                  qty={cart[p.id]?.qty || 0}
                  onToggle={toggleProduct}
                  onQtyChange={changeQty}
                />
              ))}
              {catalogue.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  Aucun produit disponible pour cette sélection
                </p>
              )}
            </div>

            <div className="mt-4">
              <FormField label="Observation (optionnel)">
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ajouter une observation..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                  rows="2"
                />
              </FormField>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">
                  {totalCount} produit{totalCount > 1 ? "s" : ""} sélectionné{totalCount > 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gray-800">{formatFCFA(totalPrice)}</span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={totalCount === 0 || submitting}
                className="w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#178dbf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Réapprovisionnement..." : "Réapprovisionner"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ===================== MAIN ===================== */

export default function Partenaires() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("distributeurs")
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [distributeurs, setDistributeurs] = useState([])
  const [commercants,   setCommercants]   = useState([])
  const [loading,       setLoading]       = useState(false)

  const [createModal,  setCreateModal]  = useState(false)
  const [editModal,    setEditModal]    = useState(false)
  const [deleteModal,  setDeleteModal]  = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  //  États pour les nouvelles actions
  const [restockModal, setRestockModal] = useState(false)
  const [releaseStockModal, setReleaseStockModal] = useState(false)
  const [assignParabolaModal, setAssignParabolaModal] = useState(false)
  const [assignServiceModal, setAssignServiceModal] = useState(false)
  const [removeServiceModal, setRemoveServiceModal] = useState(false)
  const [searchQuery,  setSearchQuery]  = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // IDs des lignes dont le statut est en cours de bascule (appel API en cours)
  const [togglingIds, setTogglingIds] = useState(() => new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalDist,   setTotalDist]   = useState(0)
  const [totalMerch,  setTotalMerch]  = useState(0)

  const companyIdRef = useRef(null)

  const resolveCompanyId = useCallback(async () => {
    if (companyIdRef.current) return companyIdRef.current
    const { companyId: storedId } = getAuthData()
    if (storedId) { companyIdRef.current = storedId; return storedId }
    const profile = await fetchProfile()
    const id = profile?.company?.id
    if (id) companyIdRef.current = id
    return id
  }, [])

  const fetchDistributeurs = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const companyId = await resolveCompanyId()
      if (!companyId) throw new Error("CompanyId manquant")

      const res = await axios.get(
        `${DIST_API}/${companyId}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      setDistributeurs(raw.map(normalizeDistributeur))
      setTotalDist(res.data?.total ?? raw.length)
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de charger les distributeurs")
      setDistributeurs([])
    } finally {
      setLoading(false)
    }
  }, [resolveCompanyId, showError])

  const fetchCommercants = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const companyId = await resolveCompanyId()
      if (!companyId) throw new Error("CompanyId manquant")

      const res = await axios.get(
        `${MERCHANT_API}/${companyId}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      setCommercants(raw.map(normalizeMerchant))
      setTotalMerch(res.data?.total ?? raw.length)
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de charger les commerçants")
      setCommercants([])
    } finally {
      setLoading(false)
    }
  }, [resolveCompanyId, showError])

  useEffect(() => {
    if (activeTab === "distributeurs") fetchDistributeurs(currentPage, rowsPerPage)
    else                               fetchCommercants(currentPage, rowsPerPage)
  }, [activeTab, currentPage, rowsPerPage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchQuery, statusFilter])

  const rawData = activeTab === "distributeurs" ? distributeurs : commercants

  const filteredData = rawData.filter((item) => {
    const text = [item.raisonSociale, item.nom, item.email, item.phone, item.ville]
      .join(" ").toLowerCase()
    const matchSearch = !searchQuery || text.includes(searchQuery.toLowerCase())
    const matchStatus =
      statusFilter === "all"      ? true :
      statusFilter === "active"   ? item.status === "Actif"   :
      statusFilter === "inactive" ? item.status === "Inactif" : true
    return matchSearch && matchStatus
  })

  const totalPages    = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const start         = (currentPage - 1) * rowsPerPage
  const end           = start + rowsPerPage
  const paginatedData = filteredData.slice(start, end)

  /**
   * Active / désactive un distributeur ou un commerçant de façon dynamique
   * via l'API PATCH .../toggle-status, en récupérant l'id du partenaire
   * directement dans l'URL de l'endpoint.
   */
  const handleToggleStatus = async (item) => {
    if (togglingIds.has(item.id)) return // évite les doubles clics pendant l'appel en cours

    const newIsActive = !item.isActive
    const label = item.raisonSociale && item.raisonSociale !== "-" ? item.raisonSociale : item.nom
    const isDistributeur = activeTab === "distributeurs"

    setTogglingIds(prev => new Set(prev).add(item.id))

    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const url = isDistributeur
        ? DIST_TOGGLE_STATUS_API(item.id)
        : MERCHANT_TOGGLE_STATUS_API(item.id)

      await axios.patch(
        url,
        { isActive: newIsActive },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )

      const updated = {
        ...item,
        isActive: newIsActive,
        status: newIsActive ? "Actif" : "Inactif",
      }

      if (isDistributeur) {
        setDistributeurs(prev => prev.map(d => d.id === item.id ? updated : d))
      } else {
        setCommercants(prev => prev.map(c => c.id === item.id ? updated : c))
      }

      showSuccess(`"${label}" ${newIsActive ? "activé" : "désactivé"} avec succès`)
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de mettre à jour le statut")
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleDelete = () => {
    const label = selectedItem?.raisonSociale !== "-"
      ? selectedItem?.raisonSociale
      : selectedItem?.nom
    if (activeTab === "distributeurs") {
      setDistributeurs(prev => prev.filter(d => d.id !== selectedItem.id))
      showSuccess(`Distributeur "${label}" supprimé`)
    } else {
      setCommercants(prev => prev.filter(c => c.id !== selectedItem.id))
      showSuccess(`Commerçant "${label}" supprimé`)
    }
    setDeleteModal(false)
    setSelectedItem(null)
  }

  const handleCreated = useCallback((type, message) => {
    showSuccess(message)
    if (type === "distributor") {
      fetchDistributeurs(currentPage, rowsPerPage)
    } else {
      fetchCommercants(currentPage, rowsPerPage)
    }
  }, [showSuccess, fetchDistributeurs, fetchCommercants, currentPage, rowsPerPage])

  //  Rafraîchit la liste après modification réussie d'un partenaire
  const handleUpdated = useCallback((type, message) => {
    showSuccess(message)
    if (type === "distributor") {
      fetchDistributeurs(currentPage, rowsPerPage)
    } else {
      fetchCommercants(currentPage, rowsPerPage)
    }
  }, [showSuccess, fetchDistributeurs, fetchCommercants, currentPage, rowsPerPage])

  //  Fonction pour naviguer vers la page de détail du distributeur
  const handleDetailDistributor = (item) => {
    navigate(`/detail_distributeur/${item.id}`)
  }

  // Fonction pour naviguer vers la page de détail du commerçant
  const handleDetailMerchant = (item) => {
    navigate(`/detail_commercant/${item.id}`)
  }

  //  Handlers pour les nouvelles actions
  const handleRestockInventory = (item) => {
    setSelectedItem(item)
    setRestockModal(true)
  }

  const handleReleaseStock = (item) => {
    setSelectedItem(item)
    setReleaseStockModal(true)
  }

  const handleAssignParabola = (item) => {
    setSelectedItem(item)
    setAssignParabolaModal(true)
  }

  const handleAssignService = (item) => {
    setSelectedItem(item)
    setAssignServiceModal(true)
  }

  const handleRemoveService = (item) => {
    setSelectedItem(item)
    setRemoveServiceModal(true)
  }

  /**
   * Confirmation finale du réapprovisionnement, déclenchée par
   * RestockWizardModal une fois que l'utilisateur a coché ses
   * produits/décodeurs et cliqué sur "Réapprovisionner".
   */
  const handleConfirmRestock = useCallback(async (payload) => {
    const label = selectedItem?.raisonSociale && selectedItem.raisonSociale !== "-"
      ? selectedItem.raisonSociale
      : selectedItem?.nom

    try {
      const { token } = getAuthData()
      if (token && selectedItem?.id) {
        await axios.post(
          RESTOCK_API(selectedItem.id),
          payload,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        )
      }
      showSuccess(
        `${payload.totalCount} produit${payload.totalCount > 1 ? "s" : ""} réapprovisionné${payload.totalCount > 1 ? "s" : ""} pour "${label}" — Total : ${formatFCFA(payload.totalPrice)}`
      )
      setRestockModal(false)
      setSelectedItem(null)
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de réapprovisionner le partenaire")
      throw err
    }
  }, [selectedItem, showSuccess, showError])

  return (
    <div className="p-8 space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">Gestion des Partenaires</h1>
        <p className="text-gray-500">Gérer distributeurs et commerçants</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-full p-1 w-fit">
        <Tab label="Distributeurs" active={activeTab === "distributeurs"} onClick={() => setActiveTab("distributeurs")} />
        <Tab label="Commerçants"   active={activeTab === "commercants"}   onClick={() => setActiveTab("commercants")} />
      </div>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-lg">
              {activeTab === "distributeurs" ? "Liste des Distributeurs" : "Liste des Commerçants"}
            </h2>
            <p className="text-gray-400 text-sm">
              {filteredData.length}{" "}
              {activeTab === "distributeurs" ? "Distributeur(s)" : "Commerçant(s)"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 text-sm outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-100 rounded-lg px-4 py-2 text-sm outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>

            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Ajouter partenaire
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5 text-[#1EA4DC]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Chargement...</span>
          </div>
        )}

        {!loading && (
          activeTab === "distributeurs" ? (
            <DistributeursTable
              data={paginatedData}
              onEdit={(item)   => { setSelectedItem(item); setEditModal(true) }}
              onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
              onDetail={handleDetailDistributor}
              onToggleStatus={handleToggleStatus}
              togglingIds={togglingIds}
              onRestockInventory={handleRestockInventory}
              onReleaseStock={handleReleaseStock}
              onAssignParabola={handleAssignParabola}
              onAssignService={handleAssignService}
              onRemoveService={handleRemoveService}
            />
          ) : (
            <CommercantTable
              data={paginatedData}
              onEdit={(item)   => { setSelectedItem(item); setEditModal(true) }}
              onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
              onDetail={handleDetailMerchant}
              onToggleStatus={handleToggleStatus}
              togglingIds={togglingIds}
              onRestockInventory={handleRestockInventory}
              onReleaseStock={handleReleaseStock}
              onAssignParabola={handleAssignParabola}
              onAssignService={handleAssignService}
              onRemoveService={handleRemoveService}
            />
          )
        )}

        <PaginationFooter
          total={filteredData.length}
          start={filteredData.length === 0 ? 0 : start + 1}
          end={Math.min(end, filteredData.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={(v) => { setRowsPerPage(v); setCurrentPage(1) }}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* ══ MODALS ══ */}

      {createModal && (
        <AddPartnerModal
          onClose={() => setCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editModal && selectedItem && (
        <EditPartnerModal
          partnerType={activeTab === "distributeurs" ? "distributeur" : "commercant"}
          item={selectedItem}
          onClose={() => { setEditModal(false); setSelectedItem(null) }}
          onUpdated={handleUpdated}
        />
      )}

      {deleteModal && selectedItem && (
        <Modal title="Confirmer la suppression" onClose={() => { setDeleteModal(false); setSelectedItem(null) }}>
          <p className="text-gray-600 text-sm">
            Voulez-vous vraiment supprimer{" "}
            <strong>
              {selectedItem?.raisonSociale !== "-" ? selectedItem.raisonSociale : selectedItem?.nom}
            </strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setDeleteModal(false); setSelectedItem(null) }}
              className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}

      {/*  ASSISTANT DE RÉAPPROVISIONNEMENT (en étapes) */}
      {restockModal && selectedItem && (
        <RestockWizardModal
          item={selectedItem}
          onClose={() => { setRestockModal(false); setSelectedItem(null) }}
          onConfirm={handleConfirmRestock}
        />
      )}

      {releaseStockModal && selectedItem && (
        <Modal 
          title="Libérer stock" 
          onClose={() => { setReleaseStockModal(false); setSelectedItem(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Libérer le stock pour <strong>{selectedItem?.raisonSociale || selectedItem?.nom}</strong>
            </p>
            <FormField label="Quantité" required>
              <FormInput placeholder="Entrer la quantité à libérer" type="number" required />
            </FormField>
            <FormField label="Raison" required>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700">
                <option value="">Sélectionner une raison</option>
                <option value="retour">Retour client</option>
                <option value="dommage">Dommage</option>
                <option value="remboursement">Remboursement</option>
                <option value="autre">Autre</option>
              </select>
            </FormField>
            <FormField label="Observation (optionnel)">
              <textarea
                placeholder="Ajouter une observation..."
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                rows="3"
              />
            </FormField>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setReleaseStockModal(false); setSelectedItem(null) }}
                className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  showSuccess(`Stock libéré pour "${selectedItem?.raisonSociale || selectedItem?.nom}"`)
                  setReleaseStockModal(false)
                  setSelectedItem(null)
                }}
                className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#178dbf] transition-colors"
              >
                Libérer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {assignParabolaModal && selectedItem && (
        <Modal 
          title="Assigner parabole" 
          onClose={() => { setAssignParabolaModal(false); setSelectedItem(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Assigner une parabole à <strong>{selectedItem?.raisonSociale || selectedItem?.nom}</strong>
            </p>
            <FormField label="Sélectionner une parabole" required>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700">
                <option value="">Choisir une parabole</option>
                <option value="parabola1">Parabola 1</option>
                <option value="parabola2">Parabola 2</option>
                <option value="parabola3">Parabola 3</option>
              </select>
            </FormField>
            <FormField label="Observation (optionnel)">
              <textarea
                placeholder="Ajouter une observation..."
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                rows="3"
              />
            </FormField>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setAssignParabolaModal(false); setSelectedItem(null) }}
                className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  showSuccess(`Parabole assignée à "${selectedItem?.raisonSociale || selectedItem?.nom}"`)
                  setAssignParabolaModal(false)
                  setSelectedItem(null)
                }}
                className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#178dbf] transition-colors"
              >
                Assigner
              </button>
            </div>
          </div>
        </Modal>
      )}

      {assignServiceModal && selectedItem && (
        <Modal 
          title="Assigner service" 
          onClose={() => { setAssignServiceModal(false); setSelectedItem(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Assigner un service à <strong>{selectedItem?.raisonSociale || selectedItem?.nom}</strong>
            </p>
            <FormField label="Sélectionner un service" required>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700">
                <option value="">Choisir un service</option>
                <option value="service1">Service Canal+</option>
                <option value="service2">Service Prépayé</option>
                <option value="service3">Service Internet</option>
              </select>
            </FormField>
            <FormField label="Date d'effet" required>
              <FormInput placeholder="JJ/MM/YYYY" type="date" required />
            </FormField>
            <FormField label="Observation (optionnel)">
              <textarea
                placeholder="Ajouter une observation..."
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                rows="3"
              />
            </FormField>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setAssignServiceModal(false); setSelectedItem(null) }}
                className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  showSuccess(`Service assigné à "${selectedItem?.raisonSociale || selectedItem?.nom}"`)
                  setAssignServiceModal(false)
                  setSelectedItem(null)
                }}
                className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#178dbf] transition-colors"
              >
                Assigner
              </button>
            </div>
          </div>
        </Modal>
      )}

      {removeServiceModal && selectedItem && (
        <Modal 
          title="Retirer service" 
          onClose={() => { setRemoveServiceModal(false); setSelectedItem(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Retirer un service à <strong>{selectedItem?.raisonSociale || selectedItem?.nom}</strong>
            </p>
            <FormField label="Sélectionner le service à retirer" required>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700">
                <option value="">Choisir un service</option>
                <option value="service1">Service Canal+</option>
                <option value="service2">Service Prépayé</option>
                <option value="service3">Service Internet</option>
              </select>
            </FormField>
            <FormField label="Raison du retrait" required>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors text-gray-700">
                <option value="">Sélectionner une raison</option>
                <option value="suspension">Suspension</option>
                <option value="resiliation">Résiliation</option>
                <option value="changement">Changement de service</option>
                <option value="autre">Autre</option>
              </select>
            </FormField>
            <FormField label="Observation (optionnel)">
              <textarea
                placeholder="Ajouter une observation..."
                className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm outline-none focus:border-[#1EA4DC] transition-colors placeholder-gray-400 text-gray-700 resize-none"
                rows="3"
              />
            </FormField>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setRemoveServiceModal(false); setSelectedItem(null) }}
                className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  showSuccess(`Service retiré à "${selectedItem?.raisonSociale || selectedItem?.nom}"`)
                  setRemoveServiceModal(false)
                  setSelectedItem(null)
                }}
                className="bg-[#1EA4DC] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#178dbf] transition-colors"
              >
                Retirer
              </button>
            </div>
          </div>
        </Modal>
      )}


    </div>
  )
}

/* ===================== ACTION MENU ===================== */

function ActionMenu({ 
  item, 
  partnerType,
  onEdit, 
  onDelete, 
  onDetail, 
  onToggleStatus, 
  isToggling,
  onRestockInventory,
  onReleaseStock,
  onAssignParabola,
  onAssignService,
  onRemoveService,
  isOpen, 
  onToggle 
}) {
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect       = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUpward(spaceBelow < 190)
    }
  }, [isOpen])

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal size={18} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className={`absolute right-0 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-xl py-1 max-h-96 overflow-y-auto
          ${openUpward ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <button
            type="button"
            onClick={() => { onDetail(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
          >
            <Eye size={15} className="text-gray-500" /> Voir détails
          </button>

          <button
            type="button"
            onClick={() => { onEdit(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} className="text-gray-500" /> Modifier
          </button>

          {/*  NOUVELLES ACTIONS */}
          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={() => { onRestockInventory(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
          >
            <Package size={15} /> Réapprovisionner
          </button>

          <button
            type="button"
            onClick={() => { onReleaseStock(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
          >
            <Unlock size={15} /> Libérer stock
          </button>

          <button
            type="button"
            onClick={() => { onAssignParabola(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
          >
            <Radio size={15} /> Assigner parabole
          </button>

          <button
            type="button"
            onClick={() => { onAssignService(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
          >
            <CheckCircle2 size={15} /> Assigner service
          </button>

          <button
            type="button"
            onClick={() => { onRemoveService(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
          >
            <XCircle size={15} /> Retirer service
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            disabled={isToggling}
            onClick={() => { onToggleStatus(item); onToggle() }}
            className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${item.status === "Actif"
                ? "text-orange-600 hover:bg-orange-50"
                : "text-green-600 hover:bg-green-50"
              }`}
          >
            {isToggling
              ? <Loader2 size={15} className="animate-spin" />
              : (item.status === "Actif" ? <ToggleLeft size={15} /> : <ToggleRight size={15} />)
            }
            {isToggling ? "Mise à jour..." : (item.status === "Actif" ? "Désactiver" : "Activer")}
          </button>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={() => { onDelete(item); onToggle() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} /> Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

/* ===================== TABLES ===================== */

function DistributeursTable({ 
  data = [], 
  onEdit, 
  onDelete, 
  onDetail, 
  onToggleStatus,
  togglingIds,
  onRestockInventory,
  onReleaseStock,
  onAssignParabola,
  onAssignService,
  onRemoveService
}) {
  const [openRow, setOpenRow] = useState(null)
  const tableRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) setOpenRow(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={tableRef} className="overflow-visible rounded-xl">
      <table className="table-auto min-w-full w-full text-sm">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left font-semibold w-12">N°</th>
            <th className="px-4 py-3 text-left font-semibold">Nom commercial / Nom et prénom</th>
            <th className="px-4 py-3 text-left font-semibold">Email / Tél</th>
            <th className="px-4 py-3 text-left font-semibold">Ville</th>
            <th className="px-4 py-3 text-center font-semibold">Statut</th>
            <th className="px-4 py-3 text-center font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((item, i) => (
            <tr
              key={item.id}
              className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors border-b border-gray-100`}
            >
              <td className="px-4 py-4 text-gray-400 text-sm">{i + 1}</td>
              <td className="px-4 py-4">
                {/* NOM COMMERCIAL : tout en MAJUSCULES */}
                <p className="font-semibold text-gray-800">
                  {item.raisonSociale !== "-" ? item.raisonSociale.toUpperCase() : "-"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.nom}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-gray-700">{item.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.phone}</p>
              </td>
              {/*  VILLE : première lettre majuscule, reste minuscule */}
              <td className="px-4 py-4 text-gray-600">{capitalizeCity(item.ville)}</td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.status} loading={togglingIds?.has(item.id)} />
              </td>
              <td className="px-4 py-4 text-center">
                <ActionMenu
                  item={item}
                  partnerType="distributor"
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDetail={onDetail}
                  onToggleStatus={onToggleStatus}
                  isToggling={togglingIds?.has(item.id)}
                  onRestockInventory={onRestockInventory}
                  onReleaseStock={onReleaseStock}
                  onAssignParabola={onAssignParabola}
                  onAssignService={onAssignService}
                  onRemoveService={onRemoveService}
                  isOpen={openRow === item.id}
                  onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                />
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" className="text-center py-10 text-gray-400">Aucun distributeur trouvé</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function CommercantTable({ 
  data = [], 
  onEdit, 
  onDelete, 
  onDetail, 
  onToggleStatus,
  togglingIds,
  onRestockInventory,
  onReleaseStock,
  onAssignParabola,
  onAssignService,
  onRemoveService
}) {
  const [openRow, setOpenRow] = useState(null)
  const tableRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) setOpenRow(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={tableRef} className="overflow-visible rounded-xl">
      <table className="table-auto min-w-full w-full text-sm">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left font-semibold w-12">N°</th>
            <th className="px-4 py-3 text-left font-semibold">Nom et prénom / Tél</th>
            <th className="px-4 py-3 text-left font-semibold">Ville / Email</th>
            <th className="px-4 py-3 text-center font-semibold">Statut</th>
            <th className="px-4 py-3 text-center font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((item, i) => (
            <tr
              key={item.id}
              className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors border-b border-gray-100`}
            >
              <td className="px-4 py-4 text-gray-400 text-sm">{i + 1}</td>
              <td className="px-4 py-4">
                <p className="font-semibold text-gray-800">{item.nom}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.phone}</p>
              </td>
              <td className="px-4 py-4">
                {/*  VILLE : première lettre majuscule, reste minuscule */}
                <p className="text-gray-700">{capitalizeCity(item.ville)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.email}</p>
              </td>
              <td className="px-4 py-4 text-center">
                <StatusBadge status={item.status} loading={togglingIds?.has(item.id)} />
              </td>
              <td className="px-4 py-4 text-center">
                <ActionMenu
                  item={item}
                  partnerType="merchant"
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDetail={onDetail}
                  onToggleStatus={onToggleStatus}
                  isToggling={togglingIds?.has(item.id)}
                  onRestockInventory={onRestockInventory}
                  onReleaseStock={onReleaseStock}
                  onAssignParabola={onAssignParabola}
                  onAssignService={onAssignService}
                  onRemoveService={onRemoveService}
                  isOpen={openRow === item.id}
                  onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                />
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="5" className="text-center py-10 text-gray-400">Aucun commerçant trouvé</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ===================== UI HELPERS ===================== */

function StatusBadge({ status, loading = false }) {
  const isActive = status === "Actif"
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
      ${isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
    >
      {loading && <Loader2 size={11} className="animate-spin" />}
      {status || "-"}
    </span>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-gray-700 text-right">{String(value ?? "-")}</span>
    </div>
  )
}

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex justify-between items-center border-t border-gray-200 pt-4 text-sm text-gray-500 flex-wrap gap-3">
      <span>Affichage de {start} à {end} sur {total} entrées</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>Lignes par page :</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(+e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-sm"
          >
            {[5, 10, 20].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <PagBtn onClick={() => setCurrentPage(1)}                                disabled={currentPage === 1}>          <ChevronsLeft  size={16} /></PagBtn>
          <PagBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))}          disabled={currentPage === 1}>          <ChevronLeft   size={16} /></PagBtn>
          <span className="px-3 py-1 text-sm">Page <strong>{currentPage}</strong> sur {totalPages}</span>
          <PagBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight  size={16} /></PagBtn>
          <PagBtn onClick={() => setCurrentPage(totalPages)}                        disabled={currentPage === totalPages}><ChevronsRight size={16} /></PagBtn>
        </div>
      </div>
    </div>
  )
}

function PagBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"}`}
    >
      {children}
    </button>
  )
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-full text-sm transition-all ${active ? "bg-white shadow font-medium" : "text-gray-500"}`}
    >
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}