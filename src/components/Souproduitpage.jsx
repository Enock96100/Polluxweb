import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { PlusCircle, ChevronDown, Info, ArrowLeft, CheckCircle, AlertCircle, X, Building2, Layers  } from "lucide-react"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"
import useAuth from "../context/auth/utils"

const SUBPRODUCT_API      = "https://youapi.youneed.app/pollux/prod/api/products/sub-products"
const SUBPRODUCT_BULK_API = "https://youapi.youneed.app/pollux/prod/api/products/sub-products/bulk"
const BANK_API             = "https://youapi.youneed.app/pollux/prod/api/products/banks"
const FORMULA_API          = "https://youapi.youneed.app/pollux/prod/api/prepairs-formula/service"
const PARABOLA_API         = "https://youapi.youneed.app/pollux/prod/api/formula-canals/parabolas"

function getServiceType(service) {
  if (!service) return null
  const cat = (service.category || "").toUpperCase()
  if (cat.includes("PREPAID") || cat.includes("CARD")) return "carte"
  if (cat.includes("CANAL")) return "canal"
  return "carte"
}

/* ══════════════════════════════════════════════
   SYSTÈME DE NOTIFICATION CENTRALISÉ
   Identique à Produits.jsx — auto-disparition 4s
   ══════════════════════════════════════════════ */
