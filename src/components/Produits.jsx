import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import axios from "axios";
import { getAuthData, fetchProfile } from "./auth";
 import useAuth from "../context/auth/utils";   
/* ===================== DATA ===================== */
const subProductsDataInit = [
  {
    id: 1,
    code: "VISA-STD",
    name: "Visa Prépayée Standard",
    parent: "Cartes Prépayées",
    price: "5 000 FCFA",
    commission: "250 FCFA",
    stock: 150,
    status: "Actif",
  },
  {
    id: 2,
    code: "VISA-GOLD",
    name: "Visa Prépayée Gold",
    parent: "Cartes Prépayées",
    price: "10 000 FCFA",
    commission: "500 FCFA",
    stock: 80,
    status: "Actif",
  },
]

/* ===================== MAIN ===================== */

const API_URL =
  "https://youapi.youneed.app/pollux/dev/api/products/services/company"

/* ===================== MAIN ===================== */

export default function Produits() {
  const [activeTab, setActiveTab] = useState("produits")
  const [products, setProducts] = useState([])
  const [subProducts, setSubProducts] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
    /* ================= FETCH ================= */
 useEffect(() => {
  
   fetchProducts();
  }, [])

const fetchProducts = async () => {
  try {
    setLoading(true);
    setError("");

    let { token, companyId } = getAuthData();

    if (!token) throw new Error("Token manquant");

  
    if (!companyId) {
      console.log("CompanyId absent, récupération du profil...");
      const profile = await fetchProfile();

      if (!profile) throw new Error("Impossible de récupérer le profil");

      companyId = profile.companyId;
    }

    if (!companyId) throw new Error("CompanyId manquant");

    console.log("TOKEN:", token);
    console.log("COMPANY ID:", companyId);

    const response = await axios.get(
      `https://youapi.youneed.app/pollux/dev/api/products/services/company/${companyId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    console.log("RESPONSE:", response.data);

    const productsData = Array.isArray(response?.data?.data)
      ? response.data.data
      : [];

    setProducts(productsData);

  } catch (error) {
    console.error("ERROR:", error?.response?.data || error.message);

    setError(
      error?.response?.data?.message ||
      error.message ||
      "Impossible de charger les produits"
    );

    setProducts([]);
  } finally {
    setLoading(false);
  }
};

  /* ================= PAGINATION ================= */

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const data = activeTab === "produits" ? products : subProducts
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const start = (currentPage - 1) * rowsPerPage
  const end = start + rowsPerPage
  const paginatedData = data.slice(start, end)

   /* ================= ACTIONS ================= */
const API_BASE = "https://youapi.youneed.app/pollux/dev/api/products/services";
  
const handleCreate = async (item) => {
  try {
    const { token, companyId } = getAuthData();

    if (!token) throw new Error("Token manquant");
    if (!companyId) throw new Error("CompanyId manquant");

    const payload = {
      name: item.name?.trim(),
      code: item.code?.trim(),
      description: item.description?.trim(),
      category: item.category || null,
      isActive: Boolean(item.isActive),
      companyId,
    };

    console.log("PAYLOAD:", payload);

    await axios.post(API_BASE, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    await fetchProducts();
    setCreateModal(false);

  } catch (err) {
    console.error("CREATE ERROR:", err.response?.data || err.message);

    alert(
      err?.response?.data?.message ||
      "Erreur lors de la création"
    );
  }
};
  const handleEdit = async (item) => {
    try {
      const token = localStorage.getItem("token")

      await axios.put(
        `${API_URL}/${item.id}`,
        item,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      fetchProducts()
      setEditModal(false)

    } catch (err) {
      alert("Erreur modification")
    }
  }

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token")

      await axios.delete(
        `${API_URL}/${selectedItem.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      fetchProducts()
      setDeleteModal(false)

    } catch (err) {
      alert("Erreur suppression")
    }
  }

 
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestion des Produits</h1>
        <p className="text-gray-500">Produits & Sous-produits</p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-full p-1 w-fit">
        <Tab label="Produits" active={activeTab === "produits"} onClick={() => setActiveTab("produits")} />
        <Tab label="Sous-produits" active={activeTab === "sous-produits"} onClick={() => setActiveTab("sous-produits")} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {loading && (
          <p className="text-center text-gray-500">Chargement...</p>
        )}

        {error && (
          <p className="text-center text-red-500">{error}</p>
        )}

        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">
            {activeTab === "produits" ? "Catégories de produits" : "Sous-produits"}
          </h2>

          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} />
            Ajouter
          </button>
        </div>
{activeTab === "produits" ? (
  <ProductsTable
    data={paginatedData}
    onEdit={(item) => { setSelectedItem(item); setEditModal(true) }}
    onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
  />
) : (
  <SubProductsTable
    data={paginatedData}
    onEdit={(item) => { setSelectedItem(item); setEditModal(true) }}
    onDelete={(item) => { setSelectedItem(item); setDeleteModal(true) }}
  />
)}


        <PaginationFooter
          total={data.length}
          start={start + 1}
          end={Math.min(end, data.length)}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* MODALS */}

    {createModal && (
  <Modal
    title={
      activeTab === "produits"
        ? "Ajouter un produit"
        : "Ajouter un sous-produit"
    }
    onClose={() => setCreateModal(false)}
  >
    {activeTab === "produits" ? (
      <ProductForm onSubmit={handleCreate} />
    ) : (
      <SubProductForm
        products={products}
        onSubmit={handleCreateSubProduct}
      />
    )}
  </Modal>
)}

      {editModal && (
        <Modal title="Modifier" onClose={() => setEditModal(false)}>
          <Form type="produits" data={selectedItem} onSubmit={handleEdit} />
        </Modal>
      )}

      {deleteModal && (
        <Modal title="Suppression" onClose={() => setDeleteModal(false)}>
          <p>Voulez-vous supprimer <strong>{selectedItem?.name}</strong> ?</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeleteModal(false)} className="border px-4 py-2 rounded-lg">Annuler</button>
            <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg">Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ===================== TABLE ===================== */

function ProductsTable({ data = [], onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#1EA4DC] text-white">
          <tr>
            <th className="px-4 py-3 text-left">Nom</th>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Catégorie</th>
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-left">Créé le</th>
            <th className="px-4 py-3 text-center">Statut</th>
           {/*  <th className="px-4 py-3 text-center">Sous-produits</th> */}
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((item, i) => (
              <tr
                key={item.id || i}
                className={`${i % 2 ? "bg-gray-50" : "bg-white"}`}
              >
                <td className="px-4 py-3 font-medium">
                  {item.name || "-"}
                </td>

                <td className="px-4 py-3">
                  {item.code || "-"}
                </td>

                <td className="px-4 py-3">
                  {item.category || "-"}
                </td>

                <td className="px-4 py-3 max-w-xs truncate">
                  {item.description || "-"}
                </td>

                <td className="px-4 py-3">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "-"}
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.isActive
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.isActive ? "Actif" : "Inactif"}
                  </span>
                </td>
{/* 
                <td className="px-4 py-3 text-center">
                  {item.subProducts?.length || 0}
                </td> */}

                <td className="px-4 py-3 flex justify-center gap-3">
                  <button onClick={() => onEdit(item)}>
                    <Pencil size={16} />
                  </button>

                  <button onClick={() => onDelete(item)}>
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="8"
                className="text-center py-8 text-gray-400"
              >
                Aucun produit trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const handleCreateSubProduct = async (item) => {
  try {
    const { token, companyId } = getAuthData();

    if (!token) throw new Error("Token manquant");
    if (!companyId) throw new Error("CompanyId manquant");

   const payload = {
  ...item,
  price: Number(item.price),
  durationInDays: Number(item.durationInDays),
  companyId,
};

    await axios.post(
      "https://youapi.youneed.app/pollux/dev/api/products/sub-products",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    await fetchProducts();
    setCreateModal(false);

  } catch (err) {
    console.error(err.response?.data || err.message);
    alert(
      err?.response?.data?.message ||
      "Erreur création sous-produit"
    );
  }
};
const handleEditSubProduct = async (item) => {
  try {
    const token = localStorage.getItem("token")

    await axios.put(
      `${SUBPRODUCT_API}/${item.id}`,
      item,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )

    fetchProducts()
    setEditModal(false)

  } catch (err) {
    alert("Erreur modification")
  }
}

const handleDeleteSubProduct = async () => {
  try {
    const token = localStorage.getItem("token")

    await axios.delete(
      `${SUBPRODUCT_API}/${selectedItem.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    fetchProducts()
    setDeleteModal(false)

  } catch (err) {
    alert("Erreur suppression")
  }
}

function SubProductsTable({ data, onEdit, onDelete }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-[#1EA4DC] text-white">
        <tr>
          <th className="px-4 py-3 text-left">Code</th>
          <th className="px-4 py-3 text-left">Nom</th>
          <th className="px-4 py-3 text-left">Banque</th>
          <th className="px-4 py-3 text-left">Prix</th>
          <th className="px-4 py-3 text-left">Devise</th>
          <th className="px-4 py-3 text-left">Durée</th>
          <th className="px-4 py-3 text-center">Statut</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, i) => (
          <tr key={item.id} className={i % 2 ? "bg-gray-50" : ""}>
            <td className="px-4 py-3">{item.code}</td>
            <td className="px-4 py-3 font-medium">{item.name}</td>
            <td className="px-4 py-3">{item.bank?.name || "-"}</td>
            <td className="px-4 py-3">
              {item.price?.toLocaleString()} 
            </td>
            <td className="px-4 py-3">{item.currency}</td>
            <td className="px-4 py-3">
              {item.durationInDays} jours
            </td>
            <td className="px-4 py-3 text-center">
              {item.isActive ? "Actif" : "Inactif"}
            </td>
            <td className="px-4 py-3 flex justify-center gap-3">
              <button onClick={() => onEdit(item)}>
                <Pencil size={16} />
              </button>
              <button onClick={() => onDelete(item)}>
                <Trash2 size={16} className="text-red-500" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ===================== UI ===================== */

function PaginationFooter({ total, start, end, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage, totalPages }) {
  return (
    <div className="flex justify-between items-center border-t border-gray-200 pt-4 text-sm">
      <span>Affichage de {start} à {end} sur {total} entrées</span>

      <div className="flex items-center gap-4">
        <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(+e.target.value); setCurrentPage(1) }} className="border border-gray-200 rounded px-2 py-1">
          {[5, 10, 20].map(n => <option key={n}>{n}</option>)}
        </select>

        <div className="flex gap-2">
          <button
  onClick={() => setCurrentPage(1)}
  className="text-gray-400 hover:text-gray-400">

  <ChevronsLeft size={18} />
</button>

<button
  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
  className="text-gray-400 hover:text-gray-600">

  <ChevronLeft size={18} />
</button>

<span className="text-gray-600">
  {currentPage} / {totalPages}
</span>

<button
  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
  className="text-gray-400 hover:text-gray-600">

  <ChevronRight size={18} />
</button>

<button
  onClick={() => setCurrentPage(totalPages)}
  className="text-gray-400 hover:text-gray-600"
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
    <button onClick={onClick} className={`px-6 py-2 rounded-full ${active ? "bg-white shadow" : "text-gray-500"}`}>
      {label}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute right-4 top-4"><X /></button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ProductForm({ data = {}, onSubmit }) {

  const [form, setForm] = useState({
    name: data.name || "",
    code: data.code || "",
    description: data.description || "",
    category: data.category || "",
    isActive: data.isActive ?? true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "isActive") {
      setForm({ ...form, isActive: value === "true" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Nom du produit"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      />

      <input
        name="code"
        value={form.code}
        onChange={handleChange}
        placeholder="Code"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      />

      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg resize-none"
      />

      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      >
        <option value="">Choisir une catégorie</option>
        <option value="PREPAID_CARD">PREPAID_CARD</option>
        <option value="SUBSCRIPTION">SUBSCRIPTION</option>
      </select>

      <select
        name="isActive"
        value={form.isActive ? "true" : "false"}
        onChange={handleChange}
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
      >
        <option value="true">Actif</option>
        <option value="false">Inactif</option>
      </select>

      <button
        type="submit"
        className="w-full bg-[#1EA4DC] text-white px-4 py-2 rounded-lg"
      >
        Enregistrer
      </button>
    </form>
  );
}
function SubProductForm({ data = {}, products = [], onSubmit }) {
  const [form, setForm] = useState({
    productId: data.productId || "",
    name: data.name || "",
    code: data.code || "",
    price: data.price || "",
    currency: data.currency || "FCFA",
    durationInDays: data.durationInDays || "",
    isActive: data.isActive ?? true,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          price: Number(form.price),
          durationInDays: Number(form.durationInDays),
        });
      }}
      className="space-y-4"
    >
      {/* PRODUIT PARENT */}
      <select
        name="productId"
        value={form.productId}
        onChange={handleChange}
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      >
        <option value="">Choisir le produit parent</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>

      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Nom du sous-produit"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      />

      <input
        name="code"
        value={form.code}
        onChange={handleChange}
        placeholder="Code"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      />

      <input
        name="price"
        type="number"
        value={form.price}
        onChange={handleChange}
        placeholder="Prix"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
        required
      />

      <select
        name="currency"
        value={form.currency}
        onChange={handleChange}
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
      >
        <option value="FCFA">FCFA</option>
        <option value="USD">USD</option>
      </select>

      <input
        name="durationInDays"
        type="number"
        value={form.durationInDays}
        onChange={handleChange}
        placeholder="Durée (jours)"
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
      />

      <select
        name="isActive"
        value={form.isActive}
        onChange={(e) =>
          setForm({ ...form, isActive: e.target.value === "true" })
        }
        className="w-full bg-gray-100 px-4 py-2 rounded-lg"
      >
        <option value="true">Actif</option>
        <option value="false">Inactif</option>
      </select>

      <button className="w-full bg-[#1EA4DC] text-white px-4 py-2 rounded-lg">
        Enregistrer
      </button>
    </form>
  );
}