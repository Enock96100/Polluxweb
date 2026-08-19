import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./Context";
import api from "../../lib/axios";
import { useNavigate } from "react-router-dom";
import parseJWT from "../../lib/parseJWT";

export default function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [company, setCompany] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const response = await api.get("/main-companies/by-owner-id");

      if (response?.data?.success) {
        const companyData = response.data.data;
        setCompany(companyData);

        // On stocke le companyId dès qu'on l'a, pour que les autres pages
        // (ex: Dashboard) n'aient plus jamais besoin de refaire un appel
        // /profile séparé juste pour obtenir cette valeur.
        if (companyData?.id) {
          localStorage.setItem("companyId", companyData.id);
        }
      }
    } catch (error) {
      console.error("FAILED TO FETCH USER", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const data = response?.data?.data;
      const tempToken = data?.tempToken;

      if (!tempToken) {
        throw new Error("Token non reçu");
      }

      localStorage.setItem("tempToken", tempToken);
      navigate("/code");
    } catch (err) {
      console.error("LOGIN ERROR :", err.response?.data || err.message);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Erreur lors de la connexion"
      );
    } finally {
      setLoading(false);
    }
  };

  const loginWithCode = async ({ email, code }) => {
    setError("");
    setLoading(true);

    try {
      if (!email) throw new Error("Email introuvable.");
      if (!code || code.length !== 6)
        throw new Error("Le code doit contenir 6 chiffres.");

      const response = await api.post(
        "/auth/verify-email",
        {},
        {
          params: {
            email,
            code,
            methodReq: "login",
          },
        }
      );

      const token = response?.data?.data?.token;
      if (!token) {
        throw new Error("Token non reçu après vérification");
      }

      localStorage.setItem("token", token);
      localStorage.removeItem("tempToken");

      // On attend que le profil (et companyId) soit chargé avant de naviguer,
      // pour que le Dashboard trouve tout de suite ce dont il a besoin.
      await getUser();

      // IMPORTANT : on utilise la navigation React Router plutôt que
      // window.location.reload(). Un reload complet force le navigateur à
      // redemander l'URL courante au serveur ; si l'hébergement n'a pas de
      // règle de fallback SPA (rewrite vers index.html), ça retombe sur une
      // page 404 générique au lieu du Dashboard React.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.description ||
        err.response?.data?.message ||
        err.message;

      if (message?.toLowerCase().includes("expir")) {
        setError(
          "Votre code a expiré. Cliquez sur 'Code expiré ?' pour en recevoir un nouveau."
        );
      } else {
        setError(message || "Erreur serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async ({ email: providedEmail } = {}) => {
    setError("");
    setLoading(true);

    try {
      const tempToken = localStorage.getItem("tempToken");
      if (!tempToken) {
        throw new Error("Session expirée.");
      }

      const parsedToken = parseJWT(tempToken);
      const email = providedEmail || parsedToken?.data?.email || parsedToken?.email;
      if (!email) {
        throw new Error("Email introuvable pour renvoi.");
      }

      const response = await api.post("/auth/resend-code", { email });

      if (response?.data?.success) {
        setError("Code renvoyé avec succès.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Impossible de renvoyer le code"
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (error) {
      console.error("Erreur logout API :", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("tempToken");
      localStorage.removeItem("companyId");
      setCompany(undefined);
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  const userInfo = useMemo(() => {
    if (!company) return undefined;
    return company.owner;
  }, [company]);

  const userCompany = useMemo(() => {
    if (!company) return undefined;
    return company;
  }, [company]);

  return (
    <AuthContext.Provider
      value={{
        user: company,
        userInfo,
        userCompany,
        login,
        loading,
        error,
        loginWithCode,
        resendCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}