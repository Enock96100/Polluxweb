
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  Users,
  CheckCircle,
  X
} from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"


/* ================= API ================= */
const API_URL =
  "https://youapi.youneed.app/pollux/dev/api/auth/users"

/* ================= MAIN COMPONENT ================= */
export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("tous")
  const [statusFilter, setStatusFilter] = useState("tous")

  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)

  /* ===== MODALS ===== */
  const [showDetails, setShowDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [showEdit, setShowEdit] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    fetchUsers()
  }, [page, search, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError("")

      const token = localStorage.getItem("token")
      if (!token) throw new Error("Token manquant")

      const response = await axios.get(API_URL, {
        params: {
          page,
          limit,
          search: search || undefined,
          userType: roleFilter !== "tous" ? roleFilter : undefined,
          isActive:
            statusFilter === "tous"
              ? undefined
              : statusFilter === "actif",
        },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })

      setUsers(response.data.data)
      setTotal(response.data.meta?.total || response.data.data.length)
    } catch {
      setError("Impossible de charger les utilisateurs")
    } finally {
      setLoading(false)
    }
  }

  /* ================= ACTIONS ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return

    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      fetchUsers()
    } catch {
      alert("Erreur lors de la suppression")
    }
  }

  const handleEdit = (user) => {
    setEditUser(user)
    setShowEdit(true)
  }

  const handleDetails = async (id) => {
    try {
      const res = await axios.get(`${'https://youapi.youneed.app/pollux/dev/api/auth/users'}/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          Accept: "application/json",
        },
      })
      setSelectedUser(res.data.data)
      setShowDetails(true)
    } catch {
      alert("Impossible de charger les détails")
    }
  }


  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 space-y-6">

      {/* ================= TITLE ================= */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Gestion des Utilisateurs</h1>
          <p className="text-gray-500">
            Créer et gérer les accès au système
          </p>
        </div>

            <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 bg-[#1EA4DC] text-white px-4 py-2 rounded-lg"
      >
        <UserPlus size={18} />
        Nouvel Utilisateur
      </button>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total" value={total} icon={<Users />} />
        <StatCard
          label="Actifs"
          value={users.filter(u => u.isActive).length}
          color="green"
          icon={<CheckCircle />}
        />
        <StatCard
          label="Admins"
          value={users.filter(u => u.userType === "MAIN_COMPANY").length}
          color="red"
          icon={<Shield />}
        />
        <StatCard
          label="Marchands"
          value={users.filter(u => u.userType === "MERCHANT").length}
          color="blue"
        />
        <StatCard
          label="Distributeurs"
          value={users.filter(u => u.userType === "DISTRIBUTOR").length}
          color="purple"
        />
      </div>

      {/* ================= FILTERS ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 py-2 rounded-lg bg-gray-100"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-gray-100"
          >
            <option value="tous">Tous les rôles</option>
            <option value="MAIN_COMPANY">Admin</option>
            <option value="MERCHANT">Marchand</option>
            <option value="DISTRIBUTOR">Distributeur</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-lg bg-gray-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {loading ? (
          <p className="text-center text-gray-500">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#1EA4DC] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Dernière connexion</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                   onDelete={handleDelete}
                  onDetails={handleDetails}
                  onEdit={handleEdit}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL DETAILS ================= */}
       {showDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showEdit && editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setShowEdit(false)}
          onSuccess={fetchUsers}
        />
      )}
      {showCreate && (
  <CreateUserModal
    onClose={() => setShowCreate(false)}
    onSuccess={fetchUsers}
  />
)}
    </div>
  )
}

