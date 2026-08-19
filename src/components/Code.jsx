import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import useAuth from "../context/auth/utils";
import parseJWT from "../lib/parseJWT";

export default function VerifyCode() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { error, loading, loginWithCode, resendCode } = useAuth();

  useEffect(() => {
    const tempToken = localStorage.getItem("tempToken");
    if (!tempToken) return;

    const decoded = parseJWT(tempToken);
    const tokenEmail = decoded?.data?.email || decoded?.email;
    if (tokenEmail) {
      setEmail(tokenEmail);
    }
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = (e) => {
    e?.preventDefault();
    if (!email || code.length !== 6) return;
    loginWithCode({ email, code });
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    try {
      await resendCode({ email });
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      console.error("Erreur resend:", err);
    }
  };

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const m = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const s = String(safeSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 sm:p-8 space-y-5 sm:space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="Pollux" className="h-10 sm:h-12" />
        </div>

        <h2 className="text-center text-lg sm:text-xl font-semibold">
          Vérification du code
        </h2>

        {email && (
          <p className="text-center text-sm text-gray-400 break-words">
            Code envoyé à{" "}
            <span className="font-medium text-gray-600">{email}</span>
          </p>
        )}

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-3 rounded-lg text-center text-sm break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
          <input
            type="text"
            maxLength="6"
            inputMode="numeric"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            required
            className="w-full text-center text-xl sm:text-2xl tracking-widest px-4 py-3 rounded-lg bg-gray-100"
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
            disabled={!canResend || loading}
            className={`w-full text-sm sm:text-base ${
              canResend ? "text-blue-500 underline" : "text-gray-400"
            }`}
          >
            Renvoyer le code
          </button>

          {!canResend && (
            <p className="text-center text-sm text-gray-400">
              Vous pourrez renvoyer un code dans {formatTime(timer)}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}