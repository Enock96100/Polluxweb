import axios from "axios";

const API_BASE = "https://youapi.youneed.app/pollux/prod/api";

const parseJson = (value) => {
  if (!value || value === "undefined" || value === "null") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// ⚠️ À CONFIRMER : endpoint exact pour récupérer les permissions d'un rôle
// donné. Suppose GET /roles/:id/permissions -> { data: [{ code, ... }] }
// (à aligner avec le pattern déjà utilisé dans Detail_role.jsx pour
// /roles/permissions/grouped et /roles/:id/permissions/bulk)
const fetchRolePermissions = async (roleId, token) => {
  if (!roleId) return [];

  try {
    const response = await axios.get(
      `${API_BASE}/roles/${roleId}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const list = response?.data?.data || [];

    return list
      .map((p) => (typeof p === "string" ? p : p?.code))
      .filter(Boolean);
  } catch (error) {
    console.error(
      "Erreur fetch permissions du rôle:",
      error?.response?.data || error.message
    );
    return [];
  }
};

export const fetchProfile = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("Aucun token trouvé");
    return null;
  }

  // userType est déterminé et stocké dès le login (voir Provider.jsx / Login.jsx)
  // On le relit ici pour savoir quel profil récupérer
  const userType = localStorage.getItem("userType") || "compagnie";

  try {
    if (userType === "agent") {
      // ✅ CONFIRMÉ : GET /admin-agents/user (identifie l'agent via le token)
      const response = await axios.get(`${API_BASE}/admin-agents/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const agentRecord = response?.data?.data || null;

      if (!agentRecord) {
        console.warn("Profil agent vide reçu");
        return null;
      }

      // agentRecord contient : id (id agent), employeeCode, department,
      // position, isActive, pinCode/pinAttempts/..., userId, companyId,
      // company: {...avec owner}, user: {...avec userRoles}
      const company = agentRecord.company || null;
      const user = agentRecord.user || null;

      // userRoles[0].role donne le rôle assigné (ex: ADMIN_AGENT) mais pas
      // directement les permissions -> second appel via roleId
      const primaryRole = user?.userRoles?.[0]?.role || null;
      const roleId = primaryRole?.id || null;
      const permissions = await fetchRolePermissions(roleId, token);

      // On stocke le "profil agent" à part (données métier : matricule,
      // département, poste, statut PIN...) et "user" garde le format
      // habituel utilisé partout ailleurs dans l'app (Header, etc.)
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("company", JSON.stringify(company));
      localStorage.setItem("agentProfile", JSON.stringify(agentRecord));
      localStorage.setItem("agentId", agentRecord?.id || "");
      localStorage.setItem("roleId", roleId || "");
      localStorage.setItem("roleName", primaryRole?.name || "");
      localStorage.setItem("permissions", JSON.stringify(permissions));

      return {
        company,
        user,
        agentProfile: agentRecord,
        roleName: primaryRole?.name || null,
        permissions,
      };
    }

    // Flow compagnie existant, inchangé
    const response = await axios.get(
      `${API_BASE}/main-companies/by-owner-id`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const company = response?.data?.data || null;

    if (!company) {
      console.warn("Profil vide reçu");
      return null;
    }

    const owner = company.owner || null;

    localStorage.setItem("company", JSON.stringify(company));
    localStorage.setItem("user", JSON.stringify(owner));

    return {
      company,
      user: owner,
    };
  } catch (error) {
    console.error(
      "Erreur fetch profile:",
      error?.response?.data || error.message
    );

    if (error?.response?.status === 401 || error?.response?.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("company");
      localStorage.removeItem("userType");
      localStorage.removeItem("agentId");
      localStorage.removeItem("agentProfile");
      localStorage.removeItem("roleId");
      localStorage.removeItem("roleName");
      localStorage.removeItem("permissions");
    }

    return null;
  }
};

export const getAuthData = () => {
  if (typeof window === "undefined") {
    return {
      token: null,
      user: null,
      company: null,
      companyId: null,
      userType: null,
      agentId: null,
      agentProfile: null,
      roleId: null,
      roleName: null,
      permissions: [],
    };
  }

  const token = localStorage.getItem("token");
  const user = parseJson(localStorage.getItem("user"));
  const company = parseJson(localStorage.getItem("company"));
  const userType = localStorage.getItem("userType") || "compagnie";
  const agentId = localStorage.getItem("agentId") || null;
  const agentProfile = parseJson(localStorage.getItem("agentProfile"));
  const roleId = localStorage.getItem("roleId") || null;
  const roleName = localStorage.getItem("roleName") || null;
  const permissions = parseJson(localStorage.getItem("permissions")) || [];

  return {
    token,
    user,
    company,
    companyId: company?.id || null,
    userType,
    agentId,
    agentProfile,
    roleId,
    roleName,
    permissions,
  };
};

// Utilitaire pour vérifier une permission (utilisé par usePermission.js)
export const hasPermission = (permission) => {
  const { userType, permissions } = getAuthData();

  // La compagnie (propriétaire) a toujours accès à tout
  if (userType === "compagnie") {
    return true;
  }

  return permissions.includes(permission);
};