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
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"
import useAuth from "../context/auth/utils"

const DIST_API            = "https://youapi.youneed.app/pollux/prod/api/distributors/by-company"
const MERCHANT_API        = "https://youapi.youneed.app/pollux/prod/api/merchants/companies"
const DIST_CREATE_API     = "https://youapi.youneed.app/pollux/prod/api/distributors"
const MERCHANT_CREATE_API = "https://youapi.youneed.app/pollux/prod/api/merchants"

/**
 * Endpoints de bascule (activation / désactivation) dynamique du statut.
 * Le PATCH est appelé avec { isActive: true|false } dans le body.
 */
const DIST_TOGGLE_STATUS_API     = (id) => `https://youapi.youneed.app/pollux/prod/api/distributors/${id}/toggle-status`
const MERCHANT_TOGGLE_STATUS_API = (id) => `https://youapi.youneed.app/pollux/prod/api/merchants/${id}/toggle-status`

/**
 * Endpoints de modification (édition) d'un partenaire existant.
 */
const DIST_UPDATE_API     = (id) => `https://youapi.youneed.app/pollux/prod/api/distributors/${id}`
const MERCHANT_UPDATE_API = (id) => `https://youapi.youneed.app/pollux/prod/api/merchants/${id}`

/**
 * Endpoints "Services" : liste des services de l'entreprise (par companyId),
 * puis assignation multiple à un distributeur ou à un commerçant.
 *  CONFIRMÉ : GET  /products/services/company/:companyId
 *  CONFIRMÉ : POST /products/distributor/assign-multiple-services  { distributorId, serviceIds: [...] }
 *  CONFIRMÉ : POST /products/merchant/assign-multiple-services     { merchantId, serviceIds: [...] }
 */
const SERVICES_LIST_API              = "https://youapi.youneed.app/pollux/prod/api/products/services/company"
const ASSIGN_SERVICE_DISTRIBUTOR_API = "https://youapi.youneed.app/pollux/prod/api/products/distributor/assign-multiple-services"
const ASSIGN_SERVICE_MERCHANT_API    = "https://youapi.youneed.app/pollux/prod/api/products/merchant/assign-multiple-services"

/**
 * Endpoint "Services assignés à un partenaire" : liste (GET) et retrait (DELETE)
 * d'un service déjà assigné à un distributeur ou un commerçant.
 *  CONFIRMÉ : GET    /products/partners/services/:partnerId?isMerchant=true|false
 *  CONFIRMÉ : DELETE /products/partners/services/:serviceAssignmentId?isMerchant=true|false
 * isMerchant = true pour un commerçant, false pour un distributeur.
 */
const PARTNER_SERVICES_API = (id) => `https://youapi.youneed.app/pollux/prod/api/products/partners/services/${id}`

