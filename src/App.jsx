import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import Login from "./components/Login";
import Code from "./components/Code";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Produits from "./components/Produits";
import Partenaires from "./components/Partenaires";
import Wallet from "./components/Wallet";
import Validation from "./components/Validation";
import Commissions from "./components/Commissions";
import Rapports from "./components/Rapports";
import Utilisateurs from "./components/Utilisateurs";
import useAuth from "./context/auth/utils";
import AuthProvider from "./context/auth/Provider";
import Detail from "./components/Detail";
import Detail_canal from "./components/Detail_canal";
import Carte_canal from "./components/Carte_canal";
import Detail_carte_prepay from "./components/Detail_carte_prepay";
import Detail_abonnement from "./components/Detail_abonnement";
import Fil_validation from "./components/Fil_validation";
import Client from "./components/Client";
import Statistique from "./components/Statistique";
import Document from "./components/Document";
import Detail_op_attente from "./components/Detail_op_attente";
import Souproduitpage from "./components/Souproduitpage";
import Detail_formule from "./components/Detail_formule";
import Ajouter_carte from "./components/Ajouter_carte";
import Ajouter_decodeur from "./components/Ajouter_decodeur";
import Detail_distributeur from "./components/Detail_distributeur";
import Detail_commercant from "./components/Detail_commercant";
import Detail_ope_distrib from "./components/Detail_ope_distrib";
import Detail_com_distrib from "./components/Detail_com_distrib";
import Detail_ope_commer from "./components/Detail_ope_commer";
import Detail_com_comm from "./components/Detail_com_comm";
import Detail_role from "./components/Detail_role";
import Detail_agent from "./components/Detail_agent";
import Profil from "./components/Profil";
import Commission_ad from "./components/Commission_ad";
import Detail_com_ad from "./components/Detail_com_ad";
import Detail_operateur from "./components/Detail_operateur";
import Gpin from "./components/Gpin";
import DashboardSwitch from "./components/DashboardSwitch";
import Mes_permissions from "./components/Mes_permissions";

/* ================= LAYOUT ================= */

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/*
        La Sidebar est en position fixed :
        - sur mobile/tablette (< lg) elle est cachée hors écran (drawer géré par
          Sidebar.jsx via translate-x), donc aucune marge n'est nécessaire ici ;
        - à partir de lg elle reste affichée en permanence avec une largeur de
          w-60 (15rem), d'où le lg:ml-60 qui décale le contenu principal.
      */}
      <div className="lg:ml-60">
        <Header />

        <div className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
/* ================= ROUTE PROTECTION ================= */

function PrivateRoute() {
  const auth = useAuth();
  const location = useLocation();
  const hasToken = localStorage.getItem("token");
  
  // Si le contexte charge encore mais qu'on possède un jeton, on bloque la redirection
  if (auth && auth.loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50">Chargement...</div>;
  }
  
  // Si pas d'utilisateur ET pas de token dans le stockage, retour à la case départ
  if (!auth?.user && !hasToken) {
    // state={{ from: location }} permet de se souvenir d'où l'on venait (ex: /produits)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <Outlet />;
}

function AuthRoute() {
  const auth = useAuth();
  const location = useLocation();
  const tempToken = localStorage.getItem("tempToken");
  const hasToken = localStorage.getItem("token");

  if (auth && auth.loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50">Chargement...</div>;
  }

  // Si l'utilisateur est connecté (ou possède un token valide au refresh)
  if ((auth && auth.user) || hasToken) {
    // On regarde si une URL d'origine était enregistrée, sinon on va sur le dashboard
    const from = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }
  
  if (tempToken) return <Navigate to="/code" replace />;

  return <Outlet />;
}

function CodeRoute() {
  const auth = useAuth();
  const token = localStorage.getItem("token");
  const tempToken = localStorage.getItem("tempToken");

  if (auth && auth.loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50">Chargement...</div>;
  }

  if (token) return <Navigate to="/dashboard" replace />;
  return tempToken ? <Outlet /> : <Navigate to="/login" replace />;
}

/* ================= APP ================= */

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Racine */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* LOGIN */}
          <Route element={<AuthRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* CODE OTP */}
          <Route element={<CodeRoute />}>
            <Route path="/code" element={<Code />} />
          </Route>

          {/* DASHBOARD PROTÉGÉ */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              {/*
                Une seule route /dashboard pour les deux rôles :
                DashboardSwitch affiche Dashboard.jsx (compagnie) ou
                Dashboard_agent.jsx (agent) selon userType du contexte auth.
              */}
              <Route path="/dashboard" element={<DashboardSwitch />} />
              <Route path="/produits" element={<Produits />} />
              <Route path="/carte_canal" element={<Carte_canal />} />
              <Route path="/detail/:id" element={<Detail />} /> 
              <Route path="/detail_canal/:id" element={<Detail_canal />} /> 
              <Route path="/detail_carte_prepay/:id" element={<Detail_carte_prepay />} />
              <Route path="/detail_abonnement/:id" element={<Detail_abonnement />} />
              <Route path="/partenaires" element={<Partenaires />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/commissions" element={<Commissions />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/utilisateurs" element={<Utilisateurs />} />
              <Route path="/fil_validation" element={<Fil_validation />} />
              <Route path="/client" element={<Client />} />
              <Route path="/statistique" element={<Statistique />} />
              <Route path="/document" element={<Document />} />
              <Route path="/souproduitpage" element={<Souproduitpage />} />
              <Route path="/detail_op_attente/:id" element={<Detail_op_attente />} />
              <Route path="/detail_formule/:id" element={<Detail_formule />} />
              <Route path="/ajouter_carte/:id" element={<Ajouter_carte />} />
              <Route path="/ajouter_decodeur/:id" element={<Ajouter_decodeur />} />
              <Route path="/detail_distributeur/:id" element={<Detail_distributeur />} />
              <Route path="/detail_commercant/:id" element={<Detail_commercant />} />
              <Route path="/detail_ope_distrib/:id" element={<Detail_ope_distrib />} />
              <Route path="/detail_com_distrib/:id" element={<Detail_com_distrib />} />
              <Route path="/detail_ope_commer/:id" element={<Detail_ope_commer />} />
              <Route path="/detail_com_comm/:id" element={<Detail_com_comm />} />
              <Route path="/detail_role/:id" element={<Detail_role />} />
              <Route path="/detail_agent/:id" element={<Detail_agent />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/commission_ad" element={<Commission_ad />} />
              <Route path="/detail_com_ad/:id" element={<Detail_com_ad />} />
              <Route path="/detail_operateur/:id" element={<Detail_operateur />} />
              <Route path="/gpin" element={<Gpin />} />
              <Route path="/Mes_permissions" element={<Mes_permissions />} />
            </Route>
          </Route>

          {/* 404 */}
           <Route path="*" element={<Navigate to="/login" replace />} /> 

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}