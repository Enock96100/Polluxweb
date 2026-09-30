import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./Context";
import api from "../../lib/axios";
import { useNavigate } from "react-router-dom";
import parseJWT from "../../lib/parseJWT";

export default function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [company, setCompany] = useState(undefined);
  const [user, setUser] = useState(undefined); // owner (compagnie) OU user agent
  const [userType, setUserType] = useState(null); // "compagnie" | "agent"
  const [agentProfile, setAgentProfile] = useState(undefined); // infos métier agent
  const [roleId, setRoleId] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // À CONFIRMER : récupère les permissions réelles d'un rôle donné.
  // Endpoint confirmé : GET /roles/:id/permissions
  const fetchRolePermissions = async (id) => {
    if (!id) return [];

    try {
      const response = await api.get(`/roles/${id}/permissions`);
      const list = response?.data?.data || [];

      return list
        .map((p) => (typeof p === "string" ? p : p?.code))
        .filter(Boolean);
    } catch (err) {
      console.error(
        "Erreur fetch permissions du rôle:",
        err?.response?.data || err.message
      );
      return [];
    }
  };

  // Charge le profil compagnie (flow existant, inchangé)
  const loadCompanyProfile = async () => {
    const response = await api.get("/main-companies/by-owner-id");

    if (!response?.data?.success) {
      throw new Error("Profil compagnie introuvable");
    }

    const companyData = response.data.data;
    const owner = companyData?.owner || null;

    setCompany(companyData);
    setUser(owner);
    setUserType("compagnie");
    setAgentProfile(undefined);
    setRoleId(null);
    setRoleName(null);
    setPermissions([]);

    localStorage.setItem("userType", "compagnie");
    localStorage.setItem("company", JSON.stringify(companyData));
    localStorage.setItem("user", JSON.stringify(owner));
    localStorage.removeItem("agentId");
    localStorage.removeItem("agentProfile");
    localStorage.removeItem("roleId");
    localStorage.removeItem("roleName");
    localStorage.removeItem("permissions");

    if (companyData?.id) {
      localStorage.setItem("companyId", companyData.id);
    }
  };

  // Charge le profil agent
  const loadAgentProfile = async () => {
    const response = await api.get("/admin-agents/user");

    if (!response?.data?.success) {
      throw new Error("Profil agent introuvable");
    }

    const agentRecord = response.data.data;
    const companyData = agentRecord?.company || null;
    const agentUser = agentRecord?.user || null;

    // userRoles[0].role donne le rôle assigné (ex: ADMIN_AGENT), pas les
    // permissions -> second appel via roleId
    const primaryRole = agentUser?.userRoles?.[0]?.role || null;
    const rId = primaryRole?.id || null;
    const perms = await fetchRolePermissions(rId);

    setCompany(companyData);
    setUser(agentUser);
    setUserType("agent");
    setAgentProfile(agentRecord);
    setRoleId(rId);
    setRoleName(primaryRole?.name || null);
    setPermissions(perms);

    localStorage.setItem("userType", "agent");
    localStorage.setItem("company", JSON.stringify(companyData));
    localStorage.setItem("user", JSON.stringify(agentUser));
    localStorage.setItem("agentProfile", JSON.stringify(agentRecord));
    localStorage.setItem("agentId", agentRecord?.id || "");
    localStorage.setItem("roleId", rId || "");
    localStorage.setItem("roleName", primaryRole?.name || "");
    localStorage.setItem("permissions", JSON.stringify(perms));

    if (companyData?.id) {
      localStorage.setItem("companyId", companyData.id);
    }
  };

  const getUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    setLoading(true);
    try {
      // On tente d'abord le profil compagnie ; s'il échoue (le compte
      // connecté n'est pas propriétaire d'une compagnie), on bascule sur
      // le profil agent. Évite de dépendre d'un claim "userType" dans le
      // JWT qui n'est pas confirmé être présent.
      try {
        await loadCompanyProfile();
        return "compagnie";
      } catch (companyError) {
        await loadAgentProfile();
        return "agent";
      }
    } catch (error) {
      console.error("FAILED TO FETCH USER", error);
      return null;
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

      // On attend que le profil (company/agent + permissions) soit chargé
      // avant de naviguer, pour que le Dashboard trouve tout de suite ce
      // dont il a besoin. getUser() renvoie le type détecté ("compagnie",
      // "agent") ou null si aucun des deux profils n'a pu être chargé.
      const detectedType = await getUser();

      if (!detectedType) {
        // Ni compagnie ni agent : on ne redirige pas vers un dashboard
        // vide, on nettoie la session et on informe l'utilisateur.
        localStorage.removeItem("token");
        setError(
          "Impossible de déterminer votre type de compte. Contactez votre administrateur."
        );
        return;
      }

      // Une seule route /dashboard : DashboardSwitch affichera
      // automatiquement Dashboard.jsx (compagnie) ou Dashboard_agent.jsx
      // (agent) selon le userType déjà chargé dans le contexte. Chaque
      // profil arrive donc bien sur SON propre dashboard, sans URL dédiée.
      //
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
      localStorage.removeItem("userType");
      localStorage.removeItem("company");
      localStorage.removeItem("user");
      localStorage.removeItem("agentId");
      localStorage.removeItem("agentProfile");
      localStorage.removeItem("roleId");
      localStorage.removeItem("roleName");
      localStorage.removeItem("permissions");

      setCompany(undefined);
      setUser(undefined);
      setUserType(null);
      setAgentProfile(undefined);
      setRoleId(null);
      setRoleName(null);
      setPermissions([]);

      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  // userInfo : conservé pour compatibilité avec le code existant qui
  // consomme déjà ce champ (ex: Header.jsx). Pointe vers l'owner en mode
  // compagnie, ou vers le user agent en mode agent.
  const userInfo = useMemo(() => {
    if (userType === "agent") return user;
    if (!company) return undefined;
    return company.owner;
  }, [company, user, userType]);

  const userCompany = useMemo(() => {
    if (!company) return undefined;
    return company;
  }, [company]);

  const isAgent = userType === "agent";
  const isCompany = userType === "compagnie";

  // La compagnie a toujours accès à tout ; l'agent est vérifié contre ses
  // permissions réelles (le backend reste la vraie barrière de sécurité,
  // ceci ne sert qu'à l'affichage conditionnel côté UI).
  const can = (permission) => {
    if (isCompany) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user: company,
        userInfo,
        userCompany,
        userType,
        isAgent,
        isCompany,
        agentProfile,
        roleId,
        roleName,
        permissions,
        can,
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