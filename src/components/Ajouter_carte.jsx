import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PlusCircle, ChevronDown, CheckCircle, AlertCircle, X, Building2, Layers, ArrowLeft } from "lucide-react"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"
import useAuth from "../context/auth/utils"

const SUBPRODUCT_API      = "https://youapi.youneed.app/pollux/prod/api/products/sub-products"
const SUBPRODUCT_BULK_API = "https://youapi.youneed.app/pollux/prod/api/products/sub-products/bulk"
const BANK_API             = "https://youapi.youneed.app/pollux/prod/api/products/banks"
const FORMULA_API          = "https://youapi.youneed.app/pollux/prod/api/prepairs-formula/service"

/* ===== HOOK NOTIFICATION ===== */
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

/* ===== BANDEAU NOTIFICATION ===== */
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
        ? <CheckCircle size={18} className="shrink-0 text-green-500 mt-0.5 sm:mt-0" />
        : <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5 sm:mt-0" />
      }
      <span className="flex-1 break-words">{notif.message}</span>
      <button onClick={onDismiss} className="ml-2 shrink-0 hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MODAL CRÉER FORMULE
   ══════════════════════════════════════════════ */
function CreateFormuleModal({ serviceId, onClose, onCreated }) {
  const { notif, showSuccess, showError, dismiss } = useNotification()
  const [form, setForm] = useState({ name: "", code: "", description: "", maxBalance: "" })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    dismiss()
    if (!form.name.trim()) return showError("Le nom de la formule est obligatoire")
    if (!form.code.trim()) return showError("Le niveau de la formule est obligatoire")
    if (!form.maxBalance)  return showError("Le prix unitaire est obligatoire")
    if (!serviceId)        return showError("Aucun service sélectionné")

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
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" } }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer une nouvelle formule</h2>
            <p className="text-sm text-gray-400">Ajouter la formule</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">×</button>
        </div>

        <NotificationBanner notif={notif} onDismiss={dismiss} />

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Nom de la formule</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Niveau de la formule</label>
            <div className="relative">
              <select name="code" value={form.code} onChange={handleChange}
                className="w-full appearance-none bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none pr-10">
                <option value="">Sélectionner un niveau</option>
                <option value="LOW">Standard (LOW)</option>
                <option value="MIDDLE">Premium (MIDDLE)</option>
                <option value="HIGH">VIP (HIGH)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Prix Unitaire (FCFA)</label>
            <input name="maxBalance" type="number" value={form.maxBalance} onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Description (Optionnel)" rows={3}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm resize-none outline-none" />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <button onClick={onClose} className="w-full sm:w-auto border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full sm:w-auto bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
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
  const [form, setForm] = useState({ name: "", code: "", description: "", logo: "" })
  const [logoPreview, setLogoPreview] = useState("")
  const [saving, setSaving] = useState(false)

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
        { name: form.name.trim(), code: form.code.trim(), description: form.description?.trim() || "", logo: form.logo || "" },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" } }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer une nouvelle banque</h2>
            <p className="text-sm text-gray-400">Ajouter une banque</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">×</button>
        </div>

        <NotificationBanner notif={notif} onDismiss={dismiss} />

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Nom de la banque</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Code</label>
            <input name="code" value={form.code} onChange={handleChange} placeholder="ex : BHD"
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Description (Optionnel)" rows={3}
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm resize-none outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700">Logo de la banque</label>
            {logoPreview && (
              <div className="flex items-center justify-center w-full h-24 bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden">
                <img src={logoPreview} alt="Aperçu logo" className="h-full object-contain" />
              </div>
            )}
            <label className="flex items-center justify-center w-full h-12 bg-gray-100 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-500 text-center px-2">{logoPreview ? "Changer l'image" : "Choisir une image"}</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <input name="logo"
              value={form.logo.startsWith("data:") ? "" : form.logo}
              onChange={(e) => { setForm((prev) => ({ ...prev, logo: e.target.value })); setLogoPreview(e.target.value) }}
              placeholder="Ou coller une URL d'image"
              className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <button onClick={onClose} className="w-full sm:w-auto border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="w-full sm:w-auto bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            <PlusCircle size={16} />
            {saving ? "Création..." : "Créer la banque"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE — CARTE PRÉPAYÉE
   Props attendues : serviceId (string, obligatoire)
   ══════════════════════════════════════════════ */
export default function CartePrePayeePage() {
  const { id: serviceId } = useParams()
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()
  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  const { can } = useAuth()

  // BANK_CREATE : code confirmé dans le catalogue (module BANK_MANAGEMENT).
  const canCreateBank = can("BANK_CREATE")

  // ⚠️ À CONFIRMER : le catalogue de permissions fourni ne contient aucun
  // code dédié à la création d'une "formule de carte prépayée"
  // (/prepairs-formula/service) ni à la génération en masse de cartes
  // (/products/sub-products/bulk). On utilise SUBPRODUCT_CREATE comme
  // proxy le plus proche (les formules et cartes prépayées sont gérées
  // dans le même écran que les sous-produits). À corriger avec le vrai
  // code dès qu'il sera confirmé côté backend.
  const canCreateFormula = can("SUBPRODUCT_CREATE")
  const canGenerateCards = can("SUBPRODUCT_CREATE")

  const [banks,    setBanks]    = useState([])
  const [formulas, setFormulas] = useState([])
  const [loading,  setLoading]  = useState(false)

  const [form, setForm] = useState({
    bankId: "", prepaidCardFormulaId: "", name: "", price: "", startNumber: "", endNumber: "",
  })

  const [createFormuleModal, setCreateFormuleModal] = useState(false)
  const [createBanqueModal,  setCreateBanqueModal]  = useState(false)

  /* ── Chargement banques (sans serviceId) ── */
  useEffect(() => {
    const load = async () => {
      try {
        let { token, companyId } = getAuthData()
        if (!token) return
        if (!companyId) {
          const profile = await fetchProfile()
          companyId = profile?.company?.id
        }
        const res = await axios.get(BANK_API, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        })
        setBanks(Array.isArray(res?.data?.data) ? res.data.data : [])
      } catch {
        setBanks([])
      }
    }
    load()
  }, [])

  /* ── Chargement formules (lié au serviceId) ── */
   useEffect(() => {
    if (!serviceId) return

    const load = async () => {
      try {
        const { token } = getAuthData()

        const res = await axios.get(
          `${FORMULA_API}/${serviceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        )

        setFormulas(
          Array.isArray(res?.data?.data)
            ? res.data.data
            : []
        )
      } catch {
        setFormulas([])
      }
    }

    load()
  }, [serviceId])

  /* ── Refresh après création via modal ── */
  const refreshFormulas = async () => {
    try {
      let { token } = getAuthData()
      if (!token) return
      const res = await axios.get(`${FORMULA_API}/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setFormulas(Array.isArray(res?.data?.data) ? res.data.data : [])
    } catch { /* silencieux */ }
  }

  const refreshBanks = async () => {
    try {
      let { token } = getAuthData()
      if (!token) return
      const res = await axios.get(BANK_API, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setBanks(Array.isArray(res?.data?.data) ? res.data.data : [])
    } catch { /* silencieux */ }
  }

  const handleFormuleCreated = async () => { await refreshFormulas(); setCreateFormuleModal(false) }
  const handleBanqueCreated  = async () => { await refreshBanks();    setCreateBanqueModal(false)  }

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
    if (!form.startNumber || !form.endNumber) return showError("Veuillez renseigner l'intervalle des numéros")

    const start = parseInt(form.startNumber, 10)
    const end   = parseInt(form.endNumber,   10)
    if (isNaN(start) || isNaN(end)) return showError("Les numéros doivent être numériques")
    if (start > end)                return showError("Le numéro de début doit être inférieur au numéro de fin")

    try {
      setLoading(true)
      const { token } = getAuthData()
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" }
      const total = end - start + 1

      // Chaque carte a son propre code unique, name/description/price/durationInDays/renewable
      // sont recopiés sur chaque entrée du tableau (mais restent propres à chaque carte).
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
      console.error("Erreur lors de la génération des cartes :", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedBank    = banks.find((b) => b.id === form.bankId)
  const selectedFormula = formulas.find((f) => f.id === form.prepaidCardFormulaId)
  const LEVEL_LABEL     = { LOW: "Standard", MIDDLE: "Premium", HIGH: "VIP" }

  return (
    <>
      {createFormuleModal && (
        <CreateFormuleModal serviceId={serviceId}
          onClose={() => setCreateFormuleModal(false)} onCreated={handleFormuleCreated} />
      )}
      {createBanqueModal && (
        <CreateBanqueModal onClose={() => setCreateBanqueModal(false)} onCreated={handleBanqueCreated} />
      )}

      <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5 shrink-0" /> Retour
        </button>

        {/* ── Titre ── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Ajouter une carte</h1>
          <p className="text-sm text-gray-500 mt-1">Renseignez les informations de la carte prépayée</p>
        </div>

        {/* ── Notification ── */}
        <NotificationBanner notif={notif} onDismiss={dismiss} />

        {/* ── Banque + Formule ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── BANQUE ── */}
          <div className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#1EA4DC] shrink-0" />
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
            <p className="text-xs text-gray-400">Sélectionner la banque émettrice</p>
            <div className="relative">
              <select name="bankId" value={form.bankId} onChange={handleChange}
                className="w-full appearance-none bg-gray-100 px-4 py-2 rounded-lg pr-10 text-gray-700 text-sm">
                <option value="">-- Banque --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {banks.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                {canCreateBank
                  ? <>Aucune banque enregistrée — cliquez sur <strong>Nouvelle</strong> pour en créer une.</>
                  : "Aucune banque enregistrée."}
              </p>
            )}
          </div>

          {/* ── FORMULE ── */}
          <div className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#1EA4DC] shrink-0" />
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
            <p className="text-xs text-gray-400">Sélectionner la formule tarifaire</p>
            <div className="relative">
              <select name="prepaidCardFormulaId" value={form.prepaidCardFormulaId} onChange={handleChange}
                className="w-full appearance-none bg-gray-100 px-4 py-2 rounded-lg pr-10 text-gray-700 text-sm">
                <option value="">-- Formule --</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {formulas.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                {serviceId
                  ? (canCreateFormula
                      ? "Aucune formule pour ce service — cliquez sur Nouvelle pour en créer une."
                      : "Aucune formule pour ce service.")
                  : "Sélectionnez d'abord un service pour afficher les formules."}
              </p>
            )}
          </div>
        </div>

        {/* ── Récap sélection ── */}
        {(selectedBank || selectedFormula) && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
            {selectedBank && (
              <div>
                <p className="text-xs font-semibold text-[#1EA4DC] uppercase tracking-wider mb-0.5">Banque sélectionnée</p>
                <p className="text-sm font-semibold text-gray-800">{selectedBank.name}
                  {selectedBank.code && <span className="ml-1 text-gray-400 font-normal">({selectedBank.code})</span>}
                </p>
              </div>
            )}
            {selectedFormula && (
              <div>
                <p className="text-xs font-semibold text-[#1EA4DC] uppercase tracking-wider mb-0.5">Formule sélectionnée</p>
                <p className="text-sm font-semibold text-gray-800">{selectedFormula.name}
                  {selectedFormula.maxBalance != null && (
                    <span className="ml-1 text-gray-400 font-normal">
                      — {Number(selectedFormula.maxBalance).toLocaleString()} FCFA
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Informations des cartes ── */}
        <div className="border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Informations des Cartes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-600">Nom de la carte</label>
              <input name="name" value={form.name} onChange={handleChange}
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">Prix (FCFA)</label>
              <input name="price" type="number" value={form.price} onChange={handleChange}
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600">Intervalle de numéros</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="startNumber" value={form.startNumber} onChange={handleChange}
                placeholder="Début numéro"
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 outline-none" />
              <input name="endNumber" value={form.endNumber} onChange={handleChange}
                placeholder="Fin numéro"
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 outline-none" />
            </div>
          </div>

          {/* Aperçu quantité */}
          {form.startNumber && form.endNumber && parseInt(form.endNumber) >= parseInt(form.startNumber) && (
            <div className="bg-[#EAF6FD] border border-[#B8E3F5] rounded-lg px-4 py-3 text-sm text-[#1EA4DC] font-medium">
              {parseInt(form.endNumber, 10) - parseInt(form.startNumber, 10) + 1} carte(s) seront générées
            </div>
          )}

          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-400">
            Les numéros sont générés automatiquement sur 10 chiffres — ex : <span className="font-mono">0000000001</span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 pb-4">
          <button onClick={() => navigate(-1)}
            className="w-full sm:w-auto border border-gray-200 px-6 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          {canGenerateCards && (
            <button onClick={handleSubmit} disabled={loading}
              className="w-full sm:w-auto bg-[#1EA4DC] text-white px-6 py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-[#179acc] transition-colors">
              {loading ? "Création en cours..." : "Générer la carte"}
            </button>
          )}
        </div>

      </div>
    </>
  )
}