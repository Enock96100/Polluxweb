import axios from "axios";

const API_BASE = "https://youapi.youneed.app/pollux/dev/api";

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

export const fetchProfile = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("Aucun token trouvé");
    return null;
  }

  try {
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
    };
  }

  const token = localStorage.getItem("token");
  const user = parseJson(localStorage.getItem("user"));
  const company = parseJson(localStorage.getItem("company"));

  return {
    token,
    user,
    company,
    companyId: company?.id || null,
  };
};