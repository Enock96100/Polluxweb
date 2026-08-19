import { useState } from "react"
import logo from "../assets/logo.png"
import useAuth from "../context/auth/utils"
/* import { fetchProfile, getAuthData } from "./auth"; */
export default function Login() {
  
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  
  const {login, error, loading} = useAuth()

const handleSubmit = async (e) => {
  e.preventDefault();
  login({
    email, password
  })
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <form onSubmit={handleSubmit} className="bg-white max-w-md w-full p-6 sm:p-8 rounded-xl shadow space-y-5 sm:space-y-6">

        <div className="flex justify-center">
          <img src={logo} alt="Pollux" className="h-12 sm:h-14" />
        </div>

        <h1 className="text-lg sm:text-xl font-semibold text-center">Connexion</h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded text-center text-xs sm:text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded bg-gray-100 text-sm sm:text-base"
        />

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded bg-gray-100 text-sm sm:text-base"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1EA4DC] text-white py-3 rounded font-semibold disabled:opacity-60 text-sm sm:text-base"
        >
          {loading ? "Connexion..." : "Continuer"}
        </button>

      </form>
    </div>
  )
}