/* ══════════════════════════════════════════════
   ℹ Les actions "Réapprovisionner", "Libérer stock" et "Assigner
   parabole" ont été déplacées dans les pages de détail
   (DetailDistributeur.jsx / DetailCommercant.jsx), directement dans la
   section Stock, sur chaque sous-onglet (Carte / Décodeurs / Paraboles).
   Elles ne sont donc plus présentes dans le menu d'actions de cette liste.
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   HELPERS DE FORMATAGE
   ══════════════════════════════════════════════ */

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
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-sm transition-all
        ${isSuccess
          ? "bg-green-50 border border-green-200 text-green-700"
          : "bg-red-50 border border-red-200 text-red-700"
        }`}
    >
      {isSuccess
        ? <CheckCircle size={18} className="shrink-0 text-green-500" />
        : <AlertCircle size={18} className="shrink-0 text-red-500" />
      }
      <span className="flex-1 break-words">{notif.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0">
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

/** Normalise un service renvoyé par l'API en item affichable dans une liste à cocher. */
function normalizeService(s) {
  return {
    id:          s.id,
    name:        s.name || s.label || s.title || "Service",
    description: s.description || null,
    _raw: s,
  }
}

/**
 * Normalise un service déjà assigné à un partenaire (réponse de
 * GET /products/partners/services/:partnerId). L'id conservé ici est
 * celui de l'assignation elle-même (et non celui du service générique),
 * car c'est cet id qui doit être transmis au DELETE pour retirer le service.
 */
function normalizeAssignedService(s) {
  const service = s.service || s.productService || {}
  return {
    id:          s.id,
    name:        service.name || s.name || s.label || "Service",
    description: service.description || s.description || null,
    since:       s.createdAt
      ? new Date(s.createdAt).toLocaleDateString("fr-FR")
      : (s.assignedAt ? new Date(s.assignedAt).toLocaleDateString("fr-FR") : null),
    _raw: s,
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
    <div className="flex flex-col sm:flex-row gap-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 focus-within:border-[#1EA4DC] transition-colors">
      <div className="flex items-center gap-1.5 px-3 py-3 sm:border-r border-b sm:border-b-0 border-gray-200 shrink-0 bg-gray-100">
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
        className="flex-1 bg-gray-100 px-4 py-3 text-sm outline-none text-gray-700 placeholder-gray-400 w-full"
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-lg sm:text-xl font-semibold mb-5 pr-8">Ajouter un partenaire</h2>

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1 break-words">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 sm:gap-6 px-4 py-3 rounded-xl border border-gray-200 bg-white mb-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-lg sm:text-xl font-semibold mb-5 pr-8">
          {partnerType === "distributeur" ? "Modifier le distributeur" : "Modifier le commerçant"}
        </h2>

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1 break-words">{localError}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
   LISTE À COCHER GÉNÉRIQUE
   ──────────────────────────────────────────────
   Utilisée par "Assigner service" et "Retirer service".
   ══════════════════════════════════════════════ */

function CheckableItemRow({ item, checked, onToggle }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors
        ${checked ? "border-[#1EA4DC] bg-blue-50/60" : "border-gray-200 bg-white"}`}
    >
      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item)}
          className="accent-[#1EA4DC] w-4 h-4 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
          {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
          {item.since && <p className="text-xs text-gray-400 truncate">Assigné le {item.since}</p>}
        </div>
      </label>
    </div>
  )
}

/**
 * Modal générique de sélection multiple avec case "Tout sélectionner".
 * Réutilisée pour : Assigner service, Retirer service.
 */
