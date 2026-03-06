// Logout.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supprime le token
    localStorage.removeItem("token");
    localStorage.removeItem("tempToken");
    localStorage.removeItem("user");

    // Redirige vers la page de login
    navigate("/login");
    // Recharge la page pour s'assurer que le layout est réinitialisé
    window.location.reload();
  }, [navigate]);

  return null; // Pas besoin d'afficher quoi que ce soit
}
