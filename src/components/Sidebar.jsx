import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Users,
  Wallet,
  CheckSquare,
  TrendingUp,
  FileText,
  UserCog,
  Tv,
  BarChart3,
  Menu,
  X,
  KeyRound,
} from "lucide-react"
import logo from "../assets/logo.png"
import useAuth from "../context/auth/utils"

//  mêmes valeurs que OPERATOR_TYPE_LABELS dans Header.jsx, pour rester
// cohérent avec le badge déjà affiché là-bas.
const OPERATOR_TYPE_LABELS = {
  MAIN_COMPANY: "COMPAGNIE",
  ADMIN_AGENT: "AGENT",
  DISTRIBUTOR: "DISTRIBUTEUR",
  MERCHANT: "COMMERÇANT",
}

export default function Sidebar() {
  // Contrôle l'ouverture de la sidebar en mode mobile/tablette (< lg).
  // Sur desktop (lg et +), la sidebar reste toujours visible et cet état
  // n'a aucun effet grâce aux classes `lg:translate-x-0` / `lg:hidden`.
  const [isOpen, setIsOpen] = useState(false)

  const { userInfo } = useAuth()

  const closeSidebar = () => setIsOpen(false)

  // Badge dynamique : "COMPAGNIE" pour le owner, "AGENT" pour un agent, etc.
  // Fallback sur "ADMINISTRATEUR" tant que userInfo n'est pas encore chargé
  // (évite un flash vide pendant le chargement initial du profil).
  const roleLabel =
    OPERATOR_TYPE_LABELS[userInfo?.userType] || "ADMINISTRATEUR"

  return (
    <>
      {/* Bouton burger — visible uniquement en dessous du breakpoint lg */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-[#1EA4DC] text-white p-2 rounded-lg shadow-md"
        aria-label="Ouvrir le menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay sombre derrière la sidebar quand elle est ouverte sur mobile */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 w-64 sm:w-60 h-screen overflow-y-auto bg-[#1EA4DC] text-white flex flex-col items-center py-6 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Bouton de fermeture — visible uniquement en dessous du breakpoint lg */}
        <button
          onClick={closeSidebar}
          className="lg:hidden self-end mr-4 mb-2 text-white"
          aria-label="Fermer le menu"
        >
          <X size={22} />
        </button>

        {/* Logo */}
        <div className="bg-white rounded-xl px-6 py-4 mb-6 flex justify-center">
          <img
            src={logo}
            alt="Pollux"
            className="h-10 sm:h-12 object-contain"
          />
        </div>

        {/* Badge de rôle — dynamique selon compagnie/agent/distributeur/commerçant 
        <button className="border border-white rounded-xl px-4 sm:px-6 py-2 mb-8 sm:mb-10 text-xs sm:text-sm font-semibold whitespace-nowrap">
          {roleLabel}
        </button>*/}

        {/* Menu — identique pour tous les rôles ; les actions non autorisées
            sont filtrées côté backend (403), voir usePermission/can() côté
            pages concernées si un masquage visuel devient nécessaire plus tard */}
        <nav className="w-full px-6 sm:px-10 space-y-5 sm:space-y-6 text-sm">
          <MenuLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Tableau de bord" onClick={closeSidebar} />
          <MenuLink to="/produits" icon={<Package size={18} />} label="Produits" onClick={closeSidebar} />
          <MenuLink to="/carte_canal" icon={<Tv size={18} />} label="Carte/Canal" onClick={closeSidebar} />
          <MenuLink to="/fil_validation" icon={<CheckSquare size={18} />} label="Opérations" onClick={closeSidebar} />
          <MenuLink to="/partenaires" icon={<Users size={18} />} label="Partenaires" onClick={closeSidebar} />
          <MenuLink to="/client" icon={<UserCog size={18} />} label="Clients" onClick={closeSidebar} />
          <MenuLink to="/document" icon={<FileText size={18} />} label="Documents" onClick={closeSidebar} />
          {/* <MenuLink to="/wallet" icon={<Wallet size={18} />} label="Wallet" onClick={closeSidebar} /> */}
          <MenuLink to="/commissions" icon={<TrendingUp size={18} />} label="Commissions" onClick={closeSidebar} />
          <MenuLink to="/statistique" icon={<BarChart3 size={18} />} label="Statistiques" onClick={closeSidebar} />
          <MenuLink to="/rapports" icon={<FileText size={18} />} label="Rapports" onClick={closeSidebar} />
          <MenuLink to="/utilisateurs" icon={<UserCog size={18} />} label="Gestion utilisateurs" onClick={closeSidebar} />
          <MenuLink to="/gpin" icon={<KeyRound size={18} />} label="Gestion de Pin" onClick={closeSidebar} />
        </nav>
      </aside>
    </>
  )
}

function MenuLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 sm:gap-4 transition ${
          isActive ? "font-bold opacity-100" : "opacity-100"
        }`
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </NavLink>
  )
}