function CheckableListModal({
  title,
  label,
  items,
  loading = false,
  confirmLabel = "Confirmer",
  confirmingLabel = "Traitement...",
  emptyMessage = "Aucun élément disponible",
  confirmButtonClass = "bg-[#1EA4DC] hover:bg-[#178dbf]",
  onClose,
  onConfirm,
}) {
  const [selected,    setSelected]    = useState({})
  const [observation, setObservation] = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [localError,  setLocalError]  = useState(null)

  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(items.map(it => it.id))
      const next = {}
      Object.entries(prev).forEach(([id, val]) => { if (ids.has(id)) next[id] = val })
      return next
    })
  }, [items])

  const allSelected = items.length > 0 && items.every(it => selected[it.id])

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
    } else {
      const next = {}
      items.forEach(it => { next[it.id] = it })
      setSelected(next)
    }
  }

  const toggleItem = (item) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })
  }

  const selectedItems = Object.values(selected)
  const count = selectedItems.length

  const handleConfirm = async () => {
    if (count === 0) return
    setLocalError(null)
    setSubmitting(true)
    try {
      await onConfirm({ selectedItems, observation })
    } catch (err) {
      setLocalError(err?.message || "Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-lg sm:text-xl font-semibold mb-1 pr-8">{title}</h2>
        {label && <p className="text-sm text-gray-400 mb-4 break-words">{label}</p>}

        {localError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1 break-words">{localError}</span>
            <button onClick={() => setLocalError(null)} className="ml-auto hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 mb-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-[#1EA4DC] w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Tout sélectionner</span>
          </label>
        )}

        <div className="space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
              <Loader2 size={18} className="animate-spin text-[#1EA4DC]" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : items.length > 0 ? (
            items.map(it => (
              <CheckableItemRow
                key={it.id}
                item={it}
                checked={!!selected[it.id]}
                onToggle={toggleItem}
              />
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
          )}
        </div>

        {!loading && items.length > 0 && (
          <>
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
                  {count} élément{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={count === 0 || submitting}
                className={`w-full text-white py-3.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmButtonClass}`}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? confirmingLabel : confirmLabel}
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

  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  // Les distributeurs et commerçants sont deux ressources distinctes
  // côté back, donc les codes de permission sont calculés par onglet
  // actif (même logique que Services/Produits dans Produits.jsx).
  // ⚠️ Adapter ces codes aux permissions réelles exposées par le back
  // si elles diffèrent.
  const { can } = useAuth()
  const isDistTab = activeTab === "distributeurs"

  const canCreatePartner        = isDistTab ? can("DISTRIBUTOR_CREATE")        : can("MERCHANT_CREATE")
  const canViewPartner          = isDistTab ? can("DISTRIBUTOR_READ")         : can("MERCHANT_READ")
  const canEditPartner          = isDistTab ? can("DISTRIBUTOR_UPDATE")       : can("MERCHANT_UPDATE")
  const canDeletePartner        = isDistTab ? can("DISTRIBUTOR_DELETE")       : can("MERCHANT_DELETE")
  const canTogglePartnerStatus  = isDistTab ? can("DISTRIBUTOR_TOGGLE_STATUS"): can("MERCHANT_TOGGLE_STATUS")
  const canAssignPartnerService = isDistTab ? can("DISTRIBUTOR_ASSIGN_SERVICE") : can("MERCHANT_ASSIGN_SERVICE")
  const canRemovePartnerService = isDistTab ? can("DISTRIBUTOR_REMOVE_SERVICE") : can("MERCHANT_REMOVE_SERVICE")

  const [distributeurs, setDistributeurs] = useState([])
  const [commercants,   setCommercants]   = useState([])
  const [loading,       setLoading]       = useState(false)

  const [createModal,  setCreateModal]  = useState(false)
  const [editModal,    setEditModal]    = useState(false)
  const [deleteModal,  setDeleteModal]  = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const [assignServiceModal, setAssignServiceModal] = useState(false)
  const [removeServiceModal, setRemoveServiceModal] = useState(false)
  const [searchQuery,  setSearchQuery]  = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Catalogue de services de l'entreprise, chargé depuis l'API à
  // l'ouverture de la modale "Assigner service".
  const [services,        setServices]        = useState([])
  const [servicesLoading, setServicesLoading]  = useState(false)

  // Services déjà assignés à un partenaire, chargés depuis l'API à
  // l'ouverture de la modale "Retirer service".
  const [assignedServices,        setAssignedServices]        = useState([])
  const [assignedServicesLoading, setAssignedServicesLoading]  = useState(false)

  // IDs des lignes dont le statut est en cours de bascule (appel API en cours)
  const [togglingIds, setTogglingIds] = useState(() => new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20) // limite par défaut : 20 éléments / page
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

  /*  CORRECTION PAGINATION :
      Avant, le fetch envoyait déjà `page` et `limit` à l'API (qui ne
      renvoyait donc que 20 éléments), puis le rendu redécoupait CE
      tableau déjà réduit avec filteredData.slice(start, end) → sur la
      page 2, on tentait de découper les éléments 20 à 40 dans un
      tableau qui n'en contenait que 20, ce qui donnait un résultat
      vide et bloquait la pagination.

      Comme dans Produits.jsx, on récupère maintenant TOUTE la liste en
      un seul appel (limite haute, page 1), et c'est le rendu qui gère
      seul la recherche, le filtre de statut et la pagination page par
      page côté client. */
  const fetchDistributeurs = useCallback(async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const companyId = await resolveCompanyId()
      if (!companyId) throw new Error("CompanyId manquant")

      const res = await axios.get(
        `${DIST_API}/${companyId}?page=1&limit=1000`,
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

  const fetchCommercants = useCallback(async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      const companyId = await resolveCompanyId()
      if (!companyId) throw new Error("CompanyId manquant")

      const res = await axios.get(
        `${MERCHANT_API}/${companyId}?page=1&limit=1000`,
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

  /**
   * ✅ CONFIRMÉ — GET /products/services/company/:companyId
   * Récupère la liste des services de l'entreprise, utilisée pour
   * alimenter la modale "Assigner service".
   */
  const fetchAvailableServices = useCallback(async () => {
    try {
      setServicesLoading(true)
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile?.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")

      const res = await axios.get(`${SERVICES_LIST_API}/${companyId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      const raw = Array.isArray(res.data?.data) ? res.data.data : []
      setServices(raw.map(normalizeService))
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("company")
      }
      showError(err?.response?.data?.message || err?.response?.data?.description || err.message || "Impossible de charger les services")
      setServices([])
    } finally {
      setServicesLoading(false)
    }
  }, [showError])

  /**
   * ✅ CONFIRMÉ — GET /products/partners/services/:partnerId?isMerchant=true|false
   * Récupère la liste des services déjà assignés à un partenaire donné,
   * utilisée pour alimenter la modale "Retirer service".
   */
  const fetchAssignedServices = useCallback(async (partnerId, isMerchant) => {
    try {
      setAssignedServicesLoading(true)
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!partnerId) throw new Error("Identifiant du partenaire manquant")

      const res = await axios.get(
        `${PARTNER_SERVICES_API(partnerId)}?isMerchant=${isMerchant}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      const raw = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      setAssignedServices(raw.map(normalizeAssignedService))
    } catch (err) {
      showError(err?.response?.data?.description || err.message || "Impossible de charger les services assignés")
      setAssignedServices([])
    } finally {
      setAssignedServicesLoading(false)
    }
  }, [showError])

  useEffect(() => {
    if (activeTab === "distributeurs") fetchDistributeurs()
    else                               fetchCommercants()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Revenir automatiquement à la page 1 quand on change d'onglet, de recherche,
  // de filtre de statut ou du nombre d'éléments par page.
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, statusFilter, rowsPerPage])

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

  // Recaler la page courante si elle devient invalide (ex: filtrage qui réduit
  // fortement le nombre de résultats affichables)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  /**
   * Active / désactive un distributeur ou un commerçant de façon dynamique
   * via l'API PATCH .../toggle-status, en récupérant l'id du partenaire
   * directement dans l'URL de l'endpoint.
   */
  const handleToggleStatus = async (item) => {
    if (togglingIds.has(item.id)) return

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
      fetchDistributeurs()
    } else {
      fetchCommercants()
    }
  }, [showSuccess, fetchDistributeurs, fetchCommercants])

  const handleUpdated = useCallback((type, message) => {
    showSuccess(message)
    if (type === "distributor") {
      fetchDistributeurs()
    } else {
      fetchCommercants()
    }
  }, [showSuccess, fetchDistributeurs, fetchCommercants])

  const handleDetailDistributor = (item) => {
    navigate(`/detail_distributeur/${item.id}`)
  }

  const handleDetailMerchant = (item) => {
    navigate(`/detail_commercant/${item.id}`)
  }

  const handleAssignService = (item) => {
    setSelectedItem(item)
    setAssignServiceModal(true)
    fetchAvailableServices()
  }

  const handleRemoveService = (item) => {
    setSelectedItem(item)
    setRemoveServiceModal(true)
    fetchAssignedServices(item.id, activeTab === "commercants")
  }

  /**
   *  CONFIRMÉ — Assigne les services cochés au partenaire sélectionné :
   * POST /products/distributor/assign-multiple-services { distributorId, serviceIds }
   * POST /products/merchant/assign-multiple-services    { merchantId, serviceIds }
   */
  const handleConfirmAssignService = useCallback(async ({ selectedItems }) => {
    const label = selectedItem?.raisonSociale && selectedItem.raisonSociale !== "-"
      ? selectedItem.raisonSociale
      : selectedItem?.nom
    const isDistributeur = activeTab === "distributeurs"

    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!selectedItem?.id) throw new Error("Identifiant du partenaire manquant")

      const url = isDistributeur ? ASSIGN_SERVICE_DISTRIBUTOR_API : ASSIGN_SERVICE_MERCHANT_API
      const payload = {
        serviceIds: selectedItems.map(it => it.id),
        ...(isDistributeur ? { distributorId: selectedItem.id } : { merchantId: selectedItem.id }),
      }

      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      showSuccess(
        `${selectedItems.length} service${selectedItems.length > 1 ? "s" : ""} assigné${selectedItems.length > 1 ? "s" : ""} à "${label}" avec succès`
      )
      setAssignServiceModal(false)
      setSelectedItem(null)
    } catch (err) {
      const message = err?.response?.data?.description || err?.response?.data?.message || err.message || "Impossible d'assigner le/les service(s)"
      showError(message)
      throw new Error(message)
    }
  }, [selectedItem, activeTab, showSuccess, showError])

  /**
   *  CONFIRMÉ — Retire les services cochés (déjà assignés) de ce partenaire :
   * DELETE /products/partners/services/:serviceAssignmentId?isMerchant=true|false
   */
  const handleConfirmRemoveService = useCallback(async ({ selectedItems }) => {
    const label = selectedItem?.raisonSociale && selectedItem.raisonSociale !== "-"
      ? selectedItem.raisonSociale
      : selectedItem?.nom
    const isMerchant = activeTab === "commercants"

    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      await Promise.all(
        selectedItems.map(it =>
          axios.delete(`${PARTNER_SERVICES_API(it.id)}?isMerchant=${isMerchant}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          })
        )
      )

      showSuccess(
        `${selectedItems.length} service${selectedItems.length > 1 ? "s" : ""} retiré${selectedItems.length > 1 ? "s" : ""} de "${label}"`
      )
      setRemoveServiceModal(false)
      setSelectedItem(null)
    } catch (err) {
      const message = err?.response?.data?.description || err?.response?.data?.message || err.message || "Impossible de retirer le/les service(s)"
      showError(message)
      throw new Error(message)
    }
  }, [selectedItem, activeTab, showSuccess, showError])

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Gestion des Partenaires</h1>
        <p className="text-gray-500 text-xs sm:text-sm lg:text-base">Gérer distributeurs et commerçants</p>
      </div>

      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <Tab label="Distributeurs" active={activeTab === "distributeurs"} onClick={() => setActiveTab("distributeurs")} />
        <Tab label="Commerçants"   active={activeTab === "commercants"}   onClick={() => setActiveTab("commercants")} />
      </div>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 space-y-4 sm:space-y-6 min-w-0">

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h2 className="font-semibold text-base sm:text-lg">
              {activeTab === "distributeurs" ? "Liste des Distributeurs" : "Liste des Commerçants"}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">
              {filteredData.length}{" "}
              {activeTab === "distributeurs" ? "Distributeur(s)" : "Commerçant(s)"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:flex-1 lg:justify-end lg:flex-wrap">
            <div className="relative w-full sm:w-64">
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
              className="w-full sm:w-auto bg-gray-100 rounded-lg px-4 py-2 text-sm outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>

            {canCreatePartner && (
              <button
                onClick={() => setCreateModal(true)}
                className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap w-full sm:w-auto"
              >
                <Plus size={16} />
                Ajouter partenaire
              </button>
            )}
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
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            {activeTab === "distributeurs" ? (
              <DistributeursTable
                data={paginatedData}
                onEdit={(item)   => { setSelectedItem(item); setEditModal(true) }}
                onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
                onDetail={handleDetailDistributor}
                onToggleStatus={handleToggleStatus}
                togglingIds={togglingIds}
                onAssignService={handleAssignService}
                onRemoveService={handleRemoveService}
                canView={canViewPartner}
                canEdit={canEditPartner}
                canDelete={canDeletePartner}
                canToggle={canTogglePartnerStatus}
                canAssignService={canAssignPartnerService}
                canRemoveService={canRemovePartnerService}
              />
            ) : (
              <CommercantTable
                data={paginatedData}
                onEdit={(item)   => { setSelectedItem(item); setEditModal(true) }}
                onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
                onDetail={handleDetailMerchant}
                onToggleStatus={handleToggleStatus}
                togglingIds={togglingIds}
                onAssignService={handleAssignService}
                onRemoveService={handleRemoveService}
                canView={canViewPartner}
                canEdit={canEditPartner}
                canDelete={canDeletePartner}
                canToggle={canTogglePartnerStatus}
                canAssignService={canAssignPartnerService}
                canRemoveService={canRemovePartnerService}
              />
            )}
          </div>
        )}

        <PaginationFooter
          total={filteredData.length}
          start={filteredData.length === 0 ? 0 : start + 1}
          end={Math.min(end, filteredData.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
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
          <p className="text-gray-600 text-sm break-words">
            Voulez-vous vraiment supprimer{" "}
            <strong>
              {selectedItem?.raisonSociale !== "-" ? selectedItem.raisonSociale : selectedItem?.nom}
            </strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
            <button
              onClick={() => { setDeleteModal(false); setSelectedItem(null) }}
              className="border border-gray-200 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors w-full sm:w-auto"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}

      {/*  ASSIGNER SERVICE — catalogue chargé en direct depuis l'API (products/services/company/:companyId), cochable un par un ou en une fois */}
      {assignServiceModal && selectedItem && (
        <CheckableListModal
          title="Assigner service"
          label={selectedItem?.raisonSociale && selectedItem.raisonSociale !== "-" ? selectedItem.raisonSociale : selectedItem?.nom}
          items={services}
          loading={servicesLoading}
          confirmLabel="Assigner"
          confirmingLabel="Assignation..."
          emptyMessage="Aucun service disponible"
          onClose={() => { setAssignServiceModal(false); setSelectedItem(null) }}
          onConfirm={handleConfirmAssignService}
        />
      )}

      {/*  RETIRER SERVICE — services déjà assignés au partenaire, chargés en direct
          depuis l'API (products/partners/services/:partnerId), cochables un par un
          ou tous ensemble ; chaque validation déclenche un DELETE par service retiré */}
      {removeServiceModal && selectedItem && (
        <CheckableListModal
          title="Retirer service"
          label={selectedItem?.raisonSociale && selectedItem.raisonSociale !== "-" ? selectedItem.raisonSociale : selectedItem?.nom}
          items={assignedServices}
          loading={assignedServicesLoading}
          confirmLabel="Retirer"
          confirmingLabel="Retrait..."
          emptyMessage="Aucun service assigné à ce partenaire"
          confirmButtonClass="bg-red-500 hover:bg-red-600"
          onClose={() => { setRemoveServiceModal(false); setSelectedItem(null) }}
          onConfirm={handleConfirmRemoveService}
        />
      )}

    </div>
  )
}

/* ===================== ACTION MENU ===================== */
/*
   AJOUT PERMISSIONS : chaque entrée du menu ("Voir détails", "Modifier",
   "Assigner service", "Retirer service", "Activer/Désactiver",
   "Supprimer") est désormais conditionnée par un flag show* transmis en
   props (même logique que ActionMenu dans Produits.jsx). Si aucune
   action n'est autorisée, le bouton "..." n'est même pas rendu.
*/

function ActionMenu({ 
  item, 
  partnerType,
  onEdit, 
  onDelete, 
  onDetail, 
  onToggleStatus, 
  isToggling,
  onAssignService,
  onRemoveService,
  isOpen, 
  onToggle,
  showDetail = true,
  showEdit = true,
  showDelete = true,
  showToggle = true,
  showAssignService = true,
  showRemoveService = true,
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

  // Aucune action autorisée pour cette ligne → on n'affiche même pas le "..."
  if (!showDetail && !showEdit && !showAssignService && !showRemoveService && !showToggle && !showDelete) {
    return null
  }

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
          {showDetail && (
            <button
              type="button"
              onClick={() => { onDetail(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
            >
              <Eye size={15} className="text-gray-500" /> Voir détails
            </button>
          )}

          {showEdit && (
            <button
              type="button"
              onClick={() => { onEdit(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
            >
              <Pencil size={15} className="text-gray-500" /> Modifier
            </button>
          )}

          {(showAssignService || showRemoveService) && (showDetail || showEdit) && (
            <div className="my-1 border-t border-gray-100" />
          )}

          {showAssignService && (
            <button
              type="button"
              onClick={() => { onAssignService(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
            >
              <CheckCircle2 size={15} /> Assigner service
            </button>
          )}

          {showRemoveService && (
            <button
              type="button"
              onClick={() => { onRemoveService(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-[#1EA4DC] hover:bg-blue-50 transition-colors"
            >
              <XCircle size={15} /> Retirer service
            </button>
          )}

          {showToggle && (
            <>
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
            </>
          )}

          {showDelete && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => { onDelete(item); onToggle() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} /> Supprimer
              </button>
            </>
          )}
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
  onAssignService,
  onRemoveService,
  canView,
  canEdit,
  canDelete,
  canToggle,
  canAssignService,
  canRemoveService,
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
    <div ref={tableRef} className="rounded-xl">
      <table className="table-auto min-w-[640px] w-full text-sm">
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
                <p className="font-semibold text-gray-800">
                  {item.raisonSociale !== "-" ? item.raisonSociale.toUpperCase() : "-"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.nom}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-gray-700">{item.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.phone}</p>
              </td>
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
                  onAssignService={onAssignService}
                  onRemoveService={onRemoveService}
                  isOpen={openRow === item.id}
                  onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                  showDetail={canView}
                  showEdit={canEdit}
                  showDelete={canDelete}
                  showToggle={canToggle}
                  showAssignService={canAssignService}
                  showRemoveService={canRemoveService}
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
  onAssignService,
  onRemoveService,
  canView,
  canEdit,
  canDelete,
  canToggle,
  canAssignService,
  canRemoveService,
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
    <div ref={tableRef} className="rounded-xl">
      <table className="table-auto min-w-[560px] w-full text-sm">
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
                  onAssignService={onAssignService}
                  onRemoveService={onRemoveService}
                  isOpen={openRow === item.id}
                  onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                  showDetail={canView}
                  showEdit={canEdit}
                  showDelete={canDelete}
                  showToggle={canToggle}
                  showAssignService={canAssignService}
                  showRemoveService={canRemoveService}
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
      ${isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
    >
      {loading && <Loader2 size={11} className="animate-spin" />}
      {status || "-"}
    </span>
  )
}

/* ===================== PAGINATION ===================== */
/* Style identique à celui de la page Produits (même composant, même classes). */

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  const isFirstPage = currentPage <= 1
  const isLastPage  = currentPage >= totalPages

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
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-gray-500 whitespace-nowrap hidden sm:inline">Par page</label>
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(+e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-xs sm:text-sm bg-white"
          >
            {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={isFirstPage}
            aria-label="Première page"
            className={btnClass(isFirstPage)}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={isFirstPage}
            aria-label="Page précédente"
            className={btnClass(isFirstPage)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-gray-600 whitespace-nowrap px-1.5 font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={isLastPage}
            aria-label="Page suivante"
            className={btnClass(isLastPage)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
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

/* Tab identique à celle du fichier Produits (mêmes tailles, mêmes classes),
   utilisée ici pour les boutons "Distributeurs" / "Commerçants". */
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${active ? "bg-white shadow" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h2 className="text-lg sm:text-xl font-semibold mb-5 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  )
}