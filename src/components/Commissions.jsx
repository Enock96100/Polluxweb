import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  MoreHorizontal,
  UserPlus,
  Pencil,
  Ban,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"

/* ===================== HELPERS ===================== */

// Catégorie API utilisée pour identifier les services "carte prépayée"
const PREPAID_CARD_CATEGORY = "PREPAID_CARD"

// Vérifie si un service appartient à la catégorie "carte prépayée"
const isCartePrepayeeService = (service) => service?.category === PREPAID_CARD_CATEGORY

/* ===================== NOTIFICATIONS (DYNAMIQUE) ===================== */

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
    dismiss
  }
}

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

/* ===================== MAIN COMPONENT ===================== */

export default function GestionCommissions() {
  const [activeTab, setActiveTab] = useState("Taux")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // selectedService : UUID du service actif (alimenté dynamiquement par fetchServices)
  const [selectedService, setSelectedService] = useState(null)
  const [services, setServices] = useState([])
  const [apiCommissions, setApiCommissions] = useState([])
  const [apiStatistiques, setApiStatistiques] = useState([]) // Nouvel état pour les statistiques de l'API
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // États pour la gestion du Pop-up de création / modification de tranche
  //  Un seul et même formulaire est utilisé pour la création (POST) et la modification (PUT).
  // editingTranche === null  -> mode création
  // editingTranche !== null  -> mode modification (contient formulaId, name, minAmount, maxAmount)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTranche, setEditingTranche] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    minAmount: "",
    maxAmount: ""
  })

  //  Notification dynamique (succès / erreur) pour le modal Création / Modification
  const trancheNotif = useNotification()

  // États pour la gestion du Pop-up d'assignation de taux à un partenaire
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignTranche, setAssignTranche] = useState(null) // tranche (serviceCommissionRate) pour laquelle on assigne un taux
  const [assignPartnerType, setAssignPartnerType] = useState("DISTRIBUTEUR") // "DISTRIBUTEUR" | "COMMERCANT"
  const [assignPartnerId, setAssignPartnerId] = useState("")
  const [assignCommissionType, setAssignCommissionType] = useState("PERCENTAGE") // "PERCENTAGE" | "FIXED" — valeurs attendues par l'API
  const [assignTauxDistributeur, setAssignTauxDistributeur] = useState("") // -> partnerRate (%)
  const [assignTauxPollux, setAssignTauxPollux] = useState("") // -> companyRate (%)
  const [assignLoading, setAssignLoading] = useState(false)

  //  Notification dynamique (succès / erreur) pour le modal d'assignation
  const assignNotif = useNotification()

  // Liste des partenaires (distributeurs ou commerçants) affichée dans le select du modal d'assignation
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(false)

  // ===================== ÉTATS POUR LA CONFIRMATION DE DÉSACTIVATION =====================
  //  On ne désactive plus une tranche directement au clic : on ouvre d'abord une
  // pop-up de confirmation. La désactivation réelle (DELETE) n'est envoyée que si
  // l'utilisateur confirme.
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)
  const [trancheToDeactivate, setTrancheToDeactivate] = useState(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  //  Notification dynamique (succès / erreur) pour le modal de confirmation de désactivation
  const deactivateNotif = useNotification()

  /* ===================== AUTH ===================== */

  const getAuthData = () => ({
    token: localStorage.getItem("token") || " ",
    companyId: JSON.parse(localStorage.getItem("company") || "{}")?.id ?? null,
    userId: JSON.parse(localStorage.getItem("user") || "{}")?.id ?? null,
  })

  /* ===================== FETCH SERVICES ===================== */

  useEffect(() => { fetchServices() }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError("")

      let { token, companyId } = getAuthData()

      if (!token) throw new Error("Token manquant")

      // Si companyId absent → on recharge le profil
      if (!companyId) {
        console.log("CompanyId absent, récupération du profil...")
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile?.company?.id
      }

      if (!companyId) throw new Error("CompanyId manquant")

      console.log("TOKEN:", token)
      console.log("COMPANY ID:", companyId)

      const res = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/products/services/company/${companyId}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )

      console.log("SERVICES RESPONSE:", res.data)

      const data = Array.isArray(res?.data?.data) ? res.data.data : []

      // FILTRE : on ne garde que les services liés à "carte prépayée"
      const filteredData = data.filter(isCartePrepayeeService)

      console.log("SERVICES FILTRÉS (carte prépayée):", filteredData)

      setServices(filteredData)

      // auto-sélection du premier service filtré
      if (filteredData.length > 0) {
        setSelectedService(filteredData[0].id)
      } else {
        setSelectedService(null)
      }

    } catch (error) {
      console.error("ERROR fetchServices:", error?.response?.data || error.message)

      // gestion token expiré
      if (error?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("company")
      }

      setError(error?.response?.data?.message || error.message || "Impossible de charger les services")
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  /* ===================== FETCH COMMISSION RATES (TAUX) ===================== */

  // Déclenche le chargement en fonction de l'onglet actif et du service sélectionné
  useEffect(() => {
    if (selectedService) {
      if (activeTab === "Taux") {
        fetchCommissionRates()
      } else if (activeTab === "Statistiques") {
        fetchStatistiques()
      }
    }
  }, [selectedService, activeTab])

  const fetchCommissionRates = async () => {
    try {
      setLoading(true)
      setError("")

      const { token } = getAuthData()

      if (!token) throw new Error("Token manquant")

      console.log("FETCH COMMISSIONS POUR SERVICE ID:", selectedService)

      const res = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/commissions/rates/service/${selectedService}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )

      console.log("COMMISSIONS RESPONSE (BRUT):", res.data)

      const apiData = Array.isArray(res?.data?.data) ? res.data.data : []

      // ✅ FILTRE : on ne garde dans la liste que les tranches actives (isActive === true)
      const activeOnly = apiData.filter((item) => item.isActive === true)

      // Mapping basé sur la vraie structure API
      // ⚠️ IMPORTANT : on garde l'UUID réel de la tranche (formulaId) séparément du
      // numéro d'affichage (id), car l'UUID est nécessaire pour l'assignation, la modification
      // ET la désactivation.
      // On garde aussi minAmount / maxAmount bruts pour pré-remplir le formulaire de modification.
      const mappedData = activeOnly.map((item, index) => ({
        id: index + 1,
        formulaId: item.id, // ✅ UUID réel de la tranche (= serviceCommissionRateId attendu par l'API d'assignation)
        name: item.name || "Nom non disponible",
        minAmount: item.minAmount || 0,
        maxAmount: item.maxAmount || 0,
        range: `${item.minAmount || 0} - ${item.maxAmount || 0} FCFA`,
        distributorRate: item?._count?.distributorAssignments || 0,
        merchantRate: item?._count?.merchantAssignments || 0,
        status: item.isActive ? "Actif" : "Inactif",
      }))

      // ✅ Console log demandé : liste exacte affichée dans le tableau
      console.log("TABLEAU DES TRANCHES (isActive = true):", mappedData)

      setApiCommissions(mappedData)

    } catch (error) {
      console.error("ERROR fetchCommissionRates:", error?.response?.data || error.message)
      setError(error?.response?.data?.message || error.message || "Erreur lors de la récupération des données")
      setApiCommissions([])
    } finally {
      setLoading(false)
    }
  }

  /* ===================== FETCH STATISTIQUES API ===================== */

  const fetchStatistiques = async () => {
    try {
      setLoading(true)
      setError("")

      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      console.log("FETCH STATISTIQUES POUR SERVICE ID:", selectedService)

      const res = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/commissions/rates/service/${selectedService}/stats`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )

      console.log("STATISTIQUES RESPONSE:", res.data)

      const apiData = Array.isArray(res?.data?.data) ? res.data.data : []

      // Adaptation et mapping dynamique des données pour le tableau Statistiques
      const mappedStats = apiData.map((item, index) => {
        // Extraction optionnelle ou calcul si vos champs de commissions existent dans votre objet
        const distComm = item.stats?.totalDistributorCommission || 0
        const merchComm = item.stats?.totalMerchantCommission || 0
        const entComm = item.stats?.totalCompanyCommission || 0
        const totalCalculated = Number(distComm) + Number(merchComm) + Number(entComm)

        return {
          id: index + 1,
          tranche: item.name || " ",
          fixe: `${item.minAmount || 0} - ${item.maxAmount || 0} FCFA`,
          users: item.stats?.usageCount || 0, // Exemple d'utilisation de vos compteurs existants
          comDist: `${distComm} F`,
          comComm: `${merchComm} F`,
          comEnt: `${entComm} F`,
          total: `${totalCalculated} F`
        }
      })

      console.log("TABLEAU DES STATISTIQUES:", mappedStats)

      setApiStatistiques(mappedStats)

    } catch (error) {
      console.error("ERROR fetchStatistiques:", error?.response?.data || error.message)
      setError(error?.response?.data?.message || error.message || "Erreur lors de la récupération des statistiques")
      setApiStatistiques([])
    } finally {
      setLoading(false)
    }
  }

  /* ===================== CREATION / MODIFICATION D'UNE TRANCHE ===================== */
  // ✅ Même formulaire (modal) pour créer (POST) et modifier (PUT) une tranche.
  // editingTranche === null  -> POST /commissions/rates            (création)
  // editingTranche !== null  -> PUT  /commissions/rates/{formulaId} (modification)

  const handleOpenCreateModal = () => {
    setEditingTranche(null)
    setFormData({ name: "", minAmount: "", maxAmount: "" })
    trancheNotif.dismiss()
    setIsModalOpen(true)
  }

  const handleCloseTrancheModal = () => {
    setIsModalOpen(false)
    setEditingTranche(null)
    trancheNotif.dismiss()
  }

  const handleSubmitTranche = async (e) => {
    e.preventDefault()
    try {
      setModalLoading(true)
      const { token } = getAuthData()

      const payload = {
        name: formData.name,
        minAmount: Number(formData.minAmount),
        maxAmount: Number(formData.maxAmount)
      }

      let res

      if (editingTranche) {
        // ===== MODIFICATION (PUT) =====
        console.log("MODIFICATION DE LA TRANCHE:", editingTranche.formulaId, payload)

        res = await axios.put(
          `https://youapi.youneed.app/pollux/dev/api/commissions/rates/${editingTranche.formulaId}`,
          payload,
          {
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          }
        )

        console.log("TRANCHE MODIFIÉE AVEC SUCCÈS:", res.data)
        trancheNotif.showSuccess("Tranche modifiée avec succès")

      } else {
        // ===== CRÉATION (POST) =====
        const createPayload = { ...payload, serviceId: selectedService || "" }
        console.log("CRÉATION D'UNE NOUVELLE TRANCHE:", createPayload)

        res = await axios.post(
          "https://youapi.youneed.app/pollux/dev/api/commissions/rates",
          createPayload,
          {
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            }
          }
        )

        console.log("TRANCHE CRÉÉE AVEC SUCCÈS:", res.data)
        trancheNotif.showSuccess("Tranche créée avec succès")
      }

      // Met à jour l'onglet actif après la création / modification
      if (activeTab === "Taux") {
        await fetchCommissionRates()
      } else {
        await fetchStatistiques()
      }

      setTimeout(() => {
        handleCloseTrancheModal()
        setFormData({ name: "", minAmount: "", maxAmount: "" })
      }, 1500)

    } catch (error) {
      console.error("ERROR handleSubmitTranche:", error?.response?.data || error.message)
      trancheNotif.showError(
        error?.response?.data?.message ||
        (editingTranche ? "Une erreur est survenue lors de la modification" : "Une erreur est survenue lors de la création")
      )
    } finally {
      setModalLoading(false)
    }
  }

  /* ===================== ASSIGNATION D'UN TAUX À UN PARTENAIRE ===================== */

  // Récupère la liste des partenaires (distributeurs ou commerçants) selon le type choisi
  const fetchPartners = async (partnerType) => {
    try {
      setPartnersLoading(true)
      const { token, companyId } = getAuthData()
      if (!token || !companyId) return

      // Endpoint différent selon le type de partenaire choisi
      const url =
        partnerType === "DISTRIBUTEUR"
          ? `https://youapi.youneed.app/pollux/dev/api/distributors/by-company/${companyId}`
          : `https://youapi.youneed.app/pollux/dev/api/merchants/companies/${companyId}`

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        params: { page: 1, limit: 20 }
      })

      console.log("PARTNERS RESPONSE:", res.data)

      const data = Array.isArray(res?.data?.data) ? res.data.data : []

      // Normalise chaque partenaire en {id, name, subtitle} pour un affichage uniforme dans le select
      const mapped = data.map((partner) => {
        const userFullName = `${partner.user?.firstName || ""} ${partner.user?.lastName || ""}`.trim()

        if (partnerType === "DISTRIBUTEUR") {
          return {
            id: partner.id,
            name: partner.businessName || userFullName || "Distributeur",
            subtitle: partner.city || ""
          }
        }

        // Commerçant : pas de businessName dans la réponse API, on affiche le nom de l'utilisateur
        return {
          id: partner.id,
          name: userFullName || partner.shopAddress || "Commerçant",
          subtitle: partner.shopAddress || partner.city || ""
        }
      })

      setPartners(mapped)

    } catch (error) {
      console.error("ERROR fetchPartners:", error?.response?.data || error.message)
      setPartners([])
    } finally {
      setPartnersLoading(false)
    }
  }

  // Recharge la liste des partenaires à chaque ouverture du modal ou changement du type choisi
  useEffect(() => {
    if (isAssignModalOpen) {
      fetchPartners(assignPartnerType)
    }
  }, [isAssignModalOpen, assignPartnerType])

  // Ouvre le modal d'assignation pré-rempli pour la tranche cliquée
  const handleOpenAssignModal = (tranche) => {
    setAssignTranche(tranche)
    setAssignPartnerType("DISTRIBUTEUR")
    setAssignPartnerId("")
    setAssignCommissionType("PERCENTAGE")
    setAssignTauxDistributeur("")
    setAssignTauxPollux("")
    assignNotif.dismiss()
    setIsAssignModalOpen(true)
  }

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false)
    assignNotif.dismiss()
  }

  const assignTotalTaux = (
    (parseFloat(assignTauxDistributeur) || 0) + (parseFloat(assignTauxPollux) || 0)
  ).toFixed(2)

  // Soumission du formulaire d'assignation
  // ✅ CORRIGÉ : l'API d'assignation carte prépayée attend l'UUID de la tranche
  // sous la clé "serviceCommissionRateId" (confirmé par l'implémentation existante
  // dans DetailDistributeur.jsx / AssignCardRateModal, qui utilise avec succès le
  // même endpoint POST /commissions/distributor-assignments). L'ancienne clé
  // "gridId" n'était pas reconnue par le backend, d'où l'erreur systématique
  // "L'ID de la grille est requis".
  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    assignNotif.dismiss()

    // ✅ On récupère explicitement l'UUID réel de la tranche (formulaId) avant tout envoi
    const serviceCommissionRateId = assignTranche?.formulaId

    if (!serviceCommissionRateId) {
      assignNotif.showError("L'ID de la grille tarifaire est introuvable pour cette tranche")
      return
    }
    if (!assignPartnerId) {
      assignNotif.showError(
        assignPartnerType === "DISTRIBUTEUR" ? "Veuillez sélectionner un distributeur" : "Veuillez sélectionner un commerçant"
      )
      return
    }
    if (assignTauxDistributeur === "" || assignTauxPollux === "") {
      assignNotif.showError("Les taux distributeur et pollux sont requis")
      return
    }

    try {
      setAssignLoading(true)
      const { token, userId } = getAuthData()

      const isDistributeur = assignPartnerType === "DISTRIBUTEUR"

      // Endpoint confirmé pour un distributeur (repris tel quel de DetailDistributeur.jsx).
      // Endpoint miroir supposé pour un commerçant tant qu'il n'est pas confirmé.
      const url = isDistributeur
        ? "https://youapi.youneed.app/pollux/dev/api/commissions/distributor-assignments"
        : "https://youapi.youneed.app/pollux/dev/api/commissions/merchant-assignments"

      const payload = {
        ...(isDistributeur
          ? { distributorId: assignPartnerId }
          : { merchantId: assignPartnerId }),
        serviceCommissionRateId, // ✅ clé corrigée (anciennement "gridId")
        commissionType: assignCommissionType, // "PERCENTAGE" | "FIXED"
        partnerRate: Number(assignTauxDistributeur) / 100,
        companyRate: Number(assignTauxPollux) / 100,
        ...(userId ? { assignedBy: userId } : {}),
      }

      console.log("ASSIGNATION EN COURS:", payload)

      const res = await axios.post(
        url,
        payload,
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log("ASSIGNATION RÉUSSIE:", res.data)

      assignNotif.showSuccess("Taux assigné avec succès")
      await fetchCommissionRates()

      setTimeout(() => {
        handleCloseAssignModal()
      }, 1500)

    } catch (error) {
      console.error("ERROR handleAssignSubmit:", error?.response?.data || error.message)
      assignNotif.showError(
        error?.response?.data?.description ||
        error?.response?.data?.message ||
        "Une erreur est survenue lors de l'assignation"
      )
    } finally {
      setAssignLoading(false)
    }
  }

  /* ===================== ACTIONS SUR UNE TRANCHE (Taux) ===================== */

  // ✅ Utilise le même modal / formulaire que la création, mais pré-rempli + mode PUT
  const handleModifierTranche = (tranche) => {
    setEditingTranche(tranche)
    setFormData({
      name: tranche.name || "",
      minAmount: tranche.minAmount ?? "",
      maxAmount: tranche.maxAmount ?? ""
    })
    trancheNotif.dismiss()
    setIsModalOpen(true)
  }

  /* ===================== DÉSACTIVATION D'UNE TRANCHE (DELETE + CONFIRMATION) ===================== */

  // ✅ Le clic sur "Désactiver" n'appelle plus l'API directement : il ouvre d'abord
  // une pop-up de confirmation contenant le nom de la tranche concernée.
  const handleDesactiverTranche = (tranche) => {
    setTrancheToDeactivate(tranche)
    deactivateNotif.dismiss()
    setIsDeactivateModalOpen(true)
  }

  const handleCloseDeactivateModal = () => {
    if (deactivateLoading) return // évite de fermer pendant l'appel API
    setIsDeactivateModalOpen(false)
    setTrancheToDeactivate(null)
    deactivateNotif.dismiss()
  }

  // ✅ Appel réel de désactivation, déclenché uniquement après confirmation de l'utilisateur.
  // Endpoint : DELETE /commissions/rates/{formulaId}
  const handleConfirmDeactivate = async () => {
    if (!trancheToDeactivate?.formulaId) {
      deactivateNotif.showError("L'identifiant de la tranche est introuvable")
      return
    }

    try {
      setDeactivateLoading(true)
      const { token } = getAuthData()

      console.log("DÉSACTIVATION DE LA TRANCHE:", trancheToDeactivate.formulaId)

      const res = await axios.delete(
        `https://youapi.youneed.app/pollux/dev/api/commissions/rates/${trancheToDeactivate.formulaId}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log("TRANCHE DÉSACTIVÉE AVEC SUCCÈS:", res.data)

      // Met à jour la liste (la tranche désactivée disparaît car isActive devient false)
      await fetchCommissionRates()

      setIsDeactivateModalOpen(false)
      setTrancheToDeactivate(null)

    } catch (error) {
      console.error("ERROR handleConfirmDeactivate:", error?.response?.data || error.message)
      deactivateNotif.showError(
        error?.response?.data?.message || "Une erreur est survenue lors de la désactivation"
      )
    } finally {
      setDeactivateLoading(false)
    }
  }

  /* ===================== PAGINATION ===================== */

  const currentData = activeTab === "Taux" ? apiCommissions : apiStatistiques
  const totalPages = Math.ceil(currentData.length / rowsPerPage) || 1
  const start = (currentPage - 1) * rowsPerPage
  const end = start + rowsPerPage
  const paginatedData = currentData.slice(start, end)

  // ✅ Console log demandé : la liste réellement affichée dans le tableau (page courante)
  console.log(`DONNÉES AFFICHÉES DANS LE TABLEAU [onglet: ${activeTab}, page: ${currentPage}]:`, paginatedData)

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setCurrentPage(1)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 bg-[#F5F7FA] min-h-screen relative">

      {/* TITRE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Gestion des Commissions</h1>
          <p className="text-gray-500 text-sm">
            Configuration des barèmes et suivi des paiements
          </p>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#198cb9] transition-all shadow-sm w-full sm:w-auto"
        >
          <Plus size={18} />
          Créer une tranche
        </button>
      </div>

      {/* NAVIGATION INTERNE (TABS) — même style que Produits.jsx */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <Tab label="Taux" active={activeTab === "Taux"} onClick={() => handleTabChange("Taux")} />
        <Tab label="Statistiques" active={activeTab === "Statistiques"} onClick={() => handleTabChange("Statistiques")} />
      </div>

      {/* CONTENEUR DU TABLEAU */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5 sm:space-y-6">
        
        <div>
          <h2 className="font-semibold text-gray-800 text-base">
            {activeTab === "Taux" ? "Barèmes de Commission" : "Statistique"}
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            {activeTab === "Taux" ? "Taux de commission par sous-produit" : "liste des statistiques"}
          </p>
        </div>

        {/* RECHERCHE ET SELECTION DU SERVICE */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-xl">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 focus:bg-white text-sm transition-all"
            />
          </div>

          {/* SELECT DYNAMIQUE — ne contient que les services "carte prépayée" */}
          <select
            value={selectedService ?? ""}
            onChange={(e) => {
              setSelectedService(e.target.value)
              setCurrentPage(1)
            }}
            disabled={loading && services.length === 0}
            className="w-full sm:w-auto bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 disabled:opacity-50"
          >
            {services.length === 0 ? (
              <option value="">
                {loading ? "Chargement des services..." : "Aucun service carte prépayée"}
              </option>
            ) : (
              services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* RENDU ET STRUCTURE DYNAMIQUE DU TABLEAU */}
        <div className="rounded-xl border border-gray-100 relative overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          
          {/* ÉTATS CHARGEMENT / ERREUR */}
          {loading && (
            <div className="p-8 text-center text-gray-500 text-sm font-medium bg-white/80 absolute inset-0 flex items-center justify-center z-10">
              Chargement des données...
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-500 text-sm font-medium bg-white/80 absolute inset-0 flex items-center justify-center z-10">
              {error}
            </div>
          )}

          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead className="bg-[#1EA4DC] text-white font-medium">
              {activeTab === "Taux" ? (
                <tr>
                  <th className="px-6 py-4 text-left w-16 whitespace-nowrap">N°</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Type / Tranche</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Nombre de Distributeurs</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Nombre de Commerçants</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Statut</th>
                  <th className="px-6 py-4 text-center w-24 whitespace-nowrap">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 text-left w-16 whitespace-nowrap">N°</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Tranche</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Nombre utilisateur</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Com distributeur</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Com commercant</th>
                  <th className="px-6 py-4 text-left whitespace-nowrap">Com entreprise</th>
                  <th className="px-6 py-4 text-center w-28 whitespace-nowrap">Total</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {activeTab === "Taux" ? (
                paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <CommissionRow
                      key={item.id}
                      {...item}
                      onAssigner={() => handleOpenAssignModal(item)}
                      onModifier={() => handleModifierTranche(item)}
                      onDesactiver={() => handleDesactiverTranche(item)}
                    />
                  ))
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-400 font-medium">
                        Aucune donnée disponible pour ce service
                      </td>
                    </tr>
                  )
                )
              ) : (
                paginatedData.length > 0 ? (
                  paginatedData.map((item) => <StatistiqueRow key={item.id} {...item} />)
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-400 font-medium">
                        Aucune statistique disponible pour ce service
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 sm:hidden">
          Faites glisser le tableau horizontalement pour voir plus de colonnes.
        </p>

        {/* FOOTER DE PAGINATION */}
        <PaginationFooter
          total={currentData.length}
          start={currentData.length > 0 ? start + 1 : 0}
          end={Math.min(end, currentData.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* ===================== POP-UP MODAL FORMULAIRE (CRÉATION / MODIFICATION) ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all animate-fadeIn p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] p-5 sm:p-8 w-full max-w-[540px] max-h-[90vh] overflow-y-auto shadow-xl relative space-y-6 my-4">
            
            {/* Bouton Fermeture */}
            <button 
              onClick={handleCloseTrancheModal}
              className="absolute right-5 sm:right-6 top-5 sm:top-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* En-tête Modal — dynamique selon le mode */}
            <div className="pr-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingTranche ? "Modifier la tranche" : "Créer une nouvelle tranche"}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {editingTranche ? "Mettre à jour les informations de cette tranche" : "Ajouter une nouvelle tranche de commission"}
              </p>
            </div>

            {/* Notification dynamique (succès / erreur) */}
            <NotificationBanner notif={trancheNotif.notif} onDismiss={trancheNotif.dismiss} />

            {/* Formulaire — commun création & modification */}
            <form onSubmit={handleSubmitTranche} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Nom de la tranche *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Standard Premium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Montant minimum</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Montant maximum</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800"
                />
              </div>

              {/* Pied de page Modal / Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseTrancheModal}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#198cb9] transition-all shadow-sm disabled:opacity-50"
                >
                  <Plus size={16} />
                  {modalLoading
                    ? (editingTranche ? "Modification..." : "Création...")
                    : (editingTranche ? "Enregistrer les modifications" : "Créer la tranche")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================== POP-UP MODAL ASSIGNATION D'UN TAUX ===================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all animate-fadeIn overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-8 w-full max-w-[540px] max-h-[85vh] overflow-y-auto shadow-xl relative space-y-6">

            {/* Bouton Fermeture */}
            <button
              onClick={handleCloseAssignModal}
              className="absolute right-5 sm:right-6 top-5 sm:top-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* En-tête Modal — titre dynamique avec le nom de la tranche cliquée */}
            <div className="pr-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                Assigner un taux {assignTranche?.name}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{assignTranche?.range}</p>
            </div>

            {/* Notification dynamique (succès / erreur) */}
            <NotificationBanner notif={assignNotif.notif} onDismiss={assignNotif.dismiss} />

            <form onSubmit={handleAssignSubmit} className="space-y-5">

              {/* CHOIX DU TYPE DE PARTENAIRE : Distributeur / Commerçant */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Type de partenaire</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignPartnerType("DISTRIBUTEUR")
                      setAssignPartnerId("")
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      assignPartnerType === "DISTRIBUTEUR"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        assignPartnerType === "DISTRIBUTEUR" ? "border-[#1EA4DC]" : "border-gray-300"
                      }`}
                    >
                      {assignPartnerType === "DISTRIBUTEUR" && (
                        <span className="w-2 h-2 rounded-full bg-[#1EA4DC]" />
                      )}
                    </span>
                    Distributeur
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignPartnerType("COMMERCANT")
                      setAssignPartnerId("")
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      assignPartnerType === "COMMERCANT"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        assignPartnerType === "COMMERCANT" ? "border-[#1EA4DC]" : "border-gray-300"
                      }`}
                    >
                      {assignPartnerType === "COMMERCANT" && (
                        <span className="w-2 h-2 rounded-full bg-[#1EA4DC]" />
                      )}
                    </span>
                    Commerçant
                  </button>
                </div>
              </div>

              {/* SELECT DU PARTENAIRE — liste dynamique selon le type choisi */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">
                  {assignPartnerType === "DISTRIBUTEUR" ? "Distributeur" : "Commerçant"}
                </label>
                <select
                  required
                  value={assignPartnerId}
                  onChange={(e) => setAssignPartnerId(e.target.value)}
                  disabled={partnersLoading}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800 disabled:opacity-50"
                >
                  <option value="">
                    {partnersLoading
                      ? "Chargement..."
                      : assignPartnerType === "DISTRIBUTEUR"
                        ? "Sélectionner le distributeur"
                        : "Sélectionner le commerçant"}
                  </option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                      {partner.subtitle ? ` — ${partner.subtitle}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* TYPE COMMISSION */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Type commission</label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="commissionType"
                      checked={assignCommissionType === "FIXED"}
                      onChange={() => setAssignCommissionType("FIXED")}
                      className="w-4 h-4 accent-[#1EA4DC]"
                    />
                    Montant fixe
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="commissionType"
                      checked={assignCommissionType === "PERCENTAGE"}
                      onChange={() => setAssignCommissionType("PERCENTAGE")}
                      className="w-4 h-4 accent-[#1EA4DC]"
                    />
                    Taux en %
                  </label>
                </div>
              </div>

              {/* TAUX DISTRIBUTEUR / COMMERÇANT (-> partnerRate) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">
                  Taux {assignPartnerType === "DISTRIBUTEUR" ? "distributeur" : "commerçant"} (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="Ex: 2 ou 5"
                  value={assignTauxDistributeur}
                  onChange={(e) => setAssignTauxDistributeur(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800"
                />
              </div>

              {/* TAUX POLLUX (-> companyRate) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Taux pollux (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="Ex: 1 ou 3"
                  value={assignTauxPollux}
                  onChange={(e) => setAssignTauxPollux(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]/20 text-sm text-gray-800"
                />
              </div>

              {/* TOTAL EN COMMISSION (lecture seule, calculé) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">Total en commission (%)</label>
                <div className="w-full px-4 py-3.5 rounded-xl bg-green-50 border border-green-100 text-sm text-gray-800 font-semibold">
                  {assignTotalTaux}%
                </div>
              </div>

              <button
                type="submit"
                disabled={assignLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-6 py-3.5 rounded-xl text-sm font-semibold hover:bg-[#198cb9] transition-all shadow-sm disabled:opacity-50"
              >
                {assignLoading ? "Assignation..." : "Assigner"}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ===================== POP-UP MODAL CONFIRMATION DE DÉSACTIVATION ===================== */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all animate-fadeIn p-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-8 w-full max-w-[440px] max-h-[90vh] overflow-y-auto shadow-xl relative space-y-6">

            {/* Bouton Fermeture */}
            <button
              onClick={handleCloseDeactivateModal}
              disabled={deactivateLoading}
              className="absolute right-5 sm:right-6 top-5 sm:top-6 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            >
              <X size={20} />
            </button>

            {/* Icône + en-tête */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={26} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Désactiver cette tranche ?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Vous êtes sur le point de désactiver la tranche{" "}
                  <span className="font-semibold text-gray-800">{trancheToDeactivate?.name}</span>
                  {trancheToDeactivate?.range ? ` (${trancheToDeactivate.range})` : ""}.
                  Cette action est irréversible et la tranche ne sera plus disponible pour de
                  nouvelles assignations.
                </p>
              </div>
            </div>

            {/* Notification dynamique (succès / erreur) */}
            <NotificationBanner notif={deactivateNotif.notif} onDismiss={deactivateNotif.dismiss} />

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleCloseDeactivateModal}
                disabled={deactivateLoading}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivateLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-600 transition-all shadow-sm disabled:opacity-50"
              >
                <Ban size={16} />
                {deactivateLoading ? "Désactivation..." : "Désactiver"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

/* ================= COMPOSANTS DE STRUCTURE ================= */

// Style aligné sur le composant Tab de Produits.jsx
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${active ? "bg-white shadow" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

/* Ligne pour l'onglet : Taux */
function CommissionRow({ id, name, range, distributorRate, merchantRate, status, onAssigner, onModifier, onDesactiver }) {
  const statusClasses =
    status === "Actif"
      ? "bg-green-50 text-green-600 border-green-100"
      : "bg-red-50 text-red-500 border-red-100"

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  const handleActionClick = (action) => {
    setIsMenuOpen(false)
    action?.()
  }

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-6 py-4.5 text-gray-500 font-medium whitespace-nowrap">{id}</td>
      <td className="px-6 py-4.5 whitespace-nowrap">
        <p className="font-semibold text-gray-800 text-sm">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{range}</p>
      </td>
      <td className="px-6 py-4.5 text-gray-700 font-medium whitespace-nowrap">{distributorRate}</td>
      <td className="px-6 py-4.5 text-gray-700 font-medium whitespace-nowrap">{merchantRate} </td>
      <td className="px-6 py-4.5 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusClasses}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4.5 text-center relative whitespace-nowrap" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <MoreHorizontal size={20} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-6 top-10 z-20 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 text-left animate-fadeIn">
            <button
              onClick={() => handleActionClick(onAssigner)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserPlus size={16} className="text-[#1EA4DC]" />
              Assigner
            </button>
            <button
              onClick={() => handleActionClick(onModifier)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={16} className="text-gray-500" />
              Modifier
            </button>
            <button
              onClick={() => handleActionClick(onDesactiver)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Ban size={16} />
              Désactiver
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

/* Ligne pour l'onglet : Statistiques */
function StatistiqueRow({ id, tranche, fixe, users, comDist, comComm, comEnt, total }) {
  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-6 py-5 text-gray-500 font-medium whitespace-nowrap">{id}</td>
     <td className="px-6 py-4.5 whitespace-nowrap">
        <p className="font-semibold text-gray-800 text-sm">{tranche}</p>
        <p className="text-xs text-gray-400 mt-0.5">{fixe}</p>
      </td>
      <td className="px-6 py-5 text-gray-700 font-medium whitespace-nowrap">{users}</td>
      <td className="px-6 py-5 text-gray-700 font-medium whitespace-nowrap">{comDist}</td>
      <td className="px-6 py-5 text-gray-700 font-medium whitespace-nowrap">{comComm}</td>
      <td className="px-6 py-5 text-gray-700 font-medium whitespace-nowrap">{comEnt}</td>
      <td className="px-6 py-5 text-center whitespace-nowrap">
        <span className="bg-green-50 text-green-600 border border-green-100 px-4 py-1 rounded-full text-xs font-semibold">
          {total}
        </span>
      </td>
    </tr>
  )
}

/* ================= PAGINATION ================= */
/*
   Style aligné sur le fichier "Produits" : boutons discrets (icônes seules,
   sans bordure), libellé "Par page" masqué sur mobile, état désactivé
   géré par une classe grisée plutôt que par un simple attribut, et
   affichage compact "page / totalPages".
*/

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
            onChange={(e) => { setRowsPerPage(+e.target.value); setCurrentPage(1) }}
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