function useNotification() {
  const [notif, setNotif] = useState(null) // { type: "success" | "error", message }
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

/* Bandeau de notification — réutilisé dans la page et dans chaque modal */
function NotificationBanner({ notif, onDismiss }) {
  if (!notif) return null
  const isSuccess = notif.type === "success"
  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-sm
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
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
   ══════════════════════════════════════════════ */
export default function SubProductCreationPage() {
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()
  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  const { can } = useAuth()

  const [products,  setProducts]  = useState([])
  const [banks,     setBanks]     = useState([])
  const [formulas,  setFormulas]  = useState([])
  const [parabolas, setParabolas] = useState([])

  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [loading,           setLoading]           = useState(false)

  const selectedService = products.find((p) => p.id === selectedServiceId)
  const serviceType     = getServiceType(selectedService)

  useEffect(() => {
    const load = async () => {
      try {
        let { token, companyId } = getAuthData()
        if (!token) return
        if (!companyId) {
          const profile = await fetchProfile()
          companyId = profile?.company?.id
        }
        const res = await axios.get(
          `https://youapi.youneed.app/pollux/prod/api/products/services/company/${companyId}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        )
        setProducts(Array.isArray(res?.data?.data) ? res.data.data : [])
      } catch {
        setProducts([])
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedServiceId || !serviceType) return
    const load = async () => {
      try {
        const { token } = getAuthData()
        const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" }
        if (serviceType === "carte") {
          const [banksRes, formulasRes] = await Promise.all([
            axios.get(BANK_API, { headers }).catch(() => ({ data: { data: [] } })),
            axios.get(`${FORMULA_API}/${selectedServiceId}`, { headers }).catch(() => ({ data: { data: [] } })),
          ])
          setBanks(Array.isArray(banksRes?.data?.data)       ? banksRes.data.data    : [])
          setFormulas(Array.isArray(formulasRes?.data?.data) ? formulasRes.data.data : [])
        }
        if (serviceType === "canal") {
          const parabolasRes = await axios.get(PARABOLA_API, { headers }).catch(() => ({ data: { data: [] } }))
          setParabolas(Array.isArray(parabolasRes?.data?.data) ? parabolasRes.data.data : [])
        }
      } catch {
        setBanks([]); setFormulas([]); setParabolas([])
      }
    }
    load()
  }, [selectedServiceId, serviceType])

  const handleServiceChange = (e) => {
    setSelectedServiceId(e.target.value)
    setBanks([]); setFormulas([]); setParabolas([])
    dismiss()
  }

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Ajouter un produit</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Renseignez les informations du sous-produit</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm self-start sm:self-auto"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>

      {/* Bandeau notification page */}
      <NotificationBanner notif={notif} onDismiss={dismiss} />

      {/* Sélecteur de service */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Sélectionner le service</label>
        <div className="relative w-full sm:max-w-md">
          <select
            value={selectedServiceId}
            onChange={handleServiceChange}
            className="w-full appearance-none bg-gray-100 px-4 py-3 rounded-lg pr-10 text-gray-700 text-sm sm:text-base"
          >
            <option value="">-- Choisir un service --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Badge service sélectionné */}
      {selectedService && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 sm:px-5 py-3 sm:py-4">
          <p className="text-xs font-semibold text-[#1EA4DC] uppercase tracking-wider mb-1">
            Service sélectionné :
          </p>
          <p className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{selectedService.name}</p>
        </div>
      )}

      {/* INTERFACE CARTE PRÉPAYÉE */}
      {selectedService && serviceType === "carte" && (
        <CartePrePayeeSection
          banks={banks}
          setBanks={setBanks}
          formulas={formulas}
          setFormulas={setFormulas}
          serviceId={selectedServiceId}
          navigate={navigate}
          showSuccess={showSuccess}
          showError={showError}
          setLoading={setLoading}
          loading={loading}
          can={can}
        />
      )}

      {/* INTERFACE CANAL+ */}
      {selectedService && serviceType === "canal" && (
        <CanalPlusSection
          parabolas={parabolas}
          serviceId={selectedServiceId}
          navigate={navigate}
          showSuccess={showSuccess}
          showError={showError}
          setLoading={setLoading}
          loading={loading}
          can={can}
        />
      )}

    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL CRÉER FORMULE
   ══════════════════════════════════════════════ */
function CreateFormuleModal({ serviceId, onClose, onCreated }) {
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [form, setForm] = useState({
    name:        "",
    code:        "",
    description: "",
    maxBalance:  "",
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    dismiss()
    if (!form.name.trim())  return showError("Le nom de la formule est obligatoire")
    if (!form.code.trim())  return showError("Le niveau de la formule est obligatoire")
    if (!form.maxBalance)   return showError("Le prix unitaire est obligatoire")
    if (!serviceId)         return showError("Aucun service sélectionné")

    try {
      setSaving(true)
      const { token } = getAuthData()
      await axios.post(
        FORMULA_API,
        {
          name:        form.name.trim(),
          code:        form.code.trim(),
          description: form.description?.trim() || "",
          maxBalance:  Number(form.maxBalance),
          serviceId,
        },
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
        }
      )
      showSuccess(`Formule "${form.name}" créée avec succès !`)
      setTimeout(() => onCreated(), 1200)
    } catch (e) {
      showError(e?.response?.data?.message || e.message || "Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer une nouvelle formule</h2>
            <p className="text-xs sm:text-sm text-gray-400">Ajouter la formule</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
        </div>

        <NotificationBanner notif={notif} onDismiss={dismiss} />

        <div className="space-y-4">
           <div className="space-y-1">
            <label className="text-sm text-gray-700">Code de la formule</label>
            <div className="relative">
              <select
                name="code"
                value={form.code}
                onChange={handleChange}
                className="w-full appearance-none bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none pr-10"
              >
                <option value="">Sélectionner un niveau</option>
                <option value="LOW">Standard (LOW)</option>
                <option value="MIDDLE">Premium (MIDDLE)</option>
                <option value="HIGH">VIP (HIGH)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Nom de la formule</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Prix maximum</label>
            <input
              name="maxBalance"
              type="number"
              value={form.maxBalance}
              onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description (Optionnel)"
              rows={4}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm resize-none outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
          <button onClick={onClose} className="border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <PlusCircle size={16} />
            {saving ? "Création..." : "Créer la formule"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL CRÉER BANQUE
   ══════════════════════════════════════════════ */
function CreateBanqueModal({ onClose, onCreated }) {
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [form, setForm] = useState({
    name:        "",
    code:        "",
    description: "",
    logo:        "",
  })
  const [logoPreview, setLogoPreview] = useState("")
  const [saving,      setSaving]      = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setLogoPreview(dataUrl)
      setForm((prev) => ({ ...prev, logo: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    dismiss()
    if (!form.name.trim()) return showError("Le nom de la banque est obligatoire")
    if (!form.code.trim()) return showError("Le code de la banque est obligatoire")

    try {
      setSaving(true)
      const { token } = getAuthData()
      await axios.post(
        BANK_API,
        {
          name:        form.name.trim(),
          code:        form.code.trim(),
          description: form.description?.trim() || "",
          logo:        form.logo || "",
        },
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
        }
      )
      showSuccess(`Banque "${form.name}" créée avec succès !`)
      setTimeout(() => onCreated(), 1200)
    } catch (e) {
      showError(e?.response?.data?.message || e.message || "Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer une nouvelle banque</h2>
            <p className="text-xs sm:text-sm text-gray-400">Ajouter une banque</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
        </div>

        <NotificationBanner notif={notif} onDismiss={dismiss} />

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Nom de la banque</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Code</label>
            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="ex : BHD"
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description (Optionnel)"
              rows={3}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm resize-none outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-700">Logo de la banque</label>

            {logoPreview && (
              <div className="flex items-center justify-center w-full h-24 bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden">
                <img src={logoPreview} alt="Aperçu logo" className="h-full object-contain" />
              </div>
            )}

            <label className="flex items-center justify-center w-full h-12 bg-gray-100 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-500">
                {logoPreview ? "Changer l'image" : "Choisir une image"}
              </span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <input
              name="logo"
              value={form.logo.startsWith("data:") ? "" : form.logo}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, logo: e.target.value }))
                setLogoPreview(e.target.value)
              }}
              placeholder="Ou coller une URL d'image"
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
          <button onClick={onClose} className="border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <PlusCircle size={16} />
            {saving ? "Création..." : "Créer la banque"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION CARTE PRÉPAYÉE
   ══════════════════════════════════════════════ */
function CartePrePayeeSection({
  banks,
  setBanks,
  formulas,
  setFormulas,
  serviceId,
  navigate,
  showSuccess,
  showError,
  setLoading,
  loading,
  can,
}) {
  const [form, setForm] = useState({
    bankId:               "",
    prepaidCardFormulaId: "",
    name:                 "",
    price:                "",
    startNumber:          "",
    endNumber:            "",
  })

  const [createFormuleModal, setCreateFormuleModal] = useState(false)
  const [createBanqueModal,  setCreateBanqueModal]  = useState(false)

  // BANK_CREATE : code confirmé dans le catalogue (module BANK_MANAGEMENT).
  const canCreateBank = can("BANK_CREATE")
  // ⚠️ À CONFIRMER : aucun code dédié dans le catalogue pour la création
  // d'une formule de carte prépayée ni pour la génération en masse de
  // cartes — SUBPRODUCT_CREATE utilisé comme proxy le plus proche (même
  // logique que Ajouter_carte.jsx).
  const canCreateFormula = can("SUBPRODUCT_CREATE")
  const canGenerateCards = can("SUBPRODUCT_CREATE")

  const refreshFormulas = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${FORMULA_API}/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setFormulas(Array.isArray(res?.data?.data) ? res.data.data : [])
    } catch { /* silencieux */ }
  }

  const refreshBanks = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(BANK_API, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setBanks(Array.isArray(res?.data?.data) ? res.data.data : [])
    } catch { /* silencieux */ }
  }

  const handleFormuleCreated = async () => {
    await refreshFormulas()
    setCreateFormuleModal(false)
  }

  const handleBanqueCreated = async () => {
    await refreshBanks()
    setCreateBanqueModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  /* ── Génération des cartes via l'API bulk ── */
  const handleSubmit = async () => {
    if (!form.bankId)               return showError("Veuillez sélectionner une banque")
    if (!form.prepaidCardFormulaId) return showError("Veuillez sélectionner une formule")
    if (!form.name.trim())          return showError("Le nom de la carte est obligatoire")
    if (!form.price)                return showError("Le prix est obligatoire")
    if (!form.startNumber || !form.endNumber)
      return showError("Veuillez renseigner l'intervalle des numéros")

    const start = parseInt(form.startNumber, 10)
    const end   = parseInt(form.endNumber,   10)

    if (isNaN(start) || isNaN(end))  return showError("Les numéros doivent être numériques")
    if (start > end)                  return showError("Le numéro de début doit être inférieur au numéro de fin")

    try {
      setLoading(true)
      const { token } = getAuthData()
      const headers = {
        Authorization:  `Bearer ${token}`,
        Accept:         "application/json",
        "Content-Type": "application/json",
      }
      const total = end - start + 1

      // Chaque carte a son propre code unique ; serviceId/bankId/prepaidCardFormulaId
      // restent communs et sont envoyés une seule fois au niveau racine.
      const subProducts = []
      for (let i = start; i <= end; i++) {
        subProducts.push({
          name:           form.name.trim(),
          code:           String(i).padStart(10, "0"),
          description:    `Carte ${Number(form.price).toLocaleString()} FCFA`,
          price:          Number(form.price),
          durationInDays: 365,
          renewable:      true,
        })
      }

      await axios.post(
        SUBPRODUCT_BULK_API,
        {
          serviceId,
          bankId:               form.bankId,
          prepaidCardFormulaId: form.prepaidCardFormulaId,
          subProducts,
        },
        { headers }
      )

      showSuccess(`${total} carte(s) générée(s) avec succès`)
      setForm({ bankId: "", prepaidCardFormulaId: "", name: "", price: "", startNumber: "", endNumber: "" })
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la génération des cartes")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {createFormuleModal && (
        <CreateFormuleModal
          serviceId={serviceId}
          onClose={() => setCreateFormuleModal(false)}
          onCreated={handleFormuleCreated}
        />
      )}

      {createBanqueModal && (
        <CreateBanqueModal
          onClose={() => setCreateBanqueModal(false)}
          onCreated={handleBanqueCreated}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Banque */}
        <div className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
           <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#1EA4DC]" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Banque</h3>
              </div>
            {canCreateBank && (
              <button type="button" onClick={() => setCreateBanqueModal(true)}
                  className="flex items-center gap-1 text-xs text-[#1EA4DC] hover:opacity-75 transition-opacity">
                  <PlusCircle size={16} />
                  Nouvelle
                </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500">Sélectionner la banque</p>
          <div className="relative">
            <select
              name="bankId"
              value={form.bankId}
              onChange={handleChange}
              className="w-full appearance-none bg-gray-100 px-4 py-2 rounded-lg pr-10 text-gray-700 text-sm"
            >
              <option value="">-- Banque --</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Formule carte */}
        <div className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
             <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#1EA4DC]" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Formule carte</h3>
              </div>
            {canCreateFormula && (
              <button type="button" onClick={() => setCreateFormuleModal(true)}
                  className="flex items-center gap-1 text-xs text-[#1EA4DC] hover:opacity-75 transition-opacity">
                  <PlusCircle size={16} />
                  Nouvelle
                </button>
            )}
            </div>
          <p className="text-xs sm:text-sm text-gray-500">Sélectionner la formule</p>
          <div className="relative">
            <select
              name="prepaidCardFormulaId"
              value={form.prepaidCardFormulaId}
              onChange={handleChange}
              className="w-full appearance-none bg-gray-100 px-4 py-2 rounded-lg pr-10 text-gray-700 text-sm"
            >
              <option value="">-- Formule --</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <h3 className="text-base sm:text-lg font-semibold">Informations des Cartes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Nom de la carte</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Prix</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Intervales de numéros</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input name="startNumber" value={form.startNumber} onChange={handleChange} placeholder="Debut numéro" className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
            <input name="endNumber"   value={form.endNumber}   onChange={handleChange} placeholder="Fin numéro"   className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
          </div>
        </div>

          {form.startNumber && form.endNumber && parseInt(form.endNumber) >= parseInt(form.startNumber) && (
            <div className="bg-[#EAF6FD] border border-[#B8E3F5] rounded-lg px-4 py-3 text-xs sm:text-sm text-[#1EA4DC] font-medium">
              {parseInt(form.endNumber, 10) - parseInt(form.startNumber, 10) + 1} carte(s) seront générées
            </div>
          )}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-400 break-words">
            Les numéros sont générés automatiquement sur 10 chiffres — ex : <span className="font-mono">0000000001</span>
          </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button onClick={() => navigate(-1)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">
          Annuler
        </button>
        {canGenerateCards && (
          <button onClick={handleSubmit} disabled={loading} className="bg-[#1EA4DC] text-white px-6 py-2 rounded-lg text-sm disabled:opacity-60">
            {loading ? "Création..." : "Générer la carte"}
          </button>
        )}
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   MODAL CRÉER PARABOLE
   ══════════════════════════════════════════════ */
function CreateParaboleModal({ onClose, onCreated }) {
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [form, setForm] = useState({
    name:        "",
    brand:       "",
    model:       "",
    price:       "",
    description: "",
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    dismiss()
    if (!form.name.trim()) return showError("Le nom du parabole est obligatoire")
    if (!form.price)       return showError("Le prix unitaire est obligatoire")

    try {
      setSaving(true)
      let { token, companyId } = getAuthData()
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }

      // Génération automatique du code : on récupère les paraboles existantes
      // pour cette entreprise, on repère le plus grand numéro au format PAR-XXX,
      // puis on incrémente.
      let generatedCode = "PAR-001"
      try {
        const listRes = await axios.get(`${PARABOLA_API}?page=1&limit=1000`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        })
        const existing = listRes.data?.data || []
        let maxNumber = 0
        existing.forEach((p) => {
          const match = /^PAR-(\d+)$/.exec(p.code || "")
          if (match) {
            const num = parseInt(match[1], 10)
            if (!Number.isNaN(num) && num > maxNumber) maxNumber = num
          }
        })
        generatedCode = `PAR-${String(maxNumber + 1).padStart(3, "0")}`
      } catch (listErr) {
        console.error("[Parabole] Erreur récupération liste pour génération du code :", listErr)
      }

      await axios.post(
        PARABOLA_API,
        {
          companyId,
          name:        form.name.trim(),
          code:        generatedCode,
          brand:       form.brand.trim(),
          model:       form.model.trim(),
          price:       Number(form.price),
          description: form.description?.trim() || "",
          isActive:    true,
        },
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
        }
      )
      showSuccess(`Parabole "${form.name}" créé avec succès (${generatedCode}) !`)
      setTimeout(() => onCreated(), 1200)
    } catch (e) {
      showError(e?.response?.data?.message || e.message || "Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer un nouveau parabole</h2>
            <p className="text-xs sm:text-sm text-gray-400">Ajouter un parabole</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
        </div>

        <NotificationBanner notif={notif} onDismiss={dismiss} />

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Nom du parabole</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Prix Unitaire</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Marque</label>
            <input name="brand" value={form.brand} onChange={handleChange} placeholder="ex : Triax, Technisat…" className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Modèle</label>
            <input name="model" value={form.model} onChange={handleChange} placeholder="ex : 88cm Offset…" className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description (Optionnel)"
              rows={4}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm resize-none outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
          <button onClick={onClose} className="border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <PlusCircle size={16} />
            {saving ? "Création..." : "Créer le parabole"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION CANAL+
   ══════════════════════════════════════════════ */
function CanalPlusSection({ parabolas: initialParabolas, serviceId, navigate, showSuccess, showError, setLoading, loading, can }) {
  const [withParabola,       setWithParabola]       = useState(false)
  const [selectedParabolaId, setSelectedParabolaId] = useState("")
  const [form, setForm]      = useState({ name: "", code: "", description: "" })
  const [showModal,          setShowModal]           = useState(false)
  const [parabolas,          setParabolas]           = useState(initialParabolas)

  // ⚠️ À CONFIRMER : aucun code dédié pour la création d'une parabole
  // (/formula-canals/parabolas) ni pour la création d'un décodeur —
  // SUBPRODUCT_CREATE utilisé comme proxy le plus proche (même logique
  // que Ajouter_decodeur.jsx).
  const canCreateParabole = can("SUBPRODUCT_CREATE")
  const canCreateDecoder  = can("SUBPRODUCT_CREATE")

  useEffect(() => { setParabolas(initialParabolas) }, [initialParabolas])

  const refreshParabolas = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(PARABOLA_API, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      setParabolas(Array.isArray(res?.data?.data) ? res.data.data : [])
    } catch { /* silencieux */ }
  }

  const handleParaboleCreated = async () => {
    await refreshParabolas()
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggle = () => {
    setWithParabola((v) => {
      if (v) setSelectedParabolaId("")
      return !v
    })
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) return showError("Le nom du décodeur est obligatoire")
    if (!form.code?.trim()) return showError("Le numéro du décodeur est obligatoire")

    try {
      setLoading(true)
      let { token, companyId } = getAuthData()
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }
      await axios.post(
        SUBPRODUCT_API,
        {
          name:        form.name.trim(),
          code:        form.code.trim(),
          description: form.description?.trim() || "",
          serviceId,
          companyId,
          parabolaId:  withParabola && selectedParabolaId ? selectedParabolaId : undefined,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" } }
      )
      showSuccess(`Décodeur "${form.name}" créé avec succès !`)
      setTimeout(() => navigate(-1), 1200)
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showModal && (
        <CreateParaboleModal
          onClose={() => setShowModal(false)}
          onCreated={handleParaboleCreated}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-[#1EA4DC] flex-shrink-0" />
            <h3 className="font-semibold text-[#1EA4DC] text-sm sm:text-base">Comment ça marche ?</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Inventoriez vos décodeurs physiques dans le système central. Vous pouvez ensuite associer une parabole disponible à chaque décodeur listé ci-dessous pour activer le flux de signal.
          </p>
          <button className="text-xs sm:text-sm text-[#1EA4DC] flex items-center gap-1 hover:underline">
            Voir plus de détails →
          </button>
        </div>

        {canCreateParabole && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 flex items-center justify-between w-full text-left gap-2"
          >
            <span className="text-sm sm:text-base font-semibold text-gray-800">Ajouter un nouveau parabole</span>
            <PlusCircle size={24} className="text-[#1EA4DC] flex-shrink-0" />
          </button>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <h3 className="text-base sm:text-lg font-semibold">Décodeur canal</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Nom du décodeur</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Numéro décodeur</label>
            <input name="code" value={form.code} onChange={handleChange} className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm sm:text-base" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Votre message"
            rows={4}
            className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 resize-none text-sm sm:text-base"
          />
        </div>

        <div className="border border-gray-200 rounded-xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Association de</p>
            <p className="text-sm font-medium text-gray-700">Paraboles</p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              withParabola ? "bg-[#1EA4DC]" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                withParabola ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {withParabola && (
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Parabole</label>
            <div className="relative">
              <select
                value={selectedParabolaId}
                onChange={(e) => setSelectedParabolaId(e.target.value)}
                className="w-full appearance-none bg-gray-100 px-4 py-2 rounded-lg pr-10 text-gray-700 text-sm"
              >
                <option value="">-- Sélectionner une parabole --</option>
                {parabolas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button onClick={() => navigate(-1)} className="border border-gray-200 px-6 py-2 rounded-lg text-sm">
          Annuler
        </button>
        {canCreateDecoder && (
          <button onClick={handleSubmit} disabled={loading} className="bg-[#1EA4DC] text-white px-6 py-2 rounded-lg text-sm disabled:opacity-60">
            {loading ? "Création..." : "Créer le décodeur"}
          </button>
        )}
      </div>
    </>
  )
}