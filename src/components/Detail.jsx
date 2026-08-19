import { 
  Search, 
  Eye, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  X
} from "lucide-react"
import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef, useCallback } from "react"
import axios from "axios"

const SUBPRODUCT_API      = "https://youapi.youneed.app/pollux/dev/api/products/sub-products"
const PARABOLA_API        = "https://youapi.youneed.app/pollux/dev/api/formula-canals/parabolas"
const FORMULA_API         = "https://youapi.youneed.app/pollux/dev/api/formula-canals"
const OPTION_API          = "https://youapi.youneed.app/pollux/dev/api/canal-options"
const PREPAID_FORM_API    = "https://youapi.youneed.app/pollux/dev/api/prepairs-formula/service"
const PREPAID_FORM_CREATE = "https://youapi.youneed.app/pollux/dev/api/prepairs-formula"
const PARTNERS_API        = "https://youapi.youneed.app/pollux/dev/api/products/services"

const TABS_CANAL   = ["Décodeurs", "Formules Canal+", "Option Canal+", "Paraboles", "Distributeurs", "Commerçants"]
const TABS_PREPAID = ["Carte prépayée", "Formules carte prépayée", "Distributeurs", "Commerçants"]

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
      <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity">
        <X size={16} />
      </button>
    </div>
  )
}

