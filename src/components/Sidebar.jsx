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
} from "lucide-react"
import logo from "../assets/logo.png"
export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-[#1EA4DC] text-white flex flex-col items-center py-6">
      
      {/* Logo */}
      <div className="bg-white rounded-xl px-6 py-4 mb-6 flex justify-center">
            <img
              src={logo}
              alt="Pollux"
              className="h-12 object-contain"
            />
      </div>
      {/* Admin */}
      <button className="border border-white rounded-xl px-6 py-2 mb-10 text-sm font-semibold">
        ADMINISTRATEUR
      </button>

      {/* Menu */}
      <nav className="w-full px-10 space-y-6 text-sm">
        <MenuLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Tableau de bord" />
        <MenuLink to="/produits" icon={<Package size={18} />} label="Produits" />
        <MenuLink to="/partenaires" icon={<Users size={18} />} label="Partenaires" />
        <MenuLink to="/wallet" icon={<Wallet size={18} />} label="Wallet" />
        <MenuLink to="/validation" icon={<CheckSquare size={18} />} label="File de validation" />
        <MenuLink to="/commissions" icon={<TrendingUp size={18} />} label="Commissions" />
        <MenuLink to="/rapports" icon={<FileText size={18} />} label="Rapports" />
        <MenuLink to="/utilisateurs" icon={<UserCog size={18} />} label="Gestion utilisateurs" />
      </nav>
    </aside>
  )
}

function MenuLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 transition ${
          isActive ? "font-bold opacity-100" : "opacity-100"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}
