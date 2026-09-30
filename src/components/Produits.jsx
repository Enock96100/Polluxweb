import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import axios from "axios"
import { getAuthData, fetchProfile } from "./auth"
import { useNavigate } from "react-router-dom"
import useAuth from "../context/auth/utils"

const API_URL        = "https://youapi.youneed.app/pollux/prod/api/products/services"
const SUBPRODUCT_API = "https://youapi.youneed.app/pollux/prod/api/products/sub-products"

/* ══════════════════════════════════════════════
   SYSTÈME DE NOTIFICATION CENTRALISÉ
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
    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-sm transition-all
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

/* ===================== MAIN ===================== */

export default function Produits() {
  const navigate = useNavigate()
  const { notif, showSuccess, showError, dismiss } = useNotification()
  // can("CODE_PERMISSION") : true pour la compagnie, vérifié contre les
  // permissions réelles de l'agent sinon. Le backend reste la vraie
  // barrière de sécurité (403) — ceci ne pilote que l'affichage.
  const { can } = useAuth()

  const [activeTab,    setActiveTab]    = useState("produits")
  const [products,     setProducts]     = useState([])
  const [subProducts,  setSubProducts]  = useState([])
  const [loading,      setLoading]      = useState(false)

  const [createModal,  setCreateModal]  = useState(false)
  const [editModal,    setEditModal]    = useState(false)
  const [deleteModal,  setDeleteModal]  = useState(false)
  const [detailModal,  setDetailModal]  = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery,  setSearchQuery]  = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // ── Modal détail subproduit ──
  const [subDetailModal,   setSubDetailModal]   = useState(false)
  const [selectedSubItem,  setSelectedSubItem]  = useState(null)
  const [loadingSubDetail, setLoadingSubDetail] = useState(false)

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchProducts()
    fetchSubProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile?.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")
      const response = await axios.get(
        `https://youapi.youneed.app/pollux/prod/api/products/services/company/${companyId}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      setProducts(Array.isArray(response?.data?.data) ? response.data.data : [])
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("company")
      }
      showError(error?.response?.data?.message || error.message || "Impossible de charger les produits")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSubProducts = async () => {
    try {
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        if (!profile) throw new Error("Impossible de récupérer le profil")
        companyId = profile.company?.id
      }
      if (!companyId) throw new Error("CompanyId manquant")
      const response = await axios.get(
        `https://youapi.youneed.app/pollux/prod/api/products/sub-products/company/${companyId}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      )
      setSubProducts(Array.isArray(response?.data?.data) ? response.data.data : [])
    } catch {
      setSubProducts([])
    }
  }

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20) // limite par défaut : 20 éléments / page

  const data = activeTab === "produits" ? products : subProducts

  const filteredData = data.filter((item) => {
    const searchText    = String(Object.values(item).join(" ")).toLowerCase()
    const matchesSearch = !searchQuery || searchText.includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" ? true : item.isActive === (statusFilter === "active")
    return matchesSearch && matchesStatus
  })

  const totalPages    = Math.max(1, Math.ceil(filteredData.length / rowsPerPage))
  const start         = (currentPage - 1) * rowsPerPage
  const end           = start + rowsPerPage
  const paginatedData = filteredData.slice(start, end)

  // Revenir automatiquement à la page 1 quand on change d'onglet, de recherche ou de filtre
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, statusFilter, rowsPerPage])

  // Recaler la page courante si elle devient invalide (ex: après suppression d'un élément
  // ou changement du nombre total de résultats)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  /* ================= ACTIONS ================= */

  const handleCreate = async (item) => {
    try {
      setLoading(true)
      let { token, companyId } = getAuthData()
      if (!token) throw new Error("Token manquant")
      if (!companyId) {
        const profile = await fetchProfile()
        companyId = profile?.company?.id
      }
      const payload = {
        name:        item.name,
        code:        item.code,
        description: item.description,
        category:    item.category,
        companyId,
      }
      if (item.category === "CANAL_PLUS_SUBSCRIPTION") {
        payload.price = Number(item.price)
      }
      await axios.post(API_URL, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      showSuccess(`Service "${item.name}" créé avec succès`)
      await fetchProducts()
      setCreateModal(false)
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (item) => {
    try {
      /*  CORRECTION : utiliser getAuthData() comme partout ailleurs */
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const serviceId = item?.id ?? item?.uuid ?? item?._id ?? item?.serviceId
      if (!serviceId) throw new Error("Identifiant du service introuvable")

      const payload = {
        name:        item.name?.trim(),
        code:        item.code?.trim(),
        description: item.description?.trim(),
        category:    item.category,
        isActive:    item.isActive ?? true,
      }
      await axios.put(`${API_URL}/${serviceId}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      showSuccess(`Service "${item.name}" mis à jour avec succès`)
      await fetchProducts()
      setEditModal(false)
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la modification")
    }
  }

  const handleEditSubProduct = async (item) => {
    try {
      /*  CORRECTION : utiliser getAuthData() comme partout ailleurs */
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const payload = {
        name:        item.name,
        code:        item.code,
        description: item.description,
        price:       Number(item.price),
        bankId:      item.bankId || undefined,
        isActive:    item.isActive ?? true,
        status:      item.status || "AVAILABLE",
      }
      await axios.put(`${SUBPRODUCT_API}/${item.id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      setEditModal(false)
      setSelectedItem(null)
      showSuccess(`Produit "${item.name}" mis à jour avec succès`)
      fetchSubProducts()
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la modification")
    }
  }

  /*  CORRECTION PRINCIPALE : handleDelete
     - Utilise getAuthData() pour le token (cohérent avec le reste du code)
     - Supprime le suffixe "/hard" qui causait un 404
     - Ajoute une vérification explicite du token
     - Ferme le modal APRÈS l'opération (succès ou échec)
  */
  const handleDelete = async () => {
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const serviceId = selectedItem?.id ?? selectedItem?.uuid ?? selectedItem?._id ?? selectedItem?.serviceId
      if (!serviceId) throw new Error("Identifiant du service introuvable")

      await axios.delete(`${API_URL}/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      // Suppression immédiate du tableau sans attendre le refetch
      setProducts((prev) => prev.filter((p) => {
        const id = p?.id ?? p?.uuid ?? p?._id ?? p?.serviceId
        return id !== serviceId
      }))
      showSuccess(`Service "${selectedItem?.name}" supprimé avec succès`)
      setDeleteModal(false)
      setSelectedItem(null)
      fetchProducts() // rafraîchissement en arrière-plan
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la suppression")
      setDeleteModal(false)
    }
  }

  /*  NOUVEAU : basculer isActive d'un service */
  const handleToggleStatus = async (item) => {
    try {
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      const serviceId = item?.id ?? item?.uuid ?? item?._id ?? item?.serviceId
      if (!serviceId) throw new Error("Identifiant du service introuvable")

      const newStatus = !item.isActive
      const payload = {
        name:        item.name,
        code:        item.code,
        description: item.description,
        category:    item.category,
        isActive:    newStatus,
      }
      await axios.put(`${API_URL}/${serviceId}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      showSuccess(`Service "${item.name}" ${newStatus ? "activé" : "désactivé"} avec succès`)
      await fetchProducts()
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors du changement de statut")
    }
  }

  const handleDeleteSubProduct = async () => {
    try {
      /*  CORRECTION : utiliser getAuthData() comme partout ailleurs */
      const { token } = getAuthData()
      if (!token) throw new Error("Token manquant")

      await axios.delete(`${SUBPRODUCT_API}/${selectedItem.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      // Suppression immédiate du tableau sans attendre le refetch
      setSubProducts((prev) => prev.filter((p) => p.id !== selectedItem.id))
      showSuccess(`Produit "${selectedItem?.name}" supprimé avec succès`)
      setDeleteModal(false)
      setSelectedItem(null)
      fetchSubProducts() // rafraîchissement en arrière-plan
    } catch (err) {
      showError(err?.response?.data?.message || err.message || "Erreur lors de la suppression")
      setDeleteModal(false)
    }
  }

  // ── Détail subproduit : fetch depuis l'API ──
  const handleSubDetail = async (item) => {
    setLoadingSubDetail(true)
    setSubDetailModal(true)
    setSelectedSubItem(null)
    try {
      const { token } = getAuthData()
      const res = await axios.get(`${SUBPRODUCT_API}/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      })
      setSelectedSubItem(res.data?.data || item)
    } catch {
      setSelectedSubItem(item)
    } finally {
      setLoadingSubDetail(false)
    }
  }

  const handleDetail = (item) => {
    if (activeTab === "sous-produits") {
      handleSubDetail(item)
    } else {
      navigate(`/Detail/${item.id}`)
    }
  }

  const handleAddClick = () => {
    if (activeTab === "produits") {
      setCreateModal(true)
    } else {
      navigate("/souproduitpage")
    }
  }

  // SERVICE_CREATE (onglet Services) / SUBPRODUCT_CREATE (onglet Produits)
  const canAdd = activeTab === "produits" ? can("SERVICE_CREATE") : can("SUBPRODUCT_CREATE")

  /* ================= RENDER ================= */
  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Gestion des Services</h1>
        <p className="text-gray-500 text-xs sm:text-sm lg:text-base">Services & Produits</p>
      </div>

      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 rounded-full p-1 w-fit max-w-full overflow-x-auto">
        <Tab label="Services" active={activeTab === "produits"}      onClick={() => setActiveTab("produits")} />
        <Tab label="Produits" active={activeTab === "sous-produits"} onClick={() => setActiveTab("sous-produits")} />
      </div>

      <NotificationBanner notif={notif} onDismiss={dismiss} />

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-w-0">

        {loading && <p className="text-center text-gray-500 text-sm">Chargement...</p>}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="font-semibold text-base sm:text-lg">
            {activeTab === "produits" ? "Catégories de Services" : "Produits"}
          </h2>
          {canAdd && (
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg text-sm sm:text-base whitespace-nowrap w-full sm:w-auto"
            >
              <Plus size={18} />
              {activeTab === "produits" ? "Ajouter nouveau service" : "Ajouter nouveau produit"}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 py-2 rounded-lg bg-gray-100 text-sm sm:text-base"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="bg-gray-100 rounded-lg px-4 py-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>

        {activeTab === "produits" ? (
          <ProductsTable
            data={paginatedData}
            onEdit={(item)         => { setSelectedItem(item); setEditModal(true) }}
            onDelete={(item)       => { setSelectedItem(item); setDeleteModal(true) }}
            onDetail={handleDetail}
            onToggleStatus={handleToggleStatus}
          />
        ) : (
          <SubProductsTable
            data={paginatedData}
            onEdit={(item)   => { setSelectedItem(item); setEditModal(true) }}
            onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
            onDetail={handleDetail}
          />
        )}

        <PaginationFooter
          total={filteredData.length}
          start={start + 1}
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
        <Modal title="Ajouter un service" onClose={() => setCreateModal(false)}>
          <ProductForm onSubmit={handleCreate} />
        </Modal>
      )}

      {editModal && (
        <Modal title="Modifier" onClose={() => { setEditModal(false); setSelectedItem(null) }}>
          {activeTab === "produits" ? (
            <ProductForm data={selectedItem} onSubmit={handleEdit} />
          ) : (
            <SubProductEditForm
              data={selectedItem}
              onCancel={() => { setEditModal(false); setSelectedItem(null) }}
              onSubmit={handleEditSubProduct}
            />
          )}
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Suppression" onClose={() => { setDeleteModal(false); setSelectedItem(null) }}>
          <p className="text-sm sm:text-base break-words">
            Voulez-vous supprimer <strong>{selectedItem?.name}</strong> ?
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
            <button
              onClick={() => { setDeleteModal(false); setSelectedItem(null) }}
              className="border px-4 py-2 rounded-lg text-sm sm:text-base w-full sm:w-auto"
            >
              Annuler
            </button>
            <button
              onClick={activeTab === "produits" ? handleDelete : handleDeleteSubProduct}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm sm:text-base w-full sm:w-auto"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}

      {detailModal && selectedItem && (
        <Modal title="Détails du produit" onClose={() => setDetailModal(false)}>
          <div className="space-y-3 text-xs sm:text-sm">
            <p className="break-words"><strong>Nom :</strong>         {selectedItem.name        || "-"}</p>
            <p className="break-words"><strong>Code :</strong>        {selectedItem.code        || "-"}</p>
            <p className="break-words"><strong>Catégorie :</strong>   {selectedItem.category    || "-"}</p>
            <p className="break-words"><strong>Description :</strong> {selectedItem.description || "-"}</p>
            <p className="break-words"><strong>Statut :</strong>      {selectedItem.isActive ? "Actif" : "Inactif"}</p>
            <p className="break-words"><strong>Créé le :</strong>     {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : "-"}</p>
          </div>
        </Modal>
      )}

      {/* ===== MODAL DÉTAIL SOUS-PRODUIT (style décodeur) ===== */}
      {subDetailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4">
              <h2 className="text-base sm:text-lg font-semibold">Détails du produit</h2>
              <button
                onClick={() => { setSubDetailModal(false); setSelectedSubItem(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl font-light flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {loadingSubDetail ? (
              <div className="px-4 sm:px-6 pb-6 flex items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-[#1EA4DC]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="ml-3 text-sm text-gray-400">Chargement...</span>
              </div>
            ) : selectedSubItem ? (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5">

                {/* Header carte */}
                <div className="bg-blue-50 rounded-xl p-3 sm:p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{selectedSubItem.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 break-words">Code : {selectedSubItem.code}</p>
                    {selectedSubItem.price && (
                      <p className="text-xs sm:text-sm font-semibold text-[#1EA4DC] mt-1">
                        {Number(selectedSubItem.price).toLocaleString("fr-FR")} {selectedSubItem.currency || "FCFA"}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    selectedSubItem.status === "ACTIVATED" ? "bg-green-100 text-green-600" :
                    selectedSubItem.status === "ASSIGNED"  ? "bg-blue-100 text-blue-600"  :
                    selectedSubItem.status === "AVAILABLE" ? "bg-gray-100 text-gray-600"  :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {selectedSubItem.status || "-"}
                  </span>
                </div>

                <hr className="border-gray-100" />

                {/* Informations générales & Service */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations Générales</p>
                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.description || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Durée (jours)</p>
                      <p className="font-semibold text-gray-800 text-sm">{selectedSubItem.durationInDays ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Renouvelable</p>
                      <p className="font-semibold text-gray-800 text-sm">{selectedSubItem.renewable ? "Oui" : "Non"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date de création</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {selectedSubItem.createdAt ? new Date(selectedSubItem.createdAt).toLocaleDateString("fr-FR") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Dernière mise à jour</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {selectedSubItem.updatedAt ? new Date(selectedSubItem.updatedAt).toLocaleDateString("fr-FR") : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service</p>
                    <div>
                      <p className="text-xs text-gray-400">Nom</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.service?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Code</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.service?.code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Catégorie</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.service?.category || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Entreprise</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.service?.company?.name || "-"}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Banque & Formule prépayée */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Banque</p>
                    <div>
                      <p className="text-xs text-gray-400">Nom</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.bank?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Code</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.bank?.code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.bank?.description || "-"}</p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Formule prépayée</p>
                    <div>
                      <p className="text-xs text-gray-400">Nom</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.prepaidCardFormula?.name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Code</p>
                      <p className="font-semibold text-gray-800 text-sm break-words">{selectedSubItem.prepaidCardFormula?.code || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Solde max</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {selectedSubItem.prepaidCardFormula?.maxBalance
                          ? `${Number(selectedSubItem.prepaidCardFormula.maxBalance).toLocaleString("fr-FR")} FCFA`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Active</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {selectedSubItem.prepaidCardFormula?.isActive ? "Oui" : "Non"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

/* ===================== ACTION MENU ===================== */
/*
   CORRECTION DU BUG "menu caché / coupé" :
   Le menu était positionné en `absolute` À L'INTÉRIEUR du conteneur du
   tableau, qui a `overflow-x-auto`. Dès que le menu dépassait la zone
   visible (bas de tableau, bord droit, conteneur scrollable), il était
   tronqué ou totalement invisible.

   Solution : on calcule la position réelle du bouton à l'écran
   (getBoundingClientRect) et on rend le menu via un PORTAL React
   (createPortal) directement dans <body>, en position `fixed`. Le menu
   n'est donc plus soumis à l'overflow du tableau et reste toujours
   entièrement visible, y compris sur mobile.

   Chaque action (Voir détails / Modifier / Supprimer) est désormais
   conditionnée à une permission via showDetail/showEdit/showDelete —
   si aucune action n'est autorisée pour un item donné, le bouton "..."
   n'est même pas rendu.
*/

const ACTION_MENU_PORTAL_CLASS = "action-menu-dropdown-portal"

function ActionMenu({
  item,
  onEdit,
  onDelete,
  onDetail,
  onToggleStatus,
  isOpen,
  onToggle,
  showDetail = true,
  showEdit = true,
  showDelete = true,
}) {
  const buttonRef = useRef(null)
  const menuRef   = useRef(null)
  const [coords, setCoords] = useState(null) // { top, left, openUpward }

  const MENU_WIDTH  = 176 // ~ w-44
  const MENU_MARGIN = 8

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()

    // Hauteur approximative du menu (varie selon la présence de "Activer/Désactiver")
    const estimatedMenuHeight = onToggleStatus ? 210 : 160

    const spaceBelow  = window.innerHeight - rect.bottom
    const openUpward  = spaceBelow < estimatedMenuHeight + MENU_MARGIN

    let left = rect.right - MENU_WIDTH
    left = Math.min(left, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    left = Math.max(left, MENU_MARGIN)

    const top = openUpward
      ? rect.top - MENU_MARGIN
      : rect.bottom + MENU_MARGIN

    setCoords({ top, left, openUpward })
  }, [onToggleStatus])

  // Recalcule la position à l'ouverture, et la maintient à jour si la page
  // défile ou si la fenêtre est redimensionnée pendant que le menu est ouvert.
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

  // Si aucune action n'est autorisée pour cet item, on n'affiche même pas
  // le bouton "..." plutôt qu'un menu vide inutile.
  if (!showDetail && !showEdit && !showDelete && !onToggleStatus) return null

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
          ref={menuRef}
          className={`${ACTION_MENU_PORTAL_CLASS} fixed z-[100] w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-left`}
          style={{
            top:  coords.openUpward ? undefined : coords.top,
            bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
            left: coords.left,
          }}
        >
          {showDetail && (
            <button
              type="button"
              onClick={() => { onDetail(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
            >
              <Eye size={16} className="text-gray-500" /> Voir détails
            </button>
          )}
          {showEdit && (
            <button
              type="button"
              onClick={() => { onEdit(item); onToggle() }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
            >
              <Pencil size={16} className="text-gray-500" /> Modifier
            </button>
          )}
          {onToggleStatus && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => { onToggleStatus(item); onToggle() }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm transition-colors
                  ${item.isActive
                    ? "text-orange-600 hover:bg-orange-50"
                    : "text-green-600 hover:bg-green-50"
                  }`}
              >
                {item.isActive
                  ? <ToggleLeft  size={16} />
                  : <ToggleRight size={16} />
                }
                {item.isActive ? "Désactiver" : "Activer"}
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
                <Trash2 size={16} /> Supprimer
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ===================== TABLES ===================== */
/* Les deux tableaux ci-dessous sont enveloppés dans un conteneur
   overflow-x-auto avec une largeur minimale forcée : sur mobile/tablette
   l'utilisateur peut scroller horizontalement plutôt que de voir les
   colonnes se compresser illisiblement.

   Le gestionnaire de clic "en dehors" ignore désormais aussi les clics
   à l'intérieur du menu d'actions (qui vit maintenant dans un portal en
   dehors du tableau), afin de ne pas fermer le menu avant que le clic
   sur une action ("Modifier", "Supprimer", ...) n'ait pu s'exécuter. */

function ProductsTable({ data = [], onEdit, onDelete, onDetail, onToggleStatus }) {
  const [openRow, setOpenRow] = useState(null)
  const tableRef = useRef(null)
  // SERVICE_MANAGEMENT : ce tableau gère des "services" (onglet "Services")
  const { can } = useAuth()
  const canView   = can("SERVICE_READ")
  const canEdit   = can("SERVICE_UPDATE")
  const canDelete = can("SERVICE_DELETE")
  const canToggle = can("SERVICE_TOGGLE_STATUS")

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideTable = tableRef.current && tableRef.current.contains(e.target)
      const clickedInsideMenu  = e.target.closest && e.target.closest(`.${ACTION_MENU_PORTAL_CLASS}`)
      if (!clickedInsideTable && !clickedInsideMenu) setOpenRow(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={tableRef} className="rounded-xl border border-gray-100 -mx-3 sm:mx-0 overflow-x-auto">
      <table className="table-auto min-w-[800px] w-full text-sm">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Nom</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Code</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Catégorie</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Créé le</th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut</th>
            <th className="px-4 py-3 text-center text-sm uppercase tracking-[0.02em] font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((item, i) => (
              <tr key={item.id || i} className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-3 font-medium">{item.name || "-"}</td>
                <td className="px-4 py-3">{item.code || "-"}</td>
                <td className="px-4 py-3">{item.category || "-"}</td>
                <td className="px-4 py-3 max-w-xs whitespace-normal break-words">{item.description || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${item.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {item.isActive ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <ActionMenu
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDetail={onDetail}
                    onToggleStatus={canToggle ? onToggleStatus : undefined}
                    showDetail={canView}
                    showEdit={canEdit}
                    showDelete={canDelete}
                    isOpen={openRow === item.id}
                    onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center py-8 text-gray-400">Aucun produit trouvé</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SubProductsTable({ data = [], onEdit, onDelete, onDetail }) {
  const [openRow, setOpenRow] = useState(null)
  const tableRef = useRef(null)
  // SUBPRODUCT_MANAGEMENT : ce tableau gère des "sous-produits" (onglet "Produits")
  const { can } = useAuth()
  const canView   = can("SUBPRODUCT_READ")
  const canEdit   = can("SUBPRODUCT_UPDATE")
  const canDelete = can("SUBPRODUCT_DELETE")

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideTable = tableRef.current && tableRef.current.contains(e.target)
      const clickedInsideMenu  = e.target.closest && e.target.closest(`.${ACTION_MENU_PORTAL_CLASS}`)
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
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Code</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Nom produit / Service</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Prix</th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Statut</th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((item, i) => (
              <tr key={item.id} className={`${i % 2 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-3">{item.code || "-"}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{item.name || "-"}</p>
                  <p className="text-sm text-gray-400">{item.service?.name || "-"}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.price ? `${Number(item.price).toLocaleString("fr-FR")} FCFA` : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${item.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {item.isActive ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <ActionMenu
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDetail={onDetail}
                    showDetail={canView}
                    showEdit={canEdit}
                    showDelete={canDelete}
                    isOpen={openRow === item.id}
                    onToggle={() => setOpenRow(openRow === item.id ? null : item.id)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-8 text-gray-400">Aucun sous-produit trouvé</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ===================== UI HELPERS ===================== */

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

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base whitespace-nowrap ${active ? "bg-white shadow" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

function Modal({ title, onClose, children, className = "w-full max-w-lg" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative shadow-xl max-h-[90vh] overflow-y-auto ${className}`}>
        <button onClick={onClose} className="absolute right-4 top-4"><X /></button>
        <h2 className="text-lg sm:text-xl font-semibold mb-4 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/* ===================== FORMS ===================== */

function ProductForm({ data = {}, onSubmit }) {
  const [form, setForm] = useState({
    id:          data.id ?? data.uuid ?? data._id ?? data.serviceId,
    category:    data.category    || "",
    name:        data.name        || "",
    code:        data.code        || "",
    price:       data.price       || "",
    description: data.description || "",
  })
  const [errors, setErrors] = useState({})

  const handleCategoryChange = (value) => {
    setForm({ ...form, category: form.category === value ? "" : value, price: value === "CANAL_PLUS_SUBSCRIPTION" ? form.price : "" })
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.category)     newErrors.category = "Choisir une catégorie"
    if (!form.name?.trim()) newErrors.name     = "Nom obligatoire"
    if (!form.code?.trim()) newErrors.code     = "Code obligatoire"
    if (form.category === "CANAL_PLUS_SUBSCRIPTION" && !form.price)
      newErrors.price = "Le prix est obligatoire pour Canal+"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4 p-2 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
          <input type="radio" checked={form.category === "PREPAID_CARD"} onChange={() => handleCategoryChange("PREPAID_CARD")} />
          Cartes prépayées
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
          <input type="radio" checked={form.category === "CANAL_PLUS_SUBSCRIPTION"} onChange={() => handleCategoryChange("CANAL_PLUS_SUBSCRIPTION")} />
          Canal+ Abonnement
        </label>
      </div>
      {errors.category && <p className="text-red-500 text-xs">{errors.category}</p>}

      <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" className="w-full px-4 py-2 bg-gray-100 rounded-lg text-sm sm:text-base" />
      {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}

      <input name="code" value={form.code} onChange={handleChange} placeholder="Code" className="w-full px-4 py-2 bg-gray-100 rounded-lg text-sm sm:text-base" />
      {errors.code && <p className="text-red-500 text-xs">{errors.code}</p>}

      {form.category === "CANAL_PLUS_SUBSCRIPTION" && (
        <div className="animate-in fade-in slide-in-from-top-1">
          <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="Prix de l'abonnement" className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm sm:text-base" />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
      )}

      <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full bg-gray-100 px-4 py-2 rounded-lg text-sm sm:text-base resize-none" rows={3} />

      <button className="w-full bg-[#1EA4DC] text-white py-2 rounded-lg font-bold text-sm sm:text-base">Enregistrer</button>
    </form>
  )
}

/* Formulaire d'édition sous-produit — payload aligné sur le PUT API */
function SubProductEditForm({ data = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    id:          data.id          || "",
    name:        data.name        || "",
    code:        data.code        || "",
    description: data.description || "",
    price:       data.price       || "",
    bankId:      data.bankId      || "",
    isActive:    data.isActive    ?? true,
    status:      data.status      || "AVAILABLE",
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === "checkbox" ? checked : value })
  }

  return (
    <div className="space-y-4">
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Nom du produit"
        className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm sm:text-base"
      />
      <input
        name="code"
        value={form.code}
        onChange={handleChange}
        placeholder="Code"
        className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm sm:text-base"
      />
      <input
        name="price"
        value={form.price}
        onChange={handleChange}
        placeholder="Prix (FCFA)"
        type="number"
        className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm sm:text-base"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description (optionnel)"
        className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 resize-none text-sm sm:text-base"
        rows={3}
      />
      <div className="space-y-1">
        <label className="text-xs text-gray-500 ml-1 font-medium">Statut</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full bg-gray-100 px-4 py-3 rounded-xl outline-none text-gray-700 text-sm"
        >
          <option value="AVAILABLE">Disponible</option>
          <option value="ASSIGNED">Assigné</option>
          <option value="ACTIVATED">Activé</option>
        </select>
      </div>
      <div className="flex items-center gap-3 px-1">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={form.isActive}
          onChange={handleChange}
          className="w-4 h-4 accent-[#1EA4DC]"
        />
        <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">Produit actif</label>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          Annuler
        </button>
        <button
          onClick={() => onSubmit(form)}
          className="px-6 py-3 bg-[#1EA4DC] text-white rounded-xl hover:bg-[#009bd6] transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          Enregistrer
        </button>
      </div>
    </div>
  )
}