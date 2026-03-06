import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import useAuth from "../context/auth/utils";
import parseJWT from "../lib/parseJWT";

export default function VerifyCode() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("")

  const {error, loading, loginWithCode,resendCode} = useAuth()

  useEffect(()=>{
    const tempToken = localStorage.getItem("tempToken")

    if(!tempToken) {
        throw new Error("Token introuvable")
    }

    const {data} = parseJWT(tempToken)

    if(!data) {
        throw new Error("JWT invalide")
    }

    const email = data.email

    setEmail(email)
  }, [])

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    loginWithCode({email, code})
  };
  const handleResend = async () => {
  if (!email) {
    console.error("Email manquant")
    return
  }

  try {
    await resendCode({ email })
  } catch (err) {
    console.error("Erreur resend:", err)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 space-y-6">

        <div className="flex justify-center">
          <img src={logo} alt="Pollux" className="h-12" />
        </div>

        <h2 className="text-center text-xl font-semibold">
          Vérification du code
        </h2>

        {email && (
          <p className="text-center text-sm text-gray-400">
            Code envoyé à{" "}
            <span className="font-medium text-gray-600">{email}</span>
          </p>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">
          <input
            type="text"
            maxLength="6"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            required
            className="w-full text-center text-2xl tracking-widest px-4 py-3 rounded-lg bg-gray-100"
          />

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-[#1EA4DC] text-white py-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Vérification..." : "Valider"}
          </button>
          <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full text-blue-500 underline"
            >
              Renvoyer le code
          </button>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
        </form>
      </div>
    </div>
  );
}