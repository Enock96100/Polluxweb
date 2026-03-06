import { Bell, ChevronDown, LogOut, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import useAuth from "../context/auth/utils"

export default function Header() {
  const [user, setUser] = useState(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)

  const {logout, userInfo} = useAuth()

  const menuRef = useRef(null)

   /*   Fermer menu si clic extérieur */
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])


    /*  Initiales dynamiques */
  
  const initials =
    (userInfo?.firstName?.[0] || "") +
    (userInfo?.lastName?.[0] || "") ||
    "U"

  return (
    <>
      <header className="h-16 bg-white border border-gray-200 flex justify-end items-center px-6 gap-6">

        {/* Notifications */}
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            3
          </span>
        </div>

        {/* User Section */}
        <div className="relative" ref={menuRef}>
          <div
            onClick={() => setOpenMenu(!openMenu)}
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-9 h-9 bg-[#1EA4DC] rounded-full text-white flex items-center justify-center font-semibold">
              {initials}
            </div>

            {/* Nom + Email */}
            <div className="text-sm leading-tight">
              <p className="font-semibold">
                {[userInfo?.firstName, userInfo?.lastName]
                  .filter(Boolean)
                  .join(" ") || "Utilisateur"}
              </p>
              <p className="text-gray-500 text-xs">
                {userInfo?.email || ""}
              </p>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>

          {/* Dropdown */}
          {openMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg py-2">
              <button
                onClick={() => {
                  setOpenProfile(true)
                  setOpenMenu(false)
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100"
              >
                <User size={16} />
                Profil
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

    
         {/*   MODAL PROFIL */}
      
      {openProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-96 rounded-2xl p-6 shadow-xl">

            <h2 className="text-lg font-semibold mb-4">
              Profil utilisateur
            </h2>

            <div className="space-y-2 text-sm">
              <p><strong>Nom :</strong> {userInfo?.lastName}</p>
              <p><strong>Prénom :</strong> {userInfo?.firstName}</p>
              <p><strong>Email :</strong> {userInfo?.email}</p>
              <p><strong>Téléphone :</strong> {userInfo?.phone}</p>
              <p><strong>Rôle :</strong> {userInfo?.userInfoType}</p>
              <p><strong>Ville :</strong> {userInfo?.city}</p>
              <p><strong>Pays :</strong> {userInfo?.country}</p>
            </div>

            <button
              onClick={() => setOpenProfile(false)}
              className="mt-6 w-full bg-[#1EA4DC] text-white py-2 rounded-lg"
            >
              Fermer
            </button>

          </div>
        </div>
      )}
    </>
  )
}