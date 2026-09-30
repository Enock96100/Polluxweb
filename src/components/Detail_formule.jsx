import {
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Pencil,
  PowerOff,
} from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"

const BASE_URL = "https://youapi.youneed.app/pollux/prod/api"

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    ""
  )
}

async function resolveAuth() {
  const token = getToken()
  let companyId = null
  try {
    const raw = localStorage.getItem("company")
    if (raw) {
      const parsed = JSON.parse(raw)
      companyId = parsed?.id || parsed?.companyId || null
    }
  } catch (_) {}

  if (!companyId) {
    try {
      const res = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const profile = res.data?.data || res.data
      companyId =
        profile?.company?.id ||
        profile?.companyId ||
        profile?.company_id ||
        null
    } catch (_) {}
  }
  return { token, companyId }
}

/* ═══════════════════════════════════════════════
   HOOK NOTIFICATION
═══════════════════════════════════════════════ */

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
    showError: (msg) => show("error", msg),
    dismiss,
  }
}

/* ═══════════════════════════════════════════════
   BANDEAU DE NOTIFICATION
═══════════════════════════════════════════════ */

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
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MODAL ASSIGNER UN TAUX
═══════════════════════════════════════════════ */

function AssignTauxModal({ open, onClose, role, formulaId, onSuccess }) {
  const [actorId, setActorId] = useState("")
  const [actors, setActors] = useState([])
  const [actorsLoading, setActorsLoading] = useState(false)
  const [commissionType, setCommissionType] = useState("FIXED")
  const [newSubscriptionRate, setNewSubscriptionRate] = useState("")
  const [renewalRate, setRenewalRate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isDistributeur = role === "Distributeur"
  const title = "Assigner un taux Canal+"
  const selectLabel = isDistributeur ? "Distributeur" : "Commerçant"
  const selectPlaceholder = isDistributeur
    ? "Sélectionner le distributeur"
    : "Sélectionner le commerçant"

  useEffect(() => {
    if (!open) return
    setActorId("")
    setCommissionType("FIXED")
    setNewSubscriptionRate("")
    setRenewalRate("")
    setError(null)
    fetchActors()
  }, [open])

  async function fetchActors() {
    setActorsLoading(true)
    try {
      const { token, companyId } = await resolveAuth()
      if (!companyId) {
        setActors([])
        setError("Impossible de récupérer l'ID de votre entreprise")
        return
      }

      const endpoint = isDistributeur
        ? `${BASE_URL}/distributors/by-company/${companyId}?page=1&limit=100`
        : `${BASE_URL}/merchants/companies/${companyId}?page=1&limit=100`

      console.log("Récupération des acteurs depuis:", endpoint)
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const actorsData = res.data?.data?.items || res.data?.data || []
      console.log(`✓ ${actorsData.length} ${selectLabel}(s) récupéré(s)`)
      setActors(actorsData)
    } catch (err) {
      console.error("Erreur chargement acteurs:", err)
      setError("Impossible de charger les acteurs")
      setActors([])
    } finally {
      setActorsLoading(false)
    }
  }

  async function handleSubmit() {
    if (!actorId) {
      setError(`Veuillez sélectionner un ${selectLabel.toLowerCase()}.`)
      return
    }
    if (!newSubscriptionRate || !renewalRate) {
      setError("Veuillez renseigner tous les taux.")
      return
    }

    const newSubValRaw = Number(newSubscriptionRate)
    const renewalValRaw = Number(renewalRate)

    if (newSubValRaw < 0 || renewalValRaw < 0) {
      setError("Les taux doivent être positifs.")
      return
    }

    // Quand le type est PERCENTAGE, l'utilisateur saisit une valeur en % (ex: 5 pour 5%)
    // On la convertit en fraction décimale avant l'envoi à l'API (5 -> 0.05)
    const isPercentage = commissionType === "PERCENTAGE"
    const newSubVal = isPercentage ? newSubValRaw / 100 : newSubValRaw
    const renewalVal = isPercentage ? renewalValRaw / 100 : renewalValRaw

    setSubmitting(true)
    setError(null)
    try {
      const { token } = await resolveAuth()

      const endpoint = isDistributeur
        ? `${BASE_URL}/canal-commissions/distributor-assignments`
        : `${BASE_URL}/canal-commissions/merchant-assignments`

      const payload = {
        formulaId,
        commissionType,
        newSubscriptionRate: newSubVal,
        renewalRate: renewalVal,
        ...(isDistributeur
          ? { distributorId: actorId }
          : { merchantId: actorId }),
      }

      console.log("╔════════════════════════════════════════════════════════╗")
      console.log("║             ENVOI DE L'ASSIGNATION DE TAUX             ║")
      console.log("╚════════════════════════════════════════════════════════╝")
      console.log("Rôle:", isDistributeur ? "DISTRIBUTEUR" : "COMMERÇANT")
      console.log("Actor ID:", actorId)
      console.log("Formula ID:", formulaId)
      console.log("Type Commission:", commissionType)
      console.log("Nouvel Abonnement (saisi):", newSubscriptionRate)
      console.log("Nouvel Abonnement (envoyé):", newSubVal)
      console.log("Renouvellement (saisi):", renewalRate)
      console.log("Renouvellement (envoyé):", renewalVal)
      console.log("Endpoint:", endpoint)
      console.log("Payload:", JSON.stringify(payload, null, 2))
      console.log("╚════════════════════════════════════════════════════════╝")

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("✓ Taux assigné avec succès")
      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      console.error("❌ Erreur assignation:", err.response?.data || err.message)
      setError(
        err.response?.data?.description ||
        err.response?.data?.message ||
        "Une erreur est survenue. Veuillez réessayer."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6 sm:mb-7 pr-8">{title}</h2>

        {/* Sélecteur acteur */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">{selectLabel}</label>
          {actorsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : (
            <div className="relative">
              <select
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1EA4DC] pr-10"
              >
                <option value="">{selectPlaceholder}</option>
                {actors.map((a) => {
                  const displayName =
                    a.user?.firstName
                      ? `${a.user.firstName} ${a.user.lastName || ""}`.trim()
                      : a.firstName
                      ? `${a.firstName} ${a.lastName || ""}`.trim()
                      : a.businessName || a.name || a.id

                  return (
                    <option key={a.id} value={a.id}>
                      {displayName}
                    </option>
                  )
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Type commission */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-3">Type commission</label>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setCommissionType("FIXED")}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  commissionType === "FIXED"
                    ? "border-[#1EA4DC] bg-[#1EA4DC]"
                    : "border-gray-300 bg-gray-100"
                }`}
              >
                {commissionType === "FIXED" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <span className="text-gray-600 text-sm">Montant fixe</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setCommissionType("PERCENTAGE")}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  commissionType === "PERCENTAGE"
                    ? "border-[#1EA4DC] bg-[#1EA4DC]"
                    : "border-gray-300 bg-gray-100"
                }`}
              >
                {commissionType === "PERCENTAGE" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <span className="text-gray-600 text-sm">Taux en %</span>
            </label>
          </div>
        </div>

        {/* Taux nouvelle souscription */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2">
            Taux nouvelle souscription{commissionType === "PERCENTAGE" ? " (%)" : " (FCFA)"}
          </label>
          <input
            type="number"
            min="0"
            step={commissionType === "PERCENTAGE" ? "0.01" : "1"}
            placeholder={commissionType === "PERCENTAGE" ? "Ex: 5 ou 5.5" : "Ex: 100 ou 500"}
            value={newSubscriptionRate}
            onChange={(e) => setNewSubscriptionRate(e.target.value)}
            className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
          />
        </div>

        {/* Taux renouvellement */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Taux renouvellement{commissionType === "PERCENTAGE" ? " (%)" : " (FCFA)"}
          </label>
          <input
            type="number"
            min="0"
            step={commissionType === "PERCENTAGE" ? "0.01" : "1"}
            placeholder={commissionType === "PERCENTAGE" ? "Ex: 3 ou 3.5" : "Ex: 50 ou 300"}
            value={renewalRate}
            onChange={(e) => setRenewalRate(e.target.value)}
            className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#1EA4DC] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#189bc8] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Assigner
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════ */

export default function DetailFormuleCanal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [formule, setFormule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("apercu")

  const [distributeurRates, setDistributeurRates] = useState([])
  const [merchantRates, setMerchantRates] = useState([])
  const [ratesLoading, setRatesLoading] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRole, setModalRole] = useState("Distributeur")

  useEffect(() => {
    if (!id) return
    fetchFormule()
  }, [id])

  async function fetchFormule() {
    setLoading(true)
    setError(null)
    try {
      const { token } = await resolveAuth()
      const res = await axios.get(
        `${BASE_URL}/formula-canals/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      console.log("✓ Formule chargée:", res.data?.data?.name)
      setFormule(res.data?.data || null)
      await fetchRates(token)
    } catch (err) {
      console.error("Erreur chargement formule:", err)
      setError("Impossible de charger les données de la formule.")
    } finally {
      setLoading(false)
    }
  }

  async function fetchRates(token) {
    setRatesLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [distRes, merchantRes] = await Promise.all([
        axios.get(
          `${BASE_URL}/canal-commissions/formulas/${id}/distributor-rates?onlyActive=true`,
          { headers }
        ),
        axios.get(
          `${BASE_URL}/canal-commissions/formulas/${id}/merchant-rates?onlyActive=true`,
          { headers }
        ),
      ])
      setDistributeurRates(distRes.data?.data || [])
      setMerchantRates(merchantRes.data?.data || [])
    } catch (err) {
      console.error("Erreur chargement des taux:", err)
    } finally {
      setRatesLoading(false)
    }
  }

  function openModal(role) {
    setModalRole(role)
    setModalOpen(true)
  }

  async function handleAssignSuccess() {
    const { token } = await resolveAuth()
    await fetchRates(token)
    showSuccess("Taux assigné avec succès.")
  }

  function formatDate(iso) {
    if (!iso) return "—"
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    const h = String(d.getHours()).padStart(2, "0")
    const m = String(d.getMinutes()).padStart(2, "0")
    return `${day}-${month}-${year} ${h}:${m}`
  }

  const tabs = [
    { key: "apercu", label: "Aperçu" },
    { key: "statistique", label: "Statistique" },
    { key: "abonnement", label: "Abonnement" },
    { key: "historique", label: "Historique" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 px-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1EA4DC] shrink-0" />
        <span className="ml-3 text-gray-500">Chargement…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!formule) return null

  const canalSubscriptions = formule.canalSubscriptions || []
  const newFormulaChanges = formule.newFormulaChanges || []

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* MODAL */}
      <AssignTauxModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        role={modalRole}
        formulaId={id}
        onSuccess={handleAssignSuccess}
      />

      {/* NOTIFICATION */}
      <NotificationBanner notif={notif} onDismiss={dismiss} />

      {/* RETOUR */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Détail de la Formule Canal +</h1>
          <p className="text-gray-500">{formule.name || "—"}</p>
        </div>

        {/* TABS */}
        <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 overflow-x-auto max-w-full lg:max-w-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                dismiss()
              }}
              className={`px-3 sm:px-5 py-2 rounded-lg text-sm whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.key
                  ? "bg-[#1EA4DC] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU PAR TAB */}
      {activeTab === "statistique" ? (
        <StatistiqueTab formule={formule} />
      ) : activeTab === "abonnement" ? (
        <AbonnementTab
          data={canalSubscriptions}
          formuleName={formule.name}
          formatDate={formatDate}
        />
      ) : activeTab === "historique" ? (
        <HistoriqueTab
          data={newFormulaChanges}
          formuleName={formule.name}
          formatDate={formatDate}
        />
      ) : (
        <>
          {/* TARIFICATION */}
          <div>
            <h2 className="text-lg font-medium mb-5">Tarification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <InfoCard label="Prix" value={`${formule.price ?? "—"} FCFA`} />
              <InfoCard
                label="Durée"
                value={
                  formule.durationInDays != null
                    ? `${formule.durationInDays} jour${formule.durationInDays > 1 ? "s" : ""}`
                    : "—"
                }
              />
            </div>
          </div>

          {/* MAIN CARD */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            {/* INFORMATIONS GÉNÉRALES */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#1EA4DC] text-white px-5 py-3 font-medium">
                Informations Générales
              </div>
              <div className="p-4 sm:p-6">
                <InfoRow
                  label="Statut"
                  value={
                    formule.isActive ? (
                      <Badge green>Activé</Badge>
                    ) : (
                      <Badge>Désactivé</Badge>
                    )
                  }
                />
                <InfoRow label="Code" value={formule.code || "—"} />
                <InfoRow label="Nom" value={formule.name || "—"} />
                <InfoRow label="Description" value={formule.description || "—"} />
                <InfoRow
                  label="ID service"
                  value={
                    <span className="text-xs font-mono break-all">
                      {formule.serviceId || "—"}
                    </span>
                  }
                />
                {formule.service && (
                  <InfoRow label="Service" value={formule.service.name || "—"} />
                )}
                <InfoRow label="Date de création" value={formatDate(formule.createdAt)} />
                <InfoRow
                  label="Prix"
                  value={
                    <Badge blue>
                      {formule.price != null ? `${formule.price} F` : "—"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Durée"
                  value={
                    <Badge green>
                      {formule.durationInDays != null
                        ? `${formule.durationInDays} Jour${formule.durationInDays > 1 ? "s" : ""}`
                        : "—"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Dernière mise à jour"
                  value={formatDate(formule.updatedAt)}
                />
              </div>
            </div>

            {/* DISTRIBUTEURS */}
            <div className="mt-10 space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => openModal("Distributeur")}
                  className="w-full sm:w-auto justify-center bg-[#1EA4DC] text-white px-5 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  Assigner un distributeur
                </button>
              </div>
              {ratesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                  <span className="ml-2 text-gray-400 text-sm">Chargement des taux…</span>
                </div>
              ) : distributeurRates.length === 0 ? (
                <EmptyTable message="Aucun distributeur assigné" />
              ) : (
                <TablePartenaire
                  data={distributeurRates}
                  role="Distributeur"
                  formatDate={formatDate}
                  onActionSuccess={handleAssignSuccess}
                  showSuccess={showSuccess}
                  showError={showError}
                />
              )}
            </div>

            {/* COMMERÇANTS */}
            <div className="mt-16 space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => openModal("Commerçant")}
                  className="w-full sm:w-auto justify-center bg-[#1EA4DC] text-white px-5 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  Assigner un commerçant
                </button>
              </div>
              {ratesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
                  <span className="ml-2 text-gray-400 text-sm">Chargement des taux…</span>
                </div>
              ) : merchantRates.length === 0 ? (
                <EmptyTable message="Aucun commerçant assigné" />
              ) : (
                <TablePartenaire
                  data={merchantRates}
                  role="Commerçant"
                  formatDate={formatDate}
                  onActionSuccess={handleAssignSuccess}
                  showSuccess={showSuccess}
                  showError={showError}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ONGLET ABONNEMENT
═══════════════════════════════════════════════ */

function AbonnementTab({ data, formuleName, formatDate }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const totalPages = Math.max(1, Math.ceil(data.length / perPage))
  const paginated = data.slice((page - 1) * perPage, page * perPage)

  function statusLabel(status) {
    const map = {
      ACTIVE: { label: "Active", cls: "bg-green-100 text-green-700" },
      INACTIVE: { label: "Inactive", cls: "bg-red-100 text-red-600" },
      EXPIRED: { label: "Expirée", cls: "bg-gray-100 text-gray-500" },
      CANCELLED: { label: "Annulée", cls: "bg-orange-100 text-orange-500" },
    }
    return map[status] || { label: status || "—", cls: "bg-gray-100 text-gray-500" }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-medium mb-5">Formules {formuleName || "access"}</h2>

      {data.length === 0 ? (
        <EmptyTable message="Aucun abonnement trouvé pour cette formule" />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">N°</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">N° Formule</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Date d'expiration</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Statut</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, index) => {
                  const st = statusLabel(item.status)
                  const clientName = item.client
                    ? `${item.client.firstName || ""} ${item.client.lastName || ""}`.trim()
                    : "—"
                  return (
                    <tr
                      key={item.id || index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-4 py-4 font-mono text-sm">
                        {item.subscriptionNumber || "—"}
                      </td>
                      <td className="px-4 py-4">{clientName}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.endDate
                          ? new Date(item.endDate).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
            <span>
              Affichage de {data.length === 0 ? 0 : (page - 1) * perPage + 1} à{" "}
              {Math.min(page * perPage, data.length)} sur {data.length} entrées
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span>Lignes par page :</span>
              <select
                className="border rounded px-2 py-1"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft size={18} className={page === 1 ? "text-gray-300" : ""} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={18} className={page === 1 ? "text-gray-300" : ""} />
              </button>
              <span className="whitespace-nowrap">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight
                  size={18}
                  className={page === totalPages ? "text-gray-300" : ""}
                />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight
                  size={18}
                  className={page === totalPages ? "text-gray-300" : ""}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ONGLET HISTORIQUE
═══════════════════════════════════════════════ */

function HistoriqueTab({ data, formuleName, formatDate }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const totalPages = Math.max(1, Math.ceil(data.length / perPage))
  const paginated = data.slice((page - 1) * perPage, page * perPage)

  function changeTypeLabel(type) {
    const map = {
      UPGRADE: { label: "Upgrade", cls: "bg-green-100 text-green-700" },
      DOWNGRADE: { label: "Downgrade", cls: "bg-orange-100 text-orange-500" },
    }
    return map[type] || { label: type || "—", cls: "bg-gray-100 text-gray-500" }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-medium mb-5">Formules {formuleName || "access"}</h2>

      {data.length === 0 ? (
        <EmptyTable message="Aucun historique de changement trouvé" />
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[#1EA4DC] text-white">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">N°</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Ancienne formule</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Nouvelle formule</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Montant payé</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Date de changement</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, index) => {
                  const ct = changeTypeLabel(item.changeType)
                  return (
                    <tr
                      key={item.id || index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">
                          {item.oldFormula?.name || "—"}
                        </span>
                        {item.oldPrice && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({Number(item.oldPrice).toLocaleString("fr-FR")} F)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">
                          {item.newFormula?.name || "—"}
                        </span>
                        {item.newPrice && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({Number(item.newPrice).toLocaleString("fr-FR")} F)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${ct.cls}`}>
                          {ct.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.amountPaid != null
                          ? `${Number(item.amountPaid).toLocaleString("fr-FR")} FCFA`
                          : "—"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.changedAt
                          ? new Date(item.changedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600">
            <span>
              Affichage de {data.length === 0 ? 0 : (page - 1) * perPage + 1} à{" "}
              {Math.min(page * perPage, data.length)} sur {data.length} entrées
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span>Lignes par page :</span>
              <select
                className="border rounded px-2 py-1"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft size={18} className={page === 1 ? "text-gray-300" : ""} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={18} className={page === 1 ? "text-gray-300" : ""} />
              </button>
              <span className="whitespace-nowrap">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight
                  size={18}
                  className={page === totalPages ? "text-gray-300" : ""}
                />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight
                  size={18}
                  className={page === totalPages ? "text-gray-300" : ""}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   ONGLET STATISTIQUE
═══════════════════════════════════════════════ */

function StatistiqueTab({ formule }) {
  const stats = formule?.stats || {}
  const count = formule?._count || {}

  const cards = [
    {
      label: "Abonnements totaux",
      value: stats.subscriptions?.total ?? count.canalSubscriptions ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      color: "text-blue-500",
      bg: "bg-blue-50",
      bar: "bg-blue-500",
    },
    {
      label: "Abonnements actifs",
      value: stats.subscriptions?.byStatus?.ACTIVE ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      color: "text-green-500",
      bg: "bg-green-50",
      bar: "bg-green-500",
    },
    {
      label: "Changements (ancienne)",
      value: count.oldFormulaChanges ?? stats.formulaChanges?.downgradesFrom ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path d="M7 16V4m0 0L3 8m4-4l4 4" />
          <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
      color: "text-orange-500",
      bg: "bg-orange-50",
      bar: "bg-orange-400",
    },
    {
      label: "Changements (nouvelle)",
      value: count.newFormulaChanges ?? stats.formulaChanges?.upgradesTo ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path d="M17 8V4m0 0l-4 4m4-4l4 4" />
          <path d="M7 16v4m0 0l-4-4m4 4l4-4" />
        </svg>
      ),
      color: "text-purple-500",
      bg: "bg-purple-50",
      bar: "bg-purple-400",
    },
    {
      label: "Renouvellements",
      value: count.renewals ?? stats.renewals?.total ?? 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      ),
      color: "text-[#1EA4DC]",
      bg: "bg-sky-50",
      bar: "bg-[#1EA4DC]",
    },
  ]

  const maxVal = Math.max(...cards.map((c) => c.value), 1)

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Vue d'ensemble</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 ${
              i === cards.length - 1 && cards.length % 2 !== 0 ? "sm:col-span-2" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${card.bg} ${card.color} p-2 rounded-xl`}>
                {card.icon}
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-gray-800">
                {card.value.toLocaleString("fr-FR")}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-3">{card.label}</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${card.bar} rounded-full transition-all duration-700`}
                style={{ width: `${Math.round((card.value / maxVal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* BLOC REVENUS */}
      {stats.revenue && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
          <h3 className="font-medium text-gray-700 mb-4">Revenus</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RevenueCard label="Nouveaux abonnements" amount={stats.revenue.fromNewSubscriptions} />
            <RevenueCard label="Renouvellements" amount={stats.revenue.fromRenewals} />
            <RevenueCard label="Total" amount={stats.revenue.total} highlight />
          </div>
        </div>
      )}

      {/* BLOC TAUX ACTIFS */}
      {stats.rates && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
          <h3 className="font-medium text-gray-700 mb-4">Taux actifs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F2F7FC] rounded-xl p-5 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm mb-1">Distributeurs</p>
                <p className="text-2xl font-bold text-[#1EA4DC]">{stats.rates.activeDistributorRates ?? 0}</p>
              </div>
              <div className="bg-blue-100 text-blue-500 p-3 rounded-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            </div>
            <div className="bg-[#F2F7FC] rounded-xl p-5 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm mb-1">Commerçants</p>
                <p className="text-2xl font-bold text-[#1EA4DC]">{stats.rates.activeMerchantRates ?? 0}</p>
              </div>
              <div className="bg-green-100 text-green-500 p-3 rounded-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOC CHANGEMENTS DE FORMULE */}
      {stats.formulaChanges && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
          <h3 className="font-medium text-gray-700 mb-4">Changements de formule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormulaChangeCard label="Upgrades vers cette formule" value={stats.formulaChanges.upgradesTo ?? 0} positive />
            <FormulaChangeCard label="Downgrades vers cette formule" value={stats.formulaChanges.downgradesTo ?? 0} />
            <FormulaChangeCard label="Upgrades depuis cette formule" value={stats.formulaChanges.upgradesFrom ?? 0} positive />
            <FormulaChangeCard label="Downgrades depuis cette formule" value={stats.formulaChanges.downgradesFrom ?? 0} />
          </div>
        </div>
      )}

      {/* BLOC RENOUVELLEMENTS DÉTAIL */}
      {stats.renewals && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
          <h3 className="font-medium text-gray-700 mb-4">Détail des renouvellements</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F2F7FC] rounded-xl p-5">
              <p className="text-gray-500 text-sm mb-1">Total</p>
              <p className="text-2xl font-bold text-[#1EA4DC]">{stats.renewals.total ?? 0}</p>
            </div>
            <div className="bg-[#F2F7FC] rounded-xl p-5">
              <p className="text-gray-500 text-sm mb-1">Montant total</p>
              <p className="text-2xl font-bold text-[#1EA4DC]">
                {(stats.renewals.totalAmount ?? 0).toLocaleString("fr-FR")} F
              </p>
            </div>
            <div className="bg-[#F2F7FC] rounded-xl p-5">
              <p className="text-gray-500 text-sm mb-1">Montant moyen</p>
              <p className="text-2xl font-bold text-[#1EA4DC]">
                {Math.round(stats.renewals.averageAmount ?? 0).toLocaleString("fr-FR")} F
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RevenueCard({ label, amount, highlight }) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? "bg-[#1EA4DC]" : "bg-[#F2F7FC]"}`}>
      <p className={`text-sm mb-2 ${highlight ? "text-blue-100" : "text-gray-500"}`}>{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-white" : "text-[#1EA4DC]"}`}>
        {(amount ?? 0).toLocaleString("fr-FR")} FCFA
      </p>
    </div>
  )
}

function FormulaChangeCard({ label, value, positive }) {
  return (
    <div className="bg-[#F2F7FC] rounded-xl p-5 flex justify-between items-center gap-3">
      <p className="text-gray-500 text-sm">{label}</p>
      <span className={`text-xl font-bold px-3 py-1 rounded-full shrink-0 ${positive ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-500"}`}>
        {value}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COMPOSANTS COMMUNS
═══════════════════════════════════════════════ */

function InfoCard({ label, value }) {
  return (
    <div className="bg-[#F2F7FC] rounded-2xl p-5 sm:p-8 flex justify-between items-center gap-3">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-xl sm:text-2xl font-bold text-[#1EA4DC] text-right">{value}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-0 py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className="sm:text-right">{value}</div>
    </div>
  )
}

function Badge({ children, green, blue }) {
  return (
    <span
      className={`inline-block px-4 py-1 rounded-full text-sm whitespace-nowrap ${
        green
          ? "bg-green-100 text-green-700"
          : blue
          ? "bg-blue-100 text-[#1EA4DC]"
          : "bg-red-100 text-red-600"
      }`}
    >
      {children}
    </span>
  )
}

function EmptyTable({ message }) {
  return (
    <div className="border border-gray-200 rounded-xl p-8 text-center text-gray-400">
      {message}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TABLE PARTENAIRE
═══════════════════════════════════════════════ */

function TablePartenaire({ data, role, formatDate, onActionSuccess, showSuccess, showError }) {
  const [actionMenuId, setActionMenuId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    function handleClickOutside() {
      setActionMenuId(null)
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  // Formate le taux "nouvelle souscription" pour l'affichage dans le tableau.
  // La valeur stockée en base est une fraction décimale pour un taux en %
  // (ex: 0.05 pour 5%), on la reconvertit donc en % pour l'affichage.
  function formatRate(item) {
    const rate = item.summary?.newSubscriptionRate
    const type = item.commissionType || item.summary?.commissionType
    if (rate == null) return "—"
    if (type === "PERCENTAGE") {
      const pct = Number(rate) <= 1 ? Number(rate) * 100 : Number(rate)
      return `${pct.toFixed(2).replace(/\.?0+$/, "")}%`
    }
    return `${Number(rate).toLocaleString("fr-FR")} F`
  }

  // Idem pour le taux de renouvellement.
  function formatRenewal(item) {
    const rate = item.summary?.renewalRate
    const type = item.commissionType || item.summary?.commissionType
    if (rate == null) return "—"
    if (type === "PERCENTAGE") {
      const pct = Number(rate) <= 1 ? Number(rate) * 100 : Number(rate)
      return `${pct.toFixed(2).replace(/\.?0+$/, "")}%`
    }
    return `${Number(rate).toLocaleString("fr-FR")} F`
  }

  async function handleDeactivate(item) {
    setLoadingId(item.id)
    setActionMenuId(null)
    try {
      const { token } = await resolveAuth()
      const isDistributeur = role === "Distributeur"
      const endpoint = isDistributeur
        ? `${BASE_URL}/canal-commissions/distributor-assignments/${item.id}/deactivate`
        : `${BASE_URL}/canal-commissions/merchant-assignments/${item.id}/deactivate`
      await axios.patch(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      showSuccess && showSuccess("Taux désactivé avec succès.")
      onActionSuccess && onActionSuccess()
    } catch (err) {
      console.error("Erreur désactivation:", err)
      showError && showError("Impossible de désactiver ce taux.")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 overflow-x-auto">
      <table className="w-full min-w-[760px]">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left whitespace-nowrap">N°</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Nom et Prénom</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Rôle</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Nouvel abonnement</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">Renouvellement</th>
            <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-4">{index + 1}</td>
              <td className="px-4 py-4">
                {(() => {
                  const u = item.distributor?.user || item.merchant?.user
                  if (u?.firstName) return `${u.firstName} ${u.lastName || ""}`.trim()
                  return item.summary?.actorName || "—"
                })()}
              </td>
              <td className="px-4 py-4">{role}</td>
              <td className="px-4 py-4 whitespace-nowrap">{formatDate(item.assignedAt)}</td>
              <td className="px-4 py-4">
               <Badge green>{formatRate(item)}</Badge>
              </td>
              <td className="px-4 py-4">
                <Badge blue>{formatRenewal(item)}</Badge>
              </td>
              <td className="px-4 py-4 text-center relative">
                {loadingId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1EA4DC] mx-auto" />
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionMenuId(actionMenuId === item.id ? null : item.id)
                      }}
                      className="hover:text-[#1EA4DC] transition-colors"
                    >
                      <MoreHorizontal />
                    </button>

                    {actionMenuId === item.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-8 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]"
                      >
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setActionMenuId(null)
                          }}
                        >
                          <Pencil size={15} className="text-[#1EA4DC]" />
                          Modifier
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => handleDeactivate(item)}
                        >
                          <PowerOff size={15} className="text-red-500" />
                          Désactiver
                        </button>
                      </div>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 text-sm text-gray-600 min-w-[760px]">
        <span>Affichage de 1 à {data.length} sur {data.length} entrées</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span>Lignes par page :</span>
          <select className="border rounded px-2 py-1">
            <option>10</option>
          </select>
          <button>
            <ChevronsLeft size={18} />
          </button>
          <button>
            <ChevronLeft size={18} />
          </button>
          <span>Page 1 sur 1</span>
          <button>
            <ChevronRight size={18} />
          </button>
          <button>
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}