/* ================= ROW ================= */
function UserRow({ user, onDelete, onDetails, onEdit }) {
  const [open, setOpen] = useState(false)

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 font-medium">
        {user.firstName} {user.lastName}
      </td>

      <td className="px-4 py-4">
        <p>{user.email}</p>
        <p className="text-xs text-gray-500">{user.phone}</p>
      </td>

      <td className="px-4 py-4">{user.userType}</td>

      <td className="px-4 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            user.isActive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {user.isActive ? "Actif" : "Inactif"}
        </span>
      </td>

      <td className="px-4 py-4">
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleString()
          : "-"}
      </td>

      <td className="px-4 py-4 text-center relative">
        <MoreHorizontal
          onClick={() => setOpen(!open)}
          className="mx-auto cursor-pointer text-gray-600"
        />

        {open && (
          <div className="absolute right-6 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
            <button
              onClick={() => onEdit (user)}
              className="w-full px-4 py-3 text-sm hover:bg-gray-50"
            >
              ✏️ Modifier
            </button>

            <button
              onClick={() => onDelete(user.id)}
              className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
            >
              🗑️ Supprimer
            </button>

            <button
              onClick={() => onDetails(user.id)}
              className="w-full px-4 py-3 text-sm hover:bg-gray-50"
            >
              👁️ Détail
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

function EditUserModal({ user, onClose, onSuccess }) {

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  /* ================= STATE ================= */
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    userType: user.userType ?? "",
    city: user.city?? "",
    isActive: user.isActive ?? true,
  })

  /* ================= CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
  try {
    setLoading(true)
    setError("")

    const token = localStorage.getItem("token")

    console.log("USER:", user)
    console.log("FORM DATA:", form)

    const response = await axios.put(
      `https://youapi.youneed.app/pollux/dev/api/auth/users/${user.id}`,
      {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        userType: form.userType,
        city: form.city,
        isActive: Boolean(form.isActive),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    )

    console.log("RESPONSE:", response.data)

    await onSuccess()
    onClose()

  } catch (err) {
    console.error("UPDATE ERROR:", err.response || err)
    setError(
      err.response?.data?.message ||
      "Erreur lors de la modification"
    )
  } finally {
    setLoading(false)
  }
}

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">

        <h2 className="text-xl font-semibold text-center mb-6">
          Modifier l’utilisateur
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Prénom"
          />

          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Nom"
          />

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Téléphone"
          />
           <input
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Email"
          />
                  <select
            name="userType"
            value={form.userType}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
          >
            <option value={form.userType}>{form.userType}</option>
           <option value="MAIN_COMPANY">Admin</option>
            <option value="MERCHANT">Marchand</option>
            <option value="DISTRIBUTOR">Distributeur</option>
          </select>

           <input
            name="city"
            value={form.city}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Ville"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            Utilisateur actif
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200"
          >
            Annuler
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#1EA4DC] text-white disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= CREATE USER MODAL ================= */
function CreateUserModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    userType: "",
    city: "",
    isActive: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, key === "isActive" ? String(value) : value);
      });

      await axios.post("https://youapi.youneed.app/pollux/dev/api/auth/register", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      await onSuccess();
      onClose();
    } catch (err) {
      console.error("CREATE ERROR:", err.response || err);
      setError(err.response?.data?.message || "Utilisateur déjà existant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-center mb-6">
          Nouvel utilisateur
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Prénom"
            required
          />

          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Nom"
            required
          />

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Téléphone"
            required
          />

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Email"
            required
          />

          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Mot de passe"
            required
          />

          <select
            name="userType"
            value={form.userType}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            required
          >
            <option value="">Sélectionner un rôle</option>
            <option value="MAIN_COMPANY">Admin</option>
            <option value="MERCHANT">Marchand</option>
            <option value="DISTRIBUTOR">Distributeur</option>
          </select>

          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            className="w-full bg-gray-100 p-3 rounded-lg"
            placeholder="Ville"
            required
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            Utilisateur actif
          </label>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#1EA4DC] text-white disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= MODAL ================= */
function UserDetailsModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500"
        >
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Détails de l’utilisateur
        </h2>

        <div className="space-y-3 text-sm">
          <p><b>Nom :</b> {user.firstName} {user.lastName}</p>
          <p><b>Email :</b> {user.email}</p>
          <p><b>Téléphone :</b> {user.phone || "-"}</p>
          <p><b>Rôle :</b> {user.userType}</p>
          <p><b>Statut :</b> {user.isActive ? "Actif" : "Inactif"}</p>
          <p><b>Créé le :</b> {new Date(user.createdAt).toLocaleString()}</p>
          <p><b>Dernière connexion :</b> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= STAT CARD ================= */
function StatCard({ label, value, icon, color = "blue" }) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className={`text-2xl font-semibold ${colors[color]}`}>
          {value}
        </p>
      </div>
      <div className={colors[color]}>{icon}</div>
    </div>
  )
}
