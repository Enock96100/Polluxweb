import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PlusCircle, ChevronDown, ArrowLeft, CheckCircle, AlertCircle, X } from "lucide-react"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"

const SUBPRODUCT_API = "https://youapi.youneed.app/pollux/dev/api/products/sub-products"
const PARABOLA_API   = "https://youapi.youneed.app/pollux/dev/api/formula-canals/parabolas"

/* ══════════════════════════════════════════════
   SYSTÈME DE NOTIFICATION
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
      className={`flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm
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
   MODAL CRÉER PARABOLE
   ══════════════════════════════════════════════ */
function CreateParaboleModal({ onClose, onCreated }) {
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [form, setForm] = useState({
    name:        "",
    code:        "",
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
    if (!form.code.trim()) return showError("Le code parabole est obligatoire")

    try {
      setSaving(true)
      let { token, companyId } = getAuthData()
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }
      await axios.post(
        PARABOLA_API,
        {
          companyId,
          name:        form.name.trim(),
          code:        form.code.trim(),
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
      showSuccess(`Parabole "${form.name}" créé avec succès !`)
      setTimeout(() => onCreated(), 1200)
    } catch (e) {
      showError(e?.response?.data?.message || e.message || "Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Créer un nouveau parabole</h2>
            <p className="text-sm text-gray-400">Ajouter un parabole</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">×</button>
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
            <label className="text-sm text-gray-700">Code parabole</label>
            <input name="code" value={form.code} onChange={handleChange} className="w-full bg-gray-100 px-4 py-3 rounded-xl text-gray-700 text-sm outline-none" />
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

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
          <button onClick={onClose} className="w-full sm:w-auto border border-gray-200 px-5 py-2 rounded-xl text-sm text-gray-700">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full sm:w-auto bg-[#1EA4DC] text-white px-5 py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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
   PAGE PRINCIPALE — AJOUTER DÉCODEUR
   ══════════════════════════════════════════════ */
export default function AjouterDecodeur() {
  const navigate = useNavigate()
  // ✅ serviceId récupéré depuis l'URL (/ajouter_decodeur/:id)
  const { id: serviceId } = useParams()

  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [parabolas,          setParabolas]          = useState([])
  const [withParabola,       setWithParabola]       = useState(false)
  const [selectedParabolaId, setSelectedParabolaId] = useState("")
  const [form,               setForm]               = useState({ name: "", code: "", description: "" })
  const [showModal,          setShowModal]           = useState(false)
  const [loading,            setLoading]             = useState(false)

  /* Chargement initial des paraboles */
  useEffect(() => {
    const load = async () => {
      try {
        const { token } = getAuthData()
        const res = await axios.get(PARABOLA_API, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        })
        setParabolas(Array.isArray(res?.data?.data) ? res.data.data : [])
      } catch {
        setParabolas([])
      }
    }
    load()
  }, [])

  const refreshParabolas = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(PARABOLA_API, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
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
    dismiss()
    if (!form.name?.trim()) return showError("Le nom du décodeur est obligatoire")
    if (!form.code?.trim()) return showError("Le numéro du décodeur est obligatoire")
    if (!serviceId)         return showError("Identifiant du service introuvable")

    try {
      setLoading(true)
      let { token, companyId } = getAuthData()
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }

      const body = {
        name:        form.name.trim(),
        code:        form.code.trim(),
        description: form.description?.trim() || "",
        serviceId,
        companyId,
        parabolaId:  withParabola && selectedParabolaId ? selectedParabolaId : undefined,
      }

      console.log("Body envoyé à l'API:", body)

      await axios.post(
        SUBPRODUCT_API,
        body,
        {
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept:         "application/json",
          },
        }
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

      <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Ajouter un décodeur</h1>
            <p className="text-gray-500 text-sm">Renseignez les informations du décodeur</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
        </div>

        {/* Bandeau notification */}
        <NotificationBanner notif={notif} onDismiss={dismiss} />

        {/* Bouton ajouter parabole */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="border border-[#1EA4DC] rounded-xl p-4 sm:p-5 flex items-center justify-between gap-3 w-full text-left"
        >
          <span className="text-sm sm:text-base font-semibold text-gray-800">Ajouter un nouveau parabole</span>
          <PlusCircle size={24} className="text-[#1EA4DC] shrink-0" />
        </button>

        {/* Formulaire décodeur */}
        <div className="border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
          <h3 className="text-base sm:text-lg font-semibold">Décodeur canal</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-600">Nom du décodeur</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">Numéro décodeur</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700"
              />
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
              className="w-full bg-gray-100 px-4 py-2 rounded-lg text-gray-700 resize-none"
            />
          </div>

          {/* Toggle association parabole */}
          <div className="border border-gray-200 rounded-xl px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Association de</p>
              <p className="text-sm font-medium text-gray-700">Paraboles</p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
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

          {/* Sélecteur parabole (conditionnel) */}
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

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border border-gray-200 px-6 py-2 rounded-lg text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto bg-[#1EA4DC] text-white px-6 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {loading ? "Création..." : "Créer le décodeur"}
          </button>
        </div>

      </div>
    </>
  )
}