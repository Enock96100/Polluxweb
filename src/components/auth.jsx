
import axios from "axios";

const API_BASE = "https://youapi.youneed.app/pollux/dev/api";


export const fetchProfile = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("Aucun token trouvé");
    return null;
  }

  try {
    const response = await axios.get(
      `${API_BASE}/admin-agents/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    console.log("PROFILE RESPONSE:", response.data);

    const user = response?.data?.data || null;

    if (!user) {
      console.warn("Profil vide reçu");
      return null;
    }

    // on stocke le user complet (companyId inclus)
    localStorage.setItem("user", JSON.stringify(user));

    return user;

  } catch (error) {
    console.error(
      "Erreur fetch profile:",
      error?.response?.data || error.message
    );

    // Si token invalide → on nettoie
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return null;
  }
};

/* ================= GET AUTH DATA ================= */

export const getAuthData = () => {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser && storedUser !== "undefined") {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Erreur parsing user:", error);
    user = null;
  }

  const companyId = user?.companyId || null;

  return {
    token,
    user,
    companyId,
  };
};