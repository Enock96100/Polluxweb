import useAuth from "../context/auth/utils";
import Dashboard from "./Dashboard";
import Dashboard_agent from "./Dashboard_agent";

export default function DashboardSwitch() {
  const auth = useAuth();
  const userType = auth?.userType;

  // Le profil (compagnie ou agent) est encore en cours de chargement dans
  // le Provider (ex: juste après un refresh de page) -> on évite d'afficher
  // le mauvais dashboard ou un flash de contenu vide le temps que
  // userType soit connu. Même pattern que PrivateRoute/AuthRoute dans
  // App.jsx pour rester cohérent visuellement.
  if (auth?.loading || !userType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        Chargement...
      </div>
    );
  }

  return userType === "agent" ? <Dashboard_agent /> : <Dashboard />;
}