export default function CanalDecoderPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { notif, showSuccess, showError, dismiss } = useNotification()

  const [activeTab, setActiveTab] = useState(0)
  const [product, setProduct]     = useState(null)
  const [loading, setLoading]     = useState(true)

  const isPrepaid = product?.category === "PREPAID_CARD"
  const TABS      = isPrepaid ? TABS_PREPAID : TABS_CANAL

  const [decoders,      setDecoders]      = useState([])
  const [formulas,      setFormulas]      = useState([])
  const [options,       setOptions]       = useState([])
  const [parabolas,     setParabolas]     = useState([])
  const [distributors,  setDistributors]  = useState([])
  const [merchants,     setMerchants]     = useState([])

  const [prepaidCards,    setPrepaidCards]    = useState([])
  const [prepaidFormulas, setPrepaidFormulas] = useState([])
  const [prepaidStats,    setPrepaidStats]    = useState(null)

  const [filterBank,    setFilterBank]    = useState("")
  const [filterFormula, setFilterFormula] = useState("")

  const [decoderStats, setDecoderStats] = useState(null)

  const [formulaModal,  setFormulaModal]  = useState(false)
  const [optionModal,   setOptionModal]   = useState(false)
  const [parabolaModal, setParabolaModal] = useState(false)

  const [prepaidFormulaModal, setPrepaidFormulaModal] = useState(false)

  const [detailModal,     setDetailModal]     = useState(false)
  const [selectedDecoder, setSelectedDecoder] = useState(null)

  const [optionDetailModal, setOptionDetailModal] = useState(false)
  const [selectedOption,    setSelectedOption]    = useState(null)

  const [parabolaDetailModal, setParabolaDetailModal] = useState(false)
  const [selectedParabola,    setSelectedParabola]    = useState(null)

  const [prepaidDetailModal, setPrepaidDetailModal] = useState(false)
  const [selectedPrepaid,    setSelectedPrepaid]    = useState(null)

  const [editPrepaidModal, setEditPrepaidModal] = useState(false)
  const [editPrepaid,      setEditPrepaid]      = useState(null)

  const [deletePrepaidConfirm, setDeletePrepaidConfirm] = useState(false)
  const [prepaidToDelete,      setPrepaidToDelete]      = useState(null)

  const [personDetailModal, setPersonDetailModal] = useState(false)
  const [selectedPerson,    setSelectedPerson]    = useState(null)

  const [editModal,   setEditModal]   = useState(false)
  const [editDecoder, setEditDecoder] = useState(null)

  const [editFormulaModal, setEditFormulaModal] = useState(false)
  const [editFormula,      setEditFormula]      = useState(null)

  const [editOptionModal, setEditOptionModal] = useState(false)
  const [editOption,      setEditOption]      = useState(null)

  const [editParabolaModal, setEditParabolaModal] = useState(false)
  const [editParabola,      setEditParabola]      = useState(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [itemToDelete,  setItemToDelete]  = useState(null)
  const [deleteType,    setDeleteType]    = useState(null)

  const [pages, setPages]             = useState({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 })
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const currentPage    = pages[activeTab]
  const setCurrentPage = (val) =>
    setPages(p => ({ ...p, [activeTab]: typeof val === "function" ? val(p[activeTab]) : val }))

  const getAuthData = () => ({
    token:     localStorage.getItem("token"),
    companyId: localStorage.getItem("companyId"),
  })

  // Résout le companyId : d'abord depuis le localStorage, sinon on va le chercher
  // via /auth/profile et on le met en cache dans le localStorage pour la suite.
  const resolveCompanyId = async () => {
    const cached = localStorage.getItem("companyId")
    if (cached) return cached
    try {
      const { token } = getAuthData()
      const res = await axios.get(
        "https://youapi.youneed.app/pollux/dev/api/auth/profile",
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      const resolvedId =
        res.data?.data?.companyId ||
        res.data?.data?.company?.id ||
        res.data?.data?.mainCompany?.id ||
        null
      if (resolvedId) localStorage.setItem("companyId", resolvedId)
      console.log("[resolveCompanyId] companyId résolu via /auth/profile :", resolvedId)
      return resolvedId
    } catch (err) {
      console.error("[resolveCompanyId] Échec de la résolution du companyId :", err)
      return null
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchProduct()
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!product) return
    const loadData = async () => {
      if (product.category === "PREPAID_CARD") {
        await Promise.all([
          fetchPrepaidCards(),
          fetchPrepaidFormulas(),
          fetchDistributors(),
          fetchMerchants(),
        ])
      } else {
        await Promise.all([
          fetchDecoders(),
          fetchFormulas(),
          fetchOptions(),
          fetchParabolasList(),
          fetchDistributors(),
          fetchMerchants(),
        ])
      }
    }
    loadData()
  }, [product?.id])

  const handleTabChange = (i) => {
    setActiveTab(i)
    dismiss()
  }

  /* ===== FETCH ===== */
  const fetchProduct = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/products/services/${id}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      setProduct(res.data?.data)
    } catch {
      showError("Erreur lors du chargement du produit")
    }
  }

  // ✅ CORRIGÉ : on conserve l'objet brut (`raw: d`) pour chaque décodeur, exactement
  // comme c'est déjà fait pour les cartes prépayées. Ça permet à handleViewDecoder
  // d'avoir une donnée de secours à afficher si l'appel de détail échoue ou renvoie
  // une réponse vide (voir le fix plus bas, c'est la cause du bug "popup vide").
  const fetchDecoders = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${SUBPRODUCT_API}/product/${id}?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      const raw = res.data
      setDecoderStats(raw?.subStats ?? null)
      setDecoders((raw?.data || []).map(d => ({
        id: d.id, name: d.name, code: d.code,
        parabolaId: d.parabolaId, description: d.description,
        date: new Date(d.createdAt).toLocaleDateString(), status: d.status || "Activé",
        raw: d,
      })))
    } catch (err) { console.error("Décodeurs:", err.message) }
  }

  const fetchFormulas = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${FORMULA_API}?serviceId=${id}&page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setFormulas((res.data?.data || []).map(d => ({
        id: d.id, name: d.name, code: d.code, price: d.price,
        durationInDays: d.durationInDays, description: d.description,
        date: new Date(d.createdAt).toLocaleDateString(), status: d.status || "Activé",
      })))
    } catch (err) { console.error("Formules:", err.message) }
  }

  const fetchOptions = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${OPTION_API}?serviceId=${id}&page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setOptions((res.data?.data || []).map(d => ({
        id: d.id, name: d.name, code: d.code, price: d.price,
        description: d.description,
        date: new Date(d.createdAt).toLocaleDateString(), status: d.status || "Activé",
      })))
    } catch (err) { console.error("Options:", err.message) }
  }

  const fetchParabolasList = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${PARABOLA_API}?serviceId=${id}&page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setParabolas((res.data?.data || []).map(d => ({
        id: d.id, name: d.name, code: d.code, price: d.price,
        brand: d.brand, description: d.description,
        date: new Date(d.createdAt).toLocaleDateString(), status: d.status || "Activé",
      })))
    } catch (err) { console.error("Paraboles:", err.message) }
  }

  const fetchPrepaidCards = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${SUBPRODUCT_API}/product/${id}?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      const raw = res.data
      setPrepaidStats(raw?.subStats ?? null)
      setPrepaidCards((raw?.data || []).map(d => ({
        id:          d.id,
        name:        d.name,
        code:        d.code,
        price:       d.price,
        description: d.description,
        bank:        d.bank?.name || "-",
        formula:     d.prepaidCardFormula?.name || "-",
        date:        new Date(d.createdAt).toLocaleDateString(),
        status:      d.status || "AVAILABLE",
        raw:         d,
      })))
    } catch (err) { console.error("Cartes prépayées:", err.message) }
  }

  const fetchPrepaidFormulas = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${PREPAID_FORM_API}/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setPrepaidFormulas((res.data?.data || []).map(d => ({
        id:          d.id,
        name:        d.name,
        code:        d.code,
        maxBalance:  d.maxBalance,
        description: d.description,
        date:        new Date(d.createdAt).toLocaleDateString(),
        status:      d.isActive ? "Activé" : "Désactivé",
      })))
    } catch (err) { console.error("Formules prépayées:", err.message) }
  }

  const fetchDistributors = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(
        `${PARTNERS_API}/${id}/partners?isMerchant=false&page=1&limit=100`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      setDistributors((res.data?.data || []).map(d => {
        const dist = d.distributor ?? d
        const user = dist.user ?? {}
        return {
          id:                   d.id,
          distributorId:        dist.id,
          name:                 `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-",
          email:                user.email || "-",
          phone:                user.phone || "-",
          city:                 dist.city || "-",
          lieu:                 dist.city || "-",
          assignedAt:           d.assignedAt ? new Date(d.assignedAt).toLocaleDateString("fr-FR") : "-",
          date:                 dist.createdAt ? new Date(dist.createdAt).toLocaleDateString("fr-FR") : "-",
          status:               d.status === "ACTIVE" || dist.isActive ? "Activé" : "Désactivé",
          totalCommissionEarned: dist.totalCommissionEarned ?? 0,
          blockedCommission:     dist.blockedCommission ?? 0,
          businessName:          dist.businessName || "-",
          address:               dist.address || "-",
          shopAddress:           dist.shopAddress || "-",
          _count:               dist._count ?? {},
          raw:                  d,
        }
      }))
    } catch (err) { console.error("Distributeurs:", err.message) }
  }

  const fetchMerchants = async () => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(
        `${PARTNERS_API}/${id}/partners?isMerchant=true&page=1&limit=100`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      setMerchants((res.data?.data || []).map(d => {
        const merch = d.merchant ?? d
        const user  = merch.user ?? {}
        return {
          id:                   d.id,
          merchantId:           merch.id,
          name:                 `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-",
          email:                user.email || "-",
          phone:                user.phone || "-",
          city:                 merch.city || "-",
          lieu:                 merch.city || "-",
          shopAddress:          merch.shopAddress || "-",
          assignedAt:           d.assignedAt ? new Date(d.assignedAt).toLocaleDateString("fr-FR") : "-",
          date:                 merch.createdAt ? new Date(merch.createdAt).toLocaleDateString("fr-FR") : "-",
          status:               d.status === "ACTIVE" || merch.isActive ? "Activé" : "Désactivé",
          totalCommissionEarned: merch.totalCommissionEarned ?? 0,
          blockedCommission:     merch.blockedCommission ?? 0,
          _count:               merch._count ?? {},
          raw:                  d,
        }
      }))
    } catch (err) { console.error("Commerçants:", err.message) }
  }

  /* ===== CREATE Canal+ ===== */
  const handleOpenAddDecoder = () => {
    navigate(`/ajouter_decodeur/${id}`)
  }

  const handleCreateFormula = async (item) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.post(FORMULA_API,
        {
          name:           item.name,
          code:           item.code,
          description:    item.description,
          price:          Number(item.price),
          durationInDays: Number(item.durationInDays),
          features:       {},
          serviceId:      id,
          isActive:       true,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Formule "${item.name}" créée avec succès`)
      setFormulaModal(false)
      fetchFormulas()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur création formule")
    } finally { setLoading(false) }
  }

  const handleCreateOption = async (item) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.post(OPTION_API,
        {
          name:        item.name,
          code:        item.code,
          description: item.description,
          price:       Number(item.price),
          serviceId:   id,
          features:    {},
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Option "${item.name}" créée avec succès`)
      setOptionModal(false)
      fetchOptions()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur création option")
    } finally { setLoading(false) }
  }

  // CORRIGÉ : le code n'est plus calculé à partir de `parabolas.length` (state local,
  // potentiellement périmé ou faux après une suppression), mais recalculé à partir des
  // codes réellement présents en base juste avant l'envoi. On récupère tous les codes
  // existants au format "PAR-XXX", on prend le plus grand numéro trouvé, et on incrémente.
  // Cela évite les collisions de code qui faisaient échouer la création (erreur 400/409
  // renvoyée par l'API car le code généré existait déjà).
  const handleCreateParabola = async (item) => {
    try {
      setLoading(true)
      const { token, companyId } = getAuthData()

      console.log("=== [Parabole] DÉBUT CRÉATION ===")
      console.log("[Parabole] Token présent ?", Boolean(token))
      console.log("[Parabole] companyId (localStorage) :", companyId)
      console.log("[Parabole] serviceId (id de l'URL) :", id)
      console.log("[Parabole] Données du formulaire (item) :", item)

      // Le backend a besoin du companyId pour rattacher la parabole à l'entreprise
      // (sans ça il plante avec un prisma.mainCompany.findUnique où id = undefined).
      const resolvedCompanyId = await resolveCompanyId()
      console.log("[Parabole] companyId résolu (final) :", resolvedCompanyId)

      // 1. Récupération à jour des paraboles existantes pour ce service
      let existing = []
      try {
        const listRes = await axios.get(`${PARABOLA_API}?serviceId=${id}&page=1&limit=1000`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        })
        console.log("[Parabole] Réponse GET liste paraboles (status) :", listRes.status)
        console.log("[Parabole] Réponse GET liste paraboles (data) :", listRes.data)
        existing = listRes.data?.data || []
      } catch (listErr) {
        console.error("[Parabole] ERREUR lors du GET liste paraboles :", listErr)
        console.error("[Parabole] listErr.response?.status :", listErr?.response?.status)
        console.error("[Parabole] listErr.response?.data :", listErr?.response?.data)
      }

      // 2. Calcul du plus grand numéro déjà utilisé au format PAR-XXX
      let maxNumber = 0
      existing.forEach(p => {
        const match = /^PAR-(\d+)$/.exec(p.code || "")
        if (match) {
          const num = parseInt(match[1], 10)
          if (!Number.isNaN(num) && num > maxNumber) maxNumber = num
        }
      })

      const generatedCode = `PAR-${String(maxNumber + 1).padStart(3, "0")}`
      console.log("[Parabole] Codes existants trouvés :", existing.map(p => p.code))
      console.log("[Parabole] Code généré :", generatedCode)

      const payload = {
        serviceId:   id,
        companyId:   resolvedCompanyId,
        name:        item.name,
        code:        generatedCode,
        brand:       item.brand,
        model:       item.model,
        price:       Number(item.price),
        description: item.description,
        isActive:    true,
      }
      console.log("[Parabole] Payload envoyé au POST :", payload)
      console.log("[Parabole] URL POST :", PARABOLA_API)

      const postRes = await axios.post(PARABOLA_API, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })

      console.log("[Parabole] Réponse POST (status) :", postRes.status)
      console.log("[Parabole] Réponse POST (data) :", postRes.data)
      console.log("=== [Parabole] CRÉATION RÉUSSIE ===")

      showSuccess(`Parabole "${item.name}" créée avec succès (${generatedCode})`)
      setParabolaModal(false)
      fetchParabolasList()
    } catch (err) {
      console.error("=== [Parabole] ERREUR CRÉATION ===")
      console.error("[Parabole] Erreur complète :", err)
      console.error("[Parabole] err.message :", err?.message)
      console.error("[Parabole] err.response?.status :", err?.response?.status)
      console.error("[Parabole] err.response?.data : ", err?.response?.data)
      console.error("[Parabole] err.response?.data.description (TEXTE COMPLET) :\n" + (err?.response?.data?.description || "—"))
      console.error("[Parabole] err.response?.headers :", err?.response?.headers)
      console.error("[Parabole] err.config?.url :", err?.config?.url)
      console.error("[Parabole] err.config?.data :", err?.config?.data)
      showError(err?.response?.data?.message || "Erreur création parabole")
    } finally { setLoading(false) }
  }

  /* ===== CREATE Formule prépayée ===== */
  const handleCreatePrepaidFormula = async (item) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.post(
        PREPAID_FORM_CREATE,
        {
          name:        item.name,
          code:        item.code,
          description: item.description,
          maxBalance:  Number(item.maxBalance),
          serviceId:   id,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Formule "${item.name}" créée avec succès`)
      setPrepaidFormulaModal(false)
      fetchPrepaidFormulas()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur création formule prépayée")
    } finally { setLoading(false) }
  }

  /* ===== DETAIL ===== */

  // ✅ CORRIGÉ (bug principal) : la popup de détail d'un décodeur restait vide/invisible
  // pour certains décodeurs (notamment ceux au statut "Activé"). En effet la condition
  // d'affichage de la modale est `detailModal && selectedDecoder`. Or l'ancien code
  // faisait `setSelectedDecoder(res.data?.data)` sans aucun filet de sécurité : si
  // l'API renvoyait `data: null` (ou une erreur), `selectedDecoder` restait vide alors
  // que `detailModal` passait quand même à `true` → résultat : rien ne s'affichait à
  // l'écran, sans erreur visible.
  // On applique désormais exactement le même pattern de secours que pour les cartes
  // prépayées (`handleViewPrepaid`) : si l'appel échoue ou ne renvoie pas de données,
  // on retombe sur `item.raw` (l'objet brut déjà en mémoire depuis fetchDecoders), afin
  // que la popup s'ouvre TOUJOURS avec au minimum les infos déjà chargées en liste.
  const handleViewDecoder = async (item) => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${SUBPRODUCT_API}/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setSelectedDecoder(res.data?.data || item.raw || item)
      setDetailModal(true)
    } catch {
      setSelectedDecoder(item.raw || item)
      setDetailModal(true)
    }
  }

  const handleViewOption = async (item) => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${OPTION_API}/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setSelectedOption(res.data?.data)
      setOptionDetailModal(true)
    } catch {
      showError("Erreur chargement détail option")
    }
  }

  const handleViewParabola = async (item) => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${PARABOLA_API}/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setSelectedParabola(res.data?.data)
      setParabolaDetailModal(true)
    } catch {
      showError("Erreur chargement détail parabole")
    }
  }

  const handleViewPrepaid = async (item) => {
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${SUBPRODUCT_API}/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      setSelectedPrepaid(res.data?.data || item.raw)
      setPrepaidDetailModal(true)
    } catch {
      setSelectedPrepaid(item.raw)
      setPrepaidDetailModal(true)
    }
  }

  const handleEditPrepaidSubmit = async (form) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.put(
        `${SUBPRODUCT_API}/${form.id}`,
        { name: form.name, code: form.code, description: form.description, price: Number(form.price) },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Carte "${form.name}" modifiée avec succès`)
      setEditPrepaidModal(false); setEditPrepaid(null)
      fetchPrepaidCards()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur modification carte")
    } finally { setLoading(false) }
  }

  const handleDeletePrepaid = async () => {
    if (!prepaidToDelete) return
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.delete(`${SUBPRODUCT_API}/${prepaidToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`"${prepaidToDelete.name}" supprimée avec succès`)
      setDeletePrepaidConfirm(false); setPrepaidToDelete(null)
      fetchPrepaidCards()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur suppression carte")
    } finally { setLoading(false) }
  }

  const handleViewFormula  = (item) => navigate(`/detail_formule/${item.id}`)
  const handleViewPerson   = (item) => { setSelectedPerson(item); setPersonDetailModal(true) }

  /* ===== EDIT ===== */

  //  CORRIGÉ : parabolaId est optionnel — on ne l'envoie que s'il est renseigné
  const handleEditDecoder = async (form) => {
    try {
      setLoading(true)
      const { token } = getAuthData()

      const payload = {
        name:        form.name,
        code:        form.code,
        description: form.description,
      }

      // On n'inclut parabolaId dans le payload que s'il est renseigné
      if (form.parabolaId && form.parabolaId !== "") {
        payload.parabolaId = form.parabolaId
      }

      await axios.put(
        `${SUBPRODUCT_API}/${form.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Décodeur "${form.name}" modifié avec succès`)
      setEditModal(false); setEditDecoder(null)
      fetchDecoders()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur modification décodeur")
    } finally { setLoading(false) }
  }

  const handleEditFormula = async (form) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.put(
        `${FORMULA_API}/${form.id}`,
        {
          name:           form.name,
          code:           form.code,
          description:    form.description,
          price:          Number(form.price),
          durationInDays: Number(form.durationInDays),
          features:       {},
          isActive:       true,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Formule "${form.name}" modifiée avec succès`)
      setEditFormulaModal(false); setEditFormula(null)
      fetchFormulas()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur modification formule")
    } finally { setLoading(false) }
  }

  const handleEditOption = async (form) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.put(
        `${OPTION_API}/${form.id}`,
        {
          name:        form.name,
          description: form.description,
          price:       Number(form.price),
          isActive:    true,
          features:    {},
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Option "${form.name}" modifiée avec succès`)
      setEditOptionModal(false); setEditOption(null)
      fetchOptions()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur modification option")
    } finally { setLoading(false) }
  }

  const handleEditParabola = async (form) => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      await axios.put(
        `${PARABOLA_API}/${form.id}`,
        {
          name:        form.name,
          code:        form.code,
          brand:       form.brand,
          model:       form.model,
          price:       Number(form.price),
          description: form.description,
          isActive:    true,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      showSuccess(`Parabole "${form.name}" modifiée avec succès`)
      setEditParabolaModal(false); setEditParabola(null)
      fetchParabolasList()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur modification parabole")
    } finally { setLoading(false) }
  }

  /* ===== DELETE ===== */
  const handleOpenDelete = (item, type) => {
    setItemToDelete(item)
    setDeleteType(type)
    setDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return
    try {
      setLoading(true)
      const { token } = getAuthData()
      const urlMap = {
        decoder:  `${SUBPRODUCT_API}/${itemToDelete.id}`,
        formula:  `${FORMULA_API}/${itemToDelete.id}`,
        option:   `${OPTION_API}/${itemToDelete.id}`,
        parabola: `${PARABOLA_API}/${itemToDelete.id}`,
      }
      await axios.delete(urlMap[deleteType], { headers: { Authorization: `Bearer ${token}` } })
      showSuccess(`"${itemToDelete.name}" supprimé avec succès`)
      setDeleteConfirm(false); setItemToDelete(null); setDeleteType(null)
      if (deleteType === "decoder")  fetchDecoders()
      if (deleteType === "formula")  fetchFormulas()
      if (deleteType === "option")   fetchOptions()
      if (deleteType === "parabola") fetchParabolasList()
    } catch (err) {
      showError(err?.response?.data?.message || "Erreur suppression")
    } finally { setLoading(false) }
  }

  /* ===== DONNÉES ACTIVES ===== */
  const personTabIndexes = isPrepaid ? [2, 3] : [4, 5]
  const isPersonTab = personTabIndexes.includes(activeTab)

  const getActiveData = () => {
    if (isPrepaid) {
      if (activeTab === 0) {
        return prepaidCards.filter(c => {
          const bankOk    = !filterBank    || c.bank    === filterBank
          const formulaOk = !filterFormula || c.formula === filterFormula
          return bankOk && formulaOk
        })
      }
      return [prepaidFormulas, distributors, merchants][activeTab - 1] || []
    } else {
      return [decoders, formulas, options, parabolas, distributors, merchants][activeTab] || []
    }
  }

  const activeData = getActiveData()
  const totalPages = Math.ceil(activeData.length / rowsPerPage)
  const start      = (currentPage - 1) * rowsPerPage
  const end        = start + rowsPerPage
  const paginated  = activeData.slice(start, end)

  const addLabels = isPrepaid
    ? ["Ajouter carte", "Ajouter formule", "", ""]
    : ["Ajouter décodeur", "Ajouter formule", "Ajouter option", "Ajouter parabole", "", ""]

  const openModal = isPrepaid
    ? [
        () => navigate(`/ajouter_carte/${id}`),
        () => setPrepaidFormulaModal(true),
        () => {},
        () => {},
      ]
    : [
        handleOpenAddDecoder,
        () => setFormulaModal(true),
        () => setOptionModal(true),
        () => setParabolaModal(true),
        () => {},
        () => {},
      ]

  const showPriceCol = isPrepaid
    ? activeTab === 0
    : (activeTab === 1 || activeTab === 2)

  const getViewHandler = (d) => {
    if (isPrepaid) {
      if (activeTab === 0) return () => handleViewPrepaid(d)
      return null
    } else {
      if (activeTab === 0) return () => handleViewDecoder(d)
      if (activeTab === 1) return () => handleViewFormula(d)
      if (activeTab === 2) return () => handleViewOption(d)
      if (activeTab === 3) return () => handleViewParabola(d)
      return null
    }
  }

  const getEditHandler = (d) => {
    if (isPrepaid && activeTab === 0) return () => { setEditPrepaid(d); setEditPrepaidModal(true) }
    if (isPrepaid) return null
    if (activeTab === 0) return () => { setEditDecoder(d);  setEditModal(true) }
    if (activeTab === 1) return () => { setEditFormula(d);  setEditFormulaModal(true) }
    if (activeTab === 2) return () => { setEditOption(d);   setEditOptionModal(true) }
    if (activeTab === 3) return () => { setEditParabola(d); setEditParabolaModal(true) }
    return null
  }

  const getDeleteHandler = (d) => {
    if (isPrepaid && activeTab === 0) return () => { setPrepaidToDelete(d); setDeletePrepaidConfirm(true) }
    if (isPrepaid) return null
    if (activeTab === 0) return () => handleOpenDelete(d, "decoder")
    if (activeTab === 1) return () => handleOpenDelete(d, "formula")
    if (activeTab === 2) return () => handleOpenDelete(d, "option")
    if (activeTab === 3) return () => handleOpenDelete(d, "parabola")
    return null
  }

  const isMerchantTab = isPrepaid ? activeTab === 3 : activeTab === 5

  if (loading && !product) return <p className="p-4 sm:p-8">Chargement...</p>

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black">
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Détails {product?.name || "Produit"}</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Catégorie : {product?.category || "-"} / Créé le{" "}
            {product?.createdAt ? new Date(product.createdAt).toLocaleDateString() : "-"}
          </p>
        </div>
        {!isPersonTab && addLabels[activeTab] && (
          <button className="bg-[#1EA4DC] text-white px-4 py-2 rounded-lg self-start sm:self-auto whitespace-nowrap" onClick={openModal[activeTab]}>
            {addLabels[activeTab]}
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-1 sm:pb-0 no-scrollbar">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm whitespace-nowrap ${
              i === activeTab ? "bg-[#1EA4DC] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* STATS */}
      {!isPersonTab && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {isPrepaid && activeTab === 0 && <PrepaidStatCard stats={prepaidStats} />}
          {isPrepaid && activeTab === 1 && <ItemStatCard label="Formules carte prépayée" data={prepaidFormulas} />}
          {!isPrepaid && activeTab === 0 && <DecoderStatCard stats={decoderStats} />}
          {!isPrepaid && activeTab === 1 && <ItemStatCard label="Formules Canal+" data={formulas} />}
          {!isPrepaid && activeTab === 2 && <ItemStatCard label="Options Canal+"  data={options}  />}
          {!isPrepaid && activeTab === 3 && <ItemStatCard label="Paraboles"       data={parabolas} />}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-rows-2 lg:grid-cols-1 gap-4 sm:gap-6">
            <StatCard title="Commerçants"   value={merchants.length}    />
            <StatCard title="Distributeurs" value={distributors.length} />
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 sm:p-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input placeholder="Rechercher..." className="w-full pl-10 py-2 rounded-lg bg-gray-100" />
          </div>
          {isPrepaid && activeTab === 0 && (
            <>
              <select
                value={filterBank}
                onChange={e => { setFilterBank(e.target.value); setCurrentPage(1) }}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-100 text-sm text-gray-600 outline-none border-none"
              >
                <option value="">Toutes les banques</option>
                {[...new Set(prepaidCards.map(c => c.bank).filter(Boolean))].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                value={filterFormula}
                onChange={e => { setFilterFormula(e.target.value); setCurrentPage(1) }}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-100 text-sm text-gray-600 outline-none border-none"
              >
                <option value="">Toutes les formules</option>
                {[...new Set(prepaidCards.map(c => c.formula).filter(Boolean))].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {(filterBank || filterFormula) && (
                <button
                  onClick={() => { setFilterBank(""); setFilterFormula(""); setCurrentPage(1) }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-sm hover:bg-red-100 transition-colors w-full sm:w-auto"
                >
                  <X size={14} /> Réinitialiser
                </button>
              )}
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm rounded-lg overflow-visible">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">N°</th>
                <th className="px-4 py-3 text-left">{TABS[activeTab]}</th>
                {isPersonTab && <th className="px-4 py-3 text-left">Email</th>}
                {isPersonTab && <th className="px-4 py-3 text-left">Ville</th>}
                {isPersonTab && isMerchantTab && <th className="px-4 py-3 text-left">Commission</th>}
                {showPriceCol && <th className="px-4 py-3 text-left">Prix</th>}
                {isPrepaid && activeTab === 1 && <th className="px-4 py-3 text-left">Solde max</th>}
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((d, i) => (
                  isPersonTab ? (
                    <PersonRow
                      key={d.id}
                      id={start + i + 1}
                      item={d}
                      alt={i % 2}
                      isMerchant={isMerchantTab}
                      onView={() => handleViewPerson(d)}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ) : isPrepaid && activeTab === 1 ? (
                    <PrepaidFormulaRow
                      key={d.id}
                      id={start + i + 1}
                      item={d}
                      alt={i % 2}
                    />
                  ) : (
                    <GenericRow
                      key={d.id}
                      id={start + i + 1}
                      item={d}
                      name={d.name}
                      code={d.code}
                      price={d.price}
                      date={d.date}
                      status={d.status}
                      showPrice={showPriceCol}
                      alt={i % 2}
                      onView={getViewHandler(d)}
                      onEdit={getEditHandler(d)}
                      onDelete={getDeleteHandler(d)}
                    />
                  )
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-400">
                    Aucun élément trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <PaginationFooter
            total={activeData.length}
            start={activeData.length > 0 ? start + 1 : 0}
            end={Math.min(end, activeData.length)}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={(v) => { setRowsPerPage(v); setCurrentPage(1) }}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </div>
      </div>

      {/* ===== MODALS CRÉATION Canal+ ===== */}
      {formulaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Ajouter une formule Canal+</h2>
            <GenericForm label="formule" showPrice onCancel={() => setFormulaModal(false)} onSubmit={handleCreateFormula} />
          </div>
        </div>
      )}

      {optionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Ajouter une option Canal+</h2>
            <GenericForm label="option" showPrice onCancel={() => setOptionModal(false)} onSubmit={handleCreateOption} />
          </div>
        </div>
      )}

      {parabolaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Ajouter une parabole</h2>
            <GenericForm label="parabole" showPrice={false} onCancel={() => setParabolaModal(false)} onSubmit={handleCreateParabola} />
          </div>
        </div>
      )}

      {/* ===== MODAL CRÉATION FORMULE PRÉPAYÉE ===== */}
      {prepaidFormulaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Ajouter une formule prépayée</h2>
            <PrepaidFormulaForm
              onCancel={() => setPrepaidFormulaModal(false)}
              onSubmit={handleCreatePrepaidFormula}
            />
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL CARTE PRÉPAYÉE ===== */}
      {prepaidDetailModal && selectedPrepaid && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
              <h2 className="text-lg font-semibold">Détails sur la carte prépayée</h2>
              <button onClick={() => setPrepaidDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <div className="px-4 sm:px-6 pb-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{selectedPrepaid.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Code : {selectedPrepaid.code}</p>
                  {selectedPrepaid.price && (
                    <p className="text-sm font-semibold text-[#1EA4DC] mt-1">
                      {Number(selectedPrepaid.price).toLocaleString("fr-FR")} {selectedPrepaid.currency || "FCFA"}
                    </p>
                  )}
                </div>
                <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedPrepaid.status === "ACTIVATED" ? "bg-green-100 text-green-600" :
                  selectedPrepaid.status === "ASSIGNED"  ? "bg-blue-100 text-blue-600"  :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {selectedPrepaid.status || "-"}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
                  <div><p className="text-xs text-gray-400">Description</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.description || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Durée (jours)</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.durationInDays ?? "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Renouvelable</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.renewable ? "Oui" : "Non"}</p></div>
                  <div><p className="text-xs text-gray-400">Date de création</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.createdAt ? new Date(selectedPrepaid.createdAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Banque & Formule</p>
                  <div><p className="text-xs text-gray-400">Banque</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.bank?.name || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Code banque</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.bank?.code || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Formule prépayée</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.prepaidCardFormula?.name || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Solde max formule</p><p className="font-semibold text-gray-800 text-sm">{selectedPrepaid.prepaidCardFormula?.maxBalance ? Number(selectedPrepaid.prepaidCardFormula.maxBalance).toLocaleString("fr-FR") + " FCFA" : "-"}</p></div>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribution</p>
                  <div><p className="text-xs text-gray-400">Distributeurs</p><p className="font-bold text-gray-800 text-base">{selectedPrepaid._count?.distributorSubProduct ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Commerçants</p><p className="font-bold text-gray-800 text-base">{selectedPrepaid._count?.merchantSubProduct ?? 0}</p></div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statistiques</p>
                  <div><p className="text-xs text-gray-400">Cartes prépayées</p><p className="font-bold text-gray-800 text-base">{selectedPrepaid._count?.prepaidCards ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Abonnements Canal</p><p className="font-bold text-gray-800 text-base">{selectedPrepaid._count?.canalSubscriptions ?? 0}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL DÉCODEUR ===== */}
      {detailModal && selectedDecoder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
              <h2 className="text-lg font-semibold">Détails sur le décodeur</h2>
              <button onClick={() => setDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <div className="px-4 sm:px-6 pb-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{selectedDecoder.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">N° : {selectedDecoder.code}</p>
                  {selectedDecoder.price && <p className="text-sm text-gray-500">{selectedDecoder.price} fcfa</p>}
                </div>
                <span className="self-start px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-semibold">
                  {selectedDecoder.status || "Activé"}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
                  <div><p className="text-xs text-gray-400">Description</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.description || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Renouvelable</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.renewable || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Date de création</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.createdAt ? new Date(selectedDecoder.createdAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Dernière mise à jour</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.updatedAt ? new Date(selectedDecoder.updatedAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service</p>
                  <div><p className="text-xs text-gray-400">Nom</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.service?.name || product?.name || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Code</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.service?.code || product?.code || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Catégorie</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.service?.category || product?.category || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Description service</p><p className="font-semibold text-gray-800 text-sm">{selectedDecoder.service?.description || product?.description || "-"}</p></div>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribution</p>
                  <div><p className="text-xs text-gray-400">Distributeurs</p><p className="font-bold text-gray-800 text-base">{selectedDecoder.distributors ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Commerçants</p><p className="font-bold text-gray-800 text-base">{selectedDecoder.merchants ?? 0}</p></div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statistiques</p>
                  <div><p className="text-xs text-gray-400">Stock total</p><p className="font-bold text-gray-800 text-base">{selectedDecoder.totalStock ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Cartes prépayées</p><p className="font-bold text-gray-800 text-base">{selectedDecoder.prepaidCards ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Abonnements Canal</p><p className="font-bold text-gray-800 text-base">{selectedDecoder.canalSubscriptions ?? 0}</p></div>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Paraboles associées ({selectedDecoder.decoderParabolas?.length ?? 0})
                </p>
                {selectedDecoder.decoderParabolas && selectedDecoder.decoderParabolas.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDecoder.decoderParabolas.map((dp) => {
                      const p = dp.parabola
                      return (
                        <div key={dp.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{p?.name || "-"}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Code : {p?.code || "-"}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dp.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                              {dp.isActive ? "Actif" : "Inactif"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div><p className="text-gray-400">Prix</p><p className="font-semibold text-gray-700">{p?.price ? `${p.price} FCFA` : "-"}</p></div>
                            <div><p className="text-gray-400">Marque</p><p className="font-semibold text-gray-700">{p?.brand || "-"}</p></div>
                            <div><p className="text-gray-400">Modèle</p><p className="font-semibold text-gray-700">{p?.model || "-"}</p></div>
                            <div><p className="text-gray-400">Statut stock</p><p className="font-semibold text-gray-700">{p?.status || "-"}</p></div>
                            <div><p className="text-gray-400">Assigné le</p><p className="font-semibold text-gray-700">{dp.assignedAt ? new Date(dp.assignedAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                            <div><p className="text-gray-400">Description</p><p className="font-semibold text-gray-700">{p?.description || "-"}</p></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 text-center">Aucune parabole associée à ce décodeur</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL OPTION ===== */}
      {optionDetailModal && selectedOption && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
              <h2 className="text-lg font-semibold">Détails sur l'option</h2>
              <button onClick={() => setOptionDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <div className="px-4 sm:px-6 pb-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{selectedOption.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Code : {selectedOption.code}</p>
                  {selectedOption.price && (
                    <p className="text-sm font-semibold text-[#1EA4DC] mt-1">
                      {Number(selectedOption.price).toLocaleString("fr-FR")} FCFA
                    </p>
                  )}
                </div>
                <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedOption.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                }`}>
                  {selectedOption.isActive ? "Activé" : "Désactivé"}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
                  <div><p className="text-xs text-gray-400">Description</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.description || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Date de création</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.createdAt ? new Date(selectedOption.createdAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Dernière mise à jour</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.updatedAt ? new Date(selectedOption.updatedAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service</p>
                  <div><p className="text-xs text-gray-400">Nom</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.service?.name || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Code</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.service?.code || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Catégorie</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.service?.category || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Description service</p><p className="font-semibold text-gray-800 text-sm">{selectedOption.service?.description || "-"}</p></div>
                </div>
              </div>
              {selectedOption.features && Object.keys(selectedOption.features).length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Caractéristiques</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(selectedOption.features).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-xs text-gray-400">{key}</p>
                          <p className="font-semibold text-gray-800 text-sm">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <hr className="border-gray-100" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Abonnements associés ({selectedOption.selectedOptions?.length ?? 0})
                </p>
                {selectedOption.selectedOptions && selectedOption.selectedOptions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOption.selectedOptions.map((so, idx) => (
                      <div key={so.id || idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                        <p className="font-semibold text-gray-800">{so.name || so.id || "-"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-400 text-center">Aucun abonnement associé à cette option</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL PARABOLE ===== */}
      {parabolaDetailModal && selectedParabola && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
              <h2 className="text-lg font-semibold">Détails sur la parabole</h2>
              <button onClick={() => setParabolaDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <div className="px-4 sm:px-6 pb-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{selectedParabola.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Code : {selectedParabola.code || "-"}</p>
                  {selectedParabola.price && (
                    <p className="text-sm text-gray-500">{Number(selectedParabola.price).toLocaleString("fr-FR")} FCFA</p>
                  )}
                </div>
                <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${selectedParabola.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                  {selectedParabola.status || (selectedParabola.isActive ? "Actif" : "Inactif")}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
                  <div><p className="text-xs text-gray-400">Description</p><p className="font-semibold text-gray-800 text-sm">{selectedParabola.description || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Marque</p><p className="font-semibold text-gray-800 text-sm">{selectedParabola.brand || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Modèle</p><p className="font-semibold text-gray-800 text-sm">{selectedParabola.model || "-"}</p></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dates</p>
                  <div><p className="text-xs text-gray-400">Date de création</p><p className="font-semibold text-gray-800 text-sm">{selectedParabola.createdAt ? new Date(selectedParabola.createdAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Dernière mise à jour</p><p className="font-semibold text-gray-800 text-sm">{selectedParabola.updatedAt ? new Date(selectedParabola.updatedAt).toLocaleDateString("fr-FR") : "-"}</p></div>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribution</p>
                  <div><p className="text-xs text-gray-400">Distributeurs</p><p className="font-bold text-gray-800 text-base">{selectedParabola._count?.distributorParabolas ?? 0}</p></div>
                  <div><p className="text-xs text-gray-400">Commerçants</p><p className="font-bold text-gray-800 text-base">{selectedParabola._count?.merchantParabolas ?? 0}</p></div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statistiques</p>
                  <div><p className="text-xs text-gray-400">Abonnements Canal</p><p className="font-bold text-gray-800 text-base">{selectedParabola._count?.canalSubscriptions ?? 0}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DÉTAIL DISTRIBUTEUR / COMMERÇANT ===== */}
      {personDetailModal && selectedPerson && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
              <h2 className="text-lg font-semibold">
                Détails sur le {isMerchantTab ? "commerçant" : "distributeur"}
              </h2>
              <button onClick={() => setPersonDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
            </div>
            <div className="px-4 sm:px-6 pb-6 space-y-5">
              <div className="bg-blue-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-base">{selectedPerson.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedPerson.city || selectedPerson.lieu || "-"}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{selectedPerson.email}</p>
                </div>
                <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedPerson.status === "Activé" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                }`}>
                  {selectedPerson.status}
                </span>
              </div>
              <hr className="border-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
                  <div><p className="text-xs text-gray-400">Prénom & Nom</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.name || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Email</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.email || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Téléphone</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.phone || selectedPerson.raw?.merchant?.user?.phone || selectedPerson.raw?.distributor?.user?.phone || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Ville</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.city || "-"}</p></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dates</p>
                  <div><p className="text-xs text-gray-400">Date d'assignation</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.assignedAt || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Date de création</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.date || "-"}</p></div>
                  <div><p className="text-xs text-gray-400">Dernière mise à jour</p><p className="font-semibold text-gray-800 text-sm">
                    {selectedPerson.raw?.merchant?.updatedAt
                      ? new Date(selectedPerson.raw.merchant.updatedAt).toLocaleDateString("fr-FR")
                      : selectedPerson.raw?.distributor?.updatedAt
                      ? new Date(selectedPerson.raw.distributor.updatedAt).toLocaleDateString("fr-FR")
                      : "-"}
                  </p></div>
                </div>
              </div>
              <hr className="border-gray-100" />
              {isMerchantTab ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Commissions</p>
                    <div><p className="text-xs text-gray-400">Commission totale gagnée</p><p className="font-bold text-gray-800 text-base">{Number(selectedPerson.totalCommissionEarned || 0).toLocaleString("fr-FR")} FCFA</p></div>
                    <div><p className="text-xs text-gray-400">Commission bloquée</p><p className="font-bold text-gray-800 text-base">{Number(selectedPerson.blockedCommission || 0).toLocaleString("fr-FR")} FCFA</p></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Boutique</p>
                    <div><p className="text-xs text-gray-400">Adresse boutique</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.shopAddress || "-"}</p></div>
                    <div><p className="text-xs text-gray-400">Opérations</p><p className="font-bold text-gray-800 text-base">{selectedPerson._count?.operations ?? 0}</p></div>
                    <div><p className="text-xs text-gray-400">Justificatifs de paiement</p><p className="font-bold text-gray-800 text-base">{selectedPerson._count?.paymentProofs ?? 0}</p></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statistiques</p>
                    <div><p className="text-xs text-gray-400">Opérations</p><p className="font-bold text-gray-800 text-base">{selectedPerson._count?.operations ?? 0}</p></div>
                    <div><p className="text-xs text-gray-400">Cartes prépayées</p><p className="font-bold text-gray-800 text-base">{selectedPerson._count?.prepaidCards ?? 0}</p></div>
                    <div><p className="text-xs text-gray-400">Abonnements Canal</p><p className="font-bold text-gray-800 text-base">{selectedPerson._count?.canalSubscriptions ?? 0}</p></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entreprise</p>
                    <div><p className="text-xs text-gray-400">Raison sociale</p><p className="font-bold text-gray-800 text-base">{selectedPerson.businessName || "-"}</p></div>
                    <div><p className="text-xs text-gray-400">Adresse</p><p className="font-semibold text-gray-800 text-sm">{selectedPerson.address || "-"}</p></div>
                    <div><p className="text-xs text-gray-400">Commission totale</p><p className="font-bold text-gray-800 text-base">{Number(selectedPerson.totalCommissionEarned || 0).toLocaleString("fr-FR")} FCFA</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALS MODIFICATION ===== */}
      {editModal && editDecoder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Modifier le décodeur</h2>
            <DecoderForm
              initialData={editDecoder}
              submitLabel="Enregistrer"
              onCancel={() => { setEditModal(false); setEditDecoder(null) }}
              onSubmit={handleEditDecoder}
            />
          </div>
        </div>
      )}

      {editFormulaModal && editFormula && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Modifier la formule</h2>
            <GenericForm
              label="formule"
              showPrice
              initialData={editFormula}
              submitLabel="Enregistrer"
              onCancel={() => { setEditFormulaModal(false); setEditFormula(null) }}
              onSubmit={handleEditFormula}
            />
          </div>
        </div>
      )}

      {editOptionModal && editOption && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Modifier l'option</h2>
            <GenericForm
              label="option"
              showPrice
              initialData={editOption}
              submitLabel="Enregistrer"
              onCancel={() => { setEditOptionModal(false); setEditOption(null) }}
              onSubmit={handleEditOption}
            />
          </div>
        </div>
      )}

      {editParabolaModal && editParabola && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Modifier la parabole</h2>
            <GenericForm
              label="parabole"
              showPrice={false}
              initialData={editParabola}
              submitLabel="Enregistrer"
              onCancel={() => { setEditParabolaModal(false); setEditParabola(null) }}
              onSubmit={handleEditParabola}
            />
          </div>
        </div>
      )}

      {editPrepaidModal && editPrepaid && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Modifier la carte prépayée</h2>
            <PrepaidCardForm
              initialData={editPrepaid}
              submitLabel="Enregistrer"
              onCancel={() => { setEditPrepaidModal(false); setEditPrepaid(null) }}
              onSubmit={handleEditPrepaidSubmit}
            />
          </div>
        </div>
      )}

      {deletePrepaidConfirm && prepaidToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Confirmer la suppression</h2>
            <p className="text-gray-500 text-sm mb-6">
              Voulez-vous vraiment supprimer la carte{" "}
              <span className="font-semibold text-gray-800">"{prepaidToDelete.name}"</span> ?
              Cette action est irréversible.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => { setDeletePrepaidConfirm(false); setPrepaidToDelete(null) }} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={handleDeletePrepaid} className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">{loading ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Confirmer la suppression</h2>
            <p className="text-gray-500 text-sm mb-6">
              Voulez-vous vraiment supprimer{" "}
              <span className="font-semibold text-gray-800">"{itemToDelete.name}"</span> ?
              Cette action est irréversible.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => { setDeleteConfirm(false); setItemToDelete(null); setDeleteType(null) }} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={handleDelete} className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">{loading ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ===== SUB-COMPONENTS ===== */

function isActiveStatus(status) {
  if (!status) return true
  const normalized = String(status).trim().toLowerCase()
  const inactiveValues = [
    "désactivé","desactive","désactive","desactivé",
    "inactif","inactive","deactivated","disabled","false","0","non","off",
  ]
  return !inactiveValues.includes(normalized)
}

function PrepaidStatCard({ stats }) {
  const total    = stats?.count ?? 0
  const byStatus = stats?.statistics?.byStatus ?? []
  const get = (s) => byStatus.find(x => x.status === s)?.count ?? 0
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-5 sm:py-6 border border-blue-50/50 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-h-[100px]">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest shrink-0">Carte prépayée</p>
      <div className="hidden sm:block w-px self-stretch bg-blue-200" />
      <div className="grid grid-cols-2 sm:grid-cols-4 flex-1 divide-x divide-y sm:divide-y-0 divide-blue-200">
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{total}</p><p className="text-xs text-gray-500 mt-1">Total</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("ASSIGNED")}</p><p className="text-xs text-gray-500 mt-1">Assigné</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("AVAILABLE")}</p><p className="text-xs text-gray-500 mt-1">Disponible</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("ACTIVATED")}</p><p className="text-xs text-gray-500 mt-1">Actif</p></div>
      </div>
    </div>
  )
}

function ItemStatCard({ label, data }) {
  const total    = data.length
  const active   = data.filter(d => isActiveStatus(d.status)).length
  const inactive = total - active
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-5 sm:py-6 border border-blue-50/50 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-h-[100px]">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest shrink-0">{label}</p>
      <div className="hidden sm:block w-px self-stretch bg-blue-200" />
      <div className="grid grid-cols-3 flex-1 divide-x divide-blue-200">
        <div className="px-2 sm:px-4 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{total}</p><p className="text-xs text-gray-500 mt-1">Total</p></div>
        <div className="px-2 sm:px-4 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{active}</p><p className="text-xs text-gray-500 mt-1">Actif</p></div>
        <div className="px-2 sm:px-4 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{inactive}</p><p className="text-xs text-gray-500 mt-1">Inactif</p></div>
      </div>
    </div>
  )
}

function DecoderStatCard({ stats }) {
  const total    = stats?.count ?? 0
  const byStatus = stats?.statistics?.byStatus ?? []
  const get      = (s) => byStatus.find(x => x.status === s)?.count ?? 0
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-5 sm:py-6 border border-blue-50/50 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-h-[100px]">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest shrink-0">Décodeur</p>
      <div className="hidden sm:block w-px self-stretch bg-blue-200" />
      <div className="grid grid-cols-2 sm:grid-cols-4 flex-1 divide-x divide-y sm:divide-y-0 divide-blue-200">
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{total}</p><p className="text-xs text-gray-500 mt-1">Total</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("ASSIGNED")}</p><p className="text-xs text-gray-500 mt-1">Assigné</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("AVAILABLE")}</p><p className="text-xs text-gray-500 mt-1">Disponible</p></div>
        <div className="px-2 sm:px-4 py-2 sm:py-0 text-center"><p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{get("ACTIVATED")}</p><p className="text-xs text-gray-500 mt-1">Activé</p></div>
      </div>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#EEF5FF] rounded-2xl px-4 sm:px-8 py-5 sm:py-6 flex flex-col space-y-1 sm:space-y-2 border border-blue-50/50">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-[#1EA4DC]">{value}</p>
    </div>
  )
}

function PrepaidFormulaRow({ id, item, alt }) {
  return (
    <tr className={`${alt ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"} transition-colors`}>
      <td className="px-4 py-4">{id}</td>
      <td className="px-4 py-4">
        <p className="font-medium text-gray-800">{item.name}</p>
        <p className="text-xs text-gray-400">{item.code}</p>
      </td>
      <td className="px-4 py-4 font-medium text-gray-700">
        {item.maxBalance ? `${Number(item.maxBalance).toLocaleString("fr-FR")} FCFA` : "-"}
      </td>
      <td className="px-4 py-4 text-gray-600">{item.date}</td>
      <td className="px-4 py-4">
        <span className="px-4 py-1.5 bg-green-100 text-green-600 rounded-full text-xs font-semibold">{item.status}</span>
      </td>
      <td className="px-4 py-4 text-center text-gray-300 text-xs">—</td>
    </tr>
  )
}

function GenericRow({ id, name, code, price, date, status, showPrice, alt, item, onView, onEdit, onDelete }) {
  const [isOpen, setIsOpen]         = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - rect.bottom < 150)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <tr className={`${alt ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"} transition-colors`}>
      <td className="px-4 py-4">{id}</td>
      <td className="px-4 py-4">
        <p className="font-medium text-gray-800">{name}</p>
        <p className="text-xs text-gray-400">{code}</p>
      </td>
      {showPrice && (
        <td className="px-4 py-4 font-medium text-gray-700">{price ? `${Number(price).toLocaleString("fr-FR")} FCFA` : "-"}</td>
      )}
      <td className="px-4 py-4 text-gray-600">{date}</td>
      <td className="px-4 py-4">
        <span className="px-4 py-1.5 bg-green-100 text-green-600 rounded-full text-xs font-semibold">{status}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="relative inline-flex" ref={containerRef}>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={18} className="text-gray-600" />
          </button>
          {isOpen && (
            <div className={`absolute right-0 z-50 w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left overflow-hidden ${openUpward ? "bottom-full mb-2" : "top-full mt-2"}`}>
              {onView && (
                <button type="button" onClick={() => { setIsOpen(false); onView() }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                  <Eye size={16} className="text-gray-500" /><span className="text-gray-700">Voir détails</span>
                </button>
              )}
              {onEdit && (
                <button type="button" onClick={() => { setIsOpen(false); onEdit(item) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                  <Pencil size={16} className="text-gray-500" /><span className="text-gray-700">Modifier</span>
                </button>
              )}
              {onDelete && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <button type="button" onClick={() => { setIsOpen(false); onDelete(item) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} /><span>Supprimer</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function PersonRow({ id, item, alt, isMerchant, onView, onEdit, onDelete }) {
  const [isOpen, setIsOpen]         = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOpenUpward(window.innerHeight - rect.bottom < 150)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <tr className={`${alt ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"} transition-colors`}>
      <td className="px-4 py-4">{id}</td>
      <td className="px-4 py-4">
        <p className="font-medium text-gray-800">{item.name || "-"}</p>
        <p className="text-xs text-gray-400">{item.city || item.lieu || "-"}</p>
      </td>
      <td className="px-4 py-4 text-gray-600 text-sm">{item.email || "-"}</td>
      <td className="px-4 py-4 text-gray-600 text-sm">{item.city || "-"}</td>
      {isMerchant && (
        <td className="px-4 py-4 text-gray-700 text-sm font-medium">
          {Number(item.totalCommissionEarned || 0).toLocaleString("fr-FR")} FCFA
        </td>
      )}
      <td className="px-4 py-4 text-gray-600">{item.date}</td>
      <td className="px-4 py-4">
        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
          item.status === "Activé" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
        }`}>
          {item.status}
        </span>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="relative inline-flex" ref={containerRef}>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreHorizontal size={18} className="text-gray-600" />
          </button>
          {isOpen && (
            <div className={`absolute right-0 z-50 w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left overflow-hidden ${openUpward ? "bottom-full mb-2" : "top-full mt-2"}`}>
              <button type="button" onClick={() => { setIsOpen(false); if (onView) onView() }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                <Eye size={16} className="text-gray-500" /><span className="text-gray-700">Voir détails</span>
              </button>
              <button type="button" onClick={() => { setIsOpen(false); if (onEdit) onEdit(item) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                <Pencil size={16} className="text-gray-500" /><span className="text-gray-700">Modifier</span>
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button type="button" onClick={() => { setIsOpen(false); if (onDelete) onDelete(item) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={16} /><span>Supprimer</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-gray-200 pt-4 text-sm mt-4">
      <span className="text-center sm:text-left">Affichage de {start} à {end} sur {total} entrées</span>
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
        <select value={rowsPerPage} onChange={(e) => setRowsPerPage(+e.target.value)} className="border border-gray-200 rounded px-2 py-1 bg-white outline-none">
          {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex gap-1 sm:gap-2 items-center">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"><ChevronsLeft size={18} /></button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-gray-600 font-semibold px-2 whitespace-nowrap">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"><ChevronRight size={18} /></button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"><ChevronsRight size={18} /></button>
        </div>
      </div>
    </div>
  )
}

//CORRIGÉ : le champ parabole est clairement optionnel (label + placeholder)
function DecoderForm({ initialData, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({
    id:          initialData?.id          || "",
    name:        initialData?.name        || "",
    code:        initialData?.code        || "",
    description: initialData?.description || "",
    price:       initialData?.price       || 0,
    parabolaId:  initialData?.parabolaId  || "",
  })
  const [parabolas, setParabolas] = useState([])

  useEffect(() => {
    const fetchParabolas = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await axios.get(
          "https://youapi.youneed.app/pollux/dev/api/formula-canals/parabolas?page=1&limit=50",
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setParabolas(res.data?.data || [])
      } catch (err) { console.error(err) }
    }
    fetchParabolas()
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <input
          placeholder="Nom du décodeur"
          value={form.name}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none"
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Code"
          value={form.code}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none"
          onChange={e => setForm({ ...form, code: e.target.value })}
        />

        {/*  Parabole optionnelle : label explicite + option vide conservée */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500 ml-1 font-medium">
            Parabole associée <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <select
            value={form.parabolaId}
            className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none text-sm text-gray-700"
            onChange={e => setForm({ ...form, parabolaId: e.target.value })}
          >
            <option value="">— Aucune parabole —</option>
            {parabolas.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <textarea
          placeholder="Description"
          value={form.description}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none min-h-[100px]"
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => onSubmit(form)}
          className="px-6 py-3 bg-[#00AEEF] text-white rounded-xl hover:bg-[#009bd6] transition-colors"
        >
          {submitLabel || "Créer"}
        </button>
      </div>
    </div>
  )
}

//  CORRIGÉ : le champ "Code parabole" a été retiré du formulaire de création.
// - En création (pas de initialData) : aucun champ code n'est affiché, il sera généré
//   automatiquement côté handleCreateParabola de façon fiable (basé sur les codes
//   réellement présents en base, pas sur le state local).
// - En modification (initialData présent) : le code existant est affiché en lecture seule,
//   pour information uniquement (il n'est pas modifiable).
function GenericForm({ onSubmit, onCancel, label, showPrice, initialData, submitLabel }) {
  const isEditing = Boolean(initialData?.id)

  const [form, setForm] = useState({
    id:             initialData?.id             || "",
    name:           initialData?.name           || "",
    code:           initialData?.code           || "",
    price:          initialData?.price          || "",
    description:    initialData?.description    || "",
    durationInDays: initialData?.durationInDays || "",
    brand:          initialData?.brand          || "",
    model:          initialData?.model          || "",
  })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <input placeholder={`Nom de la ${label}`} value={form.name} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, name: e.target.value })} />
        {(label === "formule" || label === "option") && (
          <input placeholder="Code" value={form.code} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, code: e.target.value })} />
        )}
        {(showPrice || label === "parabole") && (
          <input type="number" placeholder="Prix (FCFA)" value={form.price} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, price: e.target.value })} />
        )}
        {label === "formule" && (
          <div className="space-y-1">
            <label className="text-xs text-gray-500 ml-1 font-medium">Durée (en jours)</label>
            <input type="number" value={form.durationInDays} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, durationInDays: e.target.value })} />
          </div>
        )}
        {label === "parabole" && (
          <>
            {/* Code parabole retiré du formulaire : généré automatiquement à la création.
                En édition, on l'affiche en lecture seule pour rappel. */}
            {isEditing && (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 ml-1 font-medium">Code parabole</label>
                <input
                  value={form.code}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 bg-gray-200 text-gray-500 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
            )}
            <input placeholder="Marque (ex: Triax, Technisat…)" value={form.brand} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input placeholder="Modèle (ex: 88cm Offset…)" value={form.model} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, model: e.target.value })} />
          </>
        )}
        <textarea placeholder="Description" value={form.description} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none min-h-[100px]" onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Annuler</button>
        <button onClick={() => onSubmit(form)} className="px-6 py-3 bg-[#00AEEF] text-white rounded-xl hover:bg-[#009bd6] transition-colors">{submitLabel || "Créer"}</button>
      </div>
    </div>
  )
}

function PrepaidCardForm({ initialData, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({
    id:          initialData?.id          || "",
    name:        initialData?.name        || "",
    code:        initialData?.code        || "",
    description: initialData?.description || "",
    price:       initialData?.price       || "",
  })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <input placeholder="Nom de la carte" value={form.name} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Code" value={form.code} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, code: e.target.value })} />
        <input type="number" placeholder="Prix (FCFA)" value={form.price} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none" onChange={e => setForm({ ...form, price: e.target.value })} />
        <textarea placeholder="Description" value={form.description} className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none min-h-[100px]" onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Annuler</button>
        <button onClick={() => onSubmit(form)} className="px-6 py-3 bg-[#00AEEF] text-white rounded-xl hover:bg-[#009bd6] transition-colors">{submitLabel || "Créer"}</button>
      </div>
    </div>
  )
}

function PrepaidFormulaForm({ onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({ name: "", code: "", maxBalance: "", description: "" })

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 ml-1 font-medium">Code formule *</label>
          <select
            value={form.code}
            onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none text-sm text-gray-700"
          >
            <option value="">Sélectionner un niveau</option>
            <option value="LOW">Standard (LOW)</option>
            <option value="MIDDLE">Premium (MIDDLE)</option>
            <option value="HIGH">VIP (HIGH)</option>
          </select>
        </div>

        <input
          placeholder="Nom de la formule *"
          value={form.name}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none"
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
        />

        <div className="space-y-1">
          <label className="text-xs text-gray-500 ml-1 font-medium">Solde maximum (FCFA) *</label>
          <input
            type="number"
            placeholder="0"
            value={form.maxBalance}
            className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none"
            onChange={e => setForm(prev => ({ ...prev, maxBalance: e.target.value }))}
          />
          <p className="text-xs text-gray-400 ml-1">Montant maximum que peut contenir la carte</p>
        </div>

        <textarea
          placeholder="Description (optionnel)"
          value={form.description}
          className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none min-h-[100px]"
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={!form.code || !form.name || !form.maxBalance}
          className="px-6 py-3 bg-[#1EA4DC] text-white rounded-xl hover:bg-[#009bd6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel || "Créer"}
        </button>
      </div>
    </div>